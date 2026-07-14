import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SnopyChat } from "@/components/snopy-chat";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  description: "The non-coding RNA sequence database for kinetoplastid parasites",
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
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <SiteHeader />
        <SiteBreadcrumbs />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {isAssistantEnabled && <SnopyChat />}
      </body>
    </html>
  );
}
