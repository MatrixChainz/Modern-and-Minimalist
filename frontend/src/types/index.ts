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
  type: 'MUSIC' | 'VIDEO' | 'ART' | 'TEXT' | 'SOFTWARE';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  role: 'CREATOR' | 'PRODUCER' | 'DISTRIBUTOR' | 'PUBLISHER' | 'OTHER';
  royaltyPercentage: number;
  ipAssetId: string;
  ipAsset?: { title: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecord {
  id: string;
  ipAssetId: string;
  platform: string;
  usageType: 'STREAM' | 'DOWNLOAD' | 'LICENSE' | 'SALE';
  amount: number;
  currency: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface RoyaltyPayment {
  id: string;
  stakeholderId: string;
  stakeholder?: { name: string };
  ipAssetId: string;
  amount: number;
  currency: string;
  transactionHash: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  processedAt?: Date;
}

export interface DashboardStats {
  totalIPAssets: number;
  totalRoyalties: number;
  activeStakeholders: number;
  monthlyGrowth: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  asset: string;
  stakeholder: string;
  amount: number;
  currency: string;
  time: string;
}
