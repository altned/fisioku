import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller({
  path: 'bookings',
  version: '1',
})
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':bookingId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  createReview(
    @CurrentUser() user: ActiveUserData,
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, bookingId, dto);
  }
}
