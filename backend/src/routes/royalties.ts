import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        stakeholderId: 'stakeholder-1',
        ipAssetId: 'ip-1',
        amount: 1250.50,
        currency: 'USD',
        transactionHash: '0xabc123...',
        status: 'completed',
        createdAt: new Date('2024-01-15'),
        processedAt: new Date('2024-01-15'),
      }
    ]
  })
})

export { router as royaltyRoutes }
