import type { Metadata } from "next";
import "./globals.css";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "Track your stock & ETF portfolio, news, and market opportunities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-50">
        <PortfolioProvider>
          <Nav />
          <main className="mx-auto max-w-7xl px-4 pt-20 pb-12 sm:px-6">
            {children}
          </main>
        </PortfolioProvider>
      </body>
    </html>
  );
}
