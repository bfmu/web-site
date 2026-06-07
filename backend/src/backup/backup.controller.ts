import {
  Controller,
  Post,
  Get,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const MAX_BACKUP_SIZE =
  Number(process.env.BACKUP_MAX_SIZE) || 2 * 1024 * 1024 * 1024;

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(private readonly backupService: BackupService) {}

  @Post('create')
  async create(@Res({ passthrough: false }) res: Response): Promise<void> {
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.tar.gz`;
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await this.backupService.createBackup(res);
  }

  @Get('list')
  async list(): Promise<{ backups: Array<{ name: string; path: string }> }> {
    const backups: Array<{ name: string; path: string }> = [];
    // Optional: list pre-restore backups from ./backups. Not storing created backups on server.
    return { backups };
  }

  @Post('validate')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BACKUP_SIZE },
    }),
  )
  async validate(@UploadedFile() file: Express.Multer.File): Promise<{
    valid: boolean;
    metadata?: any;
    warnings: string[];
    error?: string;
  }> {
    this.logger.log(
      'validate called, file=' +
        (file ? `${file.originalname} ${file.size}b` : 'null'),
    );
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo.');
    }
    if (!file.originalname.toLowerCase().endsWith('.tar.gz')) {
      throw new BadRequestException('El archivo debe ser un backup .tar.gz');
    }
    const buffer = file.buffer as Buffer;
    return this.backupService.validateBackup(buffer, buffer.length);
  }

  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BACKUP_SIZE },
    }),
  )
  async restore(@UploadedFile() file: Express.Multer.File): Promise<{
    success: boolean;
    restored: any;
    preRestoreBackupPath?: string;
    error?: string;
  }> {
    this.logger.log(
      'restore called, file=' +
        (file ? `${file.originalname} ${file.size}b` : 'null'),
    );
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo.');
    }
    if (!file.originalname.toLowerCase().endsWith('.tar.gz')) {
      throw new BadRequestException('El archivo debe ser un backup .tar.gz');
    }
    const buffer = file.buffer as Buffer;
    return this.backupService.restoreBackup(buffer, buffer.length);
  }
}
