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

export default function OpportunitiesPage() {
  const { holdings, watchlist, addToWatchlist, removeFromWatchlist } = usePortfolio();
  const [customTicker, setCustomTicker] = useState("");

  const holdingTickers = holdings.map((h) => h.ticker);
  const allTickers = [...new Set([...POPULAR_TICKERS, ...watchlist, ...holdingTickers])];
  const { quotes, loading, isMock } = useStockQuotes(allTickers, 120000);

  const watchlistQuotes = watchlist
    .map((t) => quotes[t])
    .filter(Boolean);

  const bigMovers = Object.values(quotes)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 10);

  const nearLow = Object.values(quotes)
    .filter((q) => q.fiftyTwoWeekLow && q.price > 0)
    .map((q) => ({
      ...q,
      distFromLow: ((q.price - (q.fiftyTwoWeekLow || q.price)) / (q.fiftyTwoWeekLow || q.price)) * 100,
    }))
    .sort((a, b) => a.distFromLow - b.distFromLow)
    .slice(0, 8);

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
          Scan markets for potential investment opportunities and track your watchlist.
        </p>
        {isMock && (
          <span className="mt-2 inline-block rounded-full bg-yellow-400/10 px-3 py-1 text-xs text-yellow-400">
            Using sample data
          </span>
        )}
      </div>

      {/* Watchlist */}
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
                    {formatCurrency(q.price)}
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

      {/* Biggest Movers Today */}
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
                  {formatCurrency(q.price)}
                </p>
                <p className="text-xs text-zinc-500">
                  Vol: {formatNumber(q.volume)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Near 52-Week Low */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-1 font-semibold text-white">Near 52-Week Lows</h2>
        <p className="mb-3 text-xs text-zinc-400">
          Stocks trading closest to their 52-week low — potential value opportunities (or falling knives).
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
                  <th className="px-3 py-2 font-medium text-right">Day Change</th>
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
                      {formatCurrency(q.price)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-400">
                      {formatCurrency(q.fiftyTwoWeekLow || 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-400">
                      {formatCurrency(q.fiftyTwoWeekHigh || 0)}
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
    </div>
  );
}
