"use client";

import { usePortfolioSummary, useNews } from "@/lib/hooks";
import { usePortfolio } from "@/lib/portfolio-context";
import { StatCard } from "@/components/stat-card";
import { HoldingsTable } from "@/components/holdings-table";
import { PortfolioChart } from "@/components/portfolio-chart";
import { NewsCard } from "@/components/news-card";
import { formatCurrency, formatPercent, gainColor } from "@/lib/format";
import Link from "next/link";

export default function Dashboard() {
  const { holdings: rawHoldings } = usePortfolio();
  const summary = usePortfolioSummary();
  const tickerQuery = rawHoldings.map((h) => h.ticker.toLowerCase()).join(",");
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

      {/* Holdings Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">Holdings</h2>
          <Link
            href="/holdings"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            Manage
          </Link>
        </div>
        {summary.loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
          </div>
        ) : (
          <HoldingsTable holdings={summary.holdings} compact />
        )}
      </div>

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
