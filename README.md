# MarketPulse 📈⚡

**MarketPulse** is a smart Indian stock watchlist application built for hackathons.

Unlike standard stock watchlists that flood users with raw tickers and continuous noise, MarketPulse answers the critical question:

> **"What meaningfully changed since I last checked, what happened while I was away, and what can I safely ignore?"**

---

## 🌟 Key Features

1. **"Since You Last Checked" Dashboard**:
   - Calculates percentage change from user's **stored baseline** (`last_seen_price` & `last_seen_at`).
   - Categorizes stocks into 3 distinct attention zones:
     - 🔴 **Needs Attention** (`|Change| >= 5%`): High price shifts with explicit "Why am I seeing this?" root-cause explanation.
     - 🟡 **Worth Watching** (`2% <= |Change| < 5%`): Moderate stock movements.
     - 🟢 **Quiet Stocks** (`|Change| < 2%`): Minimal price shifts highlighted with explicit explanation *"These stocks did not meaningfully change. You don't need to review them right now."*
2. **"While You Were Away" Rewind Timeline**:
   - Reconstructs chronological price milestones & catalyst events between the user's last check-in timestamp and now.
3. **Single Watchlist Management**:
   - Simple, fast add/remove stock workflow supporting 10 top Indian mock stocks (`RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `ICICIBANK`, `SBIN`, `ITC`, `BHARTIARTL`, `LT`, `HINDUNILVR`).
4. **Supabase Auth & Database + Seamless Demo Mode**:
   - Fully integrated Supabase Authentication and PostgreSQL schema with Row Level Security (RLS).
   - If Supabase environment variables are missing or unconfigured, MarketPulse gracefully operates in **Demo Mode** using an in-memory store so anyone can evaluate the app instantly.

---

## 🏗️ Architecture & Project Structure

```text
marketpulse/
├── client/                 # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/    # Reusable UI components (StockCard, TimeAwayHeader, etc.)
│   │   ├── pages/         # LoginPage and DashboardPage
│   │   ├── services/      # Frontend API client
│   │   └── lib/           # Supabase client & Demo Mode helper
├── server/                 # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── providers/     # MarketDataProvider interface & MockMarketDataProvider
│   │   ├── services/      # Store service & Dashboard logic
│   │   └── routes/        # Express REST endpoints
├── supabase/
│   └── schema.sql         # Supabase PostgreSQL schema with RLS policies
├── .env.example
└── README.md
```

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 1. Install Dependencies

In the root directory, install dependencies for both server and client:

```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Configure Environment (Optional for Supabase)

Copy `.env.example` to `.env` in the server root if you want to connect to a real Supabase project:

```bash
# Optional: In server directory
cp .env.example .env
```

If Supabase environment variables are omitted, MarketPulse will automatically start in **Demo Mode**!

### 3. Start the Backend API Server

```bash
cd server
npm run dev
```

The Express API server runs at `http://localhost:5000`.

### 4. Start the Frontend React Client

In a new terminal window:

```bash
cd client
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## 🔌 Replacing Mock Data with a Real Stock API

MarketPulse uses a clean provider abstraction pattern located at:

📁 `server/src/providers/MarketDataProvider.ts`

```typescript
export interface MarketDataProvider {
  getAvailableStocks(): Promise<StockInfo[]>;
  getLatestPrices(symbols?: string[]): Promise<Record<string, number>>;
  getPriceHistory(symbol: string, fromTimestamp: string, toTimestamp: string): Promise<HistoricalPoint[]>;
}
```

### How to Swap in a Real Indian Stock API:

1. Create a new provider class, e.g. `server/src/providers/ZerodhaMarketDataProvider.ts` or `AlphaVantageMarketDataProvider.ts`, implementing `MarketDataProvider`.
2. Implement `getLatestPrices` by querying your live market API (e.g. NSE / BSE ticker endpoints).
3. Implement `getPriceHistory` by retrieving candle/historical data for the requested symbol and timeframe.
4. In `server/src/index.ts`, replace:
   ```typescript
   // const marketProvider = new MockMarketDataProvider();
   const marketProvider = new ZerodhaMarketDataProvider(process.env.API_KEY);
   ```
5. Done! The REST API routes, dashboard categorization logic, and frontend UI remain unchanged.

---

## 🛢️ Supabase Database & Google OAuth Setup

### 1. Database Provisioning
1. Go to your [Supabase Dashboard](https://supabase.com) and open the **SQL Editor**.
2. Copy and execute the contents of `supabase/schema.sql`.
3. Copy your **Supabase URL** and **Anon Key** into `server/.env` and `client/.env`.

### 2. Google OAuth Provider Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. In your **Supabase Dashboard**, navigate to **Authentication** -> **Providers** -> **Google**.
4. Enable the **Google** provider and enter:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
5. Copy the **Callback URL** provided by Supabase (e.g., `https://<your-project-id>.supabase.co/auth/v1/callback`) and paste it into **Authorized redirect URIs** in Google Cloud Console.
6. In Supabase **Authentication** -> **URL Configuration**, set **Site URL** to `http://localhost:3000` (or your production frontend URL).

