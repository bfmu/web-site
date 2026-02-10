import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as archiver from 'archiver';
import * as tar from 'tar-stream';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { Readable, Writable } from 'stream';
import {
  BackupMetadata,
  ValidateBackupResult,
  RestoreResult,
} from './interfaces/backup-metadata.interface';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Post, PostDocument } from '../blog/schemas/post.schema';
import { Media, MediaDocument } from '../media/schemas/media.schema';
import { Album, AlbumDocument } from '../media/schemas/album.schema';
import {
  ApiIntegration,
  ApiIntegrationDocument,
} from '../settings/schemas/api-integration.schema';
import {
  OAuthProvider,
  OAuthProviderDocument,
} from '../settings/schemas/oauth-provider.schema';

const BACKUP_VERSION = '1.0';
const COLLECTIONS = [
  'users',
  'posts',
  'media',
  'albums',
  'apiintegrations',
  'oauthproviders',
] as const;
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BACKUP_SIZE = Number(process.env.BACKUP_MAX_SIZE) || 2 * 1024 * 1024 * 1024; // 2GB

@Injectable()
export class BackupService {
  private lastCreateAt = 0;
  private lastRestoreAt = 0;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    @InjectModel(Album.name) private albumModel: Model<AlbumDocument>,
    @InjectModel(ApiIntegration.name)
    private apiIntegrationModel: Model<ApiIntegrationDocument>,
    @InjectModel(OAuthProvider.name)
    private oauthProviderModel: Model<OAuthProviderDocument>,
  ) {}

  private getUploadsPath(): string {
    return path.join(process.cwd(), 'uploads');
  }

  private getModels(): Record<string, Model<any>> {
    return {
      users: this.userModel,
      posts: this.postModel,
      media: this.mediaModel,
      albums: this.albumModel,
      apiintegrations: this.apiIntegrationModel,
      oauthproviders: this.oauthProviderModel,
    };
  }

  async exportCollection(name: (typeof COLLECTIONS)[number]): Promise<any[]> {
    const models = this.getModels();
    const model = models[name];
    if (!model) throw new BadRequestException(`Unknown collection: ${name}`);
    const docs = await model.find().lean().exec();
    return docs;
  }

  async importCollection(
    name: (typeof COLLECTIONS)[number],
    data: any[],
  ): Promise<number> {
    if (!data || !Array.isArray(data) || data.length === 0) return 0;
    const models = this.getModels();
    const model = models[name];
    if (!model) throw new BadRequestException(`Unknown collection: ${name}`);
    await model.insertMany(data);
    return data.length;
  }

  private sha256(buf: Buffer): string {
    return crypto.createHash('sha256').update(buf).digest('hex');
  }

  async createBackup(destination: Writable): Promise<void> {
    if (Date.now() - this.lastCreateAt < RATE_LIMIT_MS) {
      throw new BadRequestException(
        'Debes esperar al menos 5 minutos entre backups.',
      );
    }
    this.lastCreateAt = Date.now();

    const archive = archiver('tar', { gzip: true });
    archive.pipe(destination);

    const counts: BackupMetadata['counts'] = {
      users: 0,
      posts: 0,
      media: 0,
      albums: 0,
      apiintegrations: 0,
      oauthproviders: 0,
    };

    const checksums: NonNullable<BackupMetadata['checksums']> = {};

    for (const col of COLLECTIONS) {
      const data = await this.exportCollection(col);
      counts[col] = data.length;
      const json = JSON.stringify(data, null, 2);
      const buf = Buffer.from(json, 'utf8');
      checksums[`database/${col}.json`] = this.sha256(buf);
      archive.append(json, { name: `database/${col}.json` });
    }

    const metadata: BackupMetadata = {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      checksums,
      counts,
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    const uploadsPath = this.getUploadsPath();
    if (fs.existsSync(uploadsPath)) {
      archive.directory(uploadsPath, 'uploads');
    }

    await new Promise<void>((resolve, reject) => {
      destination.on('finish', () => resolve());
      destination.on('error', reject);
      archive.on('error', reject);
      archive.finalize();
    });
  }

  async createBackupToFile(filePath: string): Promise<void> {
    const archive = archiver('tar', { gzip: true });
    const out = fs.createWriteStream(filePath);
    archive.pipe(out);

    const counts: BackupMetadata['counts'] = {
      users: 0,
      posts: 0,
      media: 0,
      albums: 0,
      apiintegrations: 0,
      oauthproviders: 0,
    };
    const checksums: NonNullable<BackupMetadata['checksums']> = {};

    for (const col of COLLECTIONS) {
      const data = await this.exportCollection(col);
      counts[col] = data.length;
      const json = JSON.stringify(data, null, 2);
      const buf = Buffer.from(json, 'utf8');
      checksums[`database/${col}.json`] = this.sha256(buf);
      archive.append(json, { name: `database/${col}.json` });
    }
    const metadata: BackupMetadata = {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      checksums,
      counts,
    };
    archive.append(JSON.stringify(metadata, null, 2), {
      name: 'metadata.json',
    });
    const uploadsPath = this.getUploadsPath();
    if (fs.existsSync(uploadsPath)) {
      archive.directory(uploadsPath, 'uploads');
    }

    await new Promise<void>((resolve, reject) => {
      out.on('finish', () => resolve());
      out.on('error', reject);
      archive.on('error', reject);
      archive.finalize();
    });
  }

  async validateBackup(
    fileBuffer: Buffer,
    fileSize: number,
  ): Promise<ValidateBackupResult> {
    const warnings: string[] = [];
    if (fileSize > MAX_BACKUP_SIZE) {
      return {
        valid: false,
        warnings,
        error: `El archivo supera el tamaño máximo de ${MAX_BACKUP_SIZE / 1024 / 1024 / 1024}GB.`,
      };
    }

    let extracted: Map<string, Buffer>;
    try {
      extracted = await this.extractBackupToMap(fileBuffer);
    } catch {
      return { valid: false, warnings, error: 'No se pudo extraer el archivo (corrupto o formato incorrecto).' };
    }

    const metadataBuf = extracted.get('metadata.json');
    if (!metadataBuf) {
      return { valid: false, warnings, error: 'No se encontró metadata.json.' };
    }

    let metadata: BackupMetadata;
    try {
      metadata = JSON.parse(metadataBuf.toString('utf8'));
    } catch {
      return {
        valid: false,
        warnings,
        error: 'metadata.json inválido.',
      };
    }

    for (const col of COLLECTIONS) {
      const name = `database/${col}.json`;
      if (!extracted.has(name)) {
        warnings.push(`Falta ${name}`);
      }
    }

    const hasUploads =
      [...extracted.keys()].some((k) => k.startsWith('uploads/'));
    if (!hasUploads) {
      warnings.push('No se encontró carpeta uploads.');
    }

    return {
      valid: metadata.version != null && metadata.createdAt != null,
      metadata,
      warnings,
    };
  }

  private async extractBackupToMap(fileBuffer: Buffer): Promise<Map<string, Buffer>> {
    const extracted = new Map<string, Buffer>();
    const extract = tar.extract();

    await new Promise<void>((resolve, reject) => {
      extract.on('entry', (header, stream, next) => {
        const chunks: Buffer[] = [];
        stream.on('data', (c: Buffer) => chunks.push(c));
        stream.on('end', () => {
          extracted.set(header.name, Buffer.concat(chunks));
          next();
        });
        stream.resume();
      });
      extract.on('finish', resolve);
      extract.on('error', reject);

      const gunzip = zlib.createGunzip();
      const inp = Readable.from(fileBuffer);
      inp.pipe(gunzip).pipe(extract);
    });

    return extracted;
  }

  private async doRestoreFromBuffer(
    extracted: Map<string, Buffer>,
  ): Promise<RestoreResult['restored']> {
    const models = this.getModels();
    const order: (typeof COLLECTIONS)[number][] = [
      'users',
      'posts',
      'media',
      'albums',
      'apiintegrations',
      'oauthproviders',
    ];

    const restored: RestoreResult['restored'] = {
      users: 0,
      posts: 0,
      media: 0,
      albums: 0,
      apiintegrations: 0,
      oauthproviders: 0,
      filesCount: 0,
    };

    for (const col of order) {
      await models[col].deleteMany({}).exec();
    }

    for (const col of order) {
      const name = `database/${col}.json`;
      const buf = extracted.get(name);
      if (!buf) continue;
      const data = JSON.parse(buf.toString('utf8'));
      const n = await this.importCollection(col, data);
      restored[col] = n;
    }

    const uploadsPath = this.getUploadsPath();

    if (fs.existsSync(uploadsPath)) {
      fs.rmSync(uploadsPath, { recursive: true });
    }
    fs.mkdirSync(path.join(uploadsPath, 'images'), { recursive: true });
    fs.mkdirSync(path.join(uploadsPath, 'avatars'), { recursive: true });

    for (const [entryPath, content] of extracted) {
      if (!entryPath.startsWith('uploads/') || entryPath === 'uploads/')
        continue;
      const relative = entryPath.replace(/^uploads\//, '');
      const dest = path.join(uploadsPath, relative);
      if (entryPath.endsWith('/')) continue;
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dest, content);
      restored.filesCount += 1;
    }

    return restored;
  }

  async restoreBackup(fileBuffer: Buffer, fileSize: number): Promise<RestoreResult> {
    if (Date.now() - this.lastRestoreAt < RATE_LIMIT_MS) {
      throw new BadRequestException(
        'Debes esperar al menos 5 minutos entre restauraciones.',
      );
    }

    if (fileSize > MAX_BACKUP_SIZE) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo de ${MAX_BACKUP_SIZE / 1024 / 1024 / 1024}GB.`,
      );
    }

    const validation = await this.validateBackup(fileBuffer, fileSize);
    if (!validation.valid) {
      throw new BadRequestException(validation.error || 'Backup inválido.');
    }

    this.lastRestoreAt = Date.now();

    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const preRestorePath = path.join(
      backupsDir,
      `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`,
    );

    try {
      await this.createBackupToFile(preRestorePath);
    } catch (e) {
      throw new BadRequestException(
        'No se pudo crear el backup de seguridad previo a la restauración.',
      );
    }

    let extracted: Map<string, Buffer>;
    try {
      extracted = await this.extractBackupToMap(fileBuffer);
    } catch (e) {
      throw new BadRequestException('No se pudo extraer el archivo de backup.');
    }

    try {
      const restored = await this.doRestoreFromBuffer(extracted);
      return {
        success: true,
        restored,
        preRestoreBackupPath: preRestorePath,
      };
    } catch (err) {
      try {
        const preBuf = fs.readFileSync(preRestorePath);
        const preExtracted = await this.extractBackupToMap(preBuf);
        await this.doRestoreFromBuffer(preExtracted);
      } catch (_) {
        // Rollback failed; rethrow original error
      }
      throw err;
    }
  }
}
