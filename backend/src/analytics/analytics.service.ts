import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageView, PageViewDocument } from './schemas/page-view.schema';
import * as geoip from 'geoip-lite';

export interface AnalyticsStats {
  totalPageViews: number;
  uniqueVisitors: number;
  viewsToday: number;
  topPages: { path: string; count: number }[];
  topLocations: { country: string; city?: string; count: number }[];
  recentVisits: {
    ip: string;
    country?: string;
    city?: string;
    path: string;
    createdAt: string;
  }[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(PageView.name)
    private pageViewModel: Model<PageViewDocument>,
  ) {}

  async track(
    path: string,
    ip: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<void> {
    const geo = geoip.lookup(ip);
    const postSlug = this.extractPostSlug(path);

    await this.pageViewModel.create({
      path,
      ip,
      userAgent,
      referrer,
      country: geo?.country ?? undefined,
      city: geo?.city ?? undefined,
      postSlug,
    });
  }

  private extractPostSlug(path: string): string | undefined {
    const match = path.match(/^\/posts\/([^/]+)\/?$/);
    return match?.[1];
  }

  async getStats(): Promise<AnalyticsStats> {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfLast24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalPageViews,
      uniqueVisitors,
      viewsToday,
      topPages,
      topLocations,
      recentVisits,
    ] = await Promise.all([
      this.pageViewModel.countDocuments(),
      this.pageViewModel
        .distinct('ip', { createdAt: { $gte: startOfLast24h } })
        .then((ips) => ips.length),
      this.pageViewModel.countDocuments({ createdAt: { $gte: startOfToday } }),
      this.pageViewModel
        .aggregate<{
          path: string;
          count: number;
        }>([
          { $group: { _id: '$path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { path: '$_id', count: 1, _id: 0 } },
        ])
        .exec(),
      this.pageViewModel
        .aggregate<{ country?: string; city?: string; count: number }>([
          { $match: { country: { $exists: true, $ne: null } } },
          {
            $group: {
              _id: { country: '$country', city: '$city' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $project: {
              country: '$_id.country',
              city: '$_id.city',
              count: 1,
              _id: 0,
            },
          },
        ])
        .exec(),
      this.pageViewModel
        .find()
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .select('ip country city path createdAt')
        .exec(),
    ]);

    return {
      totalPageViews,
      uniqueVisitors,
      viewsToday,
      topPages,
      topLocations: topLocations.map((l) => ({
        country: l.country ?? 'Desconocido',
        city: l.city ?? undefined,
        count: l.count,
      })),
      recentVisits: recentVisits.map((v) => ({
        ip: v.ip,
        country: v.country,
        city: v.city,
        path: v.path,
        createdAt: (v.createdAt as Date).toISOString(),
      })),
    };
  }
}
