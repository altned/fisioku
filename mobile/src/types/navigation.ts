import type { TherapistSummary, BookingSummary } from '../api/client';

export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  AppTabs: undefined;
  TherapistDetail: { therapist: TherapistSummary };
  BookingRequest: { therapist: TherapistSummary };
  BookingDetail: { booking: BookingSummary };
};

export type AppTabParamList = {
  Home: undefined;
  Therapists: undefined;
  Bookings: undefined;
  Profile: undefined;
};
