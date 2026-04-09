import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CSV Analyst Pro — AI-powered data analysis",
  description: "Upload any CSV file and have a natural language conversation with your data.",
};

// Inline script applied BEFORE first paint to avoid flash of wrong theme
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
