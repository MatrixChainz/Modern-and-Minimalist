import { UsageTrackerService } from './usageTrackerService';

jest.mock('../config/database', () => ({
  prisma: {
    usageRecord: { create: jest.fn() },
    platformIntegration: { findUnique: jest.fn().mockResolvedValue({ id: 'pi1', name: 'platform' }) }
  }
}));

jest.mock('./stellarService', () => ({
  StellarService: jest.fn().mockImplementation(() => ({
    recordUsage: jest.fn().mockResolvedValue('hash123')
  }))
}));

jest.mock('./royaltyDistributionService', () => ({
  RoyaltyDistributionService: jest.fn().mockImplementation(() => ({
    queueRoyaltyDistribution: jest.fn()
  }))
}));

describe('UsageTrackerService - Webhook Parsers', () => {
  let service: any;

  beforeEach(() => {
    service = new UsageTrackerService();
    service.trackUsage = jest.fn();
  });

  describe('Spotify', () => {
    it('should parse valid spotify webhook', async () => {
      const payload = {
        streams: [{ track_id: 'ip123', count: 10, country: 'US', user_id: 'u1' }]
      };
      await service.processWebhook('spotify', payload);
      expect(service.trackUsage).toHaveBeenCalledWith(expect.objectContaining({
        ipAssetId: 'ip123',
        platform: 'spotify',
        usageType: 'STREAM',
        amount: 10,
        currency: 'USD'
      }));
    });
  });

  describe('YouTube', () => {
    it('should parse valid youtube webhook', async () => {
      const payload = {
        views: [{ video_id: 'ip123', count: 50, country: 'US', user_id: 'u1' }]
      };
      await service.processWebhook('youtube', payload);
      expect(service.trackUsage).toHaveBeenCalledWith(expect.objectContaining({
        ipAssetId: 'ip123',
        platform: 'youtube',
        usageType: 'STREAM',
        amount: 50,
        currency: 'USD'
      }));
    });
  });

  describe('Apple Music', () => {
    it('should parse valid apple music webhook', async () => {
      const payload = {
        plays: [{ track_id: 'ip123', count: 20, country: 'US', user_id: 'u1' }]
      };
      await service.processWebhook('apple_music', payload);
      expect(service.trackUsage).toHaveBeenCalledWith(expect.objectContaining({
        ipAssetId: 'ip123',
        platform: 'apple_music',
        usageType: 'STREAM',
        amount: 20,
        currency: 'USD'
      }));
    });
  });

  describe('Bandcamp', () => {
    it('should parse valid bandcamp webhook', async () => {
      const payload = {
        purchases: [{ track_id: 'ip123', amount: 5.0, currency: 'USD', type: 'download' }]
      };
      await service.processWebhook('bandcamp', payload);
      expect(service.trackUsage).toHaveBeenCalledWith(expect.objectContaining({
        ipAssetId: 'ip123',
        platform: 'bandcamp',
        usageType: 'DOWNLOAD',
        amount: 5.0,
        currency: 'USD'
      }));
    });
  });
});
