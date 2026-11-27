import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OscpProvider } from "@/context/OscpContext";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "OSCP Command Center",
  description: "Gamified OSCP / PEN-200 preparation: 200 labs, SM-2 flashcards and a scenario exam bank.",
};

export const viewport: Viewport = {
  themeColor: "#090d16",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <OscpProvider>
          <AppShell>{children}</AppShell>
        </OscpProvider>
      </body>
    </html>
  );
}
