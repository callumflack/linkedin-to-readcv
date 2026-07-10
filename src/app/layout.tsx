import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const readCvFont = localFont({
  src: "./fonts/readcv-deploy-font.woff2",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Callum Flack",
  description: "design + code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={readCvFont.variable}>{children}</body>
    </html>
  );
}
