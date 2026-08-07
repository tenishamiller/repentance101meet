import type { Metadata } from "next";
import { Crimson_Pro, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MINISTRY_NAME, TEACHER_NAME } from "@/lib/brand";
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
  title: `${MINISTRY_NAME} | ${TEACHER_NAME}`,
  description: `Join ${MINISTRY_NAME} — a teaching ministry led by ${TEACHER_NAME}. Live meetings, channels, and community.`,
  icons: {
    icon: "/brand/repentance101-logo.png",
    apple: "/brand/repentance101-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${crimson.variable} ${sourceSans.variable} h-full`}>
      <body className="ministry-bg flex min-h-full flex-col font-sans text-foreground antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
