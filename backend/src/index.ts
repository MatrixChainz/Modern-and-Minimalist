import { logger } from './config/logger';
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

import { errorHandler } from './middleware/errorHandler'
import { authRoutes } from './routes/auth'
import { ipAssetRoutes } from './routes/ipAssets'
import { stakeholderRoutes } from './routes/stakeholders'
import { royaltyRoutes } from './routes/royalties'
import { usageRoutes } from './routes/usage'
import { dashboardRoutes } from './routes/dashboard'
import { connectRedis } from './config/redis'
import { prisma } from './config/database'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})
app.use('/api/', limiter)

// General middleware
app.use(compression())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/ip-assets', ipAssetRoutes)
app.use('/api/stakeholders', stakeholderRoutes)
app.use('/api/royalties', royaltyRoutes)
app.use('/api/usage', usageRoutes)
app.use('/api/dashboard', dashboardRoutes)

// 404 handler — must come before error handler
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// Error handling — must be last
app.use(errorHandler)

async function start() {
  try {
    await connectRedis()
    logger.info('✅ Redis connected')
  } catch (err) {
    logger.error('⚠️  Redis connection failed (non-fatal):', err)
  }

  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`)
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

// Graceful shutdown
const shutdown = async () => {
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start()
