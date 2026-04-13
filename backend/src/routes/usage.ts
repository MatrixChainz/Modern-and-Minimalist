import { Router } from 'express'

const router = Router()

router.post('/track', (req, res) => {
  res.json({ success: true, message: 'Usage tracked successfully' })
})

router.get('/records', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        ipAssetId: 'ip-1',
        platform: 'Spotify',
        usageType: 'stream',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date('2024-01-15'),
        metadata: { country: 'US' }
      }
    ]
  })
})

export { router as usageRoutes }
