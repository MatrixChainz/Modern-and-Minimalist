import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Joi from 'joi'
import { prisma } from '../config/database'
import { validate } from '../middleware/validate'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
})

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  walletAddress: Joi.string().required(),
})

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password, walletAddress } = req.body

    const existing = await prisma.creator.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const creator = await prisma.creator.create({
      data: { name, email, walletAddress, passwordHash },
      select: { id: true, name: true, email: true, walletAddress: true, createdAt: true },
    })

    const token = jwt.sign(
      { userId: creator.id, email: creator.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    )

    res.status(201).json({ success: true, data: { creator, token } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration failed' })
  }
})

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const creator = await prisma.creator.findUnique({ where: { email } })
    if (!creator || !creator.passwordHash) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, creator.passwordHash)
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const token = jwt.sign(
      { userId: creator.id, email: creator.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    )

    res.json({
      success: true,
      data: {
        creator: { id: creator.id, name: creator.name, email: creator.email, walletAddress: creator.walletAddress },
        token,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed' })
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const creator = await prisma.creator.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, walletAddress: true, createdAt: true },
    })
    if (!creator) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }
    res.json({ success: true, data: creator })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' })
  }
})

export { router as authRoutes }
