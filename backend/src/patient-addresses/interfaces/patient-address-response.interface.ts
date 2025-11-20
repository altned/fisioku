export interface PatientAddressResponse {
  id: string;
  label?: string | null;
  fullAddress: string;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

