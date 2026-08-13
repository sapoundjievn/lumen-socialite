import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MessageAlertBootstrap from "@/components/MessageAlertBootstrap";
import IncomingCallBootstrap from "@/components/IncomingCallBootstrap";
import { LanguageProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lumen-socialite.vercel.app"),
  title: "Lumen · Socialite",
  description: "Lumen social media platform — Socialite. Champagne Frost Pearl.",
  openGraph: {
    type: "website",
    siteName: "Lumen · Socialite",
    title: "Lumen · Socialite",
    description: "Lumen social media platform — Socialite. Champagne Frost Pearl.",
    url: "https://lumen-socialite.vercel.app",
    images: [
      {
        url: "https://lumen-socialite.vercel.app/logo-official.jpg",
        width: 512,
        height: 512,
        alt: "Lumen · Socialite",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Lumen · Socialite",
    description: "Lumen social media platform — Socialite. Champagne Frost Pearl.",
    images: ["https://lumen-socialite.vercel.app/logo-official.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-pearl text-charcoal">
        <LanguageProvider>
          <MessageAlertBootstrap />
          <IncomingCallBootstrap />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
