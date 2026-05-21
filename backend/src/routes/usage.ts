import { Router, Response } from 'express'
import Joi from 'joi'
import { prisma } from '../config/database'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { UsageTrackerService } from '../services/usageTrackerService'

const router = Router()
const usageTracker = new UsageTrackerService()

const trackSchema = Joi.object({
  ipAssetId: Joi.string().required(),
  platform: Joi.string().required(),
  usageType: Joi.string().valid('STREAM', 'DOWNLOAD', 'LICENSE', 'SALE').required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  metadata: Joi.object().optional(),
})

router.post('/track', authenticate, validate(trackSchema), async (req: AuthRequest, res: Response) => {
  try {
    // Verify the IP asset belongs to the authenticated user
    const asset = await prisma.iPAsset.findFirst({
      where: { id: req.body.ipAssetId, creatorId: req.user!.userId },
    })
    if (!asset) {
      res.status(404).json({ success: false, error: 'IP asset not found' })
      return
    }
    const record = await usageTracker.trackUsage(req.body)
    res.status(201).json({ success: true, data: record })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to track usage'
    res.status(500).json({ success: false, error: message })
  }
})

router.get('/records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ipAssetId, platform } = req.query
    const records = await prisma.usageRecord.findMany({
      where: {
        ipAsset: { creatorId: req.user!.userId },
        ...(ipAssetId ? { ipAssetId: ipAssetId as string } : {}),
        ...(platform ? { platform: platform as string } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    })
    res.json({ success: true, data: records })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch usage records' })
  }
})

router.post('/webhook/:platform', async (req, res: Response) => {
  try {
    await usageTracker.processWebhook(req.params.platform, req.body as Record<string, unknown>)
    res.json({ success: true, message: 'Webhook processed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed'
    res.status(400).json({ success: false, error: message })
  }
})

export { router as usageRoutes }
