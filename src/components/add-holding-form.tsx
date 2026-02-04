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

  const [mode, setMode] = useState<"new" | "buy" | "sell">("new");
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>("");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [market, setMarket] = useState<Market>("US");
  const [costMode, setCostMode] = useState<"perShare" | "total">("perShare");
  const [transactionDate, setTransactionDate] = useState(
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

  // Calculate estimated CGT for sells
  const estimatedCGT = selectedHolding && mode === "sell" && parsedShares > 0 && parsedCost > 0
    ? (() => {
        const costBase = selectedHolding.avgCost;
        const realizedGain = (perShareCost - costBase) * parsedShares;

        // Check if CGT discount applies
        const buyTransactions = (selectedHolding.transactions || [])
          .filter((t) => t.type === "buy")
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const firstBuyDate = buyTransactions[0]?.date;
        const saleDate = new Date(transactionDate);
        const oneYearAgo = new Date(saleDate);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const cgtDiscount = firstBuyDate
          ? new Date(firstBuyDate) <= oneYearAgo && realizedGain > 0
          : false;

        return {
          costBase,
          realizedGain,
          cgtDiscount,
          discountedGain: cgtDiscount ? realizedGain * 0.5 : realizedGain,
          proceeds: perShareCost * parsedShares,
        };
      })()
    : null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if ((mode === "buy" || mode === "sell") && selectedHolding) {
      if (!shares || !avgCost) return;

      // Validate sell doesn't exceed holdings
      if (mode === "sell" && parsedShares > selectedHolding.shares) {
        alert(`You only have ${selectedHolding.shares} shares to sell.`);
        return;
      }

      addTransaction(selectedHolding.id, {
        date: new Date(transactionDate).toISOString(),
        shares: parsedShares,
        pricePerShare: perShareCost,
        totalAmount: parsedShares * perShareCost,
        type: mode === "sell" ? "sell" : "buy",
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
          dateAdded: new Date(transactionDate).toISOString(),
        },
        new Date(transactionDate).toISOString()
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
    setTransactionDate(new Date().toISOString().split("T")[0]);
    onDone?.();
  }

  const currency = (mode === "buy" || mode === "sell") && selectedHolding
    ? selectedHolding.market === "ASX" ? "AUD" : "USD"
    : market === "ASX" ? "AUD" : "USD";

  const isSellMode = mode === "sell";
  const priceLabel = isSellMode
    ? costMode === "perShare" ? `Sale Price Per Share (${currency}) *` : `Total Sale Proceeds (${currency}) *`
    : costMode === "perShare" ? `Price Per Share (${currency}) *` : `Total Amount (${currency}) *`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle */}
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
              New Holding
            </button>
            <button
              type="button"
              onClick={() => setMode("buy")}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                mode === "buy"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Buy More
            </button>
            <button
              type="button"
              onClick={() => setMode("sell")}
              className={`flex-1 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "sell"
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Record Sale
            </button>
          </div>
        </div>
      )}

      {/* Existing holding selector for buy/sell */}
      {(mode === "buy" || mode === "sell") && (
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Select Holding *</label>
          <select
            value={selectedHoldingId}
            onChange={(e) => setSelectedHoldingId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          >
            <option value="">Choose a holding...</option>
            {allHoldings
              .filter((h) => mode === "buy" || h.shares > 0)
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.ticker} - {h.name} ({h.shares} shares @ {h.market === "ASX" ? "AUD" : "USD"} {h.avgCost.toFixed(2)})
                </option>
              ))}
          </select>
          {selectedHolding && (
            <p className="mt-1 text-xs text-zinc-500">
              Current: {selectedHolding.shares} shares, avg cost {selectedHolding.market === "ASX" ? "AUD" : "USD"} {selectedHolding.avgCost.toFixed(2)}
              {mode === "sell" && (
                <span className="ml-1 text-yellow-400">
                  (Total value: {selectedHolding.market === "ASX" ? "AUD" : "USD"} {(selectedHolding.shares * selectedHolding.avgCost).toFixed(2)})
                </span>
              )}
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

      {/* Common fields for all modes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            {isSellMode ? "Sale Date *" : "Purchase Date *"}
          </label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            {isSellMode ? "Shares to Sell *" : "Shares / Units *"}
          </label>
          <input
            type="number"
            step="any"
            min="0"
            max={isSellMode && selectedHolding ? selectedHolding.shares : undefined}
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder={isSellMode && selectedHolding ? `Max: ${selectedHolding.shares}` : "e.g. 10"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </div>
        <div className="col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm text-zinc-400">{priceLabel}</label>
            <button
              type="button"
              onClick={() =>
                setCostMode((m) => (m === "perShare" ? "total" : "perShare"))
              }
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Switch to {costMode === "perShare" ? "total" : "per share"}
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
                ? `Total ${isSellMode ? "proceeds" : "invested"}: ${currency} ${totalCost.toFixed(2)} (${parsedShares} x ${currency} ${perShareCost.toFixed(2)})`
                : `Per share ${isSellMode ? "price" : "cost"}: ${currency} ${perShareCost.toFixed(2)} (${currency} ${totalCost.toFixed(2)} / ${parsedShares})`}
            </p>
          )}
        </div>
      </div>

      {/* CGT Preview for sells */}
      {mode === "sell" && estimatedCGT && (
        <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-4">
          <h4 className="mb-2 font-medium text-yellow-400">Estimated Capital Gains Tax Impact</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-zinc-400">Cost Base:</div>
            <div className="text-white">{currency} {(estimatedCGT.costBase * parsedShares).toFixed(2)}</div>

            <div className="text-zinc-400">Sale Proceeds:</div>
            <div className="text-white">{currency} {estimatedCGT.proceeds.toFixed(2)}</div>

            <div className="text-zinc-400">Realized {estimatedCGT.realizedGain >= 0 ? "Gain" : "Loss"}:</div>
            <div className={estimatedCGT.realizedGain >= 0 ? "text-emerald-400" : "text-red-400"}>
              {estimatedCGT.realizedGain >= 0 ? "+" : ""}{currency} {estimatedCGT.realizedGain.toFixed(2)}
            </div>

            {estimatedCGT.realizedGain > 0 && (
              <>
                <div className="text-zinc-400">CGT Discount (50%):</div>
                <div className={estimatedCGT.cgtDiscount ? "text-emerald-400" : "text-zinc-500"}>
                  {estimatedCGT.cgtDiscount ? "Eligible (held >12 months)" : "Not eligible (<12 months)"}
                </div>

                <div className="border-t border-zinc-700 pt-2 font-medium text-zinc-300">Taxable Gain:</div>
                <div className="border-t border-zinc-700 pt-2 font-medium text-yellow-400">
                  {currency} {estimatedCGT.discountedGain.toFixed(2)}
                  {estimatedCGT.cgtDiscount && (
                    <span className="ml-1 text-xs text-zinc-500">(after 50% discount)</span>
                  )}
                </div>
              </>
            )}

            {estimatedCGT.realizedGain < 0 && (
              <>
                <div className="border-t border-zinc-700 pt-2 font-medium text-zinc-300">Capital Loss:</div>
                <div className="border-t border-zinc-700 pt-2 font-medium text-blue-400">
                  {currency} {Math.abs(estimatedCGT.realizedGain).toFixed(2)}
                  <span className="ml-1 text-xs text-zinc-500">(can offset future gains)</span>
                </div>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Note: This is an estimate only. Consult a tax professional for actual tax advice.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={(mode === "buy" || mode === "sell") && !selectedHoldingId}
        className={`rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          mode === "sell"
            ? "bg-red-600 hover:bg-red-500"
            : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        {mode === "new" ? "Add Holding" : mode === "buy" ? "Record Purchase" : "Record Sale"}
      </button>
    </form>
  );
}
