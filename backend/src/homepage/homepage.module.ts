import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  HomepageConfig,
  HomepageConfigSchema,
} from './schemas/homepage-config.schema';
import { HomepageService } from './homepage.service';
import { HomepageController } from './homepage.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HomepageConfig.name, schema: HomepageConfigSchema },
    ]),
  ],
  controllers: [HomepageController],
  providers: [HomepageService],
  exports: [HomepageService],
})
export class HomepageModule {}
