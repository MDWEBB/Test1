"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { StockHistory } from "@/lib/hooks";

const COLORS = [
  "#34d399", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa",
  "#fb923c", "#2dd4bf", "#e879f9", "#84cc16", "#f87171",
];

interface PriceChartProps {
  histories: StockHistory[];
  loading?: boolean;
}

interface MergedPoint {
  date: string;
  [ticker: string]: string | number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-zinc-500">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-300">{entry.name}</span>
          <span className="ml-auto font-medium text-white">
            ${entry.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PriceChart({ histories, loading }: PriceChartProps) {
  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
      </div>
    );
  }

  if (histories.length === 0 || histories.every((h) => h.history.length === 0)) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-zinc-500">
        Select holdings above to see price history
      </div>
    );
  }

  // Merge all histories into a single dataset keyed by date
  const dateMap = new Map<string, MergedPoint>();

  for (const stock of histories) {
    for (const point of stock.history) {
      if (!dateMap.has(point.date)) {
        dateMap.set(point.date, { date: point.date });
      }
      const row = dateMap.get(point.date)!;
      row[stock.ticker] = point.close;
    }
  }

  const merged = Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Format date labels: show month abbreviation
  const formatDate = (date: string) => {
    const d = new Date(date + "T00:00:00");
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  // Calculate tick interval to avoid label crowding
  const tickInterval = Math.max(1, Math.floor(merged.length / 8));

  const tickers = histories.map((h) => h.ticker);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            interval={tickInterval}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<ChartTooltip />} />
          {tickers.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
            />
          )}
          {tickers.map((ticker, i) => (
            <Line
              key={ticker}
              type="monotone"
              dataKey={ticker}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
