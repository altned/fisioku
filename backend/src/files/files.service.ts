import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StoredFile,
  StoredFilePurpose,
  StoredFileDownloadToken,
  UserRole,
} from '@prisma/client';
import { createReadStream, promises as fs } from 'fs';
import { randomBytes, randomUUID } from 'crypto';
import * as path from 'path';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { Express } from 'express';

export interface SignedUrlResponse {
  fileId: string;
  signedUrl: string;
  expiresAt: Date;
  fileName?: string | null;
  mimeType?: string | null;
  size: number;
}

@Injectable()
export class FilesService {
  private readonly storageRoot: string;
  private readonly downloadTokenTtlMs: number;
  private readonly publicBaseUrl?: string;
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.storageRoot =
      this.configService.get<string>('FILE_STORAGE_ROOT') ??
      path.join(process.cwd(), 'storage');
    const ttlMinutes = Number(
      this.configService.get<string>('FILE_DOWNLOAD_TOKEN_TTL_MINUTES') ?? '15',
    );
    this.downloadTokenTtlMs = ttlMinutes * 60_000;
    this.publicBaseUrl = this.configService.get<string>('FILE_PUBLIC_BASE_URL');
  }

  async uploadPaymentProof(
    uploaderId: string,
    file?: Express.Multer.File,
  ): Promise<SignedUrlResponse> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    this.validateFile(file);

    const fileId = randomUUID();
    const extension = this.resolveExtension(file);
    const relativePath = path.posix.join(
      'payment-proof',
      `${fileId}${extension}`,
    );
    const absolutePath = path.join(this.storageRoot, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    const storedFile = await this.prisma.storedFile.create({
      data: {
        id: fileId,
        purpose: StoredFilePurpose.PAYMENT_PROOF,
        path: relativePath,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploaderId,
      },
    });

    const token = await this.createDownloadToken(storedFile.id);
    return this.buildSignedUrlResponse(storedFile, token);
  }

  async ensurePaymentProofUsable(
    fileId: string,
    requesterId: string,
    options?: { allowDifferentUploader?: boolean },
  ): Promise<StoredFile> {
    const storedFile = await this.prisma.storedFile.findUnique({
      where: { id: fileId },
    });

    if (!storedFile || storedFile.purpose !== StoredFilePurpose.PAYMENT_PROOF) {
      throw new NotFoundException('Payment proof file not found');
    }

    if (
      !options?.allowDifferentUploader &&
      storedFile.uploaderId !== requesterId
    ) {
      throw new ForbiddenException('You cannot use this file');
    }

    const linkedPayment = await this.prisma.payment.findFirst({
      where: { proofFileId: fileId },
    });
    if (linkedPayment) {
      throw new BadRequestException('File already attached to a payment');
    }

    return storedFile;
  }

  async issueSignedUrl(
    fileId: string,
    requester: ActiveUserData,
  ): Promise<SignedUrlResponse> {
    const storedFile = await this.prisma.storedFile.findUnique({
      where: { id: fileId },
    });
    if (!storedFile) {
      throw new NotFoundException('File not found');
    }

    if (
      requester.role !== UserRole.ADMIN &&
      storedFile.uploaderId !== requester.id
    ) {
      throw new ForbiddenException('You do not have access to this file');
    }

    const token = await this.createDownloadToken(fileId);
    return this.buildSignedUrlResponse(storedFile, token);
  }

  async streamFileByToken(fileId: string, token: string) {
    if (!token) {
      throw new BadRequestException('token is required');
    }

    const tokenRecord = await this.prisma.storedFileDownloadToken.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!tokenRecord || tokenRecord.fileId !== fileId) {
      throw new NotFoundException('Invalid file token');
    }

    if (tokenRecord.usedAt) {
      throw new GoneException('Token already used');
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      throw new GoneException('Token expired');
    }

    const absolutePath = path.join(this.storageRoot, tokenRecord.file.path);
    await this.assertFileExists(absolutePath);

    await this.prisma.storedFileDownloadToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    return {
      stream: createReadStream(absolutePath),
      file: tokenRecord.file,
    };
  }

  private validateFile(file: Express.Multer.File) {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException('File exceeds 5MB limit');
    }
  }

  private resolveExtension(file: Express.Multer.File) {
    const originalExt = path.extname(file.originalname);
    if (originalExt) {
      return originalExt;
    }
    switch (file.mimetype) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'application/pdf':
        return '.pdf';
      default:
        return '';
    }
  }

  private async createDownloadToken(fileId: string) {
    const tokenValue = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.downloadTokenTtlMs);
    return this.prisma.storedFileDownloadToken.create({
      data: {
        fileId,
        token: tokenValue,
        expiresAt,
      },
    });
  }

  private buildSignedUrlResponse(
    file: StoredFile,
    token: StoredFileDownloadToken,
  ): SignedUrlResponse {
    const pathSegment = `/api/v1/files/${file.id}/content?token=${token.token}`;
    const baseUrl = this.publicBaseUrl?.replace(/\/$/, '');
    const signedUrl = baseUrl ? `${baseUrl}${pathSegment}` : pathSegment;
    return {
      fileId: file.id,
      signedUrl,
      expiresAt: token.expiresAt,
      fileName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
    };
  }

  private async assertFileExists(absolutePath: string) {
    try {
      await fs.access(absolutePath);
    } catch (error) {
      throw new NotFoundException('Stored file is missing');
    }
  }
}
