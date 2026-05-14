import type { Metadata } from "next";
import { Playfair_Display, Space_Mono, DM_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const playfair = Playfair_Display({
  subsets:  ["latin"],
  variable: "--font-display",
  display:  "swap",
});

const spaceMono = Space_Mono({
  subsets:  ["latin"],
  weight:   ["400", "700"],
  variable: "--font-mono",
  display:  "swap",
});

const dmSans = DM_Sans({
  subsets:  ["latin"],
  variable: "--font-body",
  display:  "swap",
});

export const metadata: Metadata = {
  title:       "PixelMind — Collaborative Onchain Canvas",
  description: "500,000 pixels. One shared canvas. Paint the blockchain.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title:       "PixelMind",
    description: "Paint your mark on the blockchain. 500K pixels on Ritual Chain.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${spaceMono.variable} ${dmSans.variable}`}>
      <body className="bg-void text-white font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
