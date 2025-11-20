import type { TherapistSummary, BookingResponse } from '../api/client';

export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  AppTabs: undefined;
  TherapistDetail: { therapist: TherapistSummary };
  BookingRequest: { therapist: TherapistSummary };
  BookingDetail: { booking: BookingResponse };
  Chat: { bookingId: string };
  Review: { bookingId: string };
  SessionNote: {
    bookingId: string;
    sessionId: string;
    sessionNumber: number;
    existingNote?: string | null;
  };
  TherapistAvailability: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Therapists: undefined;
  Bookings: undefined;
  Assigned: undefined;
  Profile: undefined;
};
