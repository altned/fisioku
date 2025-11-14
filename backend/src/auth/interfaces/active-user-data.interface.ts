import { UserRole } from '@prisma/client';

export interface ActiveUserData {
  id: string;
  email: string;
  role: UserRole;
}
