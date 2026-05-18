import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schrammel Reloaded",
  description: "Der Schrammel.Reloaded.Stream — German party music radio",
  robots: {
    index: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen">
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  );
}
