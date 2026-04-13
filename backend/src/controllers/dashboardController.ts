import { Request, Response } from 'express'

export class DashboardController {
  async getStats(req: Request, res: Response) {
    try {
      // Mock data - replace with actual database queries
      const stats = {
        totalIPAssets: 42,
        totalRoyalties: 125430,
        activeStakeholders: 18,
        monthlyGrowth: 23.5,
        recentActivity: [
          { action: 'New IP asset registered', asset: 'Summer Vibes', time: '2 hours ago' },
          { action: 'Royalty payment processed', asset: 'Digital Art Collection', time: '5 hours ago' },
          { action: 'Stakeholder added', asset: 'Music Album', time: '1 day ago' },
          { action: 'Usage spike detected', asset: 'Video Content', time: '2 days ago' },
        ]
      }

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard stats'
      })
    }
  }
}
