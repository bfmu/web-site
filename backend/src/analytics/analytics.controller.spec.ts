import { Request } from 'express';
import { AnalyticsController } from './analytics.controller';
import * as analyticsUtils from './analytics.utils';

jest.mock('./analytics.utils', () => ({
  isBot: jest.fn(),
  isAdminSession: jest.fn(),
}));

const mockAnalyticsService = {
  track: jest.fn(),
  trackEvent: jest.fn(),
  getStats: jest.fn(),
  getRecentVisits: jest.fn(),
  getSessions: jest.fn(),
  getEngagement: jest.fn(),
};

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    get: jest.fn().mockReturnValue(undefined),
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as any,
    headers: {},
    ...overrides,
  } as unknown as Request;
}

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: typeof mockAnalyticsService;

  beforeEach(() => {
    // Instanciación directa (sin Test.createTestingModule): varios endpoints
    // llevan @UseGuards(ThrottlerGuard), que Nest intenta resolver vía DI al
    // compilar el módulo de test y no está disponible acá. new + mock del
    // servicio es el mismo patrón que ya usa media.controller.spec.ts.
    controller = new AnalyticsController(mockAnalyticsService as any);
    service = mockAnalyticsService;
    jest.clearAllMocks();
    (analyticsUtils.isBot as jest.Mock).mockReturnValue(false);
    (analyticsUtils.isAdminSession as jest.Mock).mockReturnValue(false);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /analytics/event', () => {
    it('debe delegar a trackEvent con el dto', async () => {
      const dto = { eventType: 'click' as const, path: '/gallery', label: 'photo-1' };
      const result = await controller.trackEvent(dto, createMockRequest());

      expect(service.trackEvent).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ ok: true });
    });

    it('no debe llamar a trackEvent si isBot devuelve true', async () => {
      (analyticsUtils.isBot as jest.Mock).mockReturnValue(true);
      const dto = { eventType: 'click' as const, path: '/gallery' };

      await controller.trackEvent(dto, createMockRequest());

      expect(service.trackEvent).not.toHaveBeenCalled();
    });

    it('no debe llamar a trackEvent si isAdminSession devuelve true', async () => {
      (analyticsUtils.isAdminSession as jest.Mock).mockReturnValue(true);
      const dto = { eventType: 'click' as const, path: '/gallery' };

      await controller.trackEvent(dto, createMockRequest());

      expect(service.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('GET /analytics/sessions', () => {
    it('debe delegar a getSessions con days parseado', async () => {
      service.getSessions.mockResolvedValue([]);
      await controller.getSessions('7');
      expect(service.getSessions).toHaveBeenCalledWith(7);
    });

    it('debe usar el default de 30 días cuando no se provee days', async () => {
      service.getSessions.mockResolvedValue([]);
      await controller.getSessions(undefined);
      expect(service.getSessions).toHaveBeenCalledWith(30);
    });

    it('debe clampear a 365 cuando days excede el máximo', async () => {
      service.getSessions.mockResolvedValue([]);
      await controller.getSessions('9999');
      expect(service.getSessions).toHaveBeenCalledWith(365);
    });
  });

  describe('GET /analytics/engagement', () => {
    it('debe delegar a getEngagement con days parseado', async () => {
      service.getEngagement.mockResolvedValue({
        avgTimeOnPageByPath: [],
        avgScrollDepthByPath: [],
        topClickedElements: [],
      });
      await controller.getEngagement('90');
      expect(service.getEngagement).toHaveBeenCalledWith(90);
    });

    it('debe usar el default de 30 días cuando no se provee days', async () => {
      service.getEngagement.mockResolvedValue({
        avgTimeOnPageByPath: [],
        avgScrollDepthByPath: [],
        topClickedElements: [],
      });
      await controller.getEngagement(undefined);
      expect(service.getEngagement).toHaveBeenCalledWith(30);
    });
  });
});
