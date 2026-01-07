import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaService } from './media.service';
import { AlbumService } from './album.service';
import { MediaController } from './media.controller';
import { AlbumController } from './album.controller';
import { GalleryController } from './gallery.controller';
import { Media, MediaSchema } from './schemas/media.schema';
import { Album, AlbumSchema } from './schemas/album.schema';
import { Post, PostSchema } from '../blog/schemas/post.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [MediaController, AlbumController, GalleryController],
  providers: [MediaService, AlbumService],
  exports: [MediaService, AlbumService],
})
export class MediaModule {}

