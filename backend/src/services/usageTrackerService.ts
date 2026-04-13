import { StellarService } from './stellarService'
import { PrismaClient } from '@prisma/client'
import { UsageRecord, PlatformIntegration } from '../types'

export class UsageTrackerService {
  private prisma: PrismaClient
  private stellarService: StellarService

  constructor() {
    this.prisma = new PrismaClient()
    this.stellarService = new StellarService()
  }

  async trackUsage(data: {
    ipAssetId: string
    platform: string
    usageType: 'stream' | 'download' | 'license' | 'sale'
    amount: number
    currency: string
    metadata?: Record<string, any>
  }): Promise<UsageRecord> {
    // Validate platform integration
    const platform = await this.getPlatformIntegration(data.platform)
    if (!platform || !platform.isActive) {
      throw new Error(`Platform ${data.platform} is not active`)
    }

    // Create usage record in database
    const usageRecord = await this.prisma.usageRecord.create({
      data: {
        ipAssetId: data.ipAssetId,
        platform: data.platform,
        usageType: data.usageType,
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata || {},
      },
    })

    // Record usage on Stellar blockchain
    try {
      await this.stellarService.recordUsage({
        ipTokenId: data.ipAssetId,
        platform: data.platform,
        usageType: data.usageType,
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata || {},
      })
    } catch (error) {
      console.error('Failed to record usage on blockchain:', error)
      // Continue with database record even if blockchain fails
    }

    // Trigger royalty distribution
    await this.triggerRoyaltyDistribution(usageRecord.id)

    return usageRecord
  }

  async processWebhook(platform: string, payload: any): Promise<void> {
    const integration = await this.getPlatformIntegration(platform)
    if (!integration) {
      throw new Error(`No integration found for platform: ${platform}`)
    }

    // Parse platform-specific webhook data
    const usageData = await this.parseWebhookPayload(platform, payload)

    // Track usage for each item in the webhook
    for (const item of usageData) {
      await this.trackUsage(item)
    }
  }

  private async parseWebhookPayload(platform: string, payload: any): Promise<any[]> {
    switch (platform) {
      case 'spotify':
        return this.parseSpotifyWebhook(payload)
      case 'youtube':
        return this.parseYouTubeWebhook(payload)
      case 'apple_music':
        return this.parseAppleMusicWebhook(payload)
      case 'bandcamp':
        return this.parseBandcampWebhook(payload)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  private parseSpotifyWebhook(payload: any): any[] {
    // Spotify webhook payload structure
    const usageItems = []
    
    if (payload.streams) {
      for (const stream of payload.streams) {
        usageItems.push({
          ipAssetId: stream.track_id,
          platform: 'spotify',
          usageType: 'stream',
          amount: stream.count || 1,
          currency: 'USD',
          metadata: {
            country: stream.country,
            user_id: stream.user_id,
            timestamp: stream.timestamp,
          },
        })
      }
    }

    return usageItems
  }

  private parseYouTubeWebhook(payload: any): any[] {
    // YouTube webhook payload structure
    const usageItems = []
    
    if (payload.views) {
      for (const view of payload.views) {
        usageItems.push({
          ipAssetId: view.video_id,
          platform: 'youtube',
          usageType: 'stream',
          amount: view.count || 1,
          currency: 'USD',
          metadata: {
            country: view.country,
            user_id: view.user_id,
            timestamp: view.timestamp,
          },
        })
      }
    }

    return usageItems
  }

  private parseAppleMusicWebhook(payload: any): any[] {
    // Apple Music webhook payload structure
    const usageItems = []
    
    if (payload.plays) {
      for (const play of payload.plays) {
        usageItems.push({
          ipAssetId: play.track_id,
          platform: 'apple_music',
          usageType: 'stream',
          amount: play.count || 1,
          currency: 'USD',
          metadata: {
            country: play.country,
            user_id: play.user_id,
            timestamp: play.timestamp,
          },
        })
      }
    }

    return usageItems
  }

  private parseBandcampWebhook(payload: any): any[] {
    // Bandcamp webhook payload structure
    const usageItems = []
    
    if (payload.purchases) {
      for (const purchase of payload.purchases) {
        usageItems.push({
          ipAssetId: purchase.track_id || purchase.album_id,
          platform: 'bandcamp',
          usageType: purchase.type === 'download' ? 'download' : 'sale',
          amount: purchase.amount,
          currency: purchase.currency,
          metadata: {
            buyer_id: purchase.buyer_id,
            price: purchase.price,
            timestamp: purchase.timestamp,
          },
        })
      }
    }

    return usageItems
  }

  private async triggerRoyaltyDistribution(usageRecordId: string): Promise<void> {
    // Queue royalty distribution for background processing
    // This would typically use a message queue like Bull or RabbitMQ
    console.log(`Queuing royalty distribution for usage record: ${usageRecordId}`)
    
    // For now, process immediately
    try {
      await this.stellarService.distributeRoyalties(usageRecordId)
    } catch (error) {
      console.error('Failed to distribute royalties:', error)
    }
  }

  private async getPlatformIntegration(platformName: string): Promise<PlatformIntegration | null> {
    const integration = await this.prisma.platformIntegration.findUnique({
      where: { name: platformName },
    })
    return integration
  }

  async getUsageStats(ipAssetId: string, timeRange?: { start: Date; end: Date }): Promise<any> {
    const whereClause: any = { ipAssetId }
    
    if (timeRange) {
      whereClause.timestamp = {
        gte: timeRange.start,
        lte: timeRange.end,
      }
    }

    const usageRecords = await this.prisma.usageRecord.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
    })

    // Calculate statistics
    const stats = {
      totalUsage: usageRecords.length,
      totalAmount: usageRecords.reduce((sum, record) => sum + record.amount, 0),
      byPlatform: usageRecords.reduce((acc, record) => {
        acc[record.platform] = (acc[record.platform] || 0) + record.amount
        return acc
      }, {} as Record<string, number>),
      byType: usageRecords.reduce((acc, record) => {
        acc[record.usageType] = (acc[record.usageType] || 0) + record.amount
        return acc
      }, {} as Record<string, number>),
      dailyUsage: this.groupByDay(usageRecords),
    }

    return stats
  }

  private groupByDay(records: any[]): Record<string, number> {
    return records.reduce((acc, record) => {
      const day = record.timestamp.toISOString().split('T')[0]
      acc[day] = (acc[day] || 0) + record.amount
      return acc
    }, {} as Record<string, number>)
  }
}
