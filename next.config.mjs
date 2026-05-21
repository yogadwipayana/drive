/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["image.yogathedev.com", "drive.yogathedev.com"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
