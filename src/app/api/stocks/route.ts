import { NextRequest, NextResponse } from "next/server";

interface YahooChartMeta {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

// ─── Server-side in-memory cache ────────────────────────────────────
// Even if the client sends hundreds of requests, we only hit Yahoo
// Finance once per 60 seconds per ticker set.

interface ServerCache {
  body: string;
  timestamp: number;
}

const responseCache: Record<string, ServerCache> = {};
const SERVER_CACHE_TTL = 60_000; // 60 seconds

// Simple hash to generate stable "random-looking" numbers from a string
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Try multiple Yahoo Finance domains and endpoints
async function fetchQuoteViaChart(symbol: string): Promise<YahooChartMeta | null> {
  const domains = [
    "query2.finance.yahoo.com",
    "query1.finance.yahoo.com",
  ];

  for (const domain of domains) {
    try {
      const url = `https://${domain}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta) return meta as YahooChartMeta;
    } catch {
      continue;
    }
  }

  return null;
}

// Helper to generate mock quote for a symbol
function generateMockQuote(symbol: string) {
  const h = stableHash(symbol);
  const basePrice = 50 + (h % 300);
  const change = ((h % 200) - 100) / 20;
  return {
    ticker: symbol,
    name: symbol,
    price: basePrice,
    change,
    changePercent: basePrice > 0 ? (change / basePrice) * 100 : 0,
    dayHigh: basePrice + Math.abs(change),
    dayLow: basePrice - Math.abs(change),
    volume: 1000000 + (h % 9000000),
    marketCap: (h % 900 + 100) * 1e9,
  };
}

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get("tickers");

  if (!tickers) {
    return NextResponse.json({ error: "tickers parameter required" }, { status: 400 });
  }

  // Normalise the cache key
  const cacheKey = tickers.toUpperCase().split(",").sort().join(",");

  // Return cached response if fresh
  const cached = responseCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < SERVER_CACHE_TTL) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const symbols = tickers.split(",").map((t) => t.trim().toUpperCase());

  let responseBody: string;

  try {
    // Fetch each symbol via the v8 chart endpoint
    const chartResults = await Promise.all(symbols.map(fetchQuoteViaChart));

    let hasMock = false;
    const quotes = symbols.map((symbol, i) => {
      const meta = chartResults[i];

      // If Yahoo didn't return data for this symbol, use mock data
      if (!meta) {
        hasMock = true;
        return generateMockQuote(symbol);
      }

      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.chartPreviousClose || price;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return {
        ticker: meta.symbol || symbol,
        name: meta.shortName || meta.longName || symbol,
        price,
        change,
        changePercent,
        dayHigh: meta.regularMarketDayHigh || price,
        dayLow: meta.regularMarketDayLow || price,
        volume: meta.regularMarketVolume || 0,
        marketCap: meta.marketCap,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      };
    });

    responseBody = JSON.stringify({ quotes, isMock: hasMock });
  } catch {
    // Return deterministic mock data so the UI doesn't flicker with random values
    const mockQuotes = symbols.map((s) => generateMockQuote(s));
    responseBody = JSON.stringify({ quotes: mockQuotes, isMock: true });
  }

  // Store in cache
  responseCache[cacheKey] = { body: responseBody, timestamp: Date.now() };

  return new NextResponse(responseBody, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
