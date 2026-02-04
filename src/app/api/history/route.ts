import { NextRequest, NextResponse } from "next/server";

// ─── Server-side cache for history data ─────────────────────────────
interface HistoryCache {
  body: string;
  timestamp: number;
}

const historyCache: Record<string, HistoryCache> = {};
const CACHE_TTL = 300_000; // 5 minutes — historical data doesn't change fast

interface PricePoint {
  date: string; // YYYY-MM-DD
  timestamp: number;
  close: number;
}

async function fetchHistory(symbol: string, range: string, interval: string): Promise<PricePoint[]> {
  const domains = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];

  for (const domain of domains) {
    try {
      const url = `https://${domain}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;

      const timestamps: number[] = result.timestamp || [];
      const closes: number[] = result.indicators?.quote?.[0]?.close || [];

      const points: PricePoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] != null) {
          const d = new Date(timestamps[i] * 1000);
          points.push({
            date: d.toISOString().split("T")[0],
            timestamp: timestamps[i],
            close: Math.round(closes[i] * 100) / 100,
          });
        }
      }
      return points;
    } catch {
      continue;
    }
  }

  return [];
}

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  const range = request.nextUrl.searchParams.get("range") || "3mo";

  if (!symbols) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  // Map range to appropriate interval
  const intervalMap: Record<string, string> = {
    "1mo": "1d",
    "3mo": "1d",
    "6mo": "1d",
    "1y": "1wk",
    "2y": "1wk",
    "5y": "1mo",
  };
  const interval = intervalMap[range] || "1d";

  const cacheKey = `${symbols.toUpperCase()}_${range}`;
  const cached = historyCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tickers = symbols.split(",").map((s) => s.trim().toUpperCase());
  const results = await Promise.all(
    tickers.map(async (ticker) => ({
      ticker,
      history: await fetchHistory(ticker, range, interval),
    }))
  );

  const responseBody = JSON.stringify({ data: results });
  historyCache[cacheKey] = { body: responseBody, timestamp: Date.now() };

  return new NextResponse(responseBody, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
