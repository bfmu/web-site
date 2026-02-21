import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Media, MediaDocument } from './schemas/media.schema';
import { Album, AlbumDocument } from './schemas/album.schema';
import { Post, PostDocument } from '../blog/schemas/post.schema';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    @InjectModel(Album.name) private albumModel: Model<AlbumDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(createMediaDto: CreateMediaDto): Promise<MediaDocument> {
    const media = new this.mediaModel(createMediaDto);
    return media.save();
  }

  async findAll(query: {
    type?: string;
    albumId?: string;
    isPublic?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ media: Media[]; pagination: any }> {
    const {
      type,
      albumId,
      isPublic,
      search,
      page = 1,
      limit = 50,
    } = query;

    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (albumId) {
      filter.albumId = new Types.ObjectId(albumId);
    }

    if (isPublic !== undefined) {
      filter.isPublic = isPublic;
    }

    if (search) {
      filter.$or = [
        { filename: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { alt: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [media, total] = await Promise.all([
      this.mediaModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.mediaModel.countDocuments(filter).exec(),
    ]);

    return {
      media,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Media> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid media ID');
    }
    const media = await this.mediaModel.findById(id).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID "${id}" not found`);
    }
    return media;
  }

  async findByFilename(filename: string): Promise<Media | null> {
    return this.mediaModel.findOne({ filename }).exec();
  }

  async update(id: string, updateMediaDto: UpdateMediaDto): Promise<Media> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid media ID');
    }

    const updatedMedia = await this.mediaModel
      .findByIdAndUpdate(id, updateMediaDto, { new: true })
      .exec();

    if (!updatedMedia) {
      throw new NotFoundException(`Media with ID "${id}" not found`);
    }

    return updatedMedia;
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid media ID');
    }

    const media = await this.mediaModel.findById(id).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID "${id}" not found`);
    }

    // Eliminar archivo del filesystem
    const filePath = path.join(process.cwd(), media.path);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        this.logger.error(`Error deleting file ${filePath}: ${error instanceof Error ? error.message : error}`);
        // Continuar con la eliminación del registro aunque falle el archivo
      }
    }

    // Eliminar registro de la base de datos
    await this.mediaModel.findByIdAndDelete(id).exec();

    // Remover de álbumes que lo contengan
    await this.albumModel.updateMany(
      { images: id },
      { $pull: { images: id } },
    ).exec();
  }

  async rename(id: string, newFilename: string): Promise<Media> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid media ID');
    }

    const media = await this.mediaModel.findById(id).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID "${id}" not found`);
    }

    // Verificar que el nuevo nombre no exista
    const existing = await this.mediaModel.findOne({ filename: newFilename }).exec();
    if (existing && existing._id.toString() !== id) {
      throw new BadRequestException(`Filename "${newFilename}" already exists`);
    }

    // Renombrar archivo en filesystem
    const oldPath = path.join(process.cwd(), media.path);
    const newPath = path.join(process.cwd(), path.dirname(media.path), newFilename);

    if (fs.existsSync(oldPath)) {
      try {
        fs.renameSync(oldPath, newPath);
      } catch (error) {
        throw new BadRequestException(`Error renaming file: ${error.message}`);
      }
    }

    // Actualizar registro
    const newPathRelative = path.join(path.dirname(media.path), newFilename).replace(/\\/g, '/');
    const newUrl = media.url.replace(media.filename, newFilename);

    return this.mediaModel.findByIdAndUpdate(
      id,
      {
        filename: newFilename,
        path: newPathRelative,
        url: newUrl,
      },
      { new: true },
    ).exec();
  }

  async checkUsage(id: string): Promise<{
    inUse: boolean;
    usedInPosts: string[];
    usedInAlbums: string[];
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid media ID');
    }

    const media = await this.mediaModel.findById(id).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID "${id}" not found`);
    }

    // Buscar en posts (campo image y en content HTML)
    const posts = await this.postModel.find({
      $or: [
        { image: { $regex: media.filename, $options: 'i' } },
        { content: { $regex: media.filename, $options: 'i' } },
        { content: { $regex: media.url, $options: 'i' } },
      ],
    }).select('slug title').exec();

    // Buscar en álbumes
    const albums = await this.albumModel.find({
      images: id,
    }).select('slug title').exec();

    return {
      inUse: posts.length > 0 || albums.length > 0,
      usedInPosts: posts.map((p) => p.slug),
      usedInAlbums: albums.map((a) => a.slug),
    };
  }

  async getImageDimensions(filePath: string): Promise<{ width?: number; height?: number }> {
    // Por ahora retornar vacío, se puede implementar con sharp o image-size más adelante
    return {};
  }

  async moveToAlbum(mediaId: string, albumId: string): Promise<Media> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid media ID');
    }
    if (!Types.ObjectId.isValid(albumId)) {
      throw new BadRequestException('Invalid album ID');
    }

    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID "${mediaId}" not found`);
    }

    const album = await this.albumModel.findById(albumId).exec();
    if (!album) {
      throw new NotFoundException(`Album with ID "${albumId}" not found`);
    }

    // Actualizar media
    const updatedMedia = await this.mediaModel.findByIdAndUpdate(
      mediaId,
      { albumId: new Types.ObjectId(albumId) },
      { new: true },
    ).exec();

    // Agregar a álbum si no está ya incluido
    if (!album.images.some((imgId) => imgId.toString() === mediaId)) {
      await this.albumModel.findByIdAndUpdate(
        albumId,
        { $push: { images: new Types.ObjectId(mediaId) } },
      ).exec();
    }

    return updatedMedia;
  }
}

