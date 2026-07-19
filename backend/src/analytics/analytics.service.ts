import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageView, PageViewDocument } from './schemas/page-view.schema';
import * as geoip from 'geoip-lite';
import { maskIp, parseReferrer, parseUserAgent } from './analytics.utils';

export interface RecentVisit {
  ip: string;
  country?: string;
  city?: string;
  path: string;
  createdAt: string;
  referrer: string;
  device: string;
}

export interface AnalyticsStats {
  totalPageViews: number;
  uniqueVisitors: number;
  viewsToday: number;
  rangeDays: number;
  dailyViews: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
  topLocations: { country: string; city?: string; count: number }[];
  recentVisits: RecentVisit[];
}

interface RawVisit {
  ip: string;
  country?: string;
  city?: string;
  path: string;
  createdAt: Date;
  referrer?: string;
  userAgent?: string;
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

  async getStats(days: number): Promise<AnalyticsStats> {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfRange = new Date(startOfToday);
    startOfRange.setDate(startOfRange.getDate() - (days - 1));

    const [
      totalPageViews,
      uniqueVisitors,
      viewsToday,
      topPages,
      topLocations,
      recentVisitsRaw,
      dailyViewsRaw,
    ] = await Promise.all([
      this.pageViewModel.countDocuments(),
      this.pageViewModel
        .distinct('ip', { createdAt: { $gte: startOfRange } })
        .then((ips) => ips.length),
      this.pageViewModel.countDocuments({ createdAt: { $gte: startOfToday } }),
      this.pageViewModel
        .aggregate<{
          path: string;
          count: number;
        }>([
          { $match: { createdAt: { $gte: startOfRange } } },
          { $group: { _id: '$path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { path: '$_id', count: 1, _id: 0 } },
        ])
        .exec(),
      this.pageViewModel
        .aggregate<{ country?: string; city?: string; count: number }>([
          {
            $match: {
              createdAt: { $gte: startOfRange },
              country: { $exists: true, $ne: null },
            },
          },
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
        .lean<RawVisit[]>()
        .select('ip country city path createdAt referrer userAgent')
        .exec(),
      this.pageViewModel
        .aggregate<{ _id: string; count: number }>([
          { $match: { createdAt: { $gte: startOfRange } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
    ]);

    return {
      totalPageViews,
      uniqueVisitors,
      viewsToday,
      rangeDays: days,
      dailyViews: this.fillDailyGaps(startOfRange, days, dailyViewsRaw),
      topPages,
      topLocations: topLocations.map((l) => ({
        country: l.country ?? 'Desconocido',
        city: l.city ?? undefined,
        count: l.count,
      })),
      recentVisits: recentVisitsRaw.map((v) => this.toRecentVisit(v)),
    };
  }

  async getRecentVisits(skip: number, limit: number): Promise<RecentVisit[]> {
    const visits = await this.pageViewModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<RawVisit[]>()
      .select('ip country city path createdAt referrer userAgent')
      .exec();

    return visits.map((v) => this.toRecentVisit(v));
  }

  private toRecentVisit(v: RawVisit): RecentVisit {
    return {
      ip: maskIp(v.ip),
      country: v.country,
      city: v.city,
      path: v.path,
      createdAt: v.createdAt.toISOString(),
      referrer: parseReferrer(v.referrer),
      device: parseUserAgent(v.userAgent),
    };
  }

  private fillDailyGaps(
    startOfRange: Date,
    days: number,
    raw: { _id: string; count: number }[],
  ): { date: string; count: number }[] {
    const countsByDay = new Map(raw.map((d) => [d._id, d.count]));
    const result: { date: string; count: number }[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(startOfRange);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: countsByDay.get(key) ?? 0 });
    }

    return result;
  }
}
