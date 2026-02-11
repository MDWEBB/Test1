"use client";

import { useState, useMemo } from "react";
import { usePortfolioSummary, useStockQuotes, useFundamentals } from "@/lib/hooks";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency, formatPercent, gainColor } from "@/lib/format";
import { StockQuote } from "@/lib/types";

// Curated ETFs grouped by strategy
const SUGGESTED_ETFS: {
  ticker: string;
  name: string;
  market: "US" | "ASX";
  category: "au-broad" | "intl" | "us-broad" | "growth" | "defensive";
  fee: string;
  description: string;
}[] = [
  { ticker: "A200.AX", name: "BetaShares ASX 200", market: "ASX", category: "au-broad", fee: "0.04%", description: "Core Australian market — lowest fees" },
  { ticker: "VAS.AX", name: "Vanguard Australian Shares", market: "ASX", category: "au-broad", fee: "0.07%", description: "ASX 300 coverage — slightly broader" },
  { ticker: "VGS.AX", name: "Vanguard Intl Shares", market: "ASX", category: "intl", fee: "0.18%", description: "1,500+ international stocks" },
  { ticker: "VDHG.AX", name: "Vanguard Diversified High Growth", market: "ASX", category: "growth", fee: "0.27%", description: "All-in-one: 90% growth / 10% defensive" },
  { ticker: "DHHF.AX", name: "BetaShares Diversified All Growth", market: "ASX", category: "growth", fee: "0.19%", description: "100% equities all-in-one" },
  { ticker: "VDBA.AX", name: "Vanguard Diversified Balanced", market: "ASX", category: "defensive", fee: "0.27%", description: "50/50 growth & defensive — lower risk" },
  { ticker: "NDQ.AX", name: "BetaShares NASDAQ 100", market: "ASX", category: "growth", fee: "0.48%", description: "Tech-heavy US growth exposure" },
  { ticker: "VOO", name: "Vanguard S&P 500", market: "US", category: "us-broad", fee: "0.03%", description: "Top 500 US companies" },
  { ticker: "VTI", name: "Vanguard Total US Market", market: "US", category: "us-broad", fee: "0.03%", description: "Entire US stock market" },
  { ticker: "QQQ", name: "Invesco NASDAQ 100", market: "US", category: "growth", fee: "0.20%", description: "NASDAQ 100 tech & growth" },
  { ticker: "SCHD", name: "Schwab US Dividend Equity", market: "US", category: "defensive", fee: "0.06%", description: "US dividend stocks — income focus" },
];

type Strategy = "balanced" | "growth" | "conservative";

interface Suggestion {
  ticker: string;
  displayTicker: string;
  name: string;
  market: "US" | "ASX";
  price: number;
  shares: number;
  cost: number;
  reason: string;
  isExisting: boolean;
  fee?: string;
}

function currency(market: string): "AUD" | "USD" {
  return market === "ASX" ? "AUD" : "USD";
}

export default function InvestPage() {
  const { holdings: rawHoldings } = usePortfolio();
  const summary = usePortfolioSummary();
  const [amount, setAmount] = useState("");
  const [investCurrency, setInvestCurrency] = useState<"AUD" | "USD">("AUD");
  const [strategy, setStrategy] = useState<Strategy>("balanced");

  // Collect all tickers we need quotes for: existing holdings + suggested ETFs
  const holdingYahooTickers = rawHoldings.map((h) =>
    h.market === "ASX" ? `${h.ticker}.AX` : h.ticker
  );
  const suggestedTickers = SUGGESTED_ETFS.map((e) => e.ticker);
  const allTickers = useMemo(
    () => [...new Set([...holdingYahooTickers, ...suggestedTickers])],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holdingYahooTickers.join(",")]
  );
  const { quotes, loading } = useStockQuotes(allTickers, 300000);
  const { fundamentals } = useFundamentals(allTickers);

  const budget = parseFloat(amount) || 0;

  // Build suggestions based on strategy and budget
  const suggestions = useMemo(() => {
    if (budget <= 0 || loading) return [];

    const results: Suggestion[] = [];
    let remaining = budget;

    // Determine which categories to prioritise based on strategy
    const categoryWeights: Record<Strategy, Record<string, number>> = {
      balanced: { "au-broad": 0.35, intl: 0.25, "us-broad": 0.2, growth: 0.1, defensive: 0.1 },
      growth: { "au-broad": 0.15, intl: 0.15, "us-broad": 0.2, growth: 0.45, defensive: 0.05 },
      conservative: { "au-broad": 0.3, intl: 0.15, "us-broad": 0.1, growth: 0.05, defensive: 0.4 },
    };
    const weights = categoryWeights[strategy];

    // Filter to matching currency only
    const matchingETFs = SUGGESTED_ETFS.filter((e) =>
      investCurrency === "AUD" ? e.market === "ASX" : e.market === "US"
    );

    // Check existing holdings — suggest topping up underweight positions first
    const existingHoldings = summary.holdings.filter((h) =>
      investCurrency === "AUD" ? h.market === "ASX" : h.market !== "ASX"
    );

    if (existingHoldings.length > 0) {
      // Find the most underweight holding (lowest allocation)
      const avgAlloc = 100 / Math.max(1, summary.holdings.length);
      const underweight = existingHoldings
        .filter((h) => h.allocation < avgAlloc * 0.8)
        .sort((a, b) => a.allocation - b.allocation);

      // Suggest topping up the most underweight holding (up to 30% of budget)
      for (const h of underweight.slice(0, 2)) {
        const topUpBudget = Math.min(remaining * 0.3, remaining);
        const yahooTicker = h.market === "ASX" ? `${h.ticker}.AX` : h.ticker;
        const q = quotes[yahooTicker];
        if (!q || q.price <= 0) continue;

        const shares = Math.floor(topUpBudget / q.price);
        if (shares < 1) continue;

        const cost = shares * q.price;
        results.push({
          ticker: yahooTicker,
          displayTicker: h.ticker,
          name: h.name,
          market: h.market,
          price: q.price,
          shares,
          cost,
          reason: `Underweight in your portfolio (${h.allocation.toFixed(1)}% vs avg ${avgAlloc.toFixed(1)}%). Topping up to rebalance.`,
          isExisting: true,
        });
        remaining -= cost;
      }
    }

    // Now allocate remaining budget to suggested ETFs by category weight
    // Exclude ETFs user already holds (they got top-up suggestions above)
    const heldTickers = new Set(holdingYahooTickers);

    // Group matching ETFs by category, pick the best (lowest fee) per category
    const categoryPicks: Record<string, typeof SUGGESTED_ETFS[0]> = {};
    for (const etf of matchingETFs) {
      if (heldTickers.has(etf.ticker)) continue;
      const existing = categoryPicks[etf.category];
      if (!existing || parseFloat(etf.fee) < parseFloat(existing.fee)) {
        categoryPicks[etf.category] = etf;
      }
    }

    // Build affordable picks with prices, sorted by weight priority
    const affordablePicks: { etf: typeof SUGGESTED_ETFS[0]; q: StockQuote; weight: number }[] = [];
    for (const [cat, etf] of Object.entries(categoryPicks)) {
      const q = quotes[etf.ticker] as StockQuote | undefined;
      if (!q || q.price <= 0) continue;
      affordablePicks.push({ etf, q, weight: weights[cat] || 0 });
    }
    // Sort by weight descending so highest-priority categories get allocated first
    affordablePicks.sort((a, b) => b.weight - a.weight);

    // Multi-pass allocation: keep distributing remaining budget until nothing more fits
    const allocated = new Map<string, { shares: number; cost: number }>();
    let changed = true;
    while (changed && remaining > 0) {
      changed = false;
      const totalWeight = affordablePicks.reduce((sum, p) => sum + p.weight, 0);

      for (const { etf, q, weight } of affordablePicks) {
        if (remaining < q.price) continue; // can't afford even 1 share
        // Budget for this ETF: proportional share of remaining, but at least try 1 share
        const proportional = totalWeight > 0 ? (remaining * weight) / totalWeight : remaining / affordablePicks.length;
        const sharesToBuy = Math.max(1, Math.floor(proportional / q.price));
        const cost = sharesToBuy * q.price;
        if (cost > remaining) {
          // Try just 1 share
          if (q.price <= remaining) {
            const prev = allocated.get(etf.ticker) || { shares: 0, cost: 0 };
            allocated.set(etf.ticker, { shares: prev.shares + 1, cost: prev.cost + q.price });
            remaining -= q.price;
            changed = true;
          }
        } else {
          const prev = allocated.get(etf.ticker) || { shares: 0, cost: 0 };
          allocated.set(etf.ticker, { shares: prev.shares + sharesToBuy, cost: prev.cost + cost });
          remaining -= cost;
          changed = true;
        }
      }
    }

    // Convert allocations to results
    for (const { etf, q } of affordablePicks) {
      const alloc = allocated.get(etf.ticker);
      if (!alloc || alloc.shares < 1) continue;
      results.push({
        ticker: etf.ticker,
        displayTicker: etf.ticker.replace(".AX", ""),
        name: etf.name,
        market: etf.market,
        price: q.price,
        shares: alloc.shares,
        cost: alloc.cost,
        reason: etf.description,
        isExisting: false,
        fee: etf.fee,
      });
    }

    // Sort: existing top-ups first, then by allocation size
    return results.sort((a, b) => {
      if (a.isExisting && !b.isExisting) return -1;
      if (!a.isExisting && b.isExisting) return 1;
      return b.cost - a.cost;
    });
  }, [budget, loading, strategy, investCurrency, summary.holdings, quotes, holdingYahooTickers]);

  const totalAllocated = suggestions.reduce((sum, s) => sum + s.cost, 0);
  const leftover = budget - totalAllocated;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Investment Planner</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Enter how much you want to invest this month and get personalised allocation suggestions.
        </p>
      </div>

      {/* Input Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Amount */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Amount to invest
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  min="0"
                  step="50"
                  className="w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-7 pr-3 text-lg font-semibold text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              {/* Currency Toggle */}
              <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
                {(["AUD", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setInvestCurrency(c)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      investCurrency === c
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    } ${c === "AUD" ? "rounded-l-lg" : "rounded-r-lg"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Strategy */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Strategy
            </label>
            <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
              {([
                { id: "conservative" as const, label: "Conservative" },
                { id: "balanced" as const, label: "Balanced" },
                { id: "growth" as const, label: "Growth" },
              ]).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStrategy(s.id)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    strategy === s.id
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-400 hover:text-white"
                  } ${s.id === "conservative" ? "rounded-l-lg" : ""} ${s.id === "growth" ? "rounded-r-lg" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy description */}
        <p className="mt-3 text-xs text-zinc-500">
          {strategy === "balanced" && "Balanced mix of Australian, international, and growth assets. Suitable for most investors."}
          {strategy === "growth" && "Heavier allocation to growth and tech ETFs. Higher risk, higher potential return over 10+ years."}
          {strategy === "conservative" && "Focus on defensive and dividend assets with broad market base. Lower volatility."}
        </p>
      </div>

      {/* Suggestions */}
      {budget > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          {/* Debug info - remove after fixing */}
          <details className="mb-4 text-xs text-zinc-500">
            <summary className="cursor-pointer hover:text-zinc-300">Debug Info</summary>
            <div className="mt-2 space-y-1 font-mono bg-zinc-800 p-2 rounded">
              <p>Loading: {String(loading)}</p>
              <p>Quotes keys: {Object.keys(quotes).join(", ") || "(empty)"}</p>
              <p>Sample prices: {Object.entries(quotes).slice(0, 3).map(([k, v]) => `${k}: $${v.price}`).join(", ") || "(none)"}</p>
              <p>Suggested ETF tickers: {SUGGESTED_ETFS.filter(e => e.market === "ASX").map(e => e.ticker).join(", ")}</p>
            </div>
          </details>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">
              Suggested Allocation
            </h2>
            <div className="text-right text-xs text-zinc-400">
              <span className="text-emerald-400 font-medium">
                {formatCurrency(totalAllocated, investCurrency)}
              </span>
              {" "}of {formatCurrency(budget, investCurrency)} allocated
              {leftover > 0 && (
                <span className="ml-1 text-zinc-500">
                  ({formatCurrency(leftover, investCurrency)} remaining)
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div
                  key={s.ticker}
                  className={`rounded-lg border px-4 py-3 ${
                    s.isExisting
                      ? "border-emerald-700/50 bg-emerald-900/10"
                      : "border-zinc-700 bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{s.displayTicker}</span>
                        <span
                          className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                            s.market === "ASX"
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-blue-400/10 text-blue-400"
                          }`}
                        >
                          {s.market}
                        </span>
                        {s.isExisting && (
                          <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            Top up existing
                          </span>
                        )}
                        {s.fee && (
                          <span className="text-[10px] text-zinc-500">
                            Fee: {s.fee}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{s.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">{s.reason}</p>
                      {(() => {
                        const f = fundamentals[s.ticker];
                        if (!f) return null;
                        return (
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
                            {f.dividendYield != null && f.dividendYield > 0 && <span>Yield: <span className="text-zinc-300">{(f.dividendYield * 100).toFixed(1)}%</span></span>}
                            {f.trailingPE != null && <span>P/E: <span className="text-zinc-300">{f.trailingPE.toFixed(1)}</span></span>}
                            {f.fiftyDayAverage != null && <span>50MA: <span className="text-zinc-300">{formatCurrency(f.fiftyDayAverage, currency(s.market))}</span></span>}
                            {f.twoHundredDayAverage != null && <span>200MA: <span className="text-zinc-300">{formatCurrency(f.twoHundredDayAverage, currency(s.market))}</span></span>}
                            {f.beta != null && <span>Beta: <span className="text-zinc-300">{f.beta.toFixed(2)}</span></span>}
                            {f.recommendationKey && <span>Analyst: <span className="text-zinc-300">{f.recommendationKey}</span></span>}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="ml-4 text-right shrink-0">
                      <p className="text-lg font-semibold text-white">
                        {s.shares} <span className="text-sm text-zinc-400">share{s.shares !== 1 ? "s" : ""}</span>
                      </p>
                      <p className="text-sm text-zinc-300">
                        {formatCurrency(s.cost, currency(s.market))}
                      </p>
                      <p className="text-xs text-zinc-500">
                        @ {formatCurrency(s.price, currency(s.market))}/share
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Allocation bar */}
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
                  {suggestions.map((s, i) => {
                    const pct = (s.cost / budget) * 100;
                    const colors = [
                      "bg-emerald-500", "bg-blue-500", "bg-amber-500",
                      "bg-purple-500", "bg-cyan-500", "bg-rose-500",
                    ];
                    return (
                      <div
                        key={s.ticker}
                        className={`${colors[i % colors.length]} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${s.displayTicker}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                  {leftover > 0 && (
                    <div
                      className="bg-zinc-700"
                      style={{ width: `${(leftover / budget) * 100}%` }}
                      title={`Unallocated: ${formatCurrency(leftover, investCurrency)}`}
                    />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {suggestions.map((s, i) => {
                    const pct = (s.cost / budget) * 100;
                    const colors = [
                      "bg-emerald-500", "bg-blue-500", "bg-amber-500",
                      "bg-purple-500", "bg-cyan-500", "bg-rose-500",
                    ];
                    return (
                      <div key={s.ticker} className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span className={`inline-block h-2 w-2 rounded-full ${colors[i % colors.length]}`} />
                        {s.displayTicker} ({pct.toFixed(0)}%)
                      </div>
                    );
                  })}
                  {leftover > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span className="inline-block h-2 w-2 rounded-full bg-zinc-700" />
                      Unallocated ({((leftover / budget) * 100).toFixed(0)}%)
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-zinc-500">
                {budget < 5
                  ? "Enter a larger amount to see suggestions."
                  : "No suitable investments found at current prices for this budget."}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Prices may be too high relative to your budget. Try a higher amount or different currency.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-2 font-semibold text-white">How this works</h2>
        <ul className="space-y-1.5 text-sm text-zinc-400">
          <li>
            Suggestions are based on your budget, strategy preference, and existing holdings.
          </li>
          <li>
            If you already hold stocks, underweight positions are suggested for top-up first.
          </li>
          <li>
            Remaining budget is allocated across ETFs matching your chosen strategy.
          </li>
          <li>
            Only whole shares are suggested — the remainder is shown as unallocated.
          </li>
          <li className="text-zinc-500">
            This is not financial advice. Always do your own research before investing.
          </li>
        </ul>
      </div>
    </div>
  );
}
