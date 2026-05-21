import { Response } from 'express'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth'

export class DashboardController {
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      const [
        totalIPAssets,
        activeStakeholders,
        totalRoyaltiesResult,
        lastMonthRoyaltiesResult,
        recentActivity,
      ] = await Promise.all([
        prisma.iPAsset.count({ where: { creatorId: userId } }),
        prisma.stakeholder.count({ where: { ipAsset: { creatorId: userId } } }),
        prisma.royaltyPayment.aggregate({
          where: { ipAsset: { creatorId: userId }, status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        prisma.royaltyPayment.aggregate({
          where: {
            ipAsset: { creatorId: userId },
            status: 'COMPLETED',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
          _sum: { amount: true },
        }),
        prisma.royaltyPayment.findMany({
          where: { ipAsset: { creatorId: userId } },
          include: {
            ipAsset: { select: { title: true } },
            stakeholder: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ])

      const thisMonthRoyalties = await prisma.royaltyPayment.aggregate({
        where: {
          ipAsset: { creatorId: userId },
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      })

      const lastMonthTotal = lastMonthRoyaltiesResult._sum.amount ?? 0
      const thisMonthTotal = thisMonthRoyalties._sum.amount ?? 0
      const monthlyGrowth = lastMonthTotal > 0
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0

      res.json({
        success: true,
        data: {
          totalIPAssets,
          totalRoyalties: totalRoyaltiesResult._sum.amount ?? 0,
          activeStakeholders,
          monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
          recentActivity: recentActivity.map((p) => ({
            id: p.id,
            action: `Royalty payment ${p.status.toLowerCase()}`,
            asset: p.ipAsset.title,
            stakeholder: p.stakeholder.name,
            amount: p.amount,
            currency: p.currency,
            time: p.createdAt,
          })),
        },
      })
    } catch {
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' })
    }
  }
}
