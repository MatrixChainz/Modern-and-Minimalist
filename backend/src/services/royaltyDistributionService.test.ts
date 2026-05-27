import { RoyaltyDistributionService } from './royaltyDistributionService';
import { prisma } from '../config/database';

jest.mock('../config/database', () => ({
  prisma: {
    royaltyPayment: { 
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn()
    },
    usageRecord: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    process: jest.fn(),
    add: jest.fn(),
  }));
});

describe('RoyaltyDistributionService', () => {
  let service: RoyaltyDistributionService;

  beforeEach(() => {
    service = new RoyaltyDistributionService();
    jest.clearAllMocks();
  });

  describe('getDistributionStats', () => {
    it('should return distribution stats', async () => {
      (prisma.royaltyPayment.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 1500 }
      });
      (prisma.royaltyPayment.count as jest.Mock)
        .mockResolvedValueOnce(55) // total
        .mockResolvedValueOnce(50) // completed
        .mockResolvedValueOnce(5)  // failed
        .mockResolvedValueOnce(0); // pending

      const stats = await service.getDistributionStats();

      expect(stats.totalDistributed).toBe(1500);
      expect(stats.completed).toBe(50);
      expect(stats.failed).toBe(5);
    });
  });

  describe('getStakeholderEarnings', () => {
    it('should return stakeholder earnings', async () => {
      (prisma.royaltyPayment.findMany as jest.Mock).mockResolvedValue([
        { amount: 500, currency: 'USD' },
        { amount: 250, currency: 'USD' }
      ]);
      
      const earnings = await service.getStakeholderEarnings('stk_123');
      
      expect(earnings.totalEarnings).toBe(750);
      expect(earnings.paymentsCount).toBe(2);
      expect(earnings.recentPayments.length).toBe(2);
    });
  });
});
