import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CSV Analyst Pro — AI-powered data analysis",
  description: "Upload any CSV file and have a natural language conversation with your data.",
};

// ── Fix: explicit viewport export prevents mobile Safari from zooming to desktop width
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,       // allow user pinch-zoom for accessibility
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#171717" },
  ],
};

// Inline script: apply dark class BEFORE first paint to prevent flash
const themeScript = `(function(){
  try {
    var t = localStorage.getItem("theme");
    var dark = t === "dark" || (!t || t === "system") && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch(e) {}
})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
