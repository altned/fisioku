const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const buildPath = (path: string, params?: Record<string, string | number | undefined>) => {
  if (!params) {
    return path;
  }
  const url = new URL(path, 'http://localhost');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return `${url.pathname}${url.search}`;
};

export interface ApiOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }

  return (await response.json()) as T;
}

export async function loginRequest(payload: { email: string; password: string }) {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Gagal login');
  }

  return (await response.json()) as {
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
}

export type SafeUser = {
  id: string;
  email: string;
  role: string;
  patientProfile?: { fullName?: string | null } | null;
  therapistProfile?: { fullName?: string | null } | null;
};

export type TherapistSummary = {
  id: string;
  fullName: string;
  city?: string | null;
  specialties: string[];
  experienceYears?: number | null;
  photoUrl?: string | null;
};

export type TherapyPackageSummary = {
  id: string;
  name: string;
  sessionCount: number;
  price: number;
};

export type BookingSummary = {
  id: string;
  status: string;
  preferredSchedule: string;
  createdAt: string;
  therapist: {
    id: string;
    fullName: string;
  };
  package: {
    id: string;
    name: string;
  };
};

export const api = {
  me: (token: string) => apiFetch<SafeUser>('/api/v1/users/me', { token }),
  therapists: (token: string, params?: { page?: number; limit?: number; search?: string }) =>
    apiFetch<{
      data: TherapistSummary[];
      meta: { page: number; limit: number; total: number };
    }>(buildPath('/api/v1/therapists', params), {
      token,
    }),
  packages: () => apiFetch<TherapyPackageSummary[]>('/api/v1/packages'),
  createBooking: (
    token: string,
    payload: {
      therapistId: string;
      packageId: string;
      preferredSchedule: string;
      consentAccepted: boolean;
      notesFromPatient?: string;
      painLevel?: number;
    },
  ) =>
    apiFetch<{ id: string; status: string }>('/api/v1/bookings', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  acceptConsent: (token: string, bookingId: string, textVersion: string) =>
    apiFetch(`/api/v1/bookings/${bookingId}/consent`, {
      method: 'POST',
      token,
      body: JSON.stringify({ textVersion }),
    }),
  myBookings: (token: string) =>
    apiFetch<BookingSummary[]>('/api/v1/bookings', {
      token,
    }),
  uploadBookingProof: (token: string, bookingId: string, fileId: string) =>
    apiFetch(`/api/v1/bookings/${bookingId}/payment-proof`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ fileId }),
    }),
  cancelBooking: (token: string, bookingId: string) =>
    apiFetch(`/api/v1/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      token,
    }),
};

type UploadAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export async function uploadPaymentProofFile(token: string, asset: UploadAsset) {
  const formData = new FormData();
  const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'proof.jpg';
  const type = asset.mimeType ?? 'image/jpeg';
  formData.append('file', {
    uri: asset.uri,
    name,
    type,
  } as any);

  const response = await fetch(`${API_BASE}/api/v1/files/payment-proof`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Gagal upload file');
  }

  return (await response.json()) as { fileId: string; signedUrl: string };
}
