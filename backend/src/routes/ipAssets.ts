import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        title: 'Summer Vibes',
        description: 'Upbeat summer music track',
        creatorId: 'creator-1',
        tokenId: 'token-1',
        contractAddress: '0x123...',
        type: 'music',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      }
    ]
  })
})

router.post('/', (req, res) => {
  res.json({ success: true, message: 'IP asset created' })
})

export { router as ipAssetRoutes }
