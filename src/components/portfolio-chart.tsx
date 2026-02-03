"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { HoldingWithQuote } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const COLORS = [
  "#34d399", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa",
  "#fb923c", "#2dd4bf", "#e879f9", "#84cc16", "#f87171",
];

interface PortfolioChartProps {
  holdings: HoldingWithQuote[];
}

interface ChartPayload {
  name: string;
  value: number;
  ticker: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPayload }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="font-medium text-white">{data.ticker}</p>
      <p className="text-sm text-zinc-400">{formatCurrency(data.value)}</p>
    </div>
  );
}

export function PortfolioChart({ holdings }: PortfolioChartProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Add holdings to see allocation chart
      </div>
    );
  }

  const data = holdings.map((h) => ({
    name: h.name,
    ticker: h.ticker,
    value: h.marketValue,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
