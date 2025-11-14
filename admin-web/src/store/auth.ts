"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  token?: string;
  setToken: (token?: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      setToken: (token) => set({ token }),
      logout: () => set({ token: undefined }),
    }),
    {
      name: "fisioku-admin-auth",
    },
  ),
);

export const authStore = useAuthStore;
