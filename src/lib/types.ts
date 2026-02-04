export type Market = "US" | "ASX";

export interface Transaction {
  id: string;
  date: string;       // ISO date string
  shares: number;     // Number of shares bought (positive) or sold (negative)
  pricePerShare: number;
  totalAmount: number; // shares * pricePerShare
  type: "buy" | "sell";
  notes?: string;
  // CGT fields for sell transactions
  costBase?: number;          // Average cost per share at time of sale
  realizedGain?: number;      // Gain/loss before any discount
  cgtDiscount?: boolean;      // True if held >12 months (50% discount applies)
  discountedGain?: number;    // Gain after 50% CGT discount (if applicable)
}

// Summary of capital gains for tax reporting
export interface CGTSummary {
  financialYear: string;      // e.g., "2024-25"
  totalRealizedGains: number; // Before discount
  totalRealizedLosses: number;
  discountedGains: number;    // After 50% discount on eligible gains
  netCapitalGain: number;     // What you'll be taxed on
  transactions: Transaction[]; // All sell transactions in this FY
}

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  market: Market;
  dateAdded: string;
  notes?: string;
  transactions?: Transaction[]; // Transaction history for this holding
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
