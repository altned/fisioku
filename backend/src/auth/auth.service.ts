import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService, UserWithProfiles } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin account cannot be self-registered');
    }

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        role: dto.role,
        status: UserStatus.ACTIVE,
        patientProfile: this.buildPatientProfile(dto),
        therapistProfile: this.buildTherapistProfile(dto),
      },
      include: UsersService.userWithProfilesInclude,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: UsersService.userWithProfilesInclude,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(
    user: UserWithProfiles,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);
    return {
      accessToken: token,
      user: this.usersService.toSafeUser(user),
    };
  }

  private buildPatientProfile(
    dto: RegisterDto,
  ): Prisma.PatientProfileCreateNestedOneWithoutUserInput | undefined {
    if (dto.role !== UserRole.PATIENT) {
      return undefined;
    }

    return {
      create: {
        fullName: dto.fullName,
        gender: dto.gender,
        dob: dto.dob ? new Date(dto.dob) : undefined,
      },
    };
  }

  private buildTherapistProfile(
    dto: RegisterDto,
  ): Prisma.TherapistProfileCreateNestedOneWithoutUserInput | undefined {
    if (dto.role !== UserRole.THERAPIST) {
      return undefined;
    }

    return {
      create: {
        fullName: dto.fullName,
        gender: dto.gender,
        city: dto.city,
        specialties: dto.specialties ?? [],
        experienceYears: dto.experienceYears,
        licenseNumber: dto.licenseNumber,
        photoUrl: dto.photoUrl,
        bio: dto.bio,
      },
    };
  }
}
