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
  averageRating?: number | null;
  reviewCount: number;
};

export type TherapyPackageSummary = {
  id: string;
  name: string;
  sessionCount: number;
  price: number;
};

export type TherapistAvailability = {
  id: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringWeekday?: number | null;
};

export type TherapistReviewEntry = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  patientName: string;
};

export type BookingResponse = {
  id: string;
  status: string;
  preferredSchedule: string;
  paymentDueAt?: string | null;
  createdAt: string;
  notesFromPatient?: string | null;
  painLevel?: number | null;
  patientId: string;
  patient: {
    id: string;
    email: string;
    fullName?: string | null;
  };
  therapist: {
    id: string;
    fullName: string;
  };
  package: {
    id: string;
    name: string;
    sessionCount: number;
    price: string;
  };
  sessions: Array<{
    id: string;
    sessionNumber: number;
    scheduledAt?: string | null;
    status: string;
    note?: string | null;
  }>;
  review?: {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
  } | null;
  payment?: {
    status: string;
    method: string;
    proofUrl?: string | null;
    proofFileId?: string | null;
    amount: string;
    uploadedAt?: string | null;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    therapistSharePercentage?: number | null;
    platformFeePercentage?: number | null;
    therapistShareAmount?: string | null;
    platformFeeAmount?: string | null;
  } | null;
  patientAddress?: {
    id: string;
    label?: string | null;
    fullAddress: string;
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    landmark?: string | null;
  } | null;
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
      patientAddressId?: string;
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
    apiFetch<BookingResponse[]>('/api/v1/bookings', {
      token,
    }),
  myTherapistBookings: (token: string, params?: { status?: string }) =>
    apiFetch<BookingResponse[]>(buildPath('/api/v1/bookings/assigned', params), {
      token,
    }),
  uploadBookingProof: (token: string, bookingId: string, fileId: string) =>
    apiFetch(`/api/v1/bookings/${bookingId}/payment-proof`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ fileId }),
    }),
  confirmBookingAsTherapist: (
    token: string,
    bookingId: string,
    accept: boolean,
  ) =>
    apiFetch(`/api/v1/bookings/${bookingId}/therapist-confirm`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ accept }),
    }),
  cancelBooking: (token: string, bookingId: string) =>
    apiFetch(`/api/v1/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      token,
    }),
  scheduleSession: (
    token: string,
    sessionId: string,
    scheduledAt: string,
  ) =>
    apiFetch(`/api/v1/booking-sessions/${sessionId}/schedule`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ scheduledAt }),
    }),
  chatThread: (token: string, bookingId: string) =>
    apiFetch<{
      firestoreId: string;
      bookingId: string;
      locked: boolean;
      lockedUntil?: string | null;
    }>(`/api/v1/chat/threads/${bookingId}`, {
      token,
    }),
  registerNotificationToken: (
    token: string,
    payload: { token: string; platform?: string },
  ) =>
    apiFetch('/api/v1/notifications/tokens', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  removeNotificationToken: (token: string, deviceToken: string) =>
    apiFetch(
      `/api/v1/notifications/tokens/${encodeURIComponent(deviceToken)}`,
      {
        method: 'DELETE',
        token,
      },
    ),
  sendChatMessage: (token: string, bookingId: string, message: string) =>
    apiFetch(`/api/v1/chat/threads/${bookingId}/messages`, {
      method: 'POST',
      token,
      body: JSON.stringify({ message }),
    }),
  submitReview: (
    token: string,
    bookingId: string,
    payload: { rating: number; comment?: string },
  ) =>
    apiFetch(`/api/v1/bookings/${bookingId}/review`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  upsertSessionNote: (
    token: string,
    sessionId: string,
    payload: { content: string },
  ) =>
    apiFetch(`/api/v1/booking-sessions/${sessionId}/note`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  therapistAvailability: (token: string, therapistId: string) =>
    apiFetch<TherapistAvailability[]>(
      `/api/v1/therapists/${therapistId}/availability`,
      { token },
    ),
  therapistReviews: (
    therapistId: string,
    params?: { limit?: number },
  ) =>
    apiFetch<TherapistReviewEntry[]>(
      buildPath(`/api/v1/therapists/${therapistId}/reviews`, params),
    ),
  createTherapistAvailability: (
    token: string,
    payload: { startTime: string; endTime: string; isRecurring?: boolean },
  ) =>
    apiFetch('/api/v1/therapists/availability', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  listPatientAddresses: (token: string) =>
    apiFetch<
      Array<{
        id: string;
        label?: string | null;
        fullAddress: string;
        city?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        landmark?: string | null;
        createdAt: string;
        updatedAt: string;
      }>
    >('/api/v1/patient-addresses', {
      token,
    }),
  createPatientAddress: (
    token: string,
    payload: {
      label?: string;
      fullAddress: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      landmark?: string;
    },
  ) =>
    apiFetch<{
      id: string;
      label?: string | null;
      fullAddress: string;
      city?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      landmark?: string | null;
      createdAt: string;
      updatedAt: string;
    }>('/api/v1/patient-addresses', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
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
