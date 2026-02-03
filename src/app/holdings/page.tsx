"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { usePortfolioSummary } from "@/lib/hooks";
import { HoldingsTable } from "@/components/holdings-table";
import { AddHoldingForm } from "@/components/add-holding-form";

export default function HoldingsPage() {
  const { removeHolding } = usePortfolio();
  const summary = usePortfolioSummary();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Holdings</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          {showForm ? "Cancel" : "+ Add Holding"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 font-semibold text-white">Add New Holding</h2>
          <AddHoldingForm onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        {summary.loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
          </div>
        ) : (
          <HoldingsTable
            holdings={summary.holdings}
            onRemove={(id) => {
              if (confirm("Remove this holding?")) {
                removeHolding(id);
              }
            }}
          />
        )}
      </div>

      {/* Quick Add Common ETFs */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 font-semibold text-white">Popular ETFs for Monthly Investing</h2>
        <p className="mb-3 text-sm text-zinc-400">
          These are popular low-cost ETFs commonly used for regular monthly investment plans.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { ticker: "VOO", name: "Vanguard S&P 500" },
            { ticker: "VTI", name: "Vanguard Total Stock Market" },
            { ticker: "QQQ", name: "Invesco NASDAQ 100" },
            { ticker: "SCHD", name: "Schwab US Dividend Equity" },
            { ticker: "VGT", name: "Vanguard Info Tech" },
            { ticker: "VYM", name: "Vanguard High Dividend" },
            { ticker: "ARKK", name: "ARK Innovation" },
            { ticker: "SPY", name: "SPDR S&P 500" },
          ].map((etf) => (
            <div
              key={etf.ticker}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2"
            >
              <span className="font-medium text-white">{etf.ticker}</span>
              <p className="text-xs text-zinc-400">{etf.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
