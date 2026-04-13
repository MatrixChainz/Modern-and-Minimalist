import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        walletAddress: 'GABC123...',
        role: 'creator',
        royaltyPercentage: 60.0,
        ipAssetId: 'ip-1',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      }
    ]
  })
})

export { router as stakeholderRoutes }
