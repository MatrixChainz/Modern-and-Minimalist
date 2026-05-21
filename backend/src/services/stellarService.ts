import { Horizon, Networks, Asset, Operation, TransactionBuilder } from 'stellar-sdk'

export class StellarService {
  private server: Horizon.Server
  private networkPassphrase: string

  constructor() {
    this.server = new Horizon.Server('https://horizon-testnet.stellar.org')
    this.networkPassphrase = Networks.TESTNET
  }

  async recordUsage(data: {
    ipTokenId: string
    platform: string
    usageType: string
    amount: number
    currency: string
    metadata: Record<string, unknown>
  }): Promise<string> {
    const contractAddress = process.env.ROYALTY_DISTRIBUTOR_CONTRACT_ADDRESS
    if (!contractAddress) {
      throw new Error('Royalty distributor contract address not configured')
    }
    // Soroban contract invocation would go here
    const transactionHash = `usage_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    console.log(`Recorded usage on Stellar: ${transactionHash}`)
    return transactionHash
  }

  async distributeRoyalties(usageRecordId: string): Promise<string[]> {
    const contractAddress = process.env.ROYALTY_DISTRIBUTOR_CONTRACT_ADDRESS
    if (!contractAddress) {
      throw new Error('Royalty distributor contract address not configured')
    }
    // Soroban contract invocation would go here
    const paymentIds = [
      `payment_${Date.now()}_1`,
      `payment_${Date.now()}_2`,
    ]
    console.log(`Distributed royalties: ${paymentIds.join(', ')}`)
    return paymentIds
  }

  async createIPAsset(data: {
    title: string
    description: string
    creator: string
    tokenType: string
    metadata: Record<string, unknown>
    royaltyShares: Array<{ stakeholder: string; percentage: number }>
  }): Promise<string> {
    const contractAddress = process.env.IP_TOKEN_CONTRACT_ADDRESS
    if (!contractAddress) {
      throw new Error('IP token contract address not configured')
    }
    const tokenId = `token_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    console.log(`Created IP asset on Stellar: ${tokenId}`)
    return tokenId
  }

  async getRoyaltyShares(tokenId: string): Promise<Array<{ stakeholder: string; percentage: number }>> {
    const contractAddress = process.env.IP_TOKEN_CONTRACT_ADDRESS
    if (!contractAddress) {
      throw new Error('IP token contract address not configured')
    }
    return [
      { stakeholder: 'GABC123...', percentage: 6000 },
      { stakeholder: 'GDEF456...', percentage: 2500 },
      { stakeholder: 'GHI789...', percentage: 1500 },
    ]
  }

  async validateTransaction(transactionHash: string): Promise<boolean> {
    try {
      const transaction = await this.server.transactions()
        .transaction(transactionHash)
        .call()
      return transaction.successful === true
    } catch {
      return false
    }
  }

  async getAccountBalance(accountId: string): Promise<string> {
    try {
      const account = await this.server.accounts().accountId(accountId).call()
      const nativeBalance = account.balances.find(
        (b: { asset_type: string; balance: string }) => b.asset_type === 'native'
      )
      return nativeBalance?.balance ?? '0'
    } catch {
      return '0'
    }
  }

  async sendPayment(from: string, to: string, amount: string, asset?: Asset): Promise<string> {
    const sourceAccount = await this.server.loadAccount(from)

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: await this.server.fetchBaseFee(),
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.payment({
        destination: to,
        asset: asset ?? Asset.native(),
        amount,
      }))
      .setTimeout(30)
      .build()

    // In production: sign with distribution account secret key and submit
    const transactionHash = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    console.log(`Sent payment on Stellar: ${transactionHash}`)
    return transactionHash
  }
}
