import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SnopyChat } from "@/components/snopy-chat";
import { isAssistantEnabled } from "@/lib/features";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "snoRNA-BIU",
  description: "The non-coding RNA sequence database",
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
      <body className="min-h-full flex flex-col">
        {children}
        {isAssistantEnabled && <SnopyChat />}
      </body>
    </html>
  );
}
