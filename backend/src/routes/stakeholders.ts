import { Router, Response } from 'express'
import Joi from 'joi'
import { prisma } from '../config/database'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const createSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  walletAddress: Joi.string().required(),
  role: Joi.string().valid('CREATOR', 'PRODUCER', 'DISTRIBUTOR', 'PUBLISHER', 'OTHER').required(),
  royaltyPercentage: Joi.number().min(0).max(100).required(),
  ipAssetId: Joi.string().required(),
})

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ipAssetId } = req.query
    const stakeholders = await prisma.stakeholder.findMany({
      where: {
        ipAsset: { creatorId: req.user!.userId },
        ...(ipAssetId ? { ipAssetId: ipAssetId as string } : {}),
      },
      include: { ipAsset: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: stakeholders })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch stakeholders' })
  }
})

router.post('/', authenticate, validate(createSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, walletAddress, role, royaltyPercentage, ipAssetId } = req.body

    // Verify the IP asset belongs to the authenticated user
    const asset = await prisma.iPAsset.findFirst({
      where: { id: ipAssetId, creatorId: req.user!.userId },
    })
    if (!asset) {
      res.status(404).json({ success: false, error: 'IP asset not found' })
      return
    }

    // Validate total royalty percentage won't exceed 100%
    const existing = await prisma.stakeholder.aggregate({
      where: { ipAssetId },
      _sum: { royaltyPercentage: true },
    })
    const currentTotal = existing._sum.royaltyPercentage ?? 0
    if (currentTotal + royaltyPercentage > 100) {
      res.status(400).json({ success: false, error: 'Total royalty percentage would exceed 100%' })
      return
    }

    const stakeholder = await prisma.stakeholder.create({
      data: { name, email, walletAddress, role, royaltyPercentage, ipAssetId },
    })
    res.status(201).json({ success: true, data: stakeholder })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to create stakeholder' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stakeholder = await prisma.stakeholder.findFirst({
      where: { id: req.params.id, ipAsset: { creatorId: req.user!.userId } },
    })
    if (!stakeholder) {
      res.status(404).json({ success: false, error: 'Stakeholder not found' })
      return
    }
    await prisma.stakeholder.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Stakeholder removed' })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete stakeholder' })
  }
})

export { router as stakeholderRoutes }
