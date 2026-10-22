import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/fx/SmoothScroll";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "EzLex - AI-Powered Justice",
  description: "EzLex: a unified platform bridging citizens, lawyers, and government authorities for faster legal resolution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} font-sans antialiased text-slate-900`}>
        <div className="liquid-bg" aria-hidden>
          <span /><span /><span /><span />
        </div>
        <div className="vignette" aria-hidden />
        <div className="film-grain" aria-hidden />
        <SmoothScroll>
          <main>{children}</main>
        </SmoothScroll>
      </body>
    </html>
  );
}
