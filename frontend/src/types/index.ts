export interface Creator {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPAsset {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  tokenId: string;
  contractAddress: string;
  type: 'music' | 'video' | 'art' | 'text' | 'software';
  createdAt: Date;
  updatedAt: Date;
}

export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  role: 'creator' | 'producer' | 'distributor' | 'publisher' | 'other';
  royaltyPercentage: number;
  ipAssetId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecord {
  id: string;
  ipAssetId: string;
  platform: string;
  usageType: 'stream' | 'download' | 'license' | 'sale';
  amount: number;
  currency: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface RoyaltyPayment {
  id: string;
  stakeholderId: string;
  ipAssetId: string;
  amount: number;
  currency: string;
  transactionHash: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
}

export interface DashboardStats {
  totalIPAssets: number;
  totalRoyalties: number;
  activeStakeholders: number;
  monthlyGrowth: number;
}
