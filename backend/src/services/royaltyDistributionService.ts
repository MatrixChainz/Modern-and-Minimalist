import { PrismaClient } from '@prisma/client'
import { StellarService } from './stellarService'
import { Queue } from 'bull'
import { createClient } from 'redis'

export class RoyaltyDistributionService {
  private prisma: PrismaClient
  private stellarService: StellarService
  private distributionQueue: Queue
  private redisClient: any

  constructor() {
    this.prisma = new PrismaClient()
    this.stellarService = new StellarService()
    
    // Initialize Redis for queue
    this.redisClient = createClient()
    this.redisClient.connect()
    
    // Initialize Bull queue for royalty distribution
    this.distributionQueue = new Queue('royalty distribution', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    })

    // Process queue
    this.distributionQueue.process('distribute-royalties', 5, this.processRoyaltyDistribution.bind(this))
  }

  async queueRoyaltyDistribution(usageRecordId: string): Promise<void> {
    await this.distributionQueue.add('distribute-royalties', {
      usageRecordId,
      timestamp: Date.now(),
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    })
  }

  private async processRoyaltyDistribution(job: any): Promise<void> {
    const { usageRecordId } = job.data
    
    try {
      console.log(`Processing royalty distribution for usage record: ${usageRecordId}`)
      
      // Get usage record
      const usageRecord = await this.prisma.usageRecord.findUnique({
        where: { id: usageRecordId },
        include: {
          ipAsset: {
            include: {
              stakeholders: true,
            },
          },
        },
      })

      if (!usageRecord) {
        throw new Error(`Usage record not found: ${usageRecordId}`)
      }

      // Calculate royalty amounts
      const royaltyCalculations = await this.calculateRoyalties(usageRecord)
      
      // Create royalty payments
      const paymentIds = await this.createRoyaltyPayments(usageRecordId, royaltyCalculations)
      
      // Process payments on Stellar
      for (const paymentId of paymentIds) {
        await this.processPayment(paymentId)
      }

      console.log(`Successfully processed royalty distribution for usage record: ${usageRecordId}`)
    } catch (error) {
      console.error(`Failed to process royalty distribution for usage record ${usageRecordId}:`, error)
      throw error
    }
  }

  private async calculateRoyalties(usageRecord: any): Promise<Array<{
    stakeholderId: string
    amount: number
    percentage: number
  }>> {
    const calculations = []
    
    for (const stakeholder of usageRecord.ipAsset.stakeholders) {
      const royaltyAmount = (usageRecord.amount * stakeholder.royaltyPercentage) / 100
      calculations.push({
        stakeholderId: stakeholder.id,
        amount: royaltyAmount,
        percentage: stakeholder.royaltyPercentage,
      })
    }

    return calculations
  }

  private async createRoyaltyPayments(
    usageRecordId: string,
    calculations: Array<{
      stakeholderId: string
      amount: number
      percentage: number
    }>
  ): Promise<string[]> {
    const paymentIds = []

    for (const calculation of calculations) {
      const payment = await this.prisma.royaltyPayment.create({
        data: {
          stakeholderId: calculation.stakeholderId,
          ipAssetId: usageRecordId,
          amount: calculation.amount,
          currency: 'USD', // Default to USD, can be made configurable
          status: 'PENDING',
          metadata: {
            percentage: calculation.percentage,
            calculationTimestamp: Date.now(),
          },
        },
      })

      paymentIds.push(payment.id)
    }

    return paymentIds
  }

  private async processPayment(paymentId: string): Promise<void> {
    try {
      // Get payment details
      const payment = await this.prisma.royaltyPayment.findUnique({
        where: { id: paymentId },
        include: {
          stakeholder: true,
        },
      })

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`)
      }

      // Convert amount to Stellar format (smallest unit)
      const stellarAmount = this.convertToStellarAmount(payment.amount, payment.currency)
      
      // Send payment on Stellar
      const fromAccount = process.env.STELLAR_DISTRIBUTION_ACCOUNT
      const toAddress = payment.stakeholder.walletAddress
      
      if (!fromAccount) {
        throw new Error('Stellar distribution account not configured')
      }

      const transactionHash = await this.stellarService.sendPayment(
        fromAccount,
        toAddress,
        stellarAmount
      )

      // Update payment status
      await this.prisma.royaltyPayment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          transactionHash,
          processedAt: new Date(),
        },
      })

      console.log(`Successfully processed payment ${paymentId} with transaction ${transactionHash}`)
    } catch (error) {
      // Mark payment as failed
      await this.prisma.royaltyPayment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          metadata: {
            error: error.message,
            failedAt: Date.now(),
          },
        },
      })

      throw error
    }
  }

  private convertToStellarAmount(amount: number, currency: string): string {
    // Convert to smallest unit based on currency
    switch (currency) {
      case 'USD':
        // Assuming 7 decimal places for USD (like USDC)
        return (amount * 1000000).toString()
      case 'EUR':
        // Assuming 7 decimal places for EUR (like EURC)
        return (amount * 1000000).toString()
      case 'XLM':
        // XLM has 7 decimal places
        return (amount * 10000000).toString()
      default:
        // Default to 2 decimal places
        return (amount * 100).toString()
    }
  }

  async batchDistributeRoyalties(usageRecordIds: string[]): Promise<void> {
    // Process multiple usage records in batch
    for (const usageRecordId of usageRecordIds) {
      await this.queueRoyaltyDistribution(usageRecordId)
    }
  }

  async retryFailedPayments(): Promise<void> {
    // Get failed payments
    const failedPayments = await this.prisma.royaltyPayment.findMany({
      where: {
        status: 'FAILED',
      },
      take: 100, // Limit to prevent overwhelming the system
    })

    for (const payment of failedPayments) {
      // Reset to pending and retry
      await this.prisma.royaltyPayment.update({
        where: { id: payment.id },
        data: {
          status: 'PENDING',
          metadata: {
            ...payment.metadata,
            retryCount: (payment.metadata?.retryCount || 0) + 1,
            lastRetryAt: Date.now(),
          },
        },
      })

      await this.processPayment(payment.id)
    }
  }

  async getDistributionStats(timeRange?: { start: Date; end: Date }): Promise<any> {
    const whereClause: any = {}
    
    if (timeRange) {
      whereClause.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end,
      }
    }

    const [total, completed, failed, pending] = await Promise.all([
      this.prisma.royaltyPayment.count({ where: whereClause }),
      this.prisma.royaltyPayment.count({ 
        where: { ...whereClause, status: 'COMPLETED' } 
      }),
      this.prisma.royaltyPayment.count({ 
        where: { ...whereClause, status: 'FAILED' } 
      }),
      this.prisma.royaltyPayment.count({ 
        where: { ...whereClause, status: 'PENDING' } 
      }),
    ])

    const totalAmount = await this.prisma.royaltyPayment.aggregate({
      where: { ...whereClause, status: 'COMPLETED' },
      _sum: { amount: true },
    })

    return {
      total,
      completed,
      failed,
      pending,
      totalDistributed: totalAmount._sum.amount || 0,
      successRate: total > 0 ? (completed / total) * 100 : 0,
    }
  }

  async getStakeholderEarnings(stakeholderId: string, timeRange?: { start: Date; end: Date }): Promise<any> {
    const whereClause: any = { stakeholderId }
    
    if (timeRange) {
      whereClause.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end,
      }
    }

    const payments = await this.prisma.royaltyPayment.findMany({
      where: { ...whereClause, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    })

    const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const earningsByCurrency = payments.reduce((acc, payment) => {
      acc[payment.currency] = (acc[payment.currency] || 0) + payment.amount
      return acc
    }, {} as Record<string, number>)

    return {
      totalEarnings,
      paymentsCount: payments.length,
      earningsByCurrency,
      recentPayments: payments.slice(0, 10),
    }
  }

  async schedulePeriodicDistribution(): Promise<void> {
    // This would be called by a cron job or scheduler
    // Process any pending usage records that haven't been distributed
    
    const pendingUsageRecords = await this.prisma.usageRecord.findMany({
      where: {
        // Find usage records that don't have corresponding payments
        royaltyPayments: {
          none: {},
        },
      },
      take: 100, // Limit to prevent overwhelming
    })

    for (const usageRecord of pendingUsageRecords) {
      await this.queueRoyaltyDistribution(usageRecord.id)
    }

    console.log(`Scheduled distribution for ${pendingUsageRecords.length} usage records`)
  }

  async validateRoyaltyCalculations(usageRecordId: string): Promise<boolean> {
    try {
      const usageRecord = await this.prisma.usageRecord.findUnique({
        where: { id: usageRecordId },
        include: {
          ipAsset: {
            include: {
              stakeholders: true,
            },
          },
          royaltyPayments: true,
        },
      })

      if (!usageRecord) {
        return false
      }

      // Calculate expected total royalty distribution
      const expectedTotal = usageRecord.ipAsset.stakeholders.reduce(
        (sum, stakeholder) => sum + (usageRecord.amount * stakeholder.royaltyPercentage) / 100,
        0
      )

      // Calculate actual total from completed payments
      const actualTotal = usageRecord.royaltyPayments
        .filter(payment => payment.status === 'COMPLETED')
        .reduce((sum, payment) => sum + payment.amount, 0)

      // Allow for small rounding differences
      const tolerance = 0.01 // 1 cent tolerance
      return Math.abs(expectedTotal - actualTotal) <= tolerance
    } catch (error) {
      console.error('Error validating royalty calculations:', error)
      return false
    }
  }
}
