"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";

type BalanceContextValue = {
  balance: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  setBalance: (next: number) => Promise<void>;
};

const DEFAULT_BALANCE = 5000;

const BalanceContext = React.createContext<BalanceContextValue | null>(null);

/**
 * The simulated balance, read from and written to Clerk `publicMetadata` through
 * `/api/balance`. Shared by the header (which edits it) and the dashboard (which
 * turns it into projected profit), so it lives in one place rather than being
 * fetched twice.
 */
export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [balance, setBalanceState] = React.useState(DEFAULT_BALANCE);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset during render when the auth state flips, for the same reason as in
  // `useStockData`: one user's balance must never paint under another's session.
  // Seeded to null, not to the first key: if Clerk is already loaded on the very first
  // render there is no transition to observe, and `loading` would otherwise stick at its
  // initial `true` forever.
  const authKey = `${isLoaded}|${isSignedIn}`;
  const [activeAuthKey, setActiveAuthKey] = React.useState<string | null>(null);
  if (activeAuthKey !== authKey) {
    setActiveAuthKey(authKey);
    setError(null);
    if (isLoaded && !isSignedIn) {
      setBalanceState(DEFAULT_BALANCE);
      setLoading(false);
    } else if (isLoaded) {
      setLoading(true);
    }
  }

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/balance", { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!controller.signal.aborted && typeof payload?.balance === "number") {
          setBalanceState(payload.balance);
        }
      } catch (failure) {
        if (!controller.signal.aborted && !(failure instanceof DOMException)) {
          setError("Could not load your balance.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isLoaded, isSignedIn]);

  const setBalance = React.useCallback(
    async (next: number) => {
      const previous = balance;
      setBalanceState(next); // optimistic
      setError(null);

      if (!isSignedIn) return;

      setSaving(true);
      try {
        const response = await fetch("/api/balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ balance: next }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch {
        setBalanceState(previous); // roll back so the UI never lies about what was saved
        setError("Could not save your balance.");
      } finally {
        setSaving(false);
      }
    },
    [balance, isSignedIn],
  );

  const value = React.useMemo(
    () => ({ balance, loading, saving, error, setBalance }),
    [balance, loading, saving, error, setBalance],
  );

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
}

export function useBalance() {
  const context = React.useContext(BalanceContext);
  if (!context) {
    throw new Error("useBalance must be used inside a <BalanceProvider />");
  }
  return context;
}
