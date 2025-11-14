import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(
    patientId: string,
    bookingId: string,
    dto: CreateReviewDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.patientId !== patientId) {
      throw new ForbiddenException('You cannot review this booking.');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Booking must be completed before review.');
    }

    if (booking.review) {
      throw new BadRequestException('Review already submitted.');
    }

    return this.prisma.review.create({
      data: {
        bookingId,
        patientId,
        therapistId: booking.therapistId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }
}
