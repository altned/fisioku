import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller({
  path: 'packages',
  version: '1',
})
export class PackagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.therapyPackage.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
