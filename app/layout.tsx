import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSV Analyst Pro — AI-Powered Data Analytics",
  description: "Upload CSV files and chat with your data using AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
