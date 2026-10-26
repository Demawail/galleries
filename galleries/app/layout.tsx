import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio Galleries — Your Studio",
  description: "A thoughtful photography workspace. View, pin, compare and bring your photographs into the world.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
