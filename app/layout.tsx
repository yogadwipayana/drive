import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vista",
  description: "Vista — upload images and share them via URL",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
