"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Holding } from "./types";

interface PortfolioContextType {
  holdings: Holding[];
  addHolding: (holding: Omit<Holding, "id">) => void;
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
        setHoldings(JSON.parse(saved));
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

  const addHolding = useCallback((holding: Omit<Holding, "id">) => {
    setHoldings((prev) => [...prev, { ...holding, id: generateId() }]);
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
