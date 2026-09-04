import type { Metadata, Viewport } from "next";
import { Roboto, JetBrains_Mono } from "next/font/google";
import "./tokens.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "DocuForge — idea to human-feeling document",
    template: "%s · DocuForge",
  },
  description:
    "Generate client-ready RDDs, PRDs, and technical design docs with architecture diagrams and strict 150-words-a-page typesetting — rewritten until they read human.",
  keywords: [
    "AI document generator",
    "RDD generator",
    "PRD generator",
    "technical design document",
    "AI humanizer",
    "architecture diagrams",
    "DocuForge",
  ],
  authors: [{ name: "DocuForge" }],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#101414" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${roboto.variable} ${mono.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('df-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
