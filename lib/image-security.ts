import sharp from "sharp";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_DIMENSION = 12_000;
const PROCESSING_TIMEOUT_MS = 8_000;
const MAX_OUTPUT_BYTES = 25 * 1024 * 1024;

const RASTER_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-icon",
]);

// SVG is intentionally excluded — serving SVG on the app origin enables stored XSS.

export type SecurityAuditEvent = {
  action: "accepted" | "rejected";
  fileName: string;
  claimedType: string;
  detectedType?: string;
  size: number;
  reason?: string;
  width?: number;
  height?: number;
};

export type SecuredImage = {
  buffer: Buffer;
  mime: string;
  ext: string;
  width?: number;
  height?: number;
};

export class ImageSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageSecurityError";
  }
}

export function auditImageSecurity(event: SecurityAuditEvent): void {
  console.info(JSON.stringify({ event: "image_upload_security", ...event }));
}

function detectMime(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: "image/png", ext: ".png" };
  }
  if (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a") {
    return { mime: "image/gif", ext: ".gif" };
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { mime: "image/webp", ext: ".webp" };
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 16).toString("ascii");
    if (brand.includes("avif") || brand.includes("avis")) return { mime: "image/avif", ext: ".avif" };
  }
  if (buffer.subarray(0, 2).toString("ascii") === "BM") {
    return { mime: "image/bmp", ext: ".bmp" };
  }
  if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return { mime: "image/x-icon", ext: ".ico" };
  }

  return null;
}

function assertNoEmbeddedPayload(buffer: Buffer): void {
  // Scan the full buffer — truncating to 4096 bytes misses payloads appended after the image header.
  const text = buffer.toString("latin1").toLowerCase();
  if (text.includes("<script") || text.includes("<?php") || text.includes("#!/") || text.includes("<html")) {
    throw new ImageSecurityError("File contains suspicious embedded content");
  }
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: NodeJS.Timeout;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new ImageSecurityError("Image processing timed out")), PROCESSING_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    clearTimeout(timeout!);
  }
}

async function sanitizeRaster(buffer: Buffer, mime: string): Promise<SecuredImage> {
  assertNoEmbeddedPayload(buffer);

  const image = sharp(buffer, {
    animated: mime === "image/gif" || mime === "image/webp",
    limitInputPixels: MAX_PIXELS,
    failOn: "warning",
  });
  const metadata = await withTimeout(image.metadata());
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (!width || !height) throw new ImageSecurityError("Unable to determine image dimensions");
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new ImageSecurityError("Image dimensions exceed safety limits");
  }

  let output: Buffer;
  let outputMime = mime;
  let ext = ".jpg";

  if (mime === "image/png") {
    output = await withTimeout(image.png().toBuffer());
    ext = ".png";
  } else if (mime === "image/webp") {
    output = await withTimeout(image.webp().toBuffer());
    ext = ".webp";
  } else if (mime === "image/avif") {
    output = await withTimeout(image.avif().toBuffer());
    ext = ".avif";
  } else {
    output = await withTimeout(image.jpeg({ quality: 90, mozjpeg: true }).toBuffer());
    outputMime = "image/jpeg";
  }

  if (output.length > MAX_OUTPUT_BYTES) {
    throw new ImageSecurityError("Sanitized image exceeds output size limit");
  }

  return { buffer: output, mime: outputMime, ext, width, height };
}

export async function secureImageUpload(file: File): Promise<SecuredImage> {
  if (file.size > MAX_BYTES) throw new ImageSecurityError("File exceeds 50MB limit");
  if (file.size === 0) throw new ImageSecurityError("File is empty");

  const input = Buffer.from(await file.arrayBuffer());
  const detected = detectMime(input);
  if (!detected) throw new ImageSecurityError("Unsupported or unrecognized image type");
  if (file.type && file.type !== detected.mime) {
    throw new ImageSecurityError(`MIME mismatch: claimed ${file.type}, detected ${detected.mime}`);
  }

  if (detected.mime === "image/svg+xml") {
    throw new ImageSecurityError("SVG uploads are not supported");
  }

  if (!RASTER_MIME.has(detected.mime)) {
    throw new ImageSecurityError("Unsupported image type");
  }

  return sanitizeRaster(input, detected.mime);
}
