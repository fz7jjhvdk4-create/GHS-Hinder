import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHS 2026 — Hinderinventering",
  description:
    "Inventering och hantering av hinder för Gothenburg Horse Show 2026",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GHS Hinder",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a1628",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
