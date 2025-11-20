import { Injectable } from '@nestjs/common';
import { Prisma, PatientAddress } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientAddressDto } from './dto/create-patient-address.dto';
import { PatientAddressResponse } from './interfaces/patient-address-response.interface';

@Injectable()
export class PatientAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(patientId: string): Promise<PatientAddressResponse[]> {
    const addresses = await this.prisma.patientAddress.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return addresses.map((address) => this.mapResponse(address));
  }

  async create(
    patientId: string,
    dto: CreatePatientAddressDto,
  ): Promise<PatientAddressResponse> {
    const address = await this.prisma.patientAddress.create({
      data: {
        patientId,
        label: dto.label,
        fullAddress: dto.fullAddress,
        city: dto.city,
        latitude: this.toDecimal(dto.latitude),
        longitude: this.toDecimal(dto.longitude),
        landmark: dto.landmark,
      },
    });
    return this.mapResponse(address);
  }

  private toDecimal(value?: number | null): Prisma.Decimal | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    return new Prisma.Decimal(value);
  }

  private mapResponse(address: PatientAddress): PatientAddressResponse {
    return {
      id: address.id,
      label: address.label,
      fullAddress: address.fullAddress,
      city: address.city,
      latitude: address.latitude ? Number(address.latitude) : null,
      longitude: address.longitude ? Number(address.longitude) : null,
      landmark: address.landmark,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}

