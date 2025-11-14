import { Gender, UserRole, UserStatus } from '@prisma/client';

export interface ProfileSummary {
  id: string;
  fullName: string;
  gender?: Gender | null;
  dob?: Date | null;
  city?: string | null;
  specialties?: string[];
  experienceYears?: number | null;
  licenseNumber?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
}

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  patientProfile?: ProfileSummary | null;
  therapistProfile?: ProfileSummary | null;
}
