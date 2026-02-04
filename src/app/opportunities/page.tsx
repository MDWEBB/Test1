"use client";

import { useState, useMemo } from "react";
import { useStockQuotes, useNews } from "@/lib/hooks";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency, formatPercent, formatNumber, gainColor, gainBg } from "@/lib/format";
import { NewsArticle } from "@/lib/types";

const POPULAR_TICKERS = [
  // US stocks (available on Stake)
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  "JPM", "V", "JNJ", "WMT",
  "VOO", "VTI", "QQQ", "SCHD", "SPY",
  // ASX stocks & ETFs (Yahoo Finance uses .AX suffix)
  "CBA.AX", "BHP.AX", "CSL.AX", "NAB.AX", "WBC.AX",
  "VAS.AX", "A200.AX", "VGS.AX", "NDQ.AX", "VDHG.AX",
];

// Beginner-friendly picks with reasons
const BEGINNER_PICKS = [
  {
    ticker: "VAS.AX",
    name: "Vanguard Australian Shares",
    market: "ASX" as const,
    reason: "Tracks the ASX 300 — instant diversification across all major Australian companies. Low fees (0.07%).",
  },
  {
    ticker: "A200.AX",
    name: "BetaShares ASX 200",
    market: "ASX" as const,
    reason: "Tracks the ASX 200 at Australia's lowest fee (0.04%). Great core Australian holding.",
  },
  {
    ticker: "VGS.AX",
    name: "Vanguard Intl Shares",
    market: "ASX" as const,
    reason: "1,500+ international stocks in one ETF. Gives you global exposure outside Australia.",
  },
  {
    ticker: "VDHG.AX",
    name: "Vanguard Diversified High Growth",
    market: "ASX" as const,
    reason: "All-in-one fund: 90% growth / 10% defensive. Auto-rebalances. Perfect for set-and-forget.",
  },
  {
    ticker: "DHHF.AX",
    name: "BetaShares Diversified All Growth",
    market: "ASX" as const,
    reason: "100% equities all-in-one. Lower fees than VDHG. Good for long time horizons (10+ years).",
  },
  {
    ticker: "VOO",
    name: "Vanguard S&P 500",
    market: "US" as const,
    reason: "Tracks the 500 largest US companies. Warren Buffett's recommendation for most investors.",
  },
  {
    ticker: "VTI",
    name: "Vanguard Total US Market",
    market: "US" as const,
    reason: "Broader than VOO — includes mid and small caps too. One fund for the entire US market.",
  },
  {
    ticker: "QQQ",
    name: "Invesco NASDAQ 100",
    market: "US" as const,
    reason: "Tech-heavy growth ETF. Higher risk but strong long-term returns. Good as a satellite holding.",
  },
];

function tickerCurrency(ticker: string): "AUD" | "USD" {
  return ticker.endsWith(".AX") ? "AUD" : "USD";
}

export default function OpportunitiesPage() {
  const { holdings, watchlist, addToWatchlist, removeFromWatchlist } = usePortfolio();
  const [customTicker, setCustomTicker] = useState("");
  const [tab, setTab] = useState<"value" | "movers" | "beginner">("value");

  const holdingTickers = holdings.map((h) =>
    h.market === "ASX" ? `${h.ticker}.AX` : h.ticker
  );
  const allTickers = [...new Set([...POPULAR_TICKERS, ...watchlist, ...holdingTickers])];
  const { quotes, loading, isMock } = useStockQuotes(allTickers, 300000);

  const watchlistQuotes = watchlist
    .map((t) => quotes[t])
    .filter(Boolean);

  // Biggest daily movers (by absolute % change)
  const bigMovers = Object.values(quotes)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 10);

  // Stocks near 52-week low — potential deep value
  const nearLow = Object.values(quotes)
    .filter((q) => q.fiftyTwoWeekLow && q.price > 0)
    .map((q) => ({
      ...q,
      distFromLow: ((q.price - (q.fiftyTwoWeekLow || q.price)) / (q.fiftyTwoWeekLow || q.price)) * 100,
    }))
    .sort((a, b) => a.distFromLow - b.distFromLow)
    .slice(0, 8);

  // Stocks discounted from 52-week high — beaten down from peak
  const discountedFromPeak = Object.values(quotes)
    .filter((q) => q.fiftyTwoWeekHigh && q.price > 0)
    .map((q) => {
      const high = q.fiftyTwoWeekHigh || q.price;
      const discount = ((high - q.price) / high) * 100;
      return { ...q, discount, high };
    })
    .filter((q) => q.discount >= 5) // at least 5% below peak
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 10);

  // Fetch news for the value-tab tickers so we can show context
  const valueTickers = useMemo(() => {
    const tickers = [
      ...discountedFromPeak.map((q) => q.ticker),
      ...nearLow.map((q) => q.ticker),
    ];
    // Build search query from ticker symbols and company names
    const names = [...discountedFromPeak, ...nearLow].map((q) =>
      q.name.split(" ")[0].toLowerCase()
    );
    return [...new Set([...tickers.map((t) => t.replace(".AX", "").toLowerCase()), ...names])].join(",");
  }, [discountedFromPeak, nearLow]);

  const { articles: valueNews } = useNews(valueTickers || undefined);

  // Match news articles to a specific ticker
  function getNewsForTicker(ticker: string, name: string): NewsArticle[] {
    const cleanTicker = ticker.replace(".AX", "").toLowerCase();
    const firstName = name.split(" ")[0].toLowerCase();
    return valueNews.filter((a) => {
      const text = `${a.title} ${a.description}`.toLowerCase();
      return text.includes(cleanTicker) || (firstName.length > 3 && text.includes(firstName));
    }).slice(0, 2);
  }

  // Generate a simple outlook based on position in 52-week range
  function getOutlook(price: number, low: number | undefined, high: number | undefined): { label: string; color: string; detail: string } {
    if (!low || !high || high <= low) return { label: "N/A", color: "text-zinc-500", detail: "" };
    const range = high - low;
    const position = (price - low) / range; // 0 = at low, 1 = at high

    if (position < 0.15) return {
      label: "Deep Value",
      color: "text-red-400",
      detail: "Trading in the bottom 15% of its 52-week range. High risk, potentially high reward if fundamentals are solid.",
    };
    if (position < 0.35) return {
      label: "Potential Value",
      color: "text-amber-400",
      detail: "Trading in the lower third of its range. May be oversold — check recent earnings and news for why.",
    };
    if (position < 0.55) return {
      label: "Mid-Range",
      color: "text-zinc-400",
      detail: "Trading near the middle of its 52-week range. Fair pricing unless a catalyst changes the outlook.",
    };
    return {
      label: "Near Highs",
      color: "text-emerald-400",
      detail: "Trading near the upper range. Momentum is positive but less room for upside.",
    };
  }

  function handleAddWatchlist() {
    if (customTicker.trim()) {
      addToWatchlist(customTicker.trim());
      setCustomTicker("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Opportunities</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Find undervalued stocks, track your watchlist, and explore beginner-friendly investments.
        </p>
        {isMock && (
          <span className="mt-2 inline-block rounded-full bg-yellow-400/10 px-3 py-1 text-xs text-yellow-400">
            Using sample data
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
        {[
          { id: "value" as const, label: "Value & Underpriced" },
          { id: "movers" as const, label: "Today's Movers" },
          { id: "beginner" as const, label: "Beginner Picks" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Watchlist (always visible) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 font-semibold text-white">Watchlist</h2>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={customTicker}
            onChange={(e) => setCustomTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddWatchlist()}
            placeholder="e.g. AAPL or CBA.AX"
            className="w-48 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleAddWatchlist}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Add
          </button>
        </div>
        {watchlistQuotes.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {watchlistQuotes.map((q) => (
              <div
                key={q.ticker}
                className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2"
              >
                <div>
                  <span className="font-medium text-white">{q.ticker}</span>
                  <p className="text-xs text-zinc-400">{q.name}</p>
                  <span className="text-sm text-zinc-300">
                    {formatCurrency(q.price, tickerCurrency(q.ticker))}
                  </span>
                  <span className={`ml-2 text-xs ${gainColor(q.changePercent)}`}>
                    {formatPercent(q.changePercent)}
                  </span>
                </div>
                <button
                  onClick={() => removeFromWatchlist(q.ticker)}
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-700 hover:text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Your watchlist is empty. Add tickers above to track potential investments.
          </p>
        )}
      </div>

      {/* ── VALUE TAB ── */}
      {tab === "value" && (
        <>
          {/* Discounted from Peak */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="mb-1 font-semibold text-white">Discounted from Peak</h2>
            <p className="mb-3 text-xs text-zinc-400">
              Stocks trading well below their 52-week high with news context and outlook.
              Do your own research before buying dips.
            </p>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
              </div>
            ) : discountedFromPeak.length > 0 ? (
              <div className="space-y-3">
                {discountedFromPeak.map((q) => {
                  const news = getNewsForTicker(q.ticker, q.name);
                  const outlook = getOutlook(q.price, q.fiftyTwoWeekLow, q.fiftyTwoWeekHigh);

                  return (
                    <div
                      key={q.ticker}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{q.ticker}</span>
                            <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-xs font-medium text-red-400">
                              -{q.discount.toFixed(1)}% from peak
                            </span>
                            <span className={`text-xs font-medium ${outlook.color}`}>
                              {outlook.label}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">{q.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-zinc-200">
                            {formatCurrency(q.price, tickerCurrency(q.ticker))}
                          </p>
                          <p className={`text-xs ${gainColor(q.changePercent)}`}>
                            {formatPercent(q.changePercent)} today
                          </p>
                        </div>
                      </div>

                      {/* Price range bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>52W Low: {formatCurrency(q.fiftyTwoWeekLow || 0, tickerCurrency(q.ticker))}</span>
                          <span>52W High: {formatCurrency(q.high, tickerCurrency(q.ticker))}</span>
                        </div>
                        <div className="relative mt-1 h-2 rounded-full bg-zinc-700">
                          {q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && q.fiftyTwoWeekHigh > q.fiftyTwoWeekLow && (
                            <div
                              className="absolute top-0 h-2 w-2 rounded-full bg-amber-400"
                              style={{
                                left: `${Math.min(100, Math.max(0, ((q.price - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow)) * 100))}%`,
                                transform: "translateX(-50%)",
                              }}
                            />
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-600">{outlook.detail}</p>
                      </div>

                      {/* Related news */}
                      {news.length > 0 && (
                        <div className="mt-3 border-t border-zinc-700/50 pt-2">
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                            Recent News
                          </p>
                          {news.map((article, i) => (
                            <a
                              key={i}
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block text-xs text-zinc-400 hover:text-emerald-400"
                            >
                              {article.title}
                              <span className="ml-1 text-zinc-600">— {article.source}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {news.length === 0 && (
                        <div className="mt-3 border-t border-zinc-700/50 pt-2">
                          <p className="text-[10px] text-zinc-600">
                            No specific news found. Check broader market conditions — drops may be driven by sector rotation, interest rates, or macroeconomic trends.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No significantly discounted stocks found.</p>
            )}
          </div>

          {/* Near 52-Week Low */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="mb-1 font-semibold text-white">Near 52-Week Lows</h2>
            <p className="mb-3 text-xs text-zinc-400">
              Stocks trading closest to their 52-week low with context on why they&apos;re down.
            </p>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
              </div>
            ) : nearLow.length > 0 ? (
              <div className="space-y-3">
                {nearLow.map((q) => {
                  const news = getNewsForTicker(q.ticker, q.name);
                  const outlook = getOutlook(q.price, q.fiftyTwoWeekLow, q.fiftyTwoWeekHigh);

                  return (
                    <div
                      key={q.ticker}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{q.ticker}</span>
                            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                              +{q.distFromLow.toFixed(1)}% from low
                            </span>
                            <span className={`text-xs font-medium ${outlook.color}`}>
                              {outlook.label}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">{q.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-zinc-200">
                            {formatCurrency(q.price, tickerCurrency(q.ticker))}
                          </p>
                          <p className={`text-xs ${gainColor(q.changePercent)}`}>
                            {formatPercent(q.changePercent)} today
                          </p>
                        </div>
                      </div>

                      {/* Price context */}
                      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                        <span>Low: <span className="text-red-400">{formatCurrency(q.fiftyTwoWeekLow || 0, tickerCurrency(q.ticker))}</span></span>
                        <span>High: <span className="text-emerald-400">{formatCurrency(q.fiftyTwoWeekHigh || 0, tickerCurrency(q.ticker))}</span></span>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-600">{outlook.detail}</p>

                      {/* Related news */}
                      {news.length > 0 && (
                        <div className="mt-2 border-t border-zinc-700/50 pt-2">
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                            Why it&apos;s down
                          </p>
                          {news.map((article, i) => (
                            <a
                              key={i}
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block text-xs text-zinc-400 hover:text-emerald-400"
                            >
                              {article.title}
                              <span className="ml-1 text-zinc-600">— {article.source}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {news.length === 0 && (
                        <p className="mt-2 text-[10px] text-zinc-600">
                          No specific news found. The drop may be sector-wide or driven by broader economic factors.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No data available.</p>
            )}
          </div>
        </>
      )}

      {/* ── MOVERS TAB ── */}
      {tab === "movers" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 font-semibold text-white">Biggest Movers Today</h2>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {bigMovers.map((q) => (
                <div
                  key={q.ticker}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{q.ticker}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${gainBg(q.changePercent)}`}
                    >
                      {formatPercent(q.changePercent)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-300">
                    {formatCurrency(q.price, tickerCurrency(q.ticker))}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Vol: {formatNumber(q.volume)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BEGINNER PICKS TAB ── */}
      {tab === "beginner" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-800/50 bg-emerald-900/10 p-4">
            <h2 className="mb-2 font-semibold text-emerald-400">Getting Started with $100/month</h2>
            <p className="text-sm text-zinc-300">
              With a small monthly budget, the simplest approach is to pick <strong>one or two broad ETFs</strong> and
              buy consistently each month (dollar-cost averaging). This removes the need to time the market and
              gives instant diversification across hundreds of companies.
            </p>
            <div className="mt-3 space-y-1 text-xs text-zinc-400">
              <p><strong className="text-zinc-300">Simple option:</strong> VDHG or DHHF — one ETF that covers everything (Australian + international stocks + bonds).</p>
              <p><strong className="text-zinc-300">Split option:</strong> A200 or VAS (Australian) + VGS (international) in a 40/60 or 50/50 split.</p>
              <p><strong className="text-zinc-300">US exposure via Stake:</strong> VOO or VTI for broad US market, or QQQ for tech-heavy growth.</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="mb-3 font-semibold text-white">Recommended Beginner ETFs</h2>
            <div className="space-y-3">
              {BEGINNER_PICKS.map((pick) => {
                const q = quotes[pick.ticker];
                return (
                  <div
                    key={pick.ticker}
                    className="flex items-start justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{pick.ticker.replace(".AX", "")}</span>
                        <span
                          className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                            pick.market === "ASX"
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-blue-400/10 text-blue-400"
                          }`}
                        >
                          {pick.market}
                        </span>
                        {q && (
                          <span className="text-sm text-zinc-300">
                            {formatCurrency(q.price, pick.market === "ASX" ? "AUD" : "USD")}
                          </span>
                        )}
                        {q && (
                          <span className={`text-xs ${gainColor(q.changePercent)}`}>
                            {formatPercent(q.changePercent)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{pick.name}</p>
                      <p className="mt-1 text-sm text-zinc-400">{pick.reason}</p>
                    </div>
                    {!watchlist.includes(pick.ticker) ? (
                      <button
                        onClick={() => addToWatchlist(pick.ticker)}
                        className="ml-3 shrink-0 rounded-lg border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:border-emerald-500 hover:text-emerald-400"
                      >
                        + Watch
                      </button>
                    ) : (
                      <span className="ml-3 shrink-0 rounded-lg bg-emerald-600/10 px-3 py-1 text-xs text-emerald-400">
                        Watching
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="mb-2 font-semibold text-white">Tips for New Investors</h2>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><strong className="text-zinc-300">Start simple.</strong> One all-in-one ETF (VDHG or DHHF) is better than picking 10 individual stocks when starting out.</li>
              <li><strong className="text-zinc-300">Be consistent.</strong> Invest the same amount each month regardless of market conditions. This is called dollar-cost averaging.</li>
              <li><strong className="text-zinc-300">Think long-term.</strong> The stock market goes up and down. Short-term drops are normal. What matters is where it is in 10-20 years.</li>
              <li><strong className="text-zinc-300">Fees matter.</strong> ETFs with lower management fees (0.04-0.20%) keep more money in your pocket over time.</li>
              <li><strong className="text-zinc-300">Diversify.</strong> Don&apos;t put all your money in one stock or one country. Broad ETFs do this automatically.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
