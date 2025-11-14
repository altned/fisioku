import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientProfile, TherapistProfile, User } from '@prisma/client';
import { SafeUser } from './dto/safe-user.dto';
import { PrismaService } from '../prisma/prisma.service';

export type UserWithProfiles = User & {
  patientProfile?: PatientProfile | null;
  therapistProfile?: TherapistProfile | null;
};

@Injectable()
export class UsersService {
  static readonly userWithProfilesInclude = {
    patientProfile: true,
    therapistProfile: true,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: UsersService.userWithProfilesInclude,
    });
  }

  async findById(id: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: UsersService.userWithProfilesInclude,
    });
  }

  async getMe(id: string): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafeUser(user);
  }

  toSafeUser(user: UserWithProfiles): SafeUser {
    const { password: _password, ...rest } = user;
    void _password;
    return rest as SafeUser;
  }
}
