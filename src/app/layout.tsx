import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArtistBio — Jouw verhaal, professioneel verwoord",
  description:
    "Genereer een professionele biografie voor beeldend kunstenaars en muzikanten op basis van een gestructureerde vragenlijst.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className="dark">
      <body className="min-h-screen bg-background font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
