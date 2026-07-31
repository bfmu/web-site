import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageView, PageViewDocument } from './schemas/page-view.schema';
import {
  EngagementEvent,
  EngagementEventDocument,
} from './schemas/engagement-event.schema';
import * as geoip from 'geoip-lite';
import { maskIp, parseReferrer, parseUserAgent } from './analytics.utils';
import { TrackEngagementEventDto } from './dto/track-engagement-event.dto';

export interface SessionSummary {
  sessionId: string;
  entryPath: string;
  exitPath: string;
  pageCount: number;
  durationSeconds: number;
  startedAt: string;
  paths: string[];
}

export interface EngagementStats {
  avgTimeOnPageByPath: { path: string; avgSeconds: number }[];
  avgScrollDepthByPath: { path: string; avgPercent: number }[];
  topClickedElements: { label: string; count: number }[];
}

interface RawSessionGroup {
  _id: string;
  paths: string[];
  firstSeen: Date;
  lastSeen: Date;
  pageCount: number;
}

const MAX_SESSIONS = 200;

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
  countryCounts: { country: string; count: number }[];
  recentVisits: RecentVisit[];
}

const MAX_COUNTRIES = 250; // ~195 países existentes, holgura para códigos raros/desconocidos

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
    @InjectModel(EngagementEvent.name)
    private engagementEventModel: Model<EngagementEventDocument>,
  ) {}

  async track(
    path: string,
    ip: string,
    userAgent?: string,
    referrer?: string,
    sessionId?: string,
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
      sessionId,
    });
  }

  async trackEvent(dto: TrackEngagementEventDto): Promise<void> {
    await this.engagementEventModel.create({
      eventType: dto.eventType,
      path: dto.path,
      sessionId: dto.sessionId,
      value: dto.value,
      label: dto.label,
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
      countryCounts,
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
        .aggregate<{ country: string; count: number }>([
          {
            $match: {
              createdAt: { $gte: startOfRange },
              country: { $exists: true, $ne: null },
            },
          },
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: MAX_COUNTRIES },
          { $project: { country: '$_id', count: 1, _id: 0 } },
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
      countryCounts,
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

  async getSessions(days: number): Promise<SessionSummary[]> {
    const startOfRange = this.startOfRangeFor(days);

    const raw = await this.pageViewModel
      .aggregate<RawSessionGroup>([
        {
          $match: {
            createdAt: { $gte: startOfRange },
            sessionId: { $exists: true, $ne: null },
          },
        },
        { $sort: { sessionId: 1, createdAt: 1 } },
        {
          $group: {
            _id: '$sessionId',
            paths: { $push: '$path' },
            firstSeen: { $first: '$createdAt' },
            lastSeen: { $last: '$createdAt' },
            pageCount: { $sum: 1 },
          },
        },
        { $sort: { firstSeen: -1 } },
        { $limit: MAX_SESSIONS },
      ])
      .exec();

    return raw.map((r) => this.toSessionSummary(r));
  }

  async getEngagement(days: number): Promise<EngagementStats> {
    const startOfRange = this.startOfRangeFor(days);

    const [avgTimeOnPageByPath, avgScrollDepthByPath, topClickedElements] =
      await Promise.all([
        this.engagementEventModel
          .aggregate<{ path: string; avgSeconds: number }>([
            {
              $match: {
                createdAt: { $gte: startOfRange },
                eventType: 'time_on_page',
              },
            },
            { $group: { _id: '$path', avgSeconds: { $avg: '$value' } } },
            { $sort: { avgSeconds: -1 } },
            { $limit: 10 },
            { $project: { path: '$_id', avgSeconds: 1, _id: 0 } },
          ])
          .exec(),
        this.engagementEventModel
          .aggregate<{ path: string; avgPercent: number }>([
            {
              $match: {
                createdAt: { $gte: startOfRange },
                eventType: 'scroll_depth',
              },
            },
            { $group: { _id: '$path', avgPercent: { $avg: '$value' } } },
            { $sort: { avgPercent: -1 } },
            { $limit: 10 },
            { $project: { path: '$_id', avgPercent: 1, _id: 0 } },
          ])
          .exec(),
        this.engagementEventModel
          .aggregate<{ label: string; count: number }>([
            { $match: { createdAt: { $gte: startOfRange }, eventType: 'click' } },
            { $group: { _id: '$label', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { label: '$_id', count: 1, _id: 0 } },
          ])
          .exec(),
      ]);

    return { avgTimeOnPageByPath, avgScrollDepthByPath, topClickedElements };
  }

  private startOfRangeFor(days: number): Date {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfRange = new Date(startOfToday);
    startOfRange.setDate(startOfRange.getDate() - (days - 1));
    return startOfRange;
  }

  private toSessionSummary(raw: RawSessionGroup): SessionSummary {
    const durationSeconds = Math.round(
      (raw.lastSeen.getTime() - raw.firstSeen.getTime()) / 1000,
    );

    return {
      sessionId: raw._id,
      entryPath: raw.paths[0],
      exitPath: raw.paths[raw.paths.length - 1],
      pageCount: raw.pageCount,
      durationSeconds,
      startedAt: raw.firstSeen.toISOString(),
      paths: raw.paths,
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
