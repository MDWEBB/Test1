import { NextRequest, NextResponse } from "next/server";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

function parseRSSItems(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || content.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = content.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const desc = content.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/)?.[1] || content.match(/<description>(.*?)<\/description>/)?.[1] || "";
    const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

    if (title) {
      items.push({
        title: title.replace(/<[^>]*>/g, ""),
        link,
        description: desc.replace(/<[^>]*>/g, "").slice(0, 300),
        pubDate,
        source: sourceName,
      });
    }
  }
  return items;
}

const RSS_FEEDS = [
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US", name: "Yahoo Finance" },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?region=US&lang=en-US", name: "Yahoo Finance Market" },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", name: "CNBC Markets" },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147", name: "CNBC Economy" },
];

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const category = request.nextUrl.searchParams.get("category") || "all";

  try {
    const feedPromises = RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 },
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSSItems(xml, feed.name);
      } catch {
        return [];
      }
    });

    const allResults = await Promise.all(feedPromises);
    let articles = allResults.flat();

    // Filter by query if provided
    if (query) {
      const terms = query.toLowerCase().split(",").map((t) => t.trim());
      articles = articles.filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase();
        return terms.some((term) => text.includes(term));
      });
    }

    // Filter by category
    if (category === "tariffs") {
      articles = articles.filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase();
        return /tariff|trade war|import tax|export ban|sanction|trade deal|customs duty/i.test(text);
      });
    } else if (category === "earnings") {
      articles = articles.filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase();
        return /earnings|revenue|profit|quarterly|q[1-4]|guidance|beat|miss/i.test(text);
      });
    }

    // Sort by date, newest first
    articles.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime() || 0;
      const dateB = new Date(b.pubDate).getTime() || 0;
      return dateB - dateA;
    });

    const newsArticles = articles.slice(0, 50).map((a) => ({
      title: a.title,
      description: a.description,
      url: a.link,
      source: a.source,
      publishedAt: a.pubDate,
    }));

    return NextResponse.json({ articles: newsArticles });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ articles: [], error: "Failed to fetch news" });
  }
}
