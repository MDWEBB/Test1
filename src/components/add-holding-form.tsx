"use client";

import { useState, FormEvent } from "react";
import { usePortfolio } from "@/lib/portfolio-context";

export function AddHoldingForm({ onDone }: { onDone?: () => void }) {
  const { addHolding } = usePortfolio();
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ticker || !shares || !avgCost) return;

    addHolding({
      ticker: ticker.toUpperCase(),
      name: name || ticker.toUpperCase(),
      shares: parseFloat(shares),
      avgCost: parseFloat(avgCost),
      dateAdded: new Date().toISOString(),
    });

    setTicker("");
    setName("");
    setShares("");
    setAvgCost("");
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Ticker *</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g. AAPL"
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
          <label className="mb-1 block text-sm text-zinc-400">Shares *</label>
          <input
            type="number"
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="e.g. 10"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Avg Cost per Share *</label>
          <input
            type="number"
            step="any"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            placeholder="e.g. 150.00"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
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
