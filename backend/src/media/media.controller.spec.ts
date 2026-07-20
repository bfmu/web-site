import { BadRequestException } from '@nestjs/common';
import { MediaController } from './media.controller';

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 2048 }),
  renameSync: jest.fn(),
  rmSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
}));

jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    rotate: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockResolvedValue({ width: 100, height: 200 }),
  });
});

jest.mock('heic-convert', () => jest.fn());

jest.mock('@ffmpeg-installer/ffmpeg', () => ({ path: '/fake/ffmpeg' }));
jest.mock('@ffprobe-installer/ffprobe', () => ({ path: '/fake/ffprobe' }));

jest.mock('fluent-ffmpeg', () => {
  const state = { transcodeShouldFail: false, thumbnailShouldFail: false };

  function createChain() {
    let endCb: (() => void) | undefined;
    let errorCb: ((err: Error) => void) | undefined;
    const chain: any = {
      videoCodec: () => chain,
      audioCodec: () => chain,
      outputOptions: () => chain,
      on: (event: string, cb: any) => {
        if (event === 'end') endCb = cb;
        if (event === 'error') errorCb = cb;
        return chain;
      },
      save: () => {
        if (state.transcodeShouldFail) errorCb?.(new Error('transcode failed'));
        else endCb?.();
        return chain;
      },
      screenshots: () => {
        if (state.thumbnailShouldFail) errorCb?.(new Error('thumbnail failed'));
        else endCb?.();
        return chain;
      },
    };
    return chain;
  }

  const fn: any = jest.fn(() => createChain());
  fn.setFfmpegPath = jest.fn();
  fn.setFfprobePath = jest.fn();
  fn.ffprobe = jest.fn((_filePath: string, cb: any) =>
    cb(null, { streams: [{ codec_type: 'video', width: 1280, height: 720 }] }),
  );
  fn.__state = state;
  return fn;
});

const heicConvert = jest.requireMock('heic-convert') as jest.Mock;
const ffmpegMock = jest.requireMock('fluent-ffmpeg') as any;

const mockMediaService = {
  create: jest.fn(),
};

function buildFile(overrides: Partial<any> = {}) {
  return {
    buffer: Buffer.from('fake-bytes'),
    mimetype: 'image/jpeg',
    originalname: 'photo.jpg',
    size: 1024,
    ...overrides,
  };
}

describe('MediaController.upload', () => {
  let controller: MediaController;

  beforeEach(() => {
    controller = new MediaController(mockMediaService as any);
    jest.clearAllMocks();
    ffmpegMock.__state.transcodeShouldFail = false;
    ffmpegMock.__state.thumbnailShouldFail = false;
    mockMediaService.create.mockImplementation((dto) => ({
      ...dto,
      toObject: () => dto,
    }));
  });

  it('acepta un JPEG normal sin pasar por conversión HEIC', async () => {
    const file = buildFile();
    const result = await controller.upload(file);
    expect(heicConvert).not.toHaveBeenCalled();
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.originalName).toBe('photo.jpg');
  });

  it('rechaza un mimetype no soportado', async () => {
    const file = buildFile({ mimetype: 'application/pdf', originalname: 'doc.pdf' });
    await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
  });

  it('convierte un archivo image/heic a JPEG antes de guardarlo', async () => {
    heicConvert.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const file = buildFile({
      mimetype: 'image/heic',
      originalname: 'IMG_1234.heic',
    });

    const result = await controller.upload(file);

    expect(heicConvert).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'JPEG' }),
    );
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.originalName).toBe('IMG_1234.jpg');
  });

  it('reconoce HEIC enviado como application/octet-stream por extensión', async () => {
    heicConvert.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const file = buildFile({
      mimetype: 'application/octet-stream',
      originalname: 'IMG_5678.HEIC',
    });

    const result = await controller.upload(file);

    expect(heicConvert).toHaveBeenCalled();
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('rechaza application/octet-stream sin extensión heic/heif', async () => {
    const file = buildFile({
      mimetype: 'application/octet-stream',
      originalname: 'archivo.bin',
    });
    await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
    expect(heicConvert).not.toHaveBeenCalled();
  });

  it('devuelve 400 si heic-convert falla en vez de romper el pipeline', async () => {
    heicConvert.mockRejectedValue(new Error('corrupt heic'));
    const file = buildFile({
      mimetype: 'image/heic',
      originalname: 'roto.heic',
    });
    await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
  });

  it('transcodea un video/mp4, genera thumbnail y guarda dimensiones probeadas', async () => {
    const file = buildFile({
      mimetype: 'video/mp4',
      originalname: 'clip.mov',
      size: 10 * 1024 * 1024,
    });

    const result = await controller.upload(file);

    expect(result.type).toBe('video');
    expect(result.mimeType).toBe('video/mp4');
    expect(result.originalName).toBe('clip.mp4');
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
    expect(result.thumbnailPath).toMatch(/\/uploads\/images\/.*-thumb\.jpg$/);
    expect(result.size).toBe(2048); // viene de fs.statSync mockeado
  });

  it('rechaza un video que supera los 500MB', async () => {
    const file = buildFile({
      mimetype: 'video/mp4',
      originalname: 'enorme.mp4',
      size: 600 * 1024 * 1024,
    });
    await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
  });

  it('devuelve 400 si la transcodificación de video falla', async () => {
    ffmpegMock.__state.transcodeShouldFail = true;
    const file = buildFile({ mimetype: 'video/mp4', originalname: 'roto.mp4' });
    await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
  });

  it('no falla el upload si solo falla la generación del thumbnail', async () => {
    ffmpegMock.__state.thumbnailShouldFail = true;
    const file = buildFile({ mimetype: 'video/mp4', originalname: 'clip.mp4' });

    const result = await controller.upload(file);

    expect(result.type).toBe('video');
    expect(result.thumbnailPath).toBeUndefined();
  });
});
