import { Controller, Get, Put, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { HomepageService } from './homepage.service';
import { UpdateHomepageDto } from './dto/update-homepage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../settings/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('homepage')
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  async getConfig() {
    try {
      return await this.homepageService.getConfig();
    } catch (error) {
      throw new HttpException(
        'Failed to get homepage config',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateConfig(@Body() dto: UpdateHomepageDto, @CurrentUser() user: any) {
    try {
      return await this.homepageService.updateConfig(dto, user?.sub ?? user?._id);
    } catch (error) {
      throw new HttpException(
        'Failed to update homepage config',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
