import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Album, AlbumDocument } from './schemas/album.schema';
import { Media, MediaDocument } from './schemas/media.schema';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';

@Injectable()
export class AlbumService {
  private readonly logger = new Logger(AlbumService.name);

  constructor(
    @InjectModel(Album.name) private albumModel: Model<AlbumDocument>,
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
  ) {}

  async create(createAlbumDto: CreateAlbumDto): Promise<Album> {
    // Verificar que el slug no exista
    const existing = await this.albumModel.findOne({ slug: createAlbumDto.slug }).exec();
    if (existing) {
      throw new BadRequestException(`Album with slug "${createAlbumDto.slug}" already exists`);
    }

    const images = createAlbumDto.images?.map((id) => new Types.ObjectId(id)) || [];
    const albumData: any = {
      ...createAlbumDto,
      images,
      // Álbumes vacíos se marcan automáticamente como no públicos
      isPublic: images.length > 0 ? (createAlbumDto.isPublic ?? true) : false,
    };

    if (createAlbumDto.publishedAt) {
      albumData.publishedAt = new Date(createAlbumDto.publishedAt);
    }

    const album = new this.albumModel(albumData);
    return album.save();
  }

  async findAll(query: { isPublic?: boolean; page?: number; limit?: number }): Promise<{
    albums: Album[];
    pagination: any;
  }> {
    const { isPublic, page = 1, limit = 50 } = query;

    const filter: any = {};
    if (isPublic !== undefined) {
      filter.isPublic = isPublic;
    }

    const skip = (page - 1) * limit;

    const [albums, total] = await Promise.all([
      this.albumModel
        .find(filter)
        .populate('images', 'filename url alt description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.albumModel.countDocuments(filter).exec(),
    ]);

    return {
      albums,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(slug: string): Promise<Album> {
    const album = await this.albumModel
      .findOne({ slug })
      .populate('images', 'filename url alt description width height order')
      .exec();

    if (!album) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    return album;
  }

  async update(slug: string, updateAlbumDto: UpdateAlbumDto): Promise<Album> {
    const updateData: any = { ...updateAlbumDto };

    if (updateAlbumDto.images) {
      updateData.images = updateAlbumDto.images.map((id) => new Types.ObjectId(id));
    }

    if (updateAlbumDto.publishedAt) {
      updateData.publishedAt = new Date(updateAlbumDto.publishedAt);
    }

    const updatedAlbum = await this.albumModel
      .findOneAndUpdate({ slug }, updateData, { new: true })
      .populate('images', 'filename url alt description')
      .exec();

    if (!updatedAlbum) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    return updatedAlbum;
  }

  async delete(slug: string): Promise<void> {
    const album = await this.albumModel.findOne({ slug }).exec();
    if (!album) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    // Desvincular imágenes del álbum (no eliminar las imágenes)
    await this.mediaModel.updateMany(
      { albumId: album._id },
      { $unset: { albumId: 1 } },
    ).exec();

    // Eliminar álbum
    await this.albumModel.deleteOne({ slug }).exec();
  }

  async addImage(slug: string, mediaId: string): Promise<Album> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid media ID');
    }

    const album = await this.albumModel.findOne({ slug }).exec();
    if (!album) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID "${mediaId}" not found`);
    }

    // Agregar a álbum si no está ya incluido
    if (!album.images.some((imgId) => imgId.toString() === mediaId)) {
      await this.albumModel.findByIdAndUpdate(
        album._id,
        { $push: { images: new Types.ObjectId(mediaId) } },
      ).exec();

      // Actualizar albumId en media
      await this.mediaModel.findByIdAndUpdate(
        mediaId,
        { albumId: album._id },
      ).exec();
    }

    return this.findOne(slug);
  }

  async addImagesBatch(slug: string, mediaIds: string[]): Promise<Album> {
    const album = await this.albumModel.findOne({ slug }).exec();
    if (!album) {
      this.logger.warn(`addImagesBatch: album not found slug=${slug}`);
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    const validIds = mediaIds.filter((id) => Types.ObjectId.isValid(id));
    const newIds = validIds.filter(
      (mediaId) => !album.images.some((imgId) => imgId.toString() === mediaId),
    );

    if (newIds.length === 0) {
      this.logger.log(`addImagesBatch: no new images to add for album ${slug}`);
      return this.findOne(slug);
    }

    this.logger.log(`addImagesBatch: adding ${newIds.length} images to album ${slug}`);
    await this.albumModel.findByIdAndUpdate(
      album._id,
      { $push: { images: { $each: newIds.map((id) => new Types.ObjectId(id)) } } },
    ).exec();

    await this.mediaModel.updateMany(
      { _id: { $in: newIds } },
      { albumId: album._id },
    ).exec();

    return this.findOne(slug);
  }

  async removeImage(slug: string, mediaId: string): Promise<Album> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid media ID');
    }

    const album = await this.albumModel.findOne({ slug }).exec();
    if (!album) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    // Remover de álbum
    const updatedAlbum = await this.albumModel
      .findByIdAndUpdate(
        album._id,
        { $pull: { images: new Types.ObjectId(mediaId) } },
        { new: true },
      )
      .exec();

    // Desvincular albumId en media
    await this.mediaModel.findByIdAndUpdate(
      mediaId,
      { $unset: { albumId: 1 } },
    ).exec();

    // Si el álbum quedó vacío, marcarlo como no público automáticamente
    if (updatedAlbum && (!updatedAlbum.images || updatedAlbum.images.length === 0)) {
      await this.albumModel.findByIdAndUpdate(
        album._id,
        { isPublic: false },
      ).exec();
    }

    return this.findOne(slug);
  }

  async reorderImages(slug: string, imageIds: string[]): Promise<Album> {
    const album = await this.albumModel.findOne({ slug }).exec();
    if (!album) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    // Validar que todos los IDs sean válidos
    const validIds = imageIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    // Actualizar orden en media
    validIds.forEach((mediaId, index) => {
      this.mediaModel.findByIdAndUpdate(
        mediaId,
        { order: index },
      ).exec();
    });

    // Actualizar orden en álbum
    await this.albumModel.findByIdAndUpdate(
      album._id,
      { images: validIds },
    ).exec();

    return this.findOne(slug);
  }

  async setCover(slug: string, mediaId: string): Promise<Album> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid media ID');
    }

    const album = await this.albumModel.findOne({ slug }).exec();
    if (!album) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException(`Media with ID "${mediaId}" not found`);
    }

    // Verificar que la imagen pertenezca al álbum
    if (!album.images.some((imgId) => imgId.toString() === mediaId)) {
      throw new BadRequestException('Image does not belong to this album');
    }

    // Actualizar portada
    return this.albumModel
      .findOneAndUpdate(
        { slug },
        { coverImage: media.url },
        { new: true },
      )
      .populate('images', 'filename url alt description')
      .exec();
  }
}

