import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { NavbarService } from './navbar.service';
import { UpdateNavbarDto } from './dto/update-navbar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../settings/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('navbar')
export class NavbarController {
  constructor(private readonly navbarService: NavbarService) {}

  @Get()
  async getConfig() {
    try {
      return await this.navbarService.getConfig();
    } catch (error) {
      throw new HttpException(
        'Failed to get navbar config',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateConfig(@Body() dto: UpdateNavbarDto, @CurrentUser() user: any) {
    try {
      return await this.navbarService.updateConfig(
        dto,
        user?.sub ?? user?._id,
      );
    } catch (error) {
      throw new HttpException(
        'Failed to update navbar config',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
