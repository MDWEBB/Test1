# Portfolio Tracker — How It Works

This document explains where data comes from, how decisions are made on each page,
and how the investment suggestion logic operates.

---

## Data Sources

### Stock Prices (Live Quotes)

- **Source**: Yahoo Finance v8 Chart API (public, no API key required)
- **Endpoints**: `https://query2.finance.yahoo.com/v8/finance/chart/{SYMBOL}` with
  `query1.finance.yahoo.com` as fallback
- **Data returned per stock**: current price, previous close, day high/low, volume,
  market cap, 52-week high, 52-week low, company name
- **ASX stocks**: Use the `.AX` suffix (e.g. `A200.AX`, `CBA.AX`)
- **US stocks**: Use the raw ticker (e.g. `AMZN`, `VOO`)
- **Caching**:
  - Server-side: 60-second in-memory cache per ticker set — repeated requests within
    60s return cached data without hitting Yahoo
  - Client-side: 30-second module-level cache outside React — prevents re-fetching
    during React re-renders
  - Polling interval: 5 minutes while the page is open
- **Fallback**: If Yahoo Finance is unreachable, deterministic mock data is returned
  using a stable hash of the ticker symbol (prevents UI flickering from random values).
  A yellow "Using sample data" badge is shown when this happens.

### Historical Prices (Price Chart)

- **Source**: Same Yahoo Finance v8 Chart API, but with longer range/interval parameters
- **Endpoint**: `/v8/finance/chart/{SYMBOL}?range={range}&interval={interval}`
- **Range-to-interval mapping**:
  - 1 month, 3 months, 6 months → daily data points
  - 1 year, 2 years → weekly data points
  - 5 years → monthly data points
- **Caching**: Server-side 5-minute cache; client-side 5-minute module-level cache

### News Articles

- **Source**: RSS feeds from multiple providers (no API key required)
- **Feeds**:
  - Yahoo Finance — US market headlines and S&P 500 feed
  - Yahoo Finance ASX — Australian market headlines (^AXJO feed)
  - CNBC Markets and CNBC Economy
  - Australian Financial Review (AFR) — Markets and Wealth sections
- **Filtering**: Articles are filtered by matching ticker symbols and company names
  from your holdings against article titles and descriptions
- **Category filters available**: tariffs/trade, earnings, Australia-specific
- **Caching**: 5-minute revalidation via Next.js fetch caching

### Portfolio Data (Your Holdings)

- **Source**: Your browser's localStorage — no server, no database, no cloud
- **Format**: JSON array of holdings, each with: ticker, shares, average cost, market (US/ASX)
- **Persistence**: Survives browser refreshes but is specific to one browser on one device.
  Clearing browser data will delete your holdings.
- **No linked accounts**: The app never connects to any brokerage. You manually enter
  your holdings.

---

## Page-by-Page Decision Logic

### Dashboard

**Summary Cards**: Calculates totals by summing `shares × current price` for each holding.
If you hold both US and ASX stocks, totals are split by currency (USD and AUD separately)
since they can't be meaningfully combined without an exchange rate.

**Allocation Pie Chart**: Each holding's allocation percentage =
`(holding market value / total portfolio value) × 100`.

**Today's Movers**: Sorts your holdings by absolute daily percentage change and shows
the top 6. Uses the `changePercent` field from Yahoo Finance which compares current price
to previous close.

**Holdings Table (clickable)**: Click any row to select it for the price history chart.
Multiple selections are supported. Selected rows are highlighted green with a checkbox.

**Price History Chart**: Fetches historical closing prices for selected stocks and plots
them as line charts using the Recharts library. Multiple stocks are overlaid on the same
chart with different colours. Time range is selectable (1M to 2Y).

### Holdings Page

Displays all your manually-entered holdings with full detail (avg cost, allocation %).
The "Add Holding" form supports two input modes:
- **Per share**: Enter the price you paid per share
- **Total invested**: Enter the total amount you invested, and the app calculates
  per-share cost by dividing by the number of shares

### Invest (Investment Planner)

This page takes a dollar amount and suggests how to allocate it.

**Inputs**:
- Amount to invest (any value)
- Currency: AUD or USD (filters suggestions to matching market)
- Strategy: Conservative, Balanced, or Growth

**Step 1 — Top up underweight existing holdings**:
If you already hold stocks in the selected currency, the planner checks if any positions
are underweight (allocation below 80% of the average). The most underweight positions get
a top-up suggestion using up to 30% of the budget.

**Step 2 — Allocate remaining budget to new ETFs**:
The remaining budget is distributed across ETF categories based on strategy weights:

| Category     | Balanced | Growth | Conservative |
|--------------|----------|--------|--------------|
| AU Broad     | 35%      | 15%    | 30%          |
| International| 25%      | 15%    | 15%          |
| US Broad     | 20%      | 20%    | 10%          |
| Growth       | 10%      | 45%    | 5%           |
| Defensive    | 10%      | 5%     | 40%          |

Within each category, the ETF with the **lowest management fee** is selected.

**ETFs filtered by currency**: When AUD is selected, only ASX-listed ETFs are shown.
When USD is selected, only US-listed ETFs are shown.

**Multi-pass allocation**: The allocator runs in a loop. Each pass distributes the
remaining budget proportionally by category weight. If a category's budget slice is too
small for one share, it tries to buy exactly one share if affordable. Any unspent budget
from one pass feeds into the next pass. This continues until no more shares can be
purchased, maximising budget utilisation.

**Only whole shares**: Fractional shares are not suggested. The "unallocated" amount
shown is the leftover that can't buy another whole share of anything.

**Curated ETF list**:

| Ticker  | Market | Category      | Fee   | Description                          |
|---------|--------|---------------|-------|--------------------------------------|
| A200    | ASX    | AU Broad      | 0.04% | BetaShares ASX 200                   |
| VAS     | ASX    | AU Broad      | 0.07% | Vanguard Australian Shares (ASX 300) |
| VGS     | ASX    | International | 0.18% | Vanguard International Shares        |
| VDHG    | ASX    | Growth        | 0.27% | Vanguard Diversified High Growth     |
| DHHF    | ASX    | Growth        | 0.19% | BetaShares Diversified All Growth    |
| VDBA    | ASX    | Defensive     | 0.27% | Vanguard Diversified Balanced        |
| NDQ     | ASX    | Growth        | 0.48% | BetaShares NASDAQ 100                |
| VOO     | US     | US Broad      | 0.03% | Vanguard S&P 500                     |
| VTI     | US     | US Broad      | 0.03% | Vanguard Total US Market             |
| QQQ     | US     | Growth        | 0.20% | Invesco NASDAQ 100                   |
| SCHD    | US     | Defensive     | 0.06% | Schwab US Dividend Equity            |

### Opportunities Page

Three tabs with different analysis approaches:

**Value & Underpriced tab**:
- Tracks ~26 popular US and ASX tickers plus your holdings and watchlist
- **Discounted from Peak**: Calculates `(52-week high − current price) / 52-week high × 100`
  for each stock. Shows stocks with at least 5% discount, sorted by largest discount first.
- **Near 52-Week Lows**: Calculates `(current price − 52-week low) / 52-week low × 100`.
  Shows the 8 stocks closest to their 52-week low.
- **Outlook labels** based on position in 52-week range:
  - **Deep Value** (bottom 15%): "High risk, potentially high reward if fundamentals are solid"
  - **Potential Value** (15-35%): "May be oversold — check recent earnings and news"
  - **Mid-Range** (35-55%): "Fair pricing unless a catalyst changes the outlook"
  - **Near Highs** (above 55%): "Momentum is positive but less room for upside"
- **News matching**: For each discounted stock, the app searches fetched RSS articles for
  mentions of the ticker symbol or company name. Matched headlines are shown as "Recent News"
  or "Why it's down" to provide context on the price drop.

**Today's Movers tab**:
- Sorts all tracked stocks by absolute daily percentage change
- Shows the top 10 biggest movers (up or down)

**Beginner Picks tab**:
- Static curated list of 8 beginner-friendly ETFs with explanations
- Strategy suggestions for $100/month investing
- General tips for new investors

### News Page

Aggregates RSS articles from all feeds, filtered by your portfolio's ticker symbols.
Articles are sorted newest-first, limited to 50 results.

---

## Architecture Notes

- **Framework**: Next.js 16 with App Router, React, TypeScript, Tailwind CSS
- **Charts**: Recharts library (PieChart for allocation, LineChart for price history)
- **No database**: All data is either fetched live from Yahoo Finance / RSS feeds or
  stored in browser localStorage
- **No authentication**: No user accounts, no API keys, no linked brokerages
- **No server state**: The Next.js server only proxies and caches Yahoo Finance / RSS
  requests. It stores nothing permanently.
- **Caching strategy**: Three layers prevent excessive API calls:
  1. Server-side in-memory cache (60s quotes, 5min history)
  2. Client-side module-level cache outside React (30s quotes, 5min history)
  3. JSON snapshot comparison before React state updates (prevents re-renders with
     identical data)

---

## Disclaimer

This application is a portfolio tracking and visualisation tool. The investment
suggestions, opportunities analysis, and beginner picks are based on simple
quantitative metrics (price relative to 52-week range, category-weighted allocation)
and a curated list of well-known ETFs. They are **not financial advice**. Always
conduct your own research and consider consulting a licensed financial adviser
before making investment decisions.
