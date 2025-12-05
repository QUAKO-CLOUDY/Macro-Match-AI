import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./contexts/ThemeContext"; // <--- Import this
import { DevHelpers } from "./components/DevHelpers"; // Development helpers

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SeekEatz",
  description: "AI-Powered Meal Recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> 
      {/* suppressHydrationWarning is needed for theme switching to not throw warnings */}
      <body className={inter.className}>
        <ThemeProvider> {/* <--- Wrap children with this */}
          <DevHelpers /> {/* Development-only helpers (console utilities) */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}