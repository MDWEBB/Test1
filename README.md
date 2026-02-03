# Portfolio Tracker

A web-based stock & ETF portfolio tracker with real-time market data, news tracking, and opportunity scanning.

## Features

- **Dashboard** — Portfolio overview with total value, gains/losses, allocation chart, and today's movers
- **Holdings Management** — Add, edit, and remove stock/ETF positions with cost basis tracking
- **News & Market Impact** — Live market news filtered by your holdings, with tariff/trade and earnings filters
- **Opportunities** — Watchlist, biggest daily movers, and stocks near 52-week lows

## Tech Stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS
- Recharts (portfolio allocation charts)
- Yahoo Finance (real-time quotes, free, no API key needed)
- RSS feeds from Yahoo Finance & CNBC (news)
- localStorage (portfolio data persists in your browser)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. Go to **Holdings** and add your stocks/ETFs (ticker, shares, average cost)
2. The **Dashboard** will show your portfolio value, gains/losses, and allocation
3. Check **News** for market news filtered by your holdings or by category (tariffs, earnings)
4. Use **Opportunities** to track a watchlist and spot market movers

## Deployment

Deploy for free on [Vercel](https://vercel.com):

```bash
npm run build
npx vercel
```
