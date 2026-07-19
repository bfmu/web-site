import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { TrackPageViewDto } from './dto/track-page-view.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../settings/guards/admin.guard';
import { isBot, isAdminSession } from './analytics.utils';

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;

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
    const userAgent = req.get('User-Agent');

    // No contaminar las métricas con bots ni con la navegación del propio admin
    if (isBot(userAgent) || isAdminSession(req)) {
      return { ok: true };
    }

    const ip = this.getClientIp(req);
    const referrer = dto.referrer ?? req.get('Referer') ?? undefined;

    await this.analyticsService.track(dto.path, ip, userAgent, referrer);

    return { ok: true };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener estadísticas de analytics (requiere admin)',
  })
  @ApiQuery({ name: 'days', required: false })
  @ApiResponse({ status: 200, description: 'Estadísticas de visitas' })
  async getStats(@Query('days') days?: string) {
    return this.analyticsService.getStats(this.parseDays(days));
  }

  @Get('recent-visits')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Visitas recientes paginadas (requiere admin)' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Página de visitas recientes' })
  async getRecentVisits(
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedSkip = Math.max(0, parseInt(skip ?? '0', 10) || 0);
    const parsedLimit = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '20', 10) || 20),
    );
    return this.analyticsService.getRecentVisits(parsedSkip, parsedLimit);
  }

  private parseDays(days?: string): number {
    const parsed = parseInt(days ?? '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_RANGE_DAYS;
    return Math.min(MAX_RANGE_DAYS, parsed);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1';
  }
}
