"use client";

import { useAuthStore } from "@/store/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

interface FetchOptions extends RequestInit {
  searchParams?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, searchParams?: FetchOptions["searchParams"]) {
  const url = new URL(path, API_BASE);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function getToken() {
  return useAuthStore.getState().token;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}) {
  const url = buildUrl(path, options.searchParams);
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }

  return (await response.json()) as T;
}

export type AdminSummary = {
  bookingStatusCounts: Record<string, number>;
  totalRevenue: string;
  activeTherapists: number;
  pendingPayments: number;
};

export type BookingListResponse = {
  data: Array<{
    id: string;
    status: string;
    createdAt: string;
    patient: { email: string; patientProfile?: { fullName: string } | null };
    therapist: {
      email: string;
      therapistProfile?: { fullName: string } | null;
    };
    package: { name: string };
    payment?: { status: string } | null;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type TherapyPackage = {
  id: string;
  name: string;
  description?: string | null;
  sessionCount: number;
  price: number;
  defaultExpiryDays?: number | null;
  isActive: boolean;
  createdAt: string;
};

export const adminApi = {
  summary: () => apiFetch<AdminSummary>("/api/v1/admin/summary"),
  bookings: (params: { page?: number; status?: string }) =>
    apiFetch<BookingListResponse>("/api/v1/admin/bookings", {
      searchParams: params,
    }),
  listPackages: () => apiFetch<TherapyPackage[]>("/api/v1/admin/packages"),
  createPackage: (payload: {
    name: string;
    description?: string;
    sessionCount: number;
    price: number;
    defaultExpiryDays?: number;
  }) =>
    apiFetch<TherapyPackage>("/api/v1/admin/packages", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePackage: (id: string, payload: Partial<Omit<TherapyPackage, "id" | "createdAt" | "isActive">>) =>
    apiFetch<TherapyPackage>(`/api/v1/admin/packages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  togglePackage: (id: string, isActive: boolean) =>
    apiFetch<TherapyPackage>(`/api/v1/admin/packages/${id}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
  verifyPayment: (bookingId: string, approved: boolean) =>
    apiFetch(`/api/v1/bookings/${bookingId}/payment/verify`, {
      method: "PATCH",
      body: JSON.stringify({ approved }),
    }),
};
