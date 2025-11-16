import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface RecordAuditParams {
  action: string;
  actorId?: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(params: RecordAuditParams) {
    return this.prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata:
          params.metadata !== undefined ? params.metadata : Prisma.JsonNull,
      },
    });
  }
}
