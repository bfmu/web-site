import { HttpException } from '@nestjs/common';
import { SpotifyController } from './spotify.controller';

const mockSpotifyService = {
  searchTracks: jest.fn(),
  getTrack: jest.fn(),
};

describe('SpotifyController', () => {
  let controller: SpotifyController;

  beforeEach(() => {
    controller = new SpotifyController(mockSpotifyService as any);
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('devuelve lista vacía si no hay query', async () => {
      const result = await controller.search('   ');
      expect(result).toEqual({ tracks: [] });
      expect(mockSpotifyService.searchTracks).not.toHaveBeenCalled();
    });

    it('delega en el servicio y devuelve las pistas encontradas', async () => {
      mockSpotifyService.searchTracks.mockResolvedValue([
        { id: '1', name: 'Song', artist: 'Artist' },
      ]);
      const result = await controller.search('some song');
      expect(mockSpotifyService.searchTracks).toHaveBeenCalledWith('some song');
      expect(result.tracks).toHaveLength(1);
    });

    it('traduce errores del servicio a HttpException', async () => {
      mockSpotifyService.searchTracks.mockRejectedValue(new Error('boom'));
      await expect(controller.search('some song')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getTrack', () => {
    it('delega en el servicio con el id recibido', async () => {
      mockSpotifyService.getTrack.mockResolvedValue({
        id: 'abc',
        name: 'Song',
      });
      const result = await controller.getTrack('abc');
      expect(mockSpotifyService.getTrack).toHaveBeenCalledWith('abc');
      expect(result).toEqual({ id: 'abc', name: 'Song' });
    });

    it('traduce errores del servicio a HttpException', async () => {
      mockSpotifyService.getTrack.mockRejectedValue(new Error('not found'));
      await expect(controller.getTrack('abc')).rejects.toThrow(HttpException);
    });
  });
});
