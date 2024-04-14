import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import WebsiteNavigation from "@/components/websiteNavigation";
import WebsiteFooter from "@/components/websiteFooter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Irmin",
  description: "A better home for your data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WebsiteNavigation />
        {children}
        <WebsiteFooter />
      </body>
    </html>
  );
}
