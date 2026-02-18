import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NavbarConfig,
  NavbarConfigSchema,
} from './schemas/navbar-config.schema';
import { NavbarService } from './navbar.service';
import { NavbarController } from './navbar.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NavbarConfig.name, schema: NavbarConfigSchema },
    ]),
  ],
  controllers: [NavbarController],
  providers: [NavbarService],
  exports: [NavbarService],
})
export class NavbarModule {}
