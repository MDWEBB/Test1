"use client";

import { HoldingWithQuote } from "@/lib/types";
import { formatCurrency, formatPercent, gainColor } from "@/lib/format";

interface HoldingsTableProps {
  holdings: HoldingWithQuote[];
  compact?: boolean;
  onRemove?: (id: string) => void;
}

export function HoldingsTable({ holdings, compact, onRemove }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-zinc-500">
        No holdings yet. Add your first stock or ETF.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-zinc-500">
            <th className="px-3 py-2 font-medium">Ticker</th>
            <th className="px-3 py-2 font-medium">Shares</th>
            <th className="px-3 py-2 font-medium text-right">Price</th>
            <th className="px-3 py-2 font-medium text-right">Value</th>
            {!compact && <th className="px-3 py-2 font-medium text-right">Avg Cost</th>}
            <th className="px-3 py-2 font-medium text-right">Gain/Loss</th>
            <th className="px-3 py-2 font-medium text-right">Day</th>
            {!compact && <th className="px-3 py-2 font-medium text-right">Alloc</th>}
            {onRemove && <th className="px-3 py-2"></th>}
          </tr>
        </thead>
        <tbody>
          {holdings
            .sort((a, b) => b.marketValue - a.marketValue)
            .map((h) => (
              <tr
                key={h.id}
                className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30"
              >
                <td className="px-3 py-3">
                  <div>
                    <span className="font-medium text-white">{h.ticker}</span>
                    <span className={`ml-1.5 rounded px-1 py-0.5 text-[10px] font-medium ${
                      h.market === "ASX"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-blue-400/10 text-blue-400"
                    }`}>
                      {h.market || "US"}
                    </span>
                    {!compact && (
                      <p className="text-xs text-zinc-500">{h.name}</p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-zinc-300">{h.shares}</td>
                <td className="px-3 py-3 text-right text-zinc-300">
                  {formatCurrency(h.currentPrice, h.market === "ASX" ? "AUD" : "USD")}
                </td>
                <td className="px-3 py-3 text-right font-medium text-white">
                  {formatCurrency(h.marketValue, h.market === "ASX" ? "AUD" : "USD")}
                </td>
                {!compact && (
                  <td className="px-3 py-3 text-right text-zinc-400">
                    {formatCurrency(h.avgCost, h.market === "ASX" ? "AUD" : "USD")}
                  </td>
                )}
                <td className={`px-3 py-3 text-right font-medium ${gainColor(h.gain)}`}>
                  {formatCurrency(h.gain, h.market === "ASX" ? "AUD" : "USD")}
                  <span className="ml-1 text-xs">({formatPercent(h.gainPercent)})</span>
                </td>
                <td className={`px-3 py-3 text-right ${gainColor(h.dayChangePercent)}`}>
                  {formatPercent(h.dayChangePercent)}
                </td>
                {!compact && (
                  <td className="px-3 py-3 text-right text-zinc-400">
                    {h.allocation.toFixed(1)}%
                  </td>
                )}
                {onRemove && (
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => onRemove(h.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-400/10"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
