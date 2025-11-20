import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { PatientAddressesService } from './patient-addresses.service';
import { CreatePatientAddressDto } from './dto/create-patient-address.dto';

@Controller({
  path: 'patient-addresses',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PATIENT)
export class PatientAddressesController {
  constructor(
    private readonly patientAddressesService: PatientAddressesService,
  ) {}

  @Get()
  list(@CurrentUser() user: ActiveUserData) {
    return this.patientAddressesService.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: CreatePatientAddressDto,
  ) {
    return this.patientAddressesService.create(user.id, dto);
  }
}

