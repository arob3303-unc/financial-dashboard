import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { AppHeader } from "@/components/AppHeader";
import { BalanceProvider } from "@/components/BalanceProvider";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Extro — Stock Forecaster",
  description:
    "A fictional stock forecaster: price history, projected returns, and an AI outlook on any ticker.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-svh font-sans antialiased",
            geistSans.variable,
            geistMono.variable,
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <BalanceProvider>
              <AppHeader />
              <main>{children}</main>
            </BalanceProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
