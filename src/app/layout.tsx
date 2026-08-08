import type { Metadata, Viewport } from "next";
import { Crimson_Pro, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AppChrome } from "@/components/layout/AppChrome";
import { MINISTRY_NAME } from "@/lib/brand";
import "./globals.css";

const crimson = Crimson_Pro({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: MINISTRY_NAME,
  description: `Join ${MINISTRY_NAME} — live meetings, channels, and community for biblical repentance and fellowship.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#6B2D2D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${crimson.variable} ${sourceSans.variable} h-full`}>
      <body className="ministry-bg flex min-h-full flex-col font-sans text-foreground antialiased">
        <Providers>
          <Navbar />
          <AppChrome footer={<Footer />}>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
