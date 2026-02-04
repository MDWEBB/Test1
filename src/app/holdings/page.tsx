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

// Get current Australian financial year (July 1 - June 30)
function getCurrentFinancialYear(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // If before July, we're in the FY that started last year
  const fyStartYear = month < 6 ? year - 1 : year;

  return {
    start: new Date(fyStartYear, 6, 1), // July 1
    end: new Date(fyStartYear + 1, 5, 30, 23, 59, 59), // June 30
    label: `${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
  };
}

function TransactionHistory({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
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
            className={`rounded-lg px-3 py-2 text-sm ${
              t.type === "sell" ? "bg-red-900/20 border border-red-800/30" : "bg-zinc-800/50"
            }`}
          >
            <div className="flex items-center justify-between">
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

            {/* Show CGT details for sell transactions */}
            {t.type === "sell" && t.realizedGain !== undefined && (
              <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-zinc-700/50 pt-2 text-xs">
                <span className="text-zinc-500">
                  Cost base: {currency} {((t.costBase || 0) * t.shares).toFixed(2)}
                </span>
                <span className={t.realizedGain >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {t.realizedGain >= 0 ? "Gain" : "Loss"}: {currency} {Math.abs(t.realizedGain).toFixed(2)}
                </span>
                {t.realizedGain > 0 && (
                  <>
                    <span className={t.cgtDiscount ? "text-emerald-400" : "text-zinc-500"}>
                      {t.cgtDiscount ? "50% CGT discount applied" : "No CGT discount (<12mo)"}
                    </span>
                    <span className="font-medium text-yellow-400">
                      Taxable: {currency} {(t.discountedGain || t.realizedGain).toFixed(2)}
                    </span>
                  </>
                )}
                {t.realizedGain < 0 && (
                  <span className="text-blue-400">Can offset future gains</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaxSummary({ holdings }: { holdings: { transactions?: Transaction[] }[] }) {
  const fy = getCurrentFinancialYear();

  // Collect all sell transactions in the current financial year
  const sellTransactions: Transaction[] = [];
  for (const h of holdings) {
    for (const t of h.transactions || []) {
      if (t.type === "sell") {
        const txDate = new Date(t.date);
        if (txDate >= fy.start && txDate <= fy.end) {
          sellTransactions.push(t);
        }
      }
    }
  }

  if (sellTransactions.length === 0) {
    return null;
  }

  // Calculate totals
  let totalGains = 0;
  let totalLosses = 0;
  let discountedGains = 0;

  for (const t of sellTransactions) {
    const gain = t.realizedGain || 0;
    if (gain >= 0) {
      totalGains += gain;
      discountedGains += t.discountedGain || gain;
    } else {
      totalLosses += Math.abs(gain);
    }
  }

  // Net capital gain = discounted gains - losses (losses offset gains before discount is applied in reality,
  // but for simplicity we'll show the basic calculation)
  const netCapitalGain = Math.max(0, discountedGains - totalLosses);
  const carryForwardLoss = totalLosses > discountedGains ? totalLosses - discountedGains : 0;

  return (
    <div className="rounded-xl border border-yellow-600/30 bg-yellow-900/10 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-yellow-400">
          FY{fy.label} Capital Gains Tax Summary
        </h2>
        <span className="text-xs text-zinc-500">Australian Tax Resident</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {sellTransactions.length} sale{sellTransactions.length !== 1 ? "s" : ""} recorded this financial year
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-zinc-500">Gross Gains</p>
          <p className="font-medium text-emerald-400">+${totalGains.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Capital Losses</p>
          <p className="font-medium text-red-400">-${totalLosses.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">After 50% Discount</p>
          <p className="font-medium text-white">${discountedGains.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Net Taxable Gain</p>
          <p className="font-medium text-yellow-400">${netCapitalGain.toFixed(2)}</p>
        </div>
      </div>

      {carryForwardLoss > 0 && (
        <p className="mt-3 text-xs text-blue-400">
          ${carryForwardLoss.toFixed(2)} in capital losses can be carried forward to offset future gains
        </p>
      )}

      <p className="mt-3 text-xs text-zinc-500">
        Note: This is an estimate for informational purposes only. The actual CGT calculation can be more complex
        (e.g., FIFO vs specific identification method). Consult a tax professional for accurate tax advice.
      </p>
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
  const buyCount = transactions.filter((t) => t.type === "buy").length;
  const sellCount = transactions.filter((t) => t.type === "sell").length;

  // Calculate first purchase date from buys only
  const buyTransactions = transactions.filter((t) => t.type === "buy");
  const firstPurchase = buyTransactions.length > 0
    ? buyTransactions.reduce((earliest, t) =>
        new Date(t.date) < new Date(earliest.date) ? t : earliest
      )
    : null;

  // Calculate total realized gains/losses from sells
  const totalRealized = transactions
    .filter((t) => t.type === "sell")
    .reduce((sum, t) => sum + (t.realizedGain || 0), 0);

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
            {holding.shares === 0 && (
              <span className="rounded bg-zinc-600/50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                CLOSED
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400">{holding.name}</p>
          {firstPurchase && (
            <p className="mt-1 text-xs text-zinc-500">
              First purchased: {formatDate(firstPurchase.date)}
            </p>
          )}
        </div>
        <div className="text-right">
          {holding.shares > 0 ? (
            <>
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
            </>
          ) : (
            <p className="text-sm text-zinc-500">Position closed</p>
          )}
          {totalRealized !== 0 && (
            <p className={`mt-1 text-xs ${totalRealized >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              Realized: {totalRealized >= 0 ? "+" : ""}{currency} {totalRealized.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {holding.shares > 0 && (
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
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          {expanded ? "Hide" : "Show"} transactions ({buyCount} buy{buyCount !== 1 ? "s" : ""}, {sellCount} sell{sellCount !== 1 ? "s" : ""})
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

  // Also include holdings with 0 shares (closed positions) for tax tracking
  const closedHoldings = rawHoldings
    .filter((rh) => rh.shares === 0 || !summary.holdings.find((h) => h.id === rh.id))
    .map((rh) => ({
      ...rh,
      currentPrice: 0,
      marketValue: 0,
      gain: 0,
      gainPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      allocation: 0,
      transactions: rh.transactions || [],
    }));

  const allHoldings = [...holdingsWithTransactions, ...closedHoldings];

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
          {showForm ? "Cancel" : "+ Add / Record"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 font-semibold text-white">Record Transaction</h2>
          <AddHoldingForm onDone={() => setShowForm(false)} />
        </div>
      )}

      {/* Tax Summary */}
      <TaxSummary holdings={rawHoldings} />

      {summary.loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
        </div>
      ) : allHoldings.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">No holdings yet. Add your first holding to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allHoldings
            .sort((a, b) => b.marketValue - a.marketValue)
            .map((holding) => (
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
