import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Post, PostSchema } from '../blog/schemas/post.schema';
import { Media, MediaSchema } from '../media/schemas/media.schema';
import { Album, AlbumSchema } from '../media/schemas/album.schema';
import {
  ApiIntegration,
  ApiIntegrationSchema,
} from '../settings/schemas/api-integration.schema';
import {
  OAuthProvider,
  OAuthProviderSchema,
} from '../settings/schemas/oauth-provider.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema },
      { name: Media.name, schema: MediaSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: ApiIntegration.name, schema: ApiIntegrationSchema },
      { name: OAuthProvider.name, schema: OAuthProviderSchema },
    ]),
  ],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
