import { Router, Response } from 'express'
import Joi from 'joi'
import { prisma } from '../config/database'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const createSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  tokenId: Joi.string().required(),
  contractAddress: Joi.string().required(),
  type: Joi.string().valid('MUSIC', 'VIDEO', 'ART', 'TEXT', 'SOFTWARE').required(),
  metadata: Joi.object().optional(),
})

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const assets = await prisma.iPAsset.findMany({
      where: { creatorId: req.user!.userId },
      include: { stakeholders: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: assets })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch IP assets' })
  }
})

router.post('/', authenticate, validate(createSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, tokenId, contractAddress, type, metadata } = req.body
    const asset = await prisma.iPAsset.create({
      data: {
        title,
        description,
        tokenId,
        contractAddress,
        type,
        metadata,
        creatorId: req.user!.userId,
      },
    })
    res.status(201).json({ success: true, data: asset })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to create IP asset' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.iPAsset.findFirst({
      where: { id: req.params.id, creatorId: req.user!.userId },
      include: { stakeholders: true, usageRecords: { take: 10, orderBy: { timestamp: 'desc' } } },
    })
    if (!asset) {
      res.status(404).json({ success: false, error: 'IP asset not found' })
      return
    }
    res.json({ success: true, data: asset })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch IP asset' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.iPAsset.findFirst({
      where: { id: req.params.id, creatorId: req.user!.userId },
    })
    if (!asset) {
      res.status(404).json({ success: false, error: 'IP asset not found' })
      return
    }
    await prisma.iPAsset.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'IP asset deleted' })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete IP asset' })
  }
})

export { router as ipAssetRoutes }
