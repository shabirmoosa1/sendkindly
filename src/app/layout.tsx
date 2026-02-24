import type { Metadata } from "next";
import { Newsreader, Inter, Caveat } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://sendkindly-bice.vercel.app'),
  title: "SendKindly — Celebrate Together",
  description: "Create collaborative keepsakes for the people you love. Collect messages, photos, and memories in one beautiful place.",
  openGraph: {
    siteName: 'SendKindly',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${newsreader.variable} ${inter.variable} ${caveat.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
