import { NextRequest, NextResponse } from "next/server";

// ─── Server-side cache ──────────────────────────────────────────────
interface FundCache {
  body: string;
  timestamp: number;
}

const fundCache: Record<string, FundCache> = {};
const CACHE_TTL = 300_000; // 5 minutes — fundamentals don't change rapidly

// Modules we request from Yahoo Finance quoteSummary
const MODULES = [
  "financialData",
  "defaultKeyStatistics",
  "summaryDetail",
  "recommendationTrend",
  "earningsTrend",
].join(",");

export interface FundamentalData {
  ticker: string;
  // Valuation
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  // Growth & profitability
  earningsGrowth: number | null; // quarterly YoY
  revenueGrowth: number | null;  // quarterly YoY
  profitMargin: number | null;
  returnOnEquity: number | null;
  // Dividends
  dividendYield: number | null;
  trailingAnnualDividendYield: number | null;
  // Analyst consensus
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  recommendationKey: string | null; // "buy", "hold", "sell", etc.
  recommendationMean: number | null; // 1=strong buy, 5=sell
  numberOfAnalystOpinions: number | null;
  // Moving averages (from Yahoo — pre-calculated)
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  // Risk
  beta: number | null;
  shortPercentOfFloat: number | null;
}

async function fetchFundamentals(symbol: string): Promise<FundamentalData | null> {
  const domains = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];

  for (const domain of domains) {
    try {
      const url = `https://${domain}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${MODULES}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.quoteSummary?.result?.[0];
      if (!result) continue;

      const fin = result.financialData || {};
      const stats = result.defaultKeyStatistics || {};
      const summary = result.summaryDetail || {};

      // Helper to extract raw value from Yahoo's { raw, fmt } format
      const raw = (obj: Record<string, unknown> | undefined, key: string): number | null => {
        if (!obj) return null;
        const val = obj[key] as { raw?: number } | undefined;
        return val?.raw ?? null;
      };

      return {
        ticker: symbol,
        trailingPE: raw(summary, "trailingPE"),
        forwardPE: raw(summary, "forwardPE") ?? raw(stats, "forwardPE"),
        pegRatio: raw(stats, "pegRatio"),
        priceToBook: raw(stats, "priceToBook"),
        earningsGrowth: raw(fin, "earningsGrowth"),
        revenueGrowth: raw(fin, "revenueGrowth"),
        profitMargin: raw(fin, "profitMargin"),
        returnOnEquity: raw(fin, "returnOnEquity"),
        dividendYield: raw(summary, "dividendYield"),
        trailingAnnualDividendYield: raw(summary, "trailingAnnualDividendYield"),
        targetMeanPrice: raw(fin, "targetMeanPrice"),
        targetHighPrice: raw(fin, "targetHighPrice"),
        targetLowPrice: raw(fin, "targetLowPrice"),
        recommendationKey: fin.recommendationKey ?? null,
        recommendationMean: raw(fin, "recommendationMean"),
        numberOfAnalystOpinions: raw(fin, "numberOfAnalystOpinions"),
        fiftyDayAverage: raw(summary, "fiftyDayAverage"),
        twoHundredDayAverage: raw(summary, "twoHundredDayAverage"),
        beta: raw(stats, "beta") ?? raw(summary, "beta"),
        shortPercentOfFloat: raw(stats, "shortPercentOfFloat"),
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  const cacheKey = symbols.toUpperCase().split(",").sort().join(",");
  const cached = fundCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tickers = symbols.split(",").map((s) => s.trim().toUpperCase());

  // Fetch in parallel, 5 at a time to be polite to Yahoo
  const results: FundamentalData[] = [];
  for (let i = 0; i < tickers.length; i += 5) {
    const batch = tickers.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(fetchFundamentals));
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  const responseBody = JSON.stringify({ data: results });
  fundCache[cacheKey] = { body: responseBody, timestamp: Date.now() };

  return new NextResponse(responseBody, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
