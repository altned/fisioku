import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express, Response } from 'express';
import { FilesService, SignedUrlResponse } from './files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';

@Controller({
  path: 'files',
  version: '1',
})
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('payment-proof')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPaymentProof(
    @CurrentUser() user: ActiveUserData,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<SignedUrlResponse> {
    return this.filesService.uploadPaymentProof(user.id, file);
  }

  @Post(':fileId/sign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  signFile(
    @CurrentUser() user: ActiveUserData,
    @Param('fileId', new ParseUUIDPipe()) fileId: string,
  ): Promise<SignedUrlResponse> {
    return this.filesService.issueSignedUrl(fileId, user);
  }

  @Get(':fileId/content')
  async streamFile(
    @Param('fileId', new ParseUUIDPipe()) fileId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const { stream, file } = await this.filesService.streamFileByToken(
      fileId,
      token,
    );
    if (file.mimeType) {
      res.setHeader('Content-Type', file.mimeType);
    }
    const dispositionName = file.originalName ?? 'download';
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${dispositionName.replace(/"/g, '')}"`,
    );
    stream.pipe(res);
  }
}
