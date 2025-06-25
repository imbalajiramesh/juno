import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Juno - AI-Powered Customer Management Platform",
  description: "Complete CRM solution with voice AI, SMS automation, email marketing, and team collaboration for modern businesses.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "500x500", type: "image/png" },
      { url: "/fox.png", sizes: "1024x1024", type: "image/png" },
    ],
    apple: "/fox.png",
    shortcut: "/favicon.png",
  },
  metadataBase: new URL("https://juno.laxmint.com"),
  openGraph: {
    title: "Juno - AI-Powered Customer Management Platform",
    description: "Complete CRM solution with voice AI, SMS automation, email marketing, and team collaboration for modern businesses.",
    url: "https://juno.laxmint.com",
    siteName: "Juno",
    images: [
      {
        url: "/fox.png",
        width: 1024,
        height: 1024,
        alt: "Juno Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Juno - AI-Powered Customer Management Platform",
    description: "Complete CRM solution with voice AI, SMS automation, email marketing, and team collaboration for modern businesses.",
    images: ["/fox.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
