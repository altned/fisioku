import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  SessionStatus,
} from '@prisma/client';
import { PatientAddressResponse } from '../../patient-addresses/interfaces/patient-address-response.interface';

export interface BookingSessionResponse {
  id: string;
  sessionNumber: number;
  scheduledAt?: Date | null;
  status: SessionStatus;
  note?: string | null;
}

export interface BookingPaymentResponse {
  status: PaymentStatus;
  method: PaymentMethod;
  proofUrl?: string | null;
  proofFileId?: string | null;
  amount: string;
  uploadedAt?: Date | null;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
  therapistSharePercentage?: number | null;
  platformFeePercentage?: number | null;
  therapistShareAmount?: string | null;
  platformFeeAmount?: string | null;
}

export interface BookingReviewResponse {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}

export interface BookingConsentResponse {
  textVersion: string;
  acceptedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface BookingResponse {
  id: string;
  patientId: string;
  patient: {
    id: string;
    email: string;
    fullName?: string | null;
  };
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
  consent?: BookingConsentResponse | null;
  patientAddress?: PatientAddressResponse | null;
  createdAt: Date;
}
