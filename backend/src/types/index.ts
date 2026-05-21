export interface UsageRecord {
  id: string
  ipAssetId: string
  platform: string
  usageType: 'STREAM' | 'DOWNLOAD' | 'LICENSE' | 'SALE'
  amount: number
  currency: string
  timestamp: Date
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface PlatformIntegration {
  id: string
  name: string
  apiKey: string
  webhookUrl?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface JwtPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}
