import { createContext, useContext, type ReactNode } from "react";
import { type SalesIntelController, useIdgSalesIntel } from "./useIdgSalesIntel";

const SalesIntelContext = createContext<SalesIntelController | null>(null);

export function SalesIntelProvider({ agentId, children }: { agentId: string; children: ReactNode }) {
  const controller = useIdgSalesIntel(agentId);
  return <SalesIntelContext.Provider value={controller}>{children}</SalesIntelContext.Provider>;
}

export function useSalesIntelContext(): SalesIntelController {
  const context = useContext(SalesIntelContext);
  if (!context) {
    throw new Error("useSalesIntelContext must be used within SalesIntelProvider");
  }
  return context;
}

export function useOptionalSalesIntelContext(): SalesIntelController | null {
  return useContext(SalesIntelContext);
}
