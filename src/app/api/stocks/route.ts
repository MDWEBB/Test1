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

async function fetchQuoteViaChart(symbol: string): Promise<YahooChartMeta | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return meta as YahooChartMeta;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get("tickers");

  if (!tickers) {
    return NextResponse.json({ error: "tickers parameter required" }, { status: 400 });
  }

  const symbols = tickers.split(",").map((t) => t.trim().toUpperCase());

  try {
    // Fetch each symbol via the v8 chart endpoint (still works without auth)
    const chartResults = await Promise.all(symbols.map(fetchQuoteViaChart));

    const quotes = symbols.map((symbol, i) => {
      const meta = chartResults[i];
      if (!meta) return null;

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

    const validQuotes = quotes.filter(Boolean);

    if (validQuotes.length > 0) {
      return NextResponse.json({ quotes: validQuotes });
    }

    throw new Error("No valid quotes returned");
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
