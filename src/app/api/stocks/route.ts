import { NextRequest, NextResponse } from "next/server";

interface YahooQuoteResult {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get("tickers");

  if (!tickers) {
    return NextResponse.json({ error: "tickers parameter required" }, { status: 400 });
  }

  const symbols = tickers.split(",").map((t) => t.trim().toUpperCase());

  try {
    // Yahoo Finance uses .AX suffix for ASX-listed stocks
    const yahooSymbols = symbols.map((s) => s);
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbols.join(",")}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance API returned ${res.status}`);
    }

    const data = await res.json();
    const results = (data.quoteResponse?.result || []).map((q: YahooQuoteResult) => ({
      ticker: q.symbol || "",
      name: q.shortName || q.longName || q.symbol || "",
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
      dayHigh: q.regularMarketDayHigh || 0,
      dayLow: q.regularMarketDayLow || 0,
      volume: q.regularMarketVolume || 0,
      marketCap: q.marketCap,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    }));

    return NextResponse.json({ quotes: results });
  } catch (error) {
    console.error("Stock API error:", error);
    // Return mock data as fallback so the app is still usable
    const mockQuotes = symbols.map((s) => ({
      ticker: s,
      name: s,
      price: 100 + Math.random() * 200,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      dayHigh: 150 + Math.random() * 100,
      dayLow: 90 + Math.random() * 50,
      volume: Math.floor(Math.random() * 10000000),
      marketCap: Math.floor(Math.random() * 1000000000000),
    }));
    return NextResponse.json({ quotes: mockQuotes, isMock: true });
  }
}
