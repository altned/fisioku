import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  SessionStatus,
} from '@prisma/client';

export interface BookingSessionResponse {
  id: string;
  sessionNumber: number;
  scheduledAt?: Date | null;
  status: SessionStatus;
}

export interface BookingPaymentResponse {
  status: PaymentStatus;
  method: PaymentMethod;
  proofUrl?: string | null;
  amount: string;
  uploadedAt?: Date | null;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
}

export interface BookingReviewResponse {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}

export interface BookingResponse {
  id: string;
  patientId: string;
  therapist: {
    id: string;
    fullName: string;
    city?: string | null;
    specialties: string[];
    photoUrl?: string | null;
  };
  package: {
    id: string;
    name: string;
    sessionCount: number;
    price: string;
  };
  status: BookingStatus;
  notesFromPatient?: string | null;
  painLevel?: number | null;
  preferredSchedule: Date;
  consentAccepted: boolean;
  paymentDueAt?: Date | null;
  sessions: BookingSessionResponse[];
  payment?: BookingPaymentResponse | null;
  review?: BookingReviewResponse | null;
  createdAt: Date;
}
