import { Router, Response } from 'express'
import { prisma } from '../config/database'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, ipAssetId } = req.query
    const payments = await prisma.royaltyPayment.findMany({
      where: {
        ipAsset: { creatorId: req.user!.userId },
        ...(status ? { status: status as string } : {}),
        ...(ipAssetId ? { ipAssetId: ipAssetId as string } : {}),
      },
      include: {
        stakeholder: { select: { id: true, name: true, walletAddress: true } },
        ipAsset: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: payments })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch royalty payments' })
  }
})

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [total, completed, failed, pending, totalAmount] = await Promise.all([
      prisma.royaltyPayment.count({ where: { ipAsset: { creatorId: req.user!.userId } } }),
      prisma.royaltyPayment.count({ where: { ipAsset: { creatorId: req.user!.userId }, status: 'COMPLETED' } }),
      prisma.royaltyPayment.count({ where: { ipAsset: { creatorId: req.user!.userId }, status: 'FAILED' } }),
      prisma.royaltyPayment.count({ where: { ipAsset: { creatorId: req.user!.userId }, status: 'PENDING' } }),
      prisma.royaltyPayment.aggregate({
        where: { ipAsset: { creatorId: req.user!.userId }, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ])
    res.json({
      success: true,
      data: {
        total,
        completed,
        failed,
        pending,
        totalDistributed: totalAmount._sum.amount ?? 0,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch royalty stats' })
  }
})

export { router as royaltyRoutes }
