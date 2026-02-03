"use client";

import { NewsArticle } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-medium text-white">{article.title}</h3>
          {article.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
              {article.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <span className="rounded-full bg-zinc-800 px-2 py-0.5">{article.source}</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
