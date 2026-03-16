// File: frontend/src/dashboard/stores/useAuthStore.ts
// Purpose: Zustand store for admin authentication state.
// Replaces direct localStorage reads via getToken/getUser with reactive shared state.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type AuthUser, normalizeUser } from "../utils/auth";

type AuthStore = {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: unknown) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) =>
        set({ token, user: normalizeUser(user) }),
      clearAuth: () => set({ token: null, user: null }),
      isAuthenticated: () => Boolean(get().token),
    }),
    {
      name: "dh-auth",
      // Migrate existing localStorage keys from the old auth system on first load.
      // If dh-auth doesn't exist yet but dh_admin_token does, seed the store.
      onRehydrateStorage: () => (state) => {
        if (state && state.token === null) {
          const legacyToken = localStorage.getItem("dh_admin_token");
          const legacyUserRaw = localStorage.getItem("dh_admin_user");
          if (legacyToken) {
            try {
              const legacyUser = legacyUserRaw ? JSON.parse(legacyUserRaw) : null;
              state.token = legacyToken;
              state.user = normalizeUser(legacyUser);
            } catch {
              // Ignore corrupt legacy data.
            }
          }
        }
      },
    },
  ),
);
