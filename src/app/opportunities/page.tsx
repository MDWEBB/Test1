"use client";

import { useState } from "react";
import { useStockQuotes } from "@/lib/hooks";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency, formatPercent, formatNumber, gainColor, gainBg } from "@/lib/format";

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
              Stocks trading well below their 52-week high. These have fallen from their peaks and may be undervalued
              — or may have further to fall. Do your own research before buying dips.
            </p>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
              </div>
            ) : discountedFromPeak.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-zinc-500">
                      <th className="px-3 py-2 font-medium">Ticker</th>
                      <th className="px-3 py-2 font-medium text-right">Price</th>
                      <th className="px-3 py-2 font-medium text-right">52W High</th>
                      <th className="px-3 py-2 font-medium text-right">Discount</th>
                      <th className="px-3 py-2 font-medium text-right">52W Low</th>
                      <th className="px-3 py-2 font-medium text-right">Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discountedFromPeak.map((q) => (
                      <tr
                        key={q.ticker}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                      >
                        <td className="px-3 py-2 font-medium text-white">
                          {q.ticker}
                          <p className="text-xs font-normal text-zinc-500">{q.name}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-300">
                          {formatCurrency(q.price, tickerCurrency(q.ticker))}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-400">
                          {formatCurrency(q.high, tickerCurrency(q.ticker))}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-xs font-medium text-red-400">
                            -{q.discount.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-500">
                          {formatCurrency(q.fiftyTwoWeekLow || 0, tickerCurrency(q.ticker))}
                        </td>
                        <td className={`px-3 py-2 text-right ${gainColor(q.changePercent)}`}>
                          {formatPercent(q.changePercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No significantly discounted stocks found.</p>
            )}
          </div>

          {/* Near 52-Week Low */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="mb-1 font-semibold text-white">Near 52-Week Lows</h2>
            <p className="mb-3 text-xs text-zinc-400">
              Stocks trading closest to their 52-week low. Can signal deep value if fundamentals are intact,
              or a warning sign if the business is deteriorating.
            </p>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
              </div>
            ) : nearLow.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-zinc-500">
                      <th className="px-3 py-2 font-medium">Ticker</th>
                      <th className="px-3 py-2 font-medium text-right">Price</th>
                      <th className="px-3 py-2 font-medium text-right">52W Low</th>
                      <th className="px-3 py-2 font-medium text-right">52W High</th>
                      <th className="px-3 py-2 font-medium text-right">% From Low</th>
                      <th className="px-3 py-2 font-medium text-right">Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nearLow.map((q) => (
                      <tr
                        key={q.ticker}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                      >
                        <td className="px-3 py-2 font-medium text-white">
                          {q.ticker}
                          <p className="text-xs font-normal text-zinc-500">{q.name}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-300">
                          {formatCurrency(q.price, tickerCurrency(q.ticker))}
                        </td>
                        <td className="px-3 py-2 text-right text-red-400">
                          {formatCurrency(q.fiftyTwoWeekLow || 0, tickerCurrency(q.ticker))}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-400">
                          {formatCurrency(q.fiftyTwoWeekHigh || 0, tickerCurrency(q.ticker))}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-300">
                          +{q.distFromLow.toFixed(1)}%
                        </td>
                        <td className={`px-3 py-2 text-right ${gainColor(q.changePercent)}`}>
                          {formatPercent(q.changePercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
