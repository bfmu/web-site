import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { PageView } from './schemas/page-view.schema';
import { EngagementEvent } from './schemas/engagement-event.schema';

function createMockPageViewModel() {
  const model: any = jest.fn((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(data),
  }));
  model.create = jest.fn();
  model.find = jest.fn();
  model.countDocuments = jest.fn();
  model.distinct = jest.fn();
  model.aggregate = jest.fn();
  return model;
}

function createMockEngagementEventModel() {
  const model: any = jest.fn((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(data),
  }));
  model.create = jest.fn();
  model.aggregate = jest.fn();
  return model;
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let pageViewModel: ReturnType<typeof createMockPageViewModel>;
  let engagementEventModel: ReturnType<typeof createMockEngagementEventModel>;

  beforeEach(async () => {
    const mockPageViewModel = createMockPageViewModel();
    const mockEngagementEventModel = createMockEngagementEventModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getModelToken(PageView.name), useValue: mockPageViewModel },
        {
          provide: getModelToken(EngagementEvent.name),
          useValue: mockEngagementEventModel,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    pageViewModel = module.get(getModelToken(PageView.name));
    engagementEventModel = module.get(getModelToken(EngagementEvent.name));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('track', () => {
    it('debe persistir sessionId cuando se provee', async () => {
      pageViewModel.create.mockResolvedValue({});
      await service.track('/test', '127.0.0.1', 'UA', undefined, 'sess-123');
      expect(pageViewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'sess-123' }),
      );
    });

    it('debe persistir sessionId undefined cuando no se provee', async () => {
      pageViewModel.create.mockResolvedValue({});
      await service.track('/test', '127.0.0.1', 'UA');
      expect(pageViewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: undefined }),
      );
    });
  });

  describe('trackEvent', () => {
    it('debe crear un evento de engagement con todos los campos', async () => {
      engagementEventModel.create.mockResolvedValue({});
      await service.trackEvent({
        eventType: 'click',
        path: '/gallery',
        sessionId: 'sess-1',
        label: 'photo-1',
      });
      expect(engagementEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'click',
          path: '/gallery',
          sessionId: 'sess-1',
          label: 'photo-1',
        }),
      );
    });

    it('debe crear un evento sin campos opcionales (scroll_depth sin label)', async () => {
      engagementEventModel.create.mockResolvedValue({});
      await service.trackEvent({
        eventType: 'scroll_depth',
        path: '/posts/foo',
        value: 50,
      });
      expect(engagementEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'scroll_depth',
          path: '/posts/foo',
          value: 50,
        }),
      );
    });
  });

  describe('getStats', () => {
    function mockStatsAggregates(countryCounts: { country: string; count: number }[]) {
      pageViewModel.countDocuments.mockReturnValue(Promise.resolve(0));
      pageViewModel.distinct.mockResolvedValue([]);
      pageViewModel.find.mockReturnValue({
        sort: () => ({
          limit: () => ({
            lean: () => ({
              select: () => ({ exec: () => Promise.resolve([]) }),
            }),
          }),
        }),
      });
      pageViewModel.aggregate
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) }) // topPages
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) }) // topLocations
        .mockReturnValueOnce({ exec: () => Promise.resolve(countryCounts) }) // countryCounts
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) }); // dailyViews
    }

    it('debe incluir countryCounts agregado por país, sin límite de top 10', async () => {
      const countryData = Array.from({ length: 15 }, (_, i) => ({
        country: `C${i}`,
        count: i + 1,
      }));
      mockStatsAggregates(countryData);

      const result = await service.getStats(30);

      expect(result.countryCounts).toEqual(countryData);

      const countryPipeline = pageViewModel.aggregate.mock.calls[2][0];
      const groupStage = countryPipeline.find((s: any) => '$group' in s);
      const limitStage = countryPipeline.find((s: any) => '$limit' in s);
      expect(groupStage.$group._id).toBe('$country');
      expect(limitStage?.$limit ?? Infinity).toBeGreaterThanOrEqual(15);
    });

    it('debe devolver countryCounts vacío cuando no hay datos de país', async () => {
      mockStatsAggregates([]);

      const result = await service.getStats(30);

      expect(result.countryCounts).toEqual([]);
    });
  });

  describe('getSessions', () => {
    it('debe devolver array vacío cuando no hay sesiones en el rango', async () => {
      pageViewModel.aggregate.mockReturnValue({
        exec: () => Promise.resolve([]),
      });
      const result = await service.getSessions(30);
      expect(result).toEqual([]);
    });

    it('debe agrupar page views en una sesión con entryPath y exitPath correctos', async () => {
      const firstSeen = new Date('2026-01-01T10:00:00.000Z');
      const lastSeen = new Date('2026-01-01T10:01:30.000Z');
      pageViewModel.aggregate.mockReturnValue({
        exec: () =>
          Promise.resolve([
            {
              _id: 'sess-1',
              paths: ['/a', '/b', '/c'],
              firstSeen,
              lastSeen,
              pageCount: 3,
            },
          ]),
      });

      const [session] = await service.getSessions(30);

      expect(session.sessionId).toBe('sess-1');
      expect(session.entryPath).toBe('/a');
      expect(session.exitPath).toBe('/c');
      expect(session.pageCount).toBe(3);
      expect(session.paths).toEqual(['/a', '/b', '/c']);
    });

    it('debe calcular durationSeconds como la diferencia entre primera y última visita', async () => {
      const firstSeen = new Date('2026-01-01T10:00:00.000Z');
      const lastSeen = new Date('2026-01-01T10:01:30.000Z'); // 90s después
      pageViewModel.aggregate.mockReturnValue({
        exec: () =>
          Promise.resolve([
            { _id: 'sess-1', paths: ['/a', '/b'], firstSeen, lastSeen, pageCount: 2 },
          ]),
      });

      const [session] = await service.getSessions(30);

      expect(session.durationSeconds).toBe(90);
    });

    it('debe excluir page views sin sessionId del pipeline de agregación', async () => {
      pageViewModel.aggregate.mockReturnValue({
        exec: () => Promise.resolve([]),
      });

      await service.getSessions(30);

      const pipeline = pageViewModel.aggregate.mock.calls[0][0];
      const matchStage = pipeline.find((stage: any) => '$match' in stage);
      expect(matchStage.$match.sessionId).toEqual({
        $exists: true,
        $ne: null,
      });
    });

    it('debe respetar el filtro de rango de días', async () => {
      pageViewModel.aggregate.mockReturnValue({
        exec: () => Promise.resolve([]),
      });

      const before = Date.now();
      await service.getSessions(7);
      const after = Date.now();

      const pipeline = pageViewModel.aggregate.mock.calls[0][0];
      const matchStage = pipeline.find((stage: any) => '$match' in stage);
      const gte: Date = matchStage.$match.createdAt.$gte;

      const expectedMin = before - 7 * 24 * 60 * 60 * 1000 - 1000;
      const expectedMax = after - 6 * 24 * 60 * 60 * 1000;
      expect(gte.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(gte.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('getEngagement', () => {
    it('debe devolver arrays vacíos para las tres métricas cuando no hay eventos', async () => {
      engagementEventModel.aggregate.mockReturnValue({
        exec: () => Promise.resolve([]),
      });

      const result = await service.getEngagement(30);

      expect(result).toEqual({
        avgTimeOnPageByPath: [],
        avgScrollDepthByPath: [],
        topClickedElements: [],
      });
    });

    it('debe devolver el tiempo promedio en página agrupado por path, ordenado desc, top 10', async () => {
      const timeData = [{ path: '/a', avgSeconds: 42 }];
      engagementEventModel.aggregate
        .mockReturnValueOnce({ exec: () => Promise.resolve(timeData) })
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) })
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) });

      const result = await service.getEngagement(30);

      expect(result.avgTimeOnPageByPath).toEqual(timeData);
      const firstPipeline = engagementEventModel.aggregate.mock.calls[0][0];
      const matchStage = firstPipeline.find((s: any) => '$match' in s);
      expect(matchStage.$match.eventType).toBe('time_on_page');
    });

    it('debe devolver el scroll depth promedio por path', async () => {
      const scrollData = [{ path: '/b', avgPercent: 75 }];
      engagementEventModel.aggregate
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) })
        .mockReturnValueOnce({ exec: () => Promise.resolve(scrollData) })
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) });

      const result = await service.getEngagement(30);

      expect(result.avgScrollDepthByPath).toEqual(scrollData);
      const secondPipeline = engagementEventModel.aggregate.mock.calls[1][0];
      const matchStage = secondPipeline.find((s: any) => '$match' in s);
      expect(matchStage.$match.eventType).toBe('scroll_depth');
    });

    it('debe devolver los elementos más clickeados ordenados por conteo', async () => {
      const clickData = [{ label: 'photo-1', count: 10 }];
      engagementEventModel.aggregate
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) })
        .mockReturnValueOnce({ exec: () => Promise.resolve([]) })
        .mockReturnValueOnce({ exec: () => Promise.resolve(clickData) });

      const result = await service.getEngagement(30);

      expect(result.topClickedElements).toEqual(clickData);
      const thirdPipeline = engagementEventModel.aggregate.mock.calls[2][0];
      const matchStage = thirdPipeline.find((s: any) => '$match' in s);
      expect(matchStage.$match.eventType).toBe('click');
    });
  });
});
