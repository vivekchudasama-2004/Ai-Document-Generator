import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./tokens.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "DocuForge — idea to human-feeling document",
  description: "Generate, de-robot, and export professional paginated documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${newsreader.variable} ${mono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
