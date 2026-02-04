"use client";

import { useState, FormEvent } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { Market } from "@/lib/types";

export function AddHoldingForm({ onDone }: { onDone?: () => void }) {
  const { addHolding } = usePortfolio();
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [market, setMarket] = useState<Market>("US");
  const [costMode, setCostMode] = useState<"perShare" | "total">("perShare");

  const parsedShares = parseFloat(shares) || 0;
  const parsedCost = parseFloat(avgCost) || 0;

  // Calculate the actual per-share cost depending on input mode
  const perShareCost =
    costMode === "total" && parsedShares > 0
      ? parsedCost / parsedShares
      : parsedCost;

  const totalCost =
    costMode === "perShare" ? parsedCost * parsedShares : parsedCost;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ticker || !shares || !avgCost) return;

    addHolding({
      ticker: ticker.toUpperCase(),
      name: name || ticker.toUpperCase(),
      shares: parsedShares,
      avgCost: perShareCost,
      market,
      dateAdded: new Date().toISOString(),
    });

    setTicker("");
    setName("");
    setShares("");
    setAvgCost("");
    setMarket("US");
    setCostMode("perShare");
    onDone?.();
  }

  const currency = market === "ASX" ? "AUD" : "USD";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Market *</label>
          <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
            <button
              type="button"
              onClick={() => setMarket("US")}
              className={`flex-1 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
                market === "US"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              US (Stake)
            </button>
            <button
              type="button"
              onClick={() => setMarket("ASX")}
              className={`flex-1 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors ${
                market === "ASX"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ASX
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Ticker *</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder={market === "ASX" ? "e.g. CBA, VAS, A200" : "e.g. AAPL, VOO"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Company Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apple Inc."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Shares / Units *</label>
          <input
            type="number"
            step="any"
            min="0"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="e.g. 10"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </div>
        <div className="col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm text-zinc-400">
              {costMode === "perShare"
                ? `Price You Paid Per Share (${currency}) *`
                : `Total Amount Invested (${currency}) *`}
            </label>
            <button
              type="button"
              onClick={() =>
                setCostMode((m) => (m === "perShare" ? "total" : "perShare"))
              }
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Switch to {costMode === "perShare" ? "total invested" : "per share"}
            </button>
          </div>
          <input
            type="number"
            step="any"
            min="0"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            placeholder={
              costMode === "perShare"
                ? market === "ASX"
                  ? "e.g. 130.50"
                  : "e.g. 150.00"
                : "e.g. 1000.00"
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
          {parsedShares > 0 && parsedCost > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              {costMode === "perShare"
                ? `Total invested: ${currency} ${totalCost.toFixed(2)} (${parsedShares} × ${currency} ${perShareCost.toFixed(2)})`
                : `Per share cost: ${currency} ${perShareCost.toFixed(2)} (${currency} ${totalCost.toFixed(2)} ÷ ${parsedShares})`}
            </p>
          )}
        </div>
      </div>
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-500"
      >
        Add Holding
      </button>
    </form>
  );
}
