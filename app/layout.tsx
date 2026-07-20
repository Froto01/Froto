import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Froto | Bid. Move. Deliver.",
  description:
    "Froto is a logistics marketplace for warehouse capacity, transport capacity, and procurement tenders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
