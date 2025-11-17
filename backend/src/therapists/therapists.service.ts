import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  TherapistAvailability,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListTherapistsQueryDto } from './dto/list-therapists-query.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

export interface TherapistSummary {
  id: string;
  fullName: string;
  city?: string | null;
  specialties: string[];
  experienceYears?: number | null;
  photoUrl?: string | null;
  gender?: string | null;
  averageRating?: number | null;
  reviewCount: number;
}

export interface TherapistListResponse {
  data: TherapistSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TherapistsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTherapistsQueryDto): Promise<TherapistListResponse> {
    const { page, limit, city, specialty, search } = query;
    const where: Prisma.TherapistProfileWhereInput = {
      user: {
        status: UserStatus.ACTIVE,
        role: UserRole.THERAPIST,
      },
    };

    if (city) {
      where.city = {
        equals: city,
        mode: 'insensitive',
      };
    }

    if (specialty) {
      where.specialties = {
        has: specialty,
      };
    }

    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          city: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.therapistProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          fullName: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.therapistProfile.count({ where }),
    ]);

    const therapistIds = items.map((profile) => profile.userId);
    const ratingMap: Record<
      string,
      { averageRating: number | null; reviewCount: number }
    > = {};

    if (therapistIds.length) {
      const aggregates = await this.prisma.review.groupBy({
        by: ['therapistId'],
        where: { therapistId: { in: therapistIds } },
        _avg: { rating: true },
        _count: { _all: true },
      });
      for (const aggregate of aggregates) {
        ratingMap[aggregate.therapistId] = {
          averageRating: aggregate._avg.rating ?? null,
          reviewCount: aggregate._count._all ?? 0,
        };
      }
    }

    return {
      data: items.map((profile) => {
        const rating = ratingMap[profile.userId];
        return {
          id: profile.userId,
          fullName: profile.fullName,
          city: profile.city,
          specialties: profile.specialties,
          experienceYears: profile.experienceYears,
          photoUrl: profile.photoUrl,
          gender: profile.gender,
          averageRating: rating?.averageRating ?? null,
          reviewCount: rating?.reviewCount ?? 0,
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listAvailability(therapistId: string) {
    return this.prisma.therapistAvailability.findMany({
      where: { therapistId },
      orderBy: { startTime: 'asc' },
    });
  }

  async createAvailability(
    therapistId: string,
    dto: CreateAvailabilityDto,
  ): Promise<TherapistAvailability> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.prisma.therapistAvailability.create({
      data: {
        therapistId,
        startTime: start,
        endTime: end,
        isRecurring: dto.isRecurring ?? false,
        recurringWeekday: dto.isRecurring ? dto.recurringWeekday : null,
      },
    });
  }
}
