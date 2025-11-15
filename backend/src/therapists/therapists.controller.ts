import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TherapistsService } from './therapists.service';
import { ListTherapistsQueryDto } from './dto/list-therapists-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller({
  path: 'therapists',
  version: '1',
})
export class TherapistsController {
  constructor(private readonly therapistsService: TherapistsService) {}

  @Get()
  list(@Body() query: ListTherapistsQueryDto) {
    return this.therapistsService.list(query);
  }

  @Get(':id/availability')
  getAvailability(@Param('id', new ParseUUIDPipe()) therapistId: string) {
    return this.therapistsService.listAvailability(therapistId);
  }

  @Post('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.THERAPIST)
  createAvailability(
    @CurrentUser() therapist: ActiveUserData,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.therapistsService.createAvailability(therapist.id, dto);
  }
}
