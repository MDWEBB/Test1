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
const FAILURE_RESET_TIME = 60_000; // Reset failure count after 1 minute

const cache: Record<string, CacheEntry> = {};
let globalFailCount = 0;
let lastFailureTime = 0;
// Track active fetches per ticker set to avoid race conditions
const activeFetches: Record<string, Promise<CacheEntry | null>> = {};

async function fetchStockData(tickersKey: string): Promise<CacheEntry | null> {
  // Return cached data if fresh
  const cached = cache[tickersKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }

  // Reset failure count if enough time has passed since last failure
  if (globalFailCount >= MAX_FAILURES && Date.now() - lastFailureTime > FAILURE_RESET_TIME) {
    globalFailCount = 0;
  }

  // Too many failures — return cached data if available, but still attempt fetch
  // for new ticker sets (don't return null, as that leaves UI with no data)
  const shouldSkipFetch = globalFailCount >= MAX_FAILURES && cached;
  if (shouldSkipFetch) {
    return cached;
  }

  // If a fetch is already in flight for this ticker set, wait for it
  const existingFetch = activeFetches[tickersKey];
  if (existingFetch) {
    return existingFetch;
  }

  activeFetches[tickersKey] = (async () => {
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
        lastFailureTime = Date.now();
      } else {
        globalFailCount = 0;
      }
      return entry;
    } catch {
      globalFailCount++;
      lastFailureTime = Date.now();
      return cache[tickersKey] || null;
    } finally {
      delete activeFetches[tickersKey];
    }
  })();

  return activeFetches[tickersKey];
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

// ─── Stock history (for line charts) ────────────────────────────────

export interface HistoryPoint {
  date: string;
  timestamp: number;
  close: number;
}

export interface StockHistory {
  ticker: string;
  history: HistoryPoint[];
}

// Module-level cache for history data
const historyCache: Record<string, { data: StockHistory[]; timestamp: number }> = {};
const HISTORY_CACHE_TTL = 300_000; // 5 minutes

async function fetchHistoryData(symbols: string, range: string): Promise<StockHistory[]> {
  const cacheKey = `${symbols}_${range}`;
  const cached = historyCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`/api/history?symbols=${symbols}&range=${range}`);
    const json = await res.json();
    const data: StockHistory[] = json.data || [];
    historyCache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  } catch {
    return cached?.data || [];
  }
}

// ─── Fundamentals (P/E, analyst targets, etc.) ─────────────────────

export interface FundamentalData {
  ticker: string;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  dividendYield: number | null;
  trailingAnnualDividendYield: number | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  recommendationKey: string | null;
  recommendationMean: number | null;
  numberOfAnalystOpinions: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  beta: number | null;
  shortPercentOfFloat: number | null;
}

const fundCacheMap: Record<string, { data: Record<string, FundamentalData>; timestamp: number }> = {};
const FUND_CACHE_TTL = 300_000; // 5 minutes

async function fetchFundData(symbolsKey: string): Promise<Record<string, FundamentalData>> {
  const cached = fundCacheMap[symbolsKey];
  if (cached && Date.now() - cached.timestamp < FUND_CACHE_TTL) {
    return cached.data;
  }
  try {
    const res = await fetch(`/api/fundamentals?symbols=${symbolsKey}`);
    const json = await res.json();
    const map: Record<string, FundamentalData> = {};
    for (const item of json.data || []) {
      map[item.ticker] = item;
    }
    fundCacheMap[symbolsKey] = { data: map, timestamp: Date.now() };
    return map;
  } catch {
    return cached?.data || {};
  }
}

export function useFundamentals(tickers: string[]) {
  const [data, setData] = useState<Record<string, FundamentalData>>({});
  const [loading, setLoading] = useState(false);
  const tickersKey = tickers.join(",");
  const lastSnapshot = useRef("");

  useEffect(() => {
    if (!tickersKey) { setData({}); return; }
    let cancelled = false;
    setLoading(true);
    fetchFundData(tickersKey).then((result) => {
      if (cancelled) return;
      const snap = JSON.stringify(result);
      if (snap !== lastSnapshot.current) {
        lastSnapshot.current = snap;
        setData(result);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [tickersKey]);

  return { fundamentals: data, loading };
}

// ─── Technical indicators (calculated from price history) ───────────

export function calculateRSI(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Smoothed RSI using all remaining data points
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Compute a composite score (0-100) from fundamentals + technicals
export interface CompositeScore {
  total: number;
  value: number;
  momentum: number;
  quality: number;
  analystSentiment: number;
  signals: string[];
}

export function computeCompositeScore(
  quote: StockQuote,
  fund: FundamentalData | undefined,
  rsi?: number | null,
): CompositeScore {
  const signals: string[] = [];
  let valueScore = 50;
  let momentumScore = 50;
  let qualityScore = 50;
  let analystScore = 50;

  if (fund) {
    // ── Value scoring ──
    if (fund.forwardPE != null && fund.forwardPE > 0) {
      if (fund.forwardPE < 12) { valueScore += 20; signals.push("Low forward P/E (<12)"); }
      else if (fund.forwardPE < 18) { valueScore += 10; signals.push("Moderate forward P/E"); }
      else if (fund.forwardPE > 35) { valueScore -= 15; signals.push("High forward P/E (>35)"); }
    }
    if (fund.pegRatio != null && fund.pegRatio > 0) {
      if (fund.pegRatio < 1) { valueScore += 15; signals.push("PEG < 1 (undervalued vs growth)"); }
      else if (fund.pegRatio < 1.5) { valueScore += 5; }
      else if (fund.pegRatio > 3) { valueScore -= 10; signals.push("High PEG ratio (>3)"); }
    }
    if (fund.priceToBook != null && fund.priceToBook > 0) {
      if (fund.priceToBook < 1.5) { valueScore += 10; signals.push("Low price-to-book"); }
      else if (fund.priceToBook > 10) { valueScore -= 5; }
    }
    if (fund.targetMeanPrice != null && quote.price > 0) {
      const upside = ((fund.targetMeanPrice - quote.price) / quote.price) * 100;
      if (upside > 20) { valueScore += 15; signals.push(`Analyst target ${upside.toFixed(0)}% above price`); }
      else if (upside > 10) { valueScore += 8; signals.push(`Analyst target ${upside.toFixed(0)}% above price`); }
      else if (upside < -10) { valueScore -= 10; signals.push("Analyst target below current price"); }
    }

    // ── Momentum scoring ──
    if (fund.fiftyDayAverage != null && quote.price > 0) {
      const pctAbove50 = ((quote.price - fund.fiftyDayAverage) / fund.fiftyDayAverage) * 100;
      if (pctAbove50 > 3) { momentumScore += 15; signals.push("Price above 50-day MA"); }
      else if (pctAbove50 < -5) { momentumScore -= 10; signals.push("Price below 50-day MA"); }
    }
    if (fund.twoHundredDayAverage != null && quote.price > 0) {
      const pctAbove200 = ((quote.price - fund.twoHundredDayAverage) / fund.twoHundredDayAverage) * 100;
      if (pctAbove200 > 5) { momentumScore += 15; signals.push("Price above 200-day MA"); }
      else if (pctAbove200 < -10) { momentumScore -= 15; signals.push("Price well below 200-day MA"); }
    }
    if (fund.fiftyDayAverage != null && fund.twoHundredDayAverage != null) {
      if (fund.fiftyDayAverage > fund.twoHundredDayAverage) {
        momentumScore += 10; signals.push("Golden cross (50MA > 200MA)");
      } else {
        momentumScore -= 10; signals.push("Death cross (50MA < 200MA)");
      }
    }

    // ── Quality scoring ──
    if (fund.earningsGrowth != null) {
      if (fund.earningsGrowth > 0.15) { qualityScore += 20; signals.push(`Earnings growth ${(fund.earningsGrowth * 100).toFixed(0)}%`); }
      else if (fund.earningsGrowth > 0) { qualityScore += 10; }
      else { qualityScore -= 10; signals.push("Negative earnings growth"); }
    }
    if (fund.revenueGrowth != null) {
      if (fund.revenueGrowth > 0.10) { qualityScore += 10; signals.push(`Revenue growth ${(fund.revenueGrowth * 100).toFixed(0)}%`); }
      else if (fund.revenueGrowth < -0.05) { qualityScore -= 10; }
    }
    if (fund.returnOnEquity != null) {
      if (fund.returnOnEquity > 0.20) { qualityScore += 10; signals.push("Strong return on equity (>20%)"); }
      else if (fund.returnOnEquity < 0) { qualityScore -= 10; }
    }
    if (fund.profitMargin != null) {
      if (fund.profitMargin > 0.20) { qualityScore += 5; }
      else if (fund.profitMargin < 0) { qualityScore -= 10; signals.push("Negative profit margin"); }
    }

    // ── Analyst sentiment ──
    if (fund.recommendationMean != null) {
      if (fund.recommendationMean <= 2) { analystScore += 20; signals.push(`Analyst consensus: ${fund.recommendationKey || "buy"}`); }
      else if (fund.recommendationMean <= 2.5) { analystScore += 10; signals.push(`Analyst consensus: ${fund.recommendationKey || "buy"}`); }
      else if (fund.recommendationMean >= 4) { analystScore -= 20; signals.push(`Analyst consensus: ${fund.recommendationKey || "sell"}`); }
      else { signals.push(`Analyst consensus: ${fund.recommendationKey || "hold"}`); }
    }

    if (fund.dividendYield != null && fund.dividendYield > 0.03) {
      qualityScore += 5; signals.push(`Dividend yield ${(fund.dividendYield * 100).toFixed(1)}%`);
    }
  }

  // RSI
  if (rsi != null) {
    if (rsi < 30) { momentumScore += 15; signals.push(`RSI oversold (${rsi.toFixed(0)})`); }
    else if (rsi > 70) { momentumScore -= 10; signals.push(`RSI overbought (${rsi.toFixed(0)})`); }
  }

  // 52-week range position
  if (quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekHigh > quote.fiftyTwoWeekLow) {
    const position = (quote.price - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow);
    if (position < 0.25) { valueScore += 10; }
    else if (position > 0.9) { valueScore -= 5; }
  }

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  valueScore = clamp(valueScore);
  momentumScore = clamp(momentumScore);
  qualityScore = clamp(qualityScore);
  analystScore = clamp(analystScore);

  // Weighted: value 30%, momentum 25%, quality 25%, analyst 20%
  const total = clamp(
    valueScore * 0.30 + momentumScore * 0.25 + qualityScore * 0.25 + analystScore * 0.20
  );

  return { total, value: valueScore, momentum: momentumScore, quality: qualityScore, analystSentiment: analystScore, signals };
}

export function useStockHistory(tickers: string[], range = "3mo") {
  const [data, setData] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const tickersKey = tickers.join(",");
  const lastSnapshot = useRef("");

  useEffect(() => {
    if (!tickersKey) {
      setData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchHistoryData(tickersKey, range).then((result) => {
      if (cancelled) return;
      const snap = JSON.stringify(result);
      if (snap !== lastSnapshot.current) {
        lastSnapshot.current = snap;
        setData(result);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tickersKey, range]);

  return { data, loading };
}
