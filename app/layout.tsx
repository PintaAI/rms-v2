import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Merriweather, Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { TourProvider } from "@/lib/tour-context";
import { DevTools } from "@/components/debug/dev-tools";
import { Toaster } from "@/components/ui/sonner";
import { RiLoader2Fill } from "@remixicon/react";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { Analytics } from "@vercel/analytics/next";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Merriweather({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Manrope({
  subsets: ["latin"],
  variable: "--font-mono",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  manifest: "/site.webmanifest",
  title: {
    default: "RMS | Repair Management System",
    template: "%s | RMS",
  },
  description:
    "RMS adalah aplikasi manajemen servis handphone untuk mengelola ticket, teknisi, inventory sparepart, dan operasional multi-toko.",
  applicationName: "RMS",
  authors: [{ name: "RMS" }],
  creator: "RMS",
  publisher: "RMS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RMS",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "RMS | Repair Management System",
    description:
      "Dashboard modern untuk operasional toko servis handphone: ticket, teknisi, inventory sparepart, dan invoice.",
    siteName: "RMS",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RMS | Repair Management System",
    description:
      "Kelola service ticket, teknisi, stok sparepart, dan pembayaran toko servis dari satu sistem.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        fontSans.variable,
        fontSerif.variable,
        fontMono.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col">
        <PwaProvider />
        <RootProviders>{children}</RootProviders>
        <Analytics />
      </body>
    </html>
  );
}

function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <Suspense fallback={<RootLoadingFallback />}>
        <AuthProvider>
          <TourProvider>
            {children}
            <DevTools />
            <Toaster />
          </TourProvider>
        </AuthProvider>
      </Suspense>
    </ThemeProvider>
  );
}

function RootLoadingFallback() {
  return (
    <div className="min-h-full flex flex-1 items-center justify-center">
      <RiLoader2Fill className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
