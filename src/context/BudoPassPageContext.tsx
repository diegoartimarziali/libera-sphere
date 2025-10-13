"use client"

import React, { createContext, useContext, useMemo, useRef } from 'react';

interface BudoPassPageContextValue {
  getPageNumber: (id: string) => number;
}

const BudoPassPageContext = createContext<BudoPassPageContextValue | null>(null);

interface ProviderProps {
  startAt?: number; // default 1
  children: React.ReactNode;
}

export function BudoPassPageProvider({ startAt = 1, children }: ProviderProps) {
  // Mappa ID -> numero pagina, garantisce stabilità anche tra re-render
  const assignedRef = useRef<Map<string, number>>(new Map());
  const counterRef = useRef<number>(startAt - 1);

  const value = useMemo<BudoPassPageContextValue>(() => ({
    getPageNumber: (id: string) => {
      if (!assignedRef.current.has(id)) {
        counterRef.current += 1;
        assignedRef.current.set(id, counterRef.current);
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return assignedRef.current.get(id)!;
    }
  }), []);

  return (
    <BudoPassPageContext.Provider value={value}>
      {children}
    </BudoPassPageContext.Provider>
  );
}

export function useBudoPassPageNumber(id: string): number {
  const ctx = useContext(BudoPassPageContext);
  if (!ctx) {
    throw new Error('useBudoPassPageNumber must be used within a BudoPassPageProvider');
  }
  return ctx.getPageNumber(id);
}
