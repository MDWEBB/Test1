"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Holding, Transaction } from "./types";

interface PortfolioContextType {
  holdings: Holding[];
  addHolding: (holding: Omit<Holding, "id" | "transactions">, purchaseDate?: string) => void;
  addTransaction: (holdingId: string, transaction: Omit<Transaction, "id">) => void;
  updateHolding: (id: string, updates: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  watchlist: string[];
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

const STORAGE_KEY = "portfolio-holdings";
const WATCHLIST_KEY = "portfolio-watchlist";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        // Ensure backwards compatibility: add default market and migrate to transactions
        const parsed = JSON.parse(saved);
        setHoldings(parsed.map((h: Holding) => {
          const holding = { ...h, market: h.market || "US" };
          // Migrate old holdings without transactions to have an initial transaction
          if (!holding.transactions || holding.transactions.length === 0) {
            holding.transactions = [{
              id: generateId(),
              date: holding.dateAdded || new Date().toISOString(),
              shares: holding.shares,
              pricePerShare: holding.avgCost,
              totalAmount: holding.shares * holding.avgCost,
              type: "buy" as const,
              notes: "Initial purchase (migrated)",
            }];
          }
          return holding;
        }));
      } catch {}
    }
    const savedWatchlist = localStorage.getItem(WATCHLIST_KEY);
    if (savedWatchlist) {
      try {
        setWatchlist(JSON.parse(savedWatchlist));
      } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    }
  }, [holdings, loaded]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    }
  }, [watchlist, loaded]);

  const addHolding = useCallback((holding: Omit<Holding, "id" | "transactions">, purchaseDate?: string) => {
    const holdingId = generateId();
    const transactionDate = purchaseDate || holding.dateAdded || new Date().toISOString();
    const initialTransaction: Transaction = {
      id: generateId(),
      date: transactionDate,
      shares: holding.shares,
      pricePerShare: holding.avgCost,
      totalAmount: holding.shares * holding.avgCost,
      type: "buy",
    };
    setHoldings((prev) => [...prev, {
      ...holding,
      id: holdingId,
      dateAdded: transactionDate,
      transactions: [initialTransaction],
    }]);
  }, []);

  const addTransaction = useCallback((holdingId: string, transaction: Omit<Transaction, "id">) => {
    setHoldings((prev) =>
      prev.map((h) => {
        if (h.id !== holdingId) return h;

        const newTransaction: Transaction = { ...transaction, id: generateId() };
        const transactions = [...(h.transactions || []), newTransaction];

        // Recalculate shares and avgCost from all transactions
        let totalShares = 0;
        let totalCost = 0;

        for (const t of transactions) {
          if (t.type === "buy") {
            totalCost += t.shares * t.pricePerShare;
            totalShares += t.shares;
          } else {
            // For sells, reduce shares but don't affect avgCost calculation
            totalShares -= t.shares;
          }
        }

        const avgCost = totalShares > 0 ? totalCost / totalShares : h.avgCost;

        return {
          ...h,
          shares: totalShares,
          avgCost,
          transactions,
        };
      })
    );
  }, []);

  const updateHolding = useCallback((id: string, updates: Partial<Holding>) => {
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
  }, []);

  const removeHolding = useCallback((id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const addToWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) =>
      prev.includes(ticker.toUpperCase())
        ? prev
        : [...prev, ticker.toUpperCase()]
    );
  }, []);

  const removeFromWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => prev.filter((t) => t !== ticker.toUpperCase()));
  }, []);

  if (!loaded) return null;

  return (
    <PortfolioContext.Provider
      value={{
        holdings,
        addHolding,
        addTransaction,
        updateHolding,
        removeHolding,
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
