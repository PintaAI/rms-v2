import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  manifest: "/scanner.webmanifest",
  title: "RMS Scanner",
  description: "Scanner barcode HP untuk RMS.",
  applicationName: "RMS Scanner",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RMS Scanner",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function ScannerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
