// File: frontend/src/dashboard/components/GlobalMessagingContext.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type GlobalMessagingRecipient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  meta?: string;
};

export type GlobalMessagingPageData = {
  scope?: "applications" | "program_applications";
  recipients: GlobalMessagingRecipient[];
  selectedRecipientIds: string[];
  statusOptions?: string[];
};

type GlobalMessagingContextValue = {
  pageData: GlobalMessagingPageData | null;
  setPageData: (data: GlobalMessagingPageData | null) => void;
};

const GlobalMessagingContext = createContext<GlobalMessagingContextValue | null>(null);

export function GlobalMessagingProvider({ children }: { children: ReactNode }) {
  const [pageData, setPageData] = useState<GlobalMessagingPageData | null>(null);

  const value = useMemo<GlobalMessagingContextValue>(() => ({ pageData, setPageData }), [pageData]);

  return <GlobalMessagingContext.Provider value={value}>{children}</GlobalMessagingContext.Provider>;
}

export function useGlobalMessagingContext() {
  const context = useContext(GlobalMessagingContext);
  if (!context) {
    throw new Error("useGlobalMessagingContext must be used within GlobalMessagingProvider.");
  }
  return context;
}
