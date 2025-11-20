import { Module } from '@nestjs/common';
import { PatientAddressesController } from './patient-addresses.controller';
import { PatientAddressesService } from './patient-addresses.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PatientAddressesController],
  providers: [PatientAddressesService],
  exports: [PatientAddressesService],
})
export class PatientAddressesModule {}

