import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Logger,
  StreamableFile,
  Headers,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaDocument } from './schemas/media.schema';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import * as heicConvert from 'heic-convert';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const CACHE_DIR = path.resolve(process.cwd(), 'uploads/.cache');
const UPLOAD_TEMP_DIR = path.resolve(process.cwd(), 'uploads/.tmp');
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

@ApiTags('media')
@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Algunos navegadores (notablemente Chrome/Samsung Internet en Android) no
  // reconocen el mimetype de HEIC/HEIF y lo mandan como 'application/octet-stream'.
  // En ese caso confiamos en la extensión del archivo.
  private isHeicFile(mimetype: string, filename: string): boolean {
    if (mimetype === 'image/heic' || mimetype === 'image/heif') return true;
    if (mimetype === 'application/octet-stream') {
      return /\.(heic|heif)$/i.test(filename);
    }
    return false;
  }

  // Normaliza cualquier contenedor/codec de entrada (mp4, mov, webm, HEVC, etc.)
  // a un mp4 h264/aac reproducible en cualquier navegador. +faststart mueve el
  // moov atom al inicio para que el <video> pueda reproducir en streaming.
  private transcodeVideo(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-preset veryfast', '-crf 23', '-movflags +faststart'])
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .save(outputPath);
    });
  }

  // Extrae un frame al 10% del video como thumbnail (evita fallar en clips muy cortos)
  private generateVideoThumbnail(
    inputPath: string,
    outputDir: string,
    outputFilename: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .screenshots({
          timestamps: ['10%'],
          filename: outputFilename,
          folder: outputDir,
          size: '640x?',
        });
    });
  }

  private probeVideoDimensions(
    filePath: string,
  ): Promise<{ width?: number; height?: number }> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) {
          resolve({});
          return;
        }
        const videoStream = data.streams?.find(
          (s) => s.codec_type === 'video',
        );
        resolve({ width: videoStream?.width, height: videoStream?.height });
      });
    });
  }

  // Corre desatado (fire-and-forget) desde upload() — transcodea a un archivo
  // temporal separado y recién al terminar lo swapea sobre filePath (rename
  // atómico), así un lector concurrente nunca ve el archivo a medio escribir.
  // Errores acá NO tiran excepción hacia arriba: quedan guardados en el
  // registro (processingStatus/processingError) para que el admin los vea.
  private async processVideoInBackground(
    mediaId: string,
    filePath: string,
    timestamp: number,
  ): Promise<void> {
    const tempOutputPath = `${filePath}.transcoding.mp4`;

    try {
      await this.transcodeVideo(filePath, tempOutputPath);
      fs.renameSync(tempOutputPath, filePath);
    } catch (err) {
      this.logger.warn(`Failed to transcode video ${filePath}: ${err}`);
      await this.mediaService.updateProcessingResult(mediaId, {
        processingStatus: 'failed',
        processingError: String(err),
      });
      return;
    }

    const imagesDir = path.join(process.cwd(), 'uploads', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    let thumbnailPath: string | undefined;
    try {
      const thumbFileName = `${timestamp}-thumb.jpg`;
      await this.generateVideoThumbnail(filePath, imagesDir, thumbFileName);
      thumbnailPath = `/uploads/images/${thumbFileName}`;
    } catch (err) {
      this.logger.warn(`Failed to generate thumbnail for video ${filePath}: ${err}`);
    }

    await this.mediaService.updateProcessingResult(mediaId, {
      processingStatus: 'ready',
      thumbnailPath,
      size: fs.statSync(filePath).size,
    });
  }

  @Post('upload')
  @UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Roles('admin', 'editor')
  @UseInterceptors(
    FileInterceptor('file', {
      // Multer escribe el archivo a disco en streaming en vez de bufferearlo
      // entero en memoria — crítico para videos de varios cientos de MB
      // (con memoryStorage, un video de 300MB se leía completo a RAM antes
      // de siquiera empezar a procesarlo, arriesgando un OOM del proceso).
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
          cb(null, UPLOAD_TEMP_DIR);
        },
        filename: (_req, _file, cb) => {
          cb(null, `incoming-${Date.now()}-${Math.round(Math.random() * 1e9)}`);
        },
      }),
      limits: { fileSize: 2000 * 1024 * 1024 }, // tope duro; el límite fino (100MB imagen / 2GB video) se valida en el handler
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir archivo y crear registro de media (requiere autenticación)',
  })
  @ApiResponse({ status: 201, description: 'Media creado correctamente' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados uploads, esperá 1 minuto',
  })
  async upload(@UploadedFile() file: any, @Body() body?: any) {
    if (!file) {
      this.logger.warn('Upload attempt without file');
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // multer (diskStorage) ya escribió el archivo en uploads/.tmp — file.path.
    // Este finally limpia ese temporal pase lo que pase (rechazo, error, éxito).
    // En el camino feliz de imágenes normales el archivo se RENOMBRA a destino
    // final, así que para cuando llega acá ya no existe en file.path (rmSync
    // con force no falla si no lo encuentra).
    try {
      // Validar tipo de archivo
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/heic',
        'image/heif',
        ...VIDEO_MIME_TYPES,
      ];
      const isHeic = this.isHeicFile(file.mimetype, file.originalname);
      const isVideo = VIDEO_MIME_TYPES.includes(file.mimetype);
      if (!allowedMimeTypes.includes(file.mimetype) && !isHeic) {
        this.logger.warn(
          `Upload rejected: invalid mimetype ${file.mimetype} for ${file.originalname}`,
        );
        throw new BadRequestException(
          'El archivo debe ser una imagen (JPEG, PNG, GIF, WEBP, SVG, HEIC/HEIF) o un video (MP4, MOV, WEBM)',
        );
      }

      // Validar tamaño (100MB para imágenes, 2GB para video)
      const maxSize = isVideo ? 2000 * 1024 * 1024 : 100 * 1024 * 1024;
      if (file.size > maxSize) {
        this.logger.warn(
          `Upload rejected: file too large ${file.size} bytes for ${file.originalname}`,
        );
        throw new BadRequestException(
          `El archivo no puede ser mayor a ${maxSize / (1024 * 1024)}MB`,
        );
      }

      // sharp no puede decodificar HEIC/HEIF (los binarios prebuilt de libvips no
      // incluyen soporte HEVC) ni servirlo después vía /media/serve, así que lo
      // convertimos a JPEG acá, antes de que el archivo entre al resto del pipeline.
      // sourcePath es lo que se transcodifica/mueve a destino final; para HEIC
      // es un archivo nuevo (el original en file.path queda para el cleanup final).
      let sourcePath = file.path;
      let mimeType = file.mimetype;
      let originalName = file.originalname;
      if (isHeic) {
        try {
          const converted = await heicConvert({
            buffer: fs.readFileSync(file.path),
            format: 'JPEG',
            quality: 0.92,
          });
          sourcePath = `${file.path}-converted.jpg`;
          fs.writeFileSync(sourcePath, Buffer.from(converted));
          mimeType = 'image/jpeg';
          originalName = originalName.replace(/\.(heic|heif)$/i, '.jpg');
        } catch (err) {
          this.logger.warn(
            `Failed to convert HEIC/HEIF file ${file.originalname}: ${err}`,
          );
          throw new BadRequestException(
            'No se pudo procesar la imagen HEIC/HEIF. Probá exportarla como JPEG.',
          );
        }
      }
      if (isVideo) {
        originalName = originalName.replace(/\.[^./\\]+$/, '.mp4');
        mimeType = 'video/mp4';
      }

      // Crear directorio de uploads si no existe
      const uploadsDir = path.join(
        process.cwd(),
        'uploads',
        isVideo ? 'videos' : 'images',
      );
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}-${sanitizedName}`;
      const filePath = path.join(uploadsDir, fileName);

      let width: number | undefined;
      let height: number | undefined;
      let thumbnailPath: string | undefined;
      let finalSize = file.size;

      if (isVideo) {
        // El transcode a H.264/AAC y el thumbnail son lentos (ffmpeg puede
        // tardar varios minutos en CPUs modestas) — mover el crudo a destino
        // final ahora y procesar en background (ver processVideoInBackground)
        // evita mantener la request abierta e inactiva ese tiempo, algo que
        // routers/navegadores terminan cortando (499) igual sin avisar nada.
        fs.renameSync(sourcePath, filePath);

        const dims = await this.probeVideoDimensions(filePath);
        width = dims.width;
        height = dims.height;
        finalSize = fs.statSync(filePath).size;
      } else {
        // Mover el archivo ya escrito en disco a destino final (rename, sin
        // copiar bytes en memoria). Para HEIC, sourcePath es el convertido;
        // el original crudo en file.path lo limpia el finally de más abajo.
        fs.renameSync(sourcePath, filePath);
        if (isHeic) {
          finalSize = fs.statSync(filePath).size;
        }

        // Extraer dimensiones reales (post EXIF rotation) para evitar layout shift en frontend.
        // SVG no tiene dimensiones rasterizadas — se omite.
        if (mimeType !== 'image/svg+xml') {
          try {
            const meta = await sharp(filePath).rotate().metadata();
            width = meta.width;
            height = meta.height;
          } catch (err) {
            this.logger.warn(
              `Could not extract dimensions from ${file.originalname}: ${err}`,
            );
          }
        }
      }

      // Construir URLs
      const relativePath = `/uploads/${isVideo ? 'videos' : 'images'}/${fileName}`;
      const apiUrl = process.env.API_URL || 'http://localhost:3000';
      const fullUrl = `${apiUrl}${relativePath}`;

      // Extraer metadata del body (puede venir como objeto o como string desde FormData)
      const isPublic =
        body?.isPublic === 'true' || body?.isPublic === true || false;
      const alt = body?.alt || undefined;
      const description = body?.description || undefined;
      const albumId = body?.albumId || undefined;

      // Crear DTO
      const createMediaDto: CreateMediaDto = {
        filename: fileName,
        originalName,
        path: relativePath,
        url: fullUrl,
        mimeType,
        size: finalSize,
        width,
        height,
        type: isVideo ? 'video' : 'image',
        isPublic,
        alt: alt && alt.trim() ? alt.trim() : undefined,
        description:
          description && description.trim() ? description.trim() : undefined,
        albumId: albumId && albumId.trim() ? albumId.trim() : undefined,
        thumbnailPath,
        processingStatus: isVideo ? 'processing' : 'ready',
      };

      // Crear registro en DB
      const media = await this.mediaService.create(createMediaDto);
      this.logger.log(`Media uploaded: ${fileName} (${finalSize} bytes)`);

      if (isVideo) {
        const mediaId = String((media as MediaDocument)._id);
        this.processVideoInBackground(mediaId, filePath, timestamp).catch(
          (err) => {
            this.logger.error(
              `Background video processing crashed for ${fileName}: ${err}`,
            );
          },
        );
      }

      // Convertir documento de Mongoose a objeto plano
      const mediaObj = (media as MediaDocument).toObject();

      return {
        ...mediaObj,
        url: relativePath, // Retornar URL relativa (el frontend construirá la URL completa)
      };
    } finally {
      fs.rmSync(file.path, { force: true });
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar medios (requiere autenticación)' })
  @ApiQuery({ name: 'type', required: false, description: 'Tipo de medio' })
  @ApiQuery({ name: 'albumId', required: false, description: 'ID del álbum' })
  @ApiQuery({
    name: 'notInAlbum',
    required: false,
    description: 'Solo medios que no están en ningún álbum',
  })
  @ApiQuery({ name: 'isPublic', required: false, description: 'Si es público' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda' })
  @ApiQuery({ name: 'page', required: false, description: 'Página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Límite por página',
  })
  @ApiResponse({ status: 200, description: 'Lista de medios' })
  async findAll(@Query() query: any) {
    return this.mediaService.findAll({
      type: query.type,
      albumId: query.albumId,
      notInAlbum: query.notInAlbum === 'true',
      isPublic:
        query.isPublic === 'true'
          ? true
          : query.isPublic === 'false'
            ? false
            : undefined,
      search: query.search,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
  }

  @Get('serve')
  @ApiOperation({ summary: 'Servir imagen optimizada (público)' })
  @ApiQuery({
    name: 'path',
    required: true,
    description: 'Ruta relativa, ej: /uploads/images/xxx.jpg',
  })
  @ApiQuery({
    name: 'w',
    required: false,
    description: 'Ancho máximo en píxeles',
  })
  @ApiQuery({
    name: 'h',
    required: false,
    description: 'Alto máximo en píxeles',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Calidad 1-100 (default: 80)',
  })
  @ApiQuery({ name: 'format', required: false, description: 'webp | jpeg' })
  @ApiQuery({
    name: 'v',
    required: false,
    description: 'Cache buster (típicamente la orientación)',
  })
  @ApiResponse({ status: 200, description: 'Imagen optimizada' })
  async serve(
    @Query('path') pathParam: string,
    @Res({ passthrough: true }) res: Response,
    @Query('w') w?: string,
    @Query('h') h?: string,
    @Query('q') q?: string,
    @Query('format') formatParam?: string,
    @Headers('if-none-match') ifNoneMatch?: string,
  ): Promise<StreamableFile | undefined> {
    if (!pathParam || typeof pathParam !== 'string') {
      throw new BadRequestException('El parámetro path es requerido');
    }
    const cleanPath = pathParam.trim();
    if (!cleanPath.startsWith('/uploads/') || cleanPath.includes('..')) {
      throw new BadRequestException('Path inválido');
    }
    const normalizedPath = cleanPath.startsWith('/')
      ? cleanPath.slice(1)
      : cleanPath;
    const fullPath = path.resolve(process.cwd(), normalizedPath);
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fullPath.startsWith(uploadsDir)) {
      throw new BadRequestException('Path inválido');
    }
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      throw new NotFoundException('Imagen no encontrada');
    }
    const ext = path.extname(cleanPath).toLowerCase();
    const width = w ? parseInt(w, 10) : undefined;
    const height = h ? parseInt(h, 10) : undefined;
    const quality = Math.min(100, Math.max(1, parseInt(q || '80', 10)));
    const outputFormat = formatParam === 'jpeg' ? 'jpeg' : 'webp';

    // Buscar orientación guardada del usuario (si existe registro en media)
    const mediaRecord = await this.mediaService.findByPath(cleanPath);
    const userOrientation = mediaRecord?.orientation ?? 0;

    // ETag basado en lo que afecta el output. Si rotás en admin, userOrientation cambia → ETag
    // cambia → cache invalidado automáticamente sin importar lo que tenga el browser/proxy.
    const etag = `W/"${cleanPath}-${userOrientation}-${width ?? 0}-${height ?? 0}-${quality}-${outputFormat}"`;

    // Cache largo PERO sin `immutable` (la imagen SÍ puede cambiar al rotarla).
    // El frontend bustea con &v=<orientation> para forzar URL nueva ante cambios.
    res.setHeader(
      'Cache-Control',
      'public, max-age=2592000, stale-while-revalidate=86400',
    );
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept');

    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304);
      return undefined;
    }

    if (ext === '.svg') {
      const buffer = fs.readFileSync(fullPath);
      res.setHeader('Content-Type', 'image/svg+xml');
      return new StreamableFile(buffer, { type: 'image/svg+xml' });
    }

    const mimeType = outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
    const cacheKey = crypto
      .createHash('sha256')
      .update(
        `${cleanPath}-${userOrientation}-${width ?? 0}-${height ?? 0}-${quality}-${outputFormat}`,
      )
      .digest('hex');
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.${outputFormat}`);

    if (fs.existsSync(cachePath)) {
      const buffer = fs.readFileSync(cachePath);
      res.setHeader('Content-Type', mimeType);
      return new StreamableFile(buffer, { type: mimeType });
    }

    try {
      // sharp no compone bien dos .rotate() encadenados en el mismo pipeline:
      // .rotate() (auto EXIF) seguido de .rotate(angulo) anula la rotación
      // explícita en vez de sumarla. Hay que materializar el auto-orient en
      // un buffer y recién ahí aplicar la rotación del usuario en un pipeline nuevo.
      let pipeline: sharp.Sharp;
      if (userOrientation) {
        const autoOriented = await sharp(fullPath).rotate().toBuffer();
        pipeline = sharp(autoOriented).rotate(userOrientation);
      } else {
        pipeline = sharp(fullPath).rotate(); // Sin argumentos aplica EXIF orientation (equivale a autoOrient)
      }

      const metadata = await pipeline.metadata();
      const needsResize =
        (width && metadata.width && metadata.width > width) ||
        (height && metadata.height && metadata.height > height);
      if (needsResize && (width || height)) {
        pipeline = pipeline.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      const buffer =
        outputFormat === 'webp'
          ? await pipeline.webp({ quality }).toBuffer()
          : await pipeline.jpeg({ quality }).toBuffer();

      try {
        fs.writeFileSync(cachePath + '.tmp', buffer);
        fs.renameSync(cachePath + '.tmp', cachePath);
      } catch {
        // Cache write failure is non-fatal
      }

      res.setHeader('Content-Type', mimeType);
      return new StreamableFile(buffer, { type: mimeType });
    } catch (err) {
      this.logger.warn(`Error processing image ${cleanPath}: ${err}`);
      const buffer = fs.readFileSync(fullPath);
      return new StreamableFile(buffer);
    }
  }

  @Delete('cache')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar cache de variantes procesadas (solo admin)',
  })
  @ApiResponse({ status: 200, description: 'Cache eliminado' })
  clearCache(): { deleted: number } {
    if (!fs.existsSync(CACHE_DIR)) return { deleted: 0 };
    const files = fs.readdirSync(CACHE_DIR);
    for (const f of files) {
      fs.rmSync(path.join(CACHE_DIR, f), { force: true });
    }
    return { deleted: files.length };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener media por ID (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media encontrado' })
  async findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar uso del media (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Información de uso' })
  async checkUsage(@Param('id') id: string) {
    return this.mediaService.checkUsage(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar metadata del media (requiere autenticación)',
  })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media actualizado' })
  async update(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
  ) {
    return this.mediaService.update(id, updateMediaDto);
  }

  @Patch(':id/rename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Renombrar archivo del media (requiere autenticación)',
  })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media renombrado' })
  async rename(@Param('id') id: string, @Body() body: { filename: string }) {
    if (!body.filename) {
      throw new BadRequestException('Filename is required');
    }
    return this.mediaService.rename(id, body.filename);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar media (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 204, description: 'Media eliminado' })
  async remove(@Param('id') id: string) {
    await this.mediaService.delete(id);
  }

  @Post(':id/move-to-album')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mover media a álbum (requiere autenticación)' })
  @ApiParam({ name: 'id', description: 'ID del media' })
  @ApiResponse({ status: 200, description: 'Media movido a álbum' })
  async moveToAlbum(
    @Param('id') id: string,
    @Body() body: { albumId: string },
  ) {
    if (!body.albumId) {
      throw new BadRequestException('Album ID is required');
    }
    return this.mediaService.moveToAlbum(id, body.albumId);
  }
}
