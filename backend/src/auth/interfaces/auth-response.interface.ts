import { SafeUser } from '../../users/dto/safe-user.dto';

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}
