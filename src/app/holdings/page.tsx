"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { usePortfolioSummary } from "@/lib/hooks";
import { AddHoldingForm } from "@/components/add-holding-form";
import { HoldingWithQuote, Transaction } from "@/lib/types";

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TransactionHistory({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  // Sort transactions by date, newest first
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="mt-3 border-t border-zinc-700 pt-3">
      <h4 className="mb-2 text-sm font-medium text-zinc-400">Transaction History</h4>
      <div className="space-y-2">
        {sorted.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  t.type === "buy"
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-red-400/10 text-red-400"
                }`}
              >
                {t.type.toUpperCase()}
              </span>
              <span className="text-zinc-300">{formatDate(t.date)}</span>
            </div>
            <div className="text-right">
              <span className="text-white">{t.shares} shares</span>
              <span className="text-zinc-500"> @ </span>
              <span className="text-zinc-300">
                {currency} {t.pricePerShare.toFixed(2)}
              </span>
              <span className="ml-2 text-zinc-500">
                = {currency} {t.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoldingCard({
  holding,
  onRemove,
}: {
  holding: HoldingWithQuote & { transactions?: Transaction[] };
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const currency = holding.market === "ASX" ? "AUD" : "USD";
  const transactions = holding.transactions || [];

  // Calculate first purchase date
  const firstPurchase = transactions.length > 0
    ? transactions.reduce((earliest, t) =>
        new Date(t.date) < new Date(earliest.date) ? t : earliest
      )
    : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">{holding.ticker}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                holding.market === "ASX"
                  ? "bg-yellow-400/10 text-yellow-400"
                  : "bg-blue-400/10 text-blue-400"
              }`}
            >
              {holding.market}
            </span>
          </div>
          <p className="text-sm text-zinc-400">{holding.name}</p>
          {firstPurchase && (
            <p className="mt-1 text-xs text-zinc-500">
              First purchased: {formatDate(firstPurchase.date)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-white">
            {currency} {holding.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p
            className={`text-sm ${
              holding.gain >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {holding.gain >= 0 ? "+" : ""}
            {currency} {holding.gain.toFixed(2)} ({holding.gainPercent >= 0 ? "+" : ""}
            {holding.gainPercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-zinc-500">Shares</p>
          <p className="font-medium text-white">{holding.shares}</p>
        </div>
        <div>
          <p className="text-zinc-500">Avg Cost</p>
          <p className="font-medium text-white">
            {currency} {holding.avgCost.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Current Price</p>
          <p className="font-medium text-white">
            {currency} {holding.currentPrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Allocation</p>
          <p className="font-medium text-white">{holding.allocation.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          {expanded ? "Hide" : "Show"} {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </button>
        <button
          onClick={onRemove}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Remove
        </button>
      </div>

      {expanded && transactions.length > 0 && (
        <TransactionHistory transactions={transactions} currency={currency} />
      )}
    </div>
  );
}

export default function HoldingsPage() {
  const { removeHolding, holdings: rawHoldings } = usePortfolio();
  const summary = usePortfolioSummary();
  const [showForm, setShowForm] = useState(false);

  // Merge transaction data from rawHoldings into summary.holdings
  const holdingsWithTransactions = summary.holdings.map((h) => {
    const raw = rawHoldings.find((rh) => rh.id === h.id);
    return {
      ...h,
      transactions: raw?.transactions || [],
    };
  });

  // Calculate total invested from all transactions
  const totalInvested = rawHoldings.reduce((sum, h) => {
    const txTotal = (h.transactions || [])
      .filter((t) => t.type === "buy")
      .reduce((s, t) => s + t.totalAmount, 0);
    return sum + txTotal;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Holdings</h1>
          {totalInvested > 0 && (
            <p className="text-sm text-zinc-400">
              Total invested: ${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          {showForm ? "Cancel" : "+ Add Holding"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 font-semibold text-white">Add New Holding or Transaction</h2>
          <AddHoldingForm onDone={() => setShowForm(false)} />
        </div>
      )}

      {summary.loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
        </div>
      ) : holdingsWithTransactions.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">No holdings yet. Add your first holding to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {holdingsWithTransactions.map((holding) => (
            <HoldingCard
              key={holding.id}
              holding={holding}
              onRemove={() => {
                if (confirm("Remove this holding and all its transactions?")) {
                  removeHolding(holding.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Popular US Stocks & ETFs via Stake */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 font-semibold text-white">Popular US ETFs (via Stake)</h2>
        <p className="mb-3 text-sm text-zinc-400">
          Popular US-listed ETFs available on Stake for monthly investing.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { ticker: "VOO", name: "Vanguard S&P 500" },
            { ticker: "VTI", name: "Vanguard Total Stock Market" },
            { ticker: "QQQ", name: "Invesco NASDAQ 100" },
            { ticker: "SCHD", name: "Schwab US Dividend Equity" },
            { ticker: "VGT", name: "Vanguard Info Tech" },
            { ticker: "VYM", name: "Vanguard High Dividend" },
            { ticker: "SPY", name: "SPDR S&P 500" },
            { ticker: "IVV", name: "iShares Core S&P 500" },
          ].map((etf) => (
            <div
              key={etf.ticker}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2"
            >
              <span className="font-medium text-white">{etf.ticker}</span>
              <span className="ml-1.5 rounded bg-blue-400/10 px-1 py-0.5 text-[10px] text-blue-400">US</span>
              <p className="text-xs text-zinc-400">{etf.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Popular ASX ETFs */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 font-semibold text-white">Popular ASX ETFs</h2>
        <p className="mb-3 text-sm text-zinc-400">
          Australian-listed ETFs for local market exposure and diversification.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { ticker: "VAS", name: "Vanguard Australian Shares" },
            { ticker: "A200", name: "BetaShares ASX 200" },
            { ticker: "VGS", name: "Vanguard Intl Shares" },
            { ticker: "NDQ", name: "BetaShares NASDAQ 100" },
            { ticker: "IVV", name: "iShares S&P 500 (ASX)" },
            { ticker: "VDHG", name: "Vanguard Diversified High Growth" },
            { ticker: "IOZ", name: "iShares Core ASX 200" },
            { ticker: "DHHF", name: "BetaShares Diversified All Growth" },
          ].map((etf) => (
            <div
              key={`asx-${etf.ticker}`}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2"
            >
              <span className="font-medium text-white">{etf.ticker}</span>
              <span className="ml-1.5 rounded bg-yellow-400/10 px-1 py-0.5 text-[10px] text-yellow-400">ASX</span>
              <p className="text-xs text-zinc-400">{etf.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
