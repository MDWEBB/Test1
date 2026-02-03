"use client";

import { useState } from "react";
import { useNews } from "@/lib/hooks";
import { usePortfolio } from "@/lib/portfolio-context";
import { NewsCard } from "@/components/news-card";

const CATEGORIES = [
  { id: "all", label: "All News" },
  { id: "australia", label: "Australia" },
  { id: "tariffs", label: "Tariffs & Trade" },
  { id: "earnings", label: "Earnings" },
];

export default function NewsPage() {
  const { holdings } = usePortfolio();
  const [category, setCategory] = useState("all");
  const [scope, setScope] = useState<"all" | "portfolio">("all");

  const tickerQuery =
    scope === "portfolio"
      ? holdings.map((h) => h.ticker.toLowerCase()).join(",")
      : undefined;

  const { articles, loading } = useNews(tickerQuery, category);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">News & Market Impact</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track market news, tariffs, and events that may affect your portfolio.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800/50">
          <button
            onClick={() => setScope("all")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === "all"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white"
            } rounded-l-lg`}
          >
            All Markets
          </button>
          <button
            onClick={() => setScope("portfolio")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === "portfolio"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white"
            } rounded-r-lg`}
          >
            My Holdings
          </button>
        </div>

        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                category === cat.id
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tariff Alert Banner */}
      {category === "tariffs" && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4">
          <h3 className="font-medium text-amber-400">Tariff & Trade Watch</h3>
          <p className="mt-1 text-sm text-amber-400/70">
            Filtering news for tariff announcements, trade deals, sanctions, and import/export
            policy changes that could affect stock prices and market sectors.
          </p>
        </div>
      )}

      {/* Articles */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
        </div>
      ) : articles.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <NewsCard key={i} article={article} />
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          <div className="text-center">
            <p className="text-lg">No news found</p>
            <p className="mt-1 text-sm">
              {scope === "portfolio" && holdings.length === 0
                ? "Add holdings first to see portfolio-related news."
                : "Try changing your filters."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
