import { UsageType } from '@prisma/client'
import { prisma } from '../config/database'
import { StellarService } from './stellarService'
import { UsageRecord, PlatformIntegration } from '../types'

interface TrackUsageInput {
  ipAssetId: string
  platform: string
  usageType: 'STREAM' | 'DOWNLOAD' | 'LICENSE' | 'SALE'
  amount: number
  currency: string
  metadata?: Record<string, unknown>
}

interface WebhookUsageItem {
  ipAssetId: string
  platform: string
  usageType: 'STREAM' | 'DOWNLOAD' | 'LICENSE' | 'SALE'
  amount: number
  currency: string
  metadata?: Record<string, unknown>
}

interface UsageStats {
  totalUsage: number
  totalAmount: number
  byPlatform: Record<string, number>
  byType: Record<string, number>
  dailyUsage: Record<string, number>
}

export class UsageTrackerService {
  private stellarService: StellarService

  constructor() {
    this.stellarService = new StellarService()
  }

  async trackUsage(data: TrackUsageInput): Promise<UsageRecord> {
    const platform = await this.getPlatformIntegration(data.platform)
    if (!platform?.isActive) {
      throw new Error(`Platform ${data.platform} is not active`)
    }

    const usageRecord = await prisma.usageRecord.create({
      data: {
        ipAssetId: data.ipAssetId,
        platform: data.platform,
        usageType: data.usageType as UsageType,
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata ?? {},
      },
    })

    try {
      await this.stellarService.recordUsage({
        ipTokenId: data.ipAssetId,
        platform: data.platform,
        usageType: data.usageType,
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata ?? {},
      })
    } catch (err) {
      console.error('Failed to record usage on blockchain:', err)
    }

    await this.triggerRoyaltyDistribution(usageRecord.id)

    return usageRecord as unknown as UsageRecord
  }

  async processWebhook(platform: string, payload: Record<string, unknown>): Promise<void> {
    const integration = await this.getPlatformIntegration(platform)
    if (!integration) {
      throw new Error(`No integration found for platform: ${platform}`)
    }

    const usageData = this.parseWebhookPayload(platform, payload)
    for (const item of usageData) {
      await this.trackUsage(item)
    }
  }

  private parseWebhookPayload(platform: string, payload: Record<string, unknown>): WebhookUsageItem[] {
    switch (platform) {
      case 'spotify': return this.parseSpotifyWebhook(payload)
      case 'youtube': return this.parseYouTubeWebhook(payload)
      case 'apple_music': return this.parseAppleMusicWebhook(payload)
      case 'bandcamp': return this.parseBandcampWebhook(payload)
      default: throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  private parseSpotifyWebhook(payload: Record<string, unknown>): WebhookUsageItem[] {
    const streams = payload.streams as Array<Record<string, unknown>> | undefined
    if (!streams) return []
    return streams.map((stream) => ({
      ipAssetId: stream.track_id as string,
      platform: 'spotify',
      usageType: 'STREAM',
      amount: (stream.count as number) || 1,
      currency: 'USD',
      metadata: { country: stream.country, user_id: stream.user_id, timestamp: stream.timestamp },
    }))
  }

  private parseYouTubeWebhook(payload: Record<string, unknown>): WebhookUsageItem[] {
    const views = payload.views as Array<Record<string, unknown>> | undefined
    if (!views) return []
    return views.map((view) => ({
      ipAssetId: view.video_id as string,
      platform: 'youtube',
      usageType: 'STREAM',
      amount: (view.count as number) || 1,
      currency: 'USD',
      metadata: { country: view.country, user_id: view.user_id, timestamp: view.timestamp },
    }))
  }

  private parseAppleMusicWebhook(payload: Record<string, unknown>): WebhookUsageItem[] {
    const plays = payload.plays as Array<Record<string, unknown>> | undefined
    if (!plays) return []
    return plays.map((play) => ({
      ipAssetId: play.track_id as string,
      platform: 'apple_music',
      usageType: 'STREAM',
      amount: (play.count as number) || 1,
      currency: 'USD',
      metadata: { country: play.country, user_id: play.user_id, timestamp: play.timestamp },
    }))
  }

  private parseBandcampWebhook(payload: Record<string, unknown>): WebhookUsageItem[] {
    const purchases = payload.purchases as Array<Record<string, unknown>> | undefined
    if (!purchases) return []
    return purchases.map((purchase) => ({
      ipAssetId: (purchase.track_id ?? purchase.album_id) as string,
      platform: 'bandcamp',
      usageType: purchase.type === 'download' ? 'DOWNLOAD' : 'SALE',
      amount: purchase.amount as number,
      currency: purchase.currency as string,
      metadata: { buyer_id: purchase.buyer_id, price: purchase.price, timestamp: purchase.timestamp },
    }))
  }

  private async triggerRoyaltyDistribution(usageRecordId: string): Promise<void> {
    try {
      await this.stellarService.distributeRoyalties(usageRecordId)
    } catch (err) {
      console.error('Failed to distribute royalties:', err)
    }
  }

  private async getPlatformIntegration(platformName: string): Promise<PlatformIntegration | null> {
    return prisma.platformIntegration.findUnique({ where: { name: platformName } })
  }

  async getUsageStats(ipAssetId: string, timeRange?: { start: Date; end: Date }): Promise<UsageStats> {
    const where = {
      ipAssetId,
      ...(timeRange ? { timestamp: { gte: timeRange.start, lte: timeRange.end } } : {}),
    }

    const usageRecords = await prisma.usageRecord.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    })

    return {
      totalUsage: usageRecords.length,
      totalAmount: usageRecords.reduce((sum, r) => sum + r.amount, 0),
      byPlatform: usageRecords.reduce<Record<string, number>>((acc, r) => {
        acc[r.platform] = (acc[r.platform] ?? 0) + r.amount
        return acc
      }, {}),
      byType: usageRecords.reduce<Record<string, number>>((acc, r) => {
        acc[r.usageType] = (acc[r.usageType] ?? 0) + r.amount
        return acc
      }, {}),
      dailyUsage: this.groupByDay(usageRecords),
    }
  }

  private groupByDay(records: Array<{ timestamp: Date; amount: number }>): Record<string, number> {
    return records.reduce<Record<string, number>>((acc, record) => {
      const day = record.timestamp.toISOString().split('T')[0]
      acc[day] = (acc[day] ?? 0) + record.amount
      return acc
    }, {})
  }
}
