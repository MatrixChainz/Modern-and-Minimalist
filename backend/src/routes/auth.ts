import { Router } from 'express'

const router = Router()

// Mock auth routes
router.post('/login', (req, res) => {
  res.json({ success: true, token: 'mock-token' })
})

router.post('/register', (req, res) => {
  res.json({ success: true, message: 'User registered' })
})

export { router as authRoutes }
