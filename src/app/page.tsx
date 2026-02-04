"use client";

import { useState } from "react";
import { usePortfolioSummary, useNews, useStockHistory, toYahooTicker } from "@/lib/hooks";
import { usePortfolio } from "@/lib/portfolio-context";
import { StatCard } from "@/components/stat-card";
import { PortfolioChart } from "@/components/portfolio-chart";
import { PriceChart } from "@/components/price-chart";
import { NewsCard } from "@/components/news-card";
import { formatCurrency, formatPercent, gainColor } from "@/lib/format";
import { Transaction } from "@/lib/types";
import Link from "next/link";

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function getFirstPurchaseDate(transactions: Transaction[] | undefined): string | null {
  if (!transactions || transactions.length === 0) return null;
  const earliest = transactions.reduce((min, t) =>
    new Date(t.date) < new Date(min.date) ? t : min
  );
  return earliest.date;
}

const RANGE_OPTIONS = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
] as const;

export default function Dashboard() {
  const { holdings: rawHoldings } = usePortfolio();
  const summary = usePortfolioSummary();
  const tickerQuery = rawHoldings.map((h) => h.ticker.toLowerCase()).join(",");
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [chartRange, setChartRange] = useState("3mo");

  // Convert selected tickers to Yahoo format for the history API
  const yahooTickers = selectedTickers.map((t) => {
    const holding = rawHoldings.find((h) => h.ticker === t);
    return toYahooTicker(t, holding?.market || "US");
  });
  const { data: historyData, loading: historyLoading } = useStockHistory(yahooTickers, chartRange);

  function toggleTicker(ticker: string) {
    setSelectedTickers((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker]
    );
  }
  const { articles, loading: newsLoading } = useNews(tickerQuery || undefined);

  // Check if portfolio has mixed currencies
  const hasUS = summary.holdings.some((h) => h.market !== "ASX");
  const hasASX = summary.holdings.some((h) => h.market === "ASX");
  const isMixed = hasUS && hasASX;

  // Split totals by currency for mixed portfolios
  const usTotals = summary.holdings
    .filter((h) => h.market !== "ASX")
    .reduce(
      (acc, h) => ({
        value: acc.value + h.marketValue,
        cost: acc.cost + h.avgCost * h.shares,
      }),
      { value: 0, cost: 0 }
    );
  const asxTotals = summary.holdings
    .filter((h) => h.market === "ASX")
    .reduce(
      (acc, h) => ({
        value: acc.value + h.marketValue,
        cost: acc.cost + h.avgCost * h.shares,
      }),
      { value: 0, cost: 0 }
    );

  // Determine the primary currency for single-currency portfolios
  const primaryCurrency: "AUD" | "USD" = !hasUS ? "AUD" : "USD";

  const totalGain =
    usTotals.value - usTotals.cost + (asxTotals.value - asxTotals.cost);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        {summary.isMock && (
          <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs text-yellow-400">
            Using sample data (Yahoo Finance unavailable)
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Value"
          value={
            isMixed
              ? `${formatCurrency(usTotals.value, "USD")}`
              : formatCurrency(summary.totalValue, primaryCurrency)
          }
          subValue={isMixed ? formatCurrency(asxTotals.value, "AUD") : undefined}
        />
        <StatCard
          label="Total Cost"
          value={
            isMixed
              ? `${formatCurrency(usTotals.cost, "USD")}`
              : formatCurrency(summary.totalCost, primaryCurrency)
          }
          subValue={isMixed ? formatCurrency(asxTotals.cost, "AUD") : undefined}
        />
        <StatCard
          label="Total Gain/Loss"
          value={
            isMixed
              ? formatCurrency(usTotals.value - usTotals.cost, "USD")
              : formatCurrency(summary.totalGain, primaryCurrency)
          }
          subValue={
            isMixed
              ? formatCurrency(asxTotals.value - asxTotals.cost, "AUD")
              : formatPercent(summary.totalGainPercent)
          }
          subColor={gainColor(totalGain)}
        />
        <StatCard
          label="Holdings"
          value={summary.holdings.length.toString()}
          subValue={`${rawHoldings.length} positions`}
        />
      </div>

      {/* Chart + Top Movers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 font-semibold text-white">Allocation</h2>
          <PortfolioChart holdings={summary.holdings} />
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.holdings
              .sort((a, b) => b.allocation - a.allocation)
              .slice(0, 6)
              .map((h) => (
                <span
                  key={h.id}
                  className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                >
                  {h.ticker} {h.allocation.toFixed(1)}%
                </span>
              ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Today&apos;s Movers</h2>
          </div>
          {summary.holdings.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-zinc-500">
              <div className="text-center">
                <p>No holdings yet</p>
                <Link
                  href="/holdings"
                  className="mt-2 inline-block text-emerald-400 hover:text-emerald-300"
                >
                  Add your first holding
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.holdings
                .sort(
                  (a, b) =>
                    Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent)
                )
                .slice(0, 6)
                .map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
                  >
                    <div>
                      <span className="font-medium text-white">{h.ticker}</span>
                      <span className="ml-2 text-sm text-zinc-400">
                        {formatCurrency(h.currentPrice, h.market === "ASX" ? "AUD" : "USD")}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-medium ${gainColor(h.dayChangePercent)}`}
                    >
                      {formatPercent(h.dayChangePercent)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Holdings Table — clickable rows to select for chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">Holdings</h2>
          <div className="flex items-center gap-3">
            {selectedTickers.length > 0 && (
              <button
                onClick={() => setSelectedTickers([])}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear selection
              </button>
            )}
            <Link
              href="/holdings"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Manage
            </Link>
          </div>
        </div>
        {summary.loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
          </div>
        ) : summary.holdings.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-zinc-500">
            No holdings yet. Add your first stock or ETF.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  <th className="px-3 py-2 font-medium">Ticker</th>
                  <th className="px-3 py-2 font-medium">Shares</th>
                  <th className="px-3 py-2 font-medium text-right">Price</th>
                  <th className="px-3 py-2 font-medium text-right">Value</th>
                  <th className="px-3 py-2 font-medium text-right">Gain/Loss</th>
                  <th className="px-3 py-2 font-medium text-right">First Buy</th>
                </tr>
              </thead>
              <tbody>
                {summary.holdings
                  .sort((a, b) => b.marketValue - a.marketValue)
                  .map((h) => {
                    const isSelected = selectedTickers.includes(h.ticker);
                    const rawHolding = rawHoldings.find((rh) => rh.id === h.id);
                    const firstBuyDate = getFirstPurchaseDate(rawHolding?.transactions);
                    const txCount = rawHolding?.transactions?.length || 0;
                    return (
                      <tr
                        key={h.id}
                        onClick={() => toggleTicker(h.ticker)}
                        className={`cursor-pointer border-b border-zinc-800/50 transition-colors ${
                          isSelected
                            ? "bg-emerald-400/10 hover:bg-emerald-400/15"
                            : "hover:bg-zinc-800/30"
                        }`}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                                isSelected
                                  ? "border-emerald-400 bg-emerald-400 text-black"
                                  : "border-zinc-600 text-transparent"
                              }`}
                            >
                              {isSelected ? "✓" : ""}
                            </span>
                            <span className="font-medium text-white">{h.ticker}</span>
                            <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                              h.market === "ASX"
                                ? "bg-yellow-400/10 text-yellow-400"
                                : "bg-blue-400/10 text-blue-400"
                            }`}>
                              {h.market || "US"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-zinc-300">{h.shares}</td>
                        <td className="px-3 py-3 text-right text-zinc-300">
                          {formatCurrency(h.currentPrice, h.market === "ASX" ? "AUD" : "USD")}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-white">
                          {formatCurrency(h.marketValue, h.market === "ASX" ? "AUD" : "USD")}
                        </td>
                        <td className={`px-3 py-3 text-right font-medium ${gainColor(h.gain)}`}>
                          {formatCurrency(h.gain, h.market === "ASX" ? "AUD" : "USD")}
                          <span className="ml-1 text-xs">({formatPercent(h.gainPercent)})</span>
                        </td>
                        <td className="px-3 py-3 text-right text-zinc-400">
                          {firstBuyDate ? (
                            <div>
                              <span className="text-zinc-300">{formatDate(firstBuyDate)}</span>
                              {txCount > 1 && (
                                <span className="ml-1 text-[10px] text-zinc-500">
                                  ({txCount} buys)
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {summary.holdings.length > 0 && selectedTickers.length === 0 && (
              <p className="mt-2 text-center text-xs text-zinc-600">
                Click a row to view price history
              </p>
            )}
          </div>
        )}
      </div>

      {/* Price History Chart */}
      {(selectedTickers.length > 0 || historyLoading) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Price History</h2>
            <div className="flex gap-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setChartRange(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    chartRange === opt.value
                      ? "bg-emerald-400/20 text-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selectedTickers.map((ticker) => (
              <button
                key={ticker}
                onClick={() => toggleTicker(ticker)}
                className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-400/20"
              >
                {ticker}
                <span className="text-emerald-400/60">&times;</span>
              </button>
            ))}
          </div>
          <PriceChart histories={historyData} loading={historyLoading} />
        </div>
      )}

      {/* News */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">Market News</h2>
          <Link
            href="/news"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            View All
          </Link>
        </div>
        {newsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
          </div>
        ) : articles.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {articles.slice(0, 4).map((article, i) => (
              <NewsCard key={i} article={article} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-zinc-500">
            No relevant news found. Add holdings to see related news.
          </p>
        )}
      </div>
    </div>
  );
}
