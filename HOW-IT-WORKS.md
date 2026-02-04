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

### Fundamental Data (P/E, Analyst Targets, Moving Averages)

- **Source**: Yahoo Finance v10 quoteSummary API (public, no API key required)
- **Endpoint**: `https://query2.finance.yahoo.com/v10/finance/quoteSummary/{SYMBOL}`
- **Modules fetched**: `financialData`, `defaultKeyStatistics`, `summaryDetail`,
  `recommendationTrend`, `earningsTrend`
- **Data returned per stock**:
  - Valuation: trailing P/E, forward P/E, PEG ratio, price-to-book
  - Growth: quarterly earnings growth, revenue growth
  - Profitability: profit margin, return on equity
  - Dividends: dividend yield, trailing annual yield
  - Analyst consensus: target mean/high/low price, recommendation key (buy/hold/sell),
    recommendation mean (1-5 scale), number of analyst opinions
  - Moving averages: 50-day average, 200-day average (pre-calculated by Yahoo)
  - Risk: beta, short percent of float
- **Caching**: Server-side 5-minute in-memory cache; client-side 5-minute module-level cache
- **Rate limiting**: Fetched in batches of 5 to avoid overwhelming Yahoo Finance

### Technical Indicators (Calculated Locally)

- **RSI (Relative Strength Index)**: Calculated from 3-month daily price history using
  the standard 14-period smoothed RSI formula. Values below 30 indicate oversold conditions;
  above 70 indicates overbought.
- **Moving average crossovers**: Golden cross (50MA > 200MA) and death cross (50MA < 200MA)
  are detected from Yahoo's pre-calculated 50-day and 200-day moving averages.

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

**Fundamental data on suggestions**: Each ETF suggestion card shows available fundamental
metrics (dividend yield, P/E ratio, 50-day and 200-day moving averages, beta, analyst
consensus) fetched from Yahoo Finance, helping you evaluate each suggestion beyond just
the category allocation.

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
- Uses a **composite scoring system** (0-100) combining four dimensions:

**Composite Score (0-100)**:
Each stock gets a score based on four weighted dimensions:

| Dimension        | Weight | What it measures                                      |
|------------------|--------|-------------------------------------------------------|
| Value (30%)      | 0.30   | Forward P/E, PEG ratio, price-to-book, analyst target upside, 52-week position |
| Momentum (25%)   | 0.25   | Price vs 50-day MA, price vs 200-day MA, golden/death cross, RSI |
| Quality (25%)    | 0.25   | Earnings growth, revenue growth, return on equity, profit margin, dividend yield |
| Analyst (20%)    | 0.20   | Analyst buy/hold/sell consensus and recommendation mean |

Each dimension starts at 50 and adjusts up/down based on specific thresholds:
- **Value example**: Forward P/E < 12 adds +20, PEG < 1 adds +15, analyst target 20%+ above
  price adds +15
- **Momentum example**: Price above 50-day MA adds +15, golden cross adds +10, RSI < 30
  (oversold) adds +15
- **Quality example**: Earnings growth > 15% adds +20, ROE > 20% adds +10
- **Analyst example**: Mean recommendation ≤ 2.0 (buy) adds +20

Score labels:
- **Strong** (70+): Multiple positive signals across dimensions
- **Good** (55-69): More positives than negatives
- **Neutral** (40-54): Mixed signals
- **Weak** (25-39): More negatives than positives
- **Poor** (<25): Multiple negative signals

**Top Ranked Stocks**: All tracked stocks ranked by composite score, showing the score
breakdown bars, key fundamental metrics (P/E, PEG, earnings growth, yield, targets, MAs,
RSI, beta), and the individual signals that contributed to the score.

**Discounted from Peak**: Stocks 5%+ below their 52-week high, but now sorted by composite
score instead of just discount percentage. This means a 10% dip with strong fundamentals
and analyst support ranks higher than a 30% dip with deteriorating earnings.

- **News matching**: For each discounted stock, RSS articles are searched for mentions
  of the ticker or company name. Headlines shown for context on price drops.

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
  1. Server-side in-memory cache (60s quotes, 5min history, 5min fundamentals)
  2. Client-side module-level cache outside React (30s quotes, 5min history, 5min fundamentals)
  3. JSON snapshot comparison before React state updates (prevents re-renders with
     identical data)
- **Composite scoring engine**: Runs client-side combining price data, fundamentals, and
  technical indicators into a weighted 0-100 score for each stock

---

## Disclaimer

This application is a portfolio tracking and visualisation tool. The investment
suggestions, composite scores, and opportunities analysis are based on quantitative
metrics (fundamental ratios, technical indicators, analyst consensus, price data)
and a curated list of well-known ETFs. The composite scoring system is a simplified
model — it does not account for macroeconomic conditions, sector-specific risks,
company-specific events, or your personal financial situation. Scores should be
treated as a starting point for research, not a buy/sell signal. This is **not
financial advice**. Always conduct your own research and consider consulting a
licensed financial adviser before making investment decisions.
