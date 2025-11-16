const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

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

export const api = {
  me: (token: string) => apiFetch<SafeUser>('/api/v1/users/me', { token }),
};
