export type Market = "US" | "ASX";

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  market: Market;
  dateAdded: string;
  notes?: string;
}

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  relatedTickers?: string[];
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  holdings: HoldingWithQuote[];
}

export interface HoldingWithQuote extends Holding {
  currentPrice: number;
  marketValue: number;
  gain: number;
  gainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: number;
}

export interface MarketMover {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  reason?: string;
}
