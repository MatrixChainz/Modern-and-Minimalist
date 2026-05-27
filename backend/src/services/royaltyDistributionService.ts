import { logger } from '../config/logger';
import { prisma } from '../config/database'
import { StellarService } from './stellarService'
import { Queue } from 'bull'

interface DistributionStats {
  total: number
  completed: number
  failed: number
  pending: number
  totalDistributed: number
  successRate: number
}

interface StakeholderEarnings {
  totalEarnings: number
  paymentsCount: number
  earningsByCurrency: Record<string, number>
  recentPayments: unknown[]
}

export class RoyaltyDistributionService {
  private stellarService: StellarService
  private distributionQueue: Queue

  constructor() {
    this.stellarService = new StellarService()

    this.distributionQueue = new Queue('royalty distribution', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    })

    this.distributionQueue.process('distribute-royalties', 5, this.processRoyaltyDistribution.bind(this))
  }

  async queueRoyaltyDistribution(usageRecordId: string): Promise<void> {
    await this.distributionQueue.add('distribute-royalties', {
      usageRecordId,
      timestamp: Date.now(),
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    })
  }

  private async processRoyaltyDistribution(job: { data: { usageRecordId: string } }): Promise<void> {
    const { usageRecordId } = job.data

    const usageRecord = await prisma.usageRecord.findUnique({
      where: { id: usageRecordId },
      include: { ipAsset: { include: { stakeholders: true } } },
    })

    if (!usageRecord) {
      throw new Error(`Usage record not found: ${usageRecordId}`)
    }

    const royaltyCalculations = this.calculateRoyalties(usageRecord)
    const paymentIds = await this.createRoyaltyPayments(usageRecord.ipAssetId, usageRecordId, royaltyCalculations)

    for (const paymentId of paymentIds) {
      await this.processPayment(paymentId)
    }
  }

  private calculateRoyalties(usageRecord: {
    amount: number
    ipAsset: { stakeholders: Array<{ id: string; royaltyPercentage: number }> }
  }): Array<{ stakeholderId: string; amount: number; percentage: number }> {
    return usageRecord.ipAsset.stakeholders.map((stakeholder) => ({
      stakeholderId: stakeholder.id,
      amount: (usageRecord.amount * stakeholder.royaltyPercentage) / 100,
      percentage: stakeholder.royaltyPercentage,
    }))
  }

  private async createRoyaltyPayments(
    ipAssetId: string,
    usageRecordId: string,
    calculations: Array<{ stakeholderId: string; amount: number; percentage: number }>,
  ): Promise<string[]> {
    const paymentIds: string[] = []

    for (const calculation of calculations) {
      const payment = await prisma.royaltyPayment.create({
        data: {
          stakeholderId: calculation.stakeholderId,
          ipAssetId,
          usageRecordId,
          amount: calculation.amount,
          currency: 'USD',
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
    const payment = await prisma.royaltyPayment.findUnique({
      where: { id: paymentId },
      include: { stakeholder: true },
    })

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`)
    }

    const fromAccount = process.env.STELLAR_DISTRIBUTION_ACCOUNT
    if (!fromAccount) {
      throw new Error('Stellar distribution account not configured')
    }

    try {
      const stellarAmount = this.convertToStellarAmount(payment.amount, payment.currency)
      const transactionHash = await this.stellarService.sendPayment(
        fromAccount,
        payment.stakeholder.walletAddress,
        stellarAmount,
      )

      await prisma.royaltyPayment.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED', transactionHash, processedAt: new Date() },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await prisma.royaltyPayment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          metadata: { error: message, failedAt: Date.now() },
        },
      })
      throw err
    }
  }

  private convertToStellarAmount(amount: number, currency: string): string {
    switch (currency) {
      case 'USD':
      case 'EUR':
        return (amount * 1_000_000).toFixed(0)
      case 'XLM':
        return (amount * 10_000_000).toFixed(0)
      default:
        return (amount * 100).toFixed(0)
    }
  }

  async batchDistributeRoyalties(usageRecordIds: string[]): Promise<void> {
    for (const id of usageRecordIds) {
      await this.queueRoyaltyDistribution(id)
    }
  }

  async retryFailedPayments(): Promise<void> {
    const failedPayments = await prisma.royaltyPayment.findMany({
      where: { status: 'FAILED' },
      take: 100,
    })

    for (const payment of failedPayments) {
      const meta = (payment.metadata as Record<string, unknown>) ?? {}
      await prisma.royaltyPayment.update({
        where: { id: payment.id },
        data: {
          status: 'PENDING',
          metadata: {
            ...meta,
            retryCount: ((meta.retryCount as number) || 0) + 1,
            lastRetryAt: Date.now(),
          },
        },
      })
      await this.processPayment(payment.id)
    }
  }

  async getDistributionStats(timeRange?: { start: Date; end: Date }): Promise<DistributionStats> {
    const where = timeRange
      ? { createdAt: { gte: timeRange.start, lte: timeRange.end } }
      : {}

    const [total, completed, failed, pending, totalAmount] = await Promise.all([
      prisma.royaltyPayment.count({ where }),
      prisma.royaltyPayment.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.royaltyPayment.count({ where: { ...where, status: 'FAILED' } }),
      prisma.royaltyPayment.count({ where: { ...where, status: 'PENDING' } }),
      prisma.royaltyPayment.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { amount: true } }),
    ])

    return {
      total,
      completed,
      failed,
      pending,
      totalDistributed: totalAmount._sum.amount ?? 0,
      successRate: total > 0 ? (completed / total) * 100 : 0,
    }
  }

  async getStakeholderEarnings(stakeholderId: string, timeRange?: { start: Date; end: Date }): Promise<StakeholderEarnings> {
    const where = {
      stakeholderId,
      status: 'COMPLETED' as const,
      ...(timeRange ? { createdAt: { gte: timeRange.start, lte: timeRange.end } } : {}),
    }

    const payments = await prisma.royaltyPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0)
    const earningsByCurrency = payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.currency] = (acc[p.currency] ?? 0) + p.amount
      return acc
    }, {})

    return {
      totalEarnings,
      paymentsCount: payments.length,
      earningsByCurrency,
      recentPayments: payments.slice(0, 10),
    }
  }

  async schedulePeriodicDistribution(): Promise<void> {
    const pendingUsageRecords = await prisma.usageRecord.findMany({
      where: { royaltyPayments: { none: {} } },
      take: 100,
    })

    for (const record of pendingUsageRecords) {
      await this.queueRoyaltyDistribution(record.id)
    }

    logger.info(`Scheduled distribution for ${pendingUsageRecords.length} usage records`)
  }

  async validateRoyaltyCalculations(usageRecordId: string): Promise<boolean> {
    try {
      const usageRecord = await prisma.usageRecord.findUnique({
        where: { id: usageRecordId },
        include: {
          ipAsset: { include: { stakeholders: true } },
          royaltyPayments: true,
        },
      })

      if (!usageRecord) return false

      const expectedTotal = usageRecord.ipAsset.stakeholders.reduce(
        (sum, s) => sum + (usageRecord.amount * s.royaltyPercentage) / 100,
        0,
      )

      const actualTotal = usageRecord.royaltyPayments
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amount, 0)

      return Math.abs(expectedTotal - actualTotal) <= 0.01
    } catch {
      return false
    }
  }
}
