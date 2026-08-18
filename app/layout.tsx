import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import { PublicBrandHeader } from "@/components/public-brand-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Froto",
  description: "Connect. Match. Move.",
  icons: {
    icon: "/brand/froto-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <PublicBrandHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
