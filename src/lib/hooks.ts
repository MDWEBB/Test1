"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StockQuote, NewsArticle, HoldingWithQuote, PortfolioSummary } from "./types";
import { usePortfolio } from "./portfolio-context";

// ─── Module-level stock cache (lives OUTSIDE React) ────────────────
// This cache is immune to React re-renders, strict mode double-mounts,
// and any other React lifecycle quirks. Network requests only happen
// when the cache is stale (>30 seconds old).

interface CacheEntry {
  quotes: Record<string, StockQuote>;
  isMock: boolean;
  timestamp: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const POLL_INTERVAL = 300_000; // 5 minutes
const MAX_FAILURES = 3;

const cache: Record<string, CacheEntry> = {};
let globalFailCount = 0;
let activeFetch: Promise<CacheEntry | null> | null = null;

async function fetchStockData(tickersKey: string): Promise<CacheEntry | null> {
  // Return cached data if fresh
  const cached = cache[tickersKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }

  // Too many failures — stop trying
  if (globalFailCount >= MAX_FAILURES) {
    return cached || null;
  }

  // If a fetch is already in flight, wait for it instead of starting another
  if (activeFetch) {
    return activeFetch;
  }

  activeFetch = (async () => {
    try {
      const res = await fetch(`/api/stocks?tickers=${tickersKey}`);
      const data = await res.json();
      const map: Record<string, StockQuote> = {};
      for (const q of data.quotes || []) {
        map[q.ticker] = q;
      }
      const entry: CacheEntry = {
        quotes: map,
        isMock: !!data.isMock,
        timestamp: Date.now(),
      };
      cache[tickersKey] = entry;
      if (data.isMock) {
        globalFailCount++;
      } else {
        globalFailCount = 0;
      }
      return entry;
    } catch {
      globalFailCount++;
      return cache[tickersKey] || null;
    } finally {
      activeFetch = null;
    }
  })();

  return activeFetch;
}

// ─── React hook (thin wrapper around the cache) ─────────────────────

export function useStockQuotes(tickers: string[], refreshInterval = POLL_INTERVAL) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  // Track last data snapshot to avoid unnecessary state updates / re-renders
  const lastSnapshot = useRef("");
  const tickersKey = tickers.join(",");

  useEffect(() => {
    if (!tickersKey) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const entry = await fetchStockData(tickersKey);
      if (cancelled) return;
      if (entry) {
        // Only update state if the data actually changed — this breaks
        // any render loop that feeds back through useEffect.
        const snapshot = JSON.stringify(entry.quotes);
        if (snapshot !== lastSnapshot.current) {
          lastSnapshot.current = snapshot;
          setQuotes(entry.quotes);
          setIsMock(entry.isMock);
        }
      }
      setLoading(false);
    }

    load();
    const interval = setInterval(load, refreshInterval);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tickersKey, refreshInterval]);

  return { quotes, loading, isMock };
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
