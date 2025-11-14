import { Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListTherapistsQueryDto } from './dto/list-therapists-query.dto';

export interface TherapistSummary {
  id: string;
  fullName: string;
  city?: string | null;
  specialties: string[];
  experienceYears?: number | null;
  photoUrl?: string | null;
  gender?: string | null;
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

    return {
      data: items.map((profile) => ({
        id: profile.userId,
        fullName: profile.fullName,
        city: profile.city,
        specialties: profile.specialties,
        experienceYears: profile.experienceYears,
        photoUrl: profile.photoUrl,
        gender: profile.gender,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
