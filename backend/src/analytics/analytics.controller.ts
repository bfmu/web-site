import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { TrackPageViewDto } from './dto/track-page-view.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../settings/guards/admin.guard';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Registrar una vista de página (público)' })
  @ApiBody({ type: TrackPageViewDto })
  @ApiResponse({ status: 201, description: 'Vista registrada' })
  @ApiResponse({ status: 429, description: 'Demasiadas requests' })
  async track(@Body() dto: TrackPageViewDto, @Req() req: Request) {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    const referrer = dto.referrer ?? req.get('Referer') ?? undefined;

    await this.analyticsService.track(
      dto.path,
      ip,
      userAgent,
      referrer,
    );

    return { ok: true };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener estadísticas de analytics (requiere admin)' })
  @ApiResponse({ status: 200, description: 'Estadísticas de visitas' })
  async getStats() {
    return this.analyticsService.getStats();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1';
  }
}
