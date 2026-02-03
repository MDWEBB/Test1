"use client";

import { useState, useEffect, useCallback } from "react";
import { StockQuote, NewsArticle, HoldingWithQuote, PortfolioSummary } from "./types";
import { usePortfolio } from "./portfolio-context";

export function useStockQuotes(tickers: string[], refreshInterval = 60000) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const fetchQuotes = useCallback(async () => {
    if (tickers.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks?tickers=${tickers.join(",")}`);
      const data = await res.json();
      if (data.isMock) setIsMock(true);
      const map: Record<string, StockQuote> = {};
      for (const q of data.quotes || []) {
        map[q.ticker] = q;
      }
      setQuotes(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch quotes");
    } finally {
      setLoading(false);
    }
  }, [tickers]);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchQuotes, refreshInterval]);

  return { quotes, loading, error, isMock, refetch: fetchQuotes };
}

// Convert ticker to Yahoo Finance format (ASX stocks need .AX suffix)
export function toYahooTicker(ticker: string, market: string): string {
  if (market === "ASX") return `${ticker}.AX`;
  return ticker;
}

// Convert Yahoo Finance ticker back to display ticker
function fromYahooTicker(yahooTicker: string): string {
  return yahooTicker.replace(/\.AX$/, "");
}

export function usePortfolioSummary(): PortfolioSummary & { loading: boolean; isMock: boolean } {
  const { holdings } = usePortfolio();
  const tickers = holdings.map((h) => toYahooTicker(h.ticker, h.market || "US"));
  const { quotes, loading, isMock } = useStockQuotes(tickers);

  const holdingsWithQuotes: HoldingWithQuote[] = holdings.map((h) => {
    const yahooTicker = toYahooTicker(h.ticker, h.market || "US");
    const quote = quotes[yahooTicker] || quotes[h.ticker];
    const currentPrice = quote?.price || h.avgCost;
    const marketValue = currentPrice * h.shares;
    const costBasis = h.avgCost * h.shares;
    const gain = marketValue - costBasis;
    const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

    return {
      ...h,
      currentPrice,
      marketValue,
      gain,
      gainPercent,
      dayChange: quote?.change || 0,
      dayChangePercent: quote?.changePercent || 0,
      allocation: 0,
    };
  });

  const totalValue = holdingsWithQuotes.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCost = holdingsWithQuotes.reduce((sum, h) => sum + h.avgCost * h.shares, 0);

  // Calculate allocation percentages
  for (const h of holdingsWithQuotes) {
    h.allocation = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
  }

  return {
    totalValue,
    totalCost,
    totalGain: totalValue - totalCost,
    totalGainPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    holdings: holdingsWithQuotes,
    loading,
    isMock,
  };
}

export function useNews(query?: string, category?: string) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return { articles, loading, refetch: fetchNews };
}
