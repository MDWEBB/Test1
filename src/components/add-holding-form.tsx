"use client";

import { useState, FormEvent } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { Market, Holding } from "@/lib/types";

interface AddHoldingFormProps {
  onDone?: () => void;
  existingHoldings?: Holding[];
}

export function AddHoldingForm({ onDone, existingHoldings = [] }: AddHoldingFormProps) {
  const { addHolding, addTransaction, holdings } = usePortfolio();
  const allHoldings = existingHoldings.length > 0 ? existingHoldings : holdings;

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>("");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [market, setMarket] = useState<Market>("US");
  const [costMode, setCostMode] = useState<"perShare" | "total">("perShare");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const parsedShares = parseFloat(shares) || 0;
  const parsedCost = parseFloat(avgCost) || 0;

  // Calculate the actual per-share cost depending on input mode
  const perShareCost =
    costMode === "total" && parsedShares > 0
      ? parsedCost / parsedShares
      : parsedCost;

  const totalCost =
    costMode === "perShare" ? parsedCost * parsedShares : parsedCost;

  const selectedHolding = allHoldings.find((h) => h.id === selectedHoldingId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (mode === "existing" && selectedHolding) {
      // Add transaction to existing holding
      if (!shares || !avgCost) return;

      addTransaction(selectedHolding.id, {
        date: new Date(purchaseDate).toISOString(),
        shares: parsedShares,
        pricePerShare: perShareCost,
        totalAmount: parsedShares * perShareCost,
        type: "buy",
      });
    } else {
      // Add new holding
      if (!ticker || !shares || !avgCost) return;

      addHolding(
        {
          ticker: ticker.toUpperCase(),
          name: name || ticker.toUpperCase(),
          shares: parsedShares,
          avgCost: perShareCost,
          market,
          dateAdded: new Date(purchaseDate).toISOString(),
        },
        new Date(purchaseDate).toISOString()
      );
    }

    // Reset form
    setMode("new");
    setSelectedHoldingId("");
    setTicker("");
    setName("");
    setShares("");
    setAvgCost("");
    setMarket("US");
    setCostMode("perShare");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    onDone?.();
  }

  const currency = mode === "existing" && selectedHolding
    ? selectedHolding.market === "ASX" ? "AUD" : "USD"
    : market === "ASX" ? "AUD" : "USD";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle - only show if there are existing holdings */}
      {allHoldings.length > 0 && (
        <div>
          <label className="mb-1 block text-sm text-zinc-400">What would you like to do?</label>
          <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setSelectedHoldingId("");
              }}
              className={`flex-1 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "new"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Add New Holding
            </button>
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex-1 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "existing"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Buy More of Existing
            </button>
          </div>
        </div>
      )}

      {/* Existing holding selector */}
      {mode === "existing" && (
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Select Holding *</label>
          <select
            value={selectedHoldingId}
            onChange={(e) => setSelectedHoldingId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          >
            <option value="">Choose a holding...</option>
            {allHoldings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.ticker} - {h.name} ({h.shares} shares @ {h.market === "ASX" ? "AUD" : "USD"} {h.avgCost.toFixed(2)})
              </option>
            ))}
          </select>
          {selectedHolding && (
            <p className="mt-1 text-xs text-zinc-500">
              Current position: {selectedHolding.shares} shares, avg cost {selectedHolding.market === "ASX" ? "AUD" : "USD"} {selectedHolding.avgCost.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* New holding fields */}
      {mode === "new" && (
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
          <div className="col-span-2">
            <label className="mb-1 block text-sm text-zinc-400">Company Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apple Inc."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Common fields for both modes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Purchase Date *</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
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
                ? currency === "AUD"
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
                ? `Total invested: ${currency} ${totalCost.toFixed(2)} (${parsedShares} x ${currency} ${perShareCost.toFixed(2)})`
                : `Per share cost: ${currency} ${perShareCost.toFixed(2)} (${currency} ${totalCost.toFixed(2)} / ${parsedShares})`}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={mode === "existing" && !selectedHoldingId}
        className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mode === "existing" ? "Add Transaction" : "Add Holding"}
      </button>
    </form>
  );
}
