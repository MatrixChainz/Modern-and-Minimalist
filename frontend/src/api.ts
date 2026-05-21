import type { IPAsset, Stakeholder, RoyaltyPayment, DashboardStats, UsageRecord } from './types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error || `Request failed: ${res.status}`)
  }
  return json.data as T
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request<{ creator: { id: string; name: string; email: string }; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { name: string; email: string; password: string; walletAddress: string }) =>
    request<{ creator: { id: string; name: string; email: string }; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<{ id: string; name: string; email: string; walletAddress: string }>('/auth/me'),
}

// Dashboard
export const dashboard = {
  getStats: () => request<DashboardStats & { recentActivity: unknown[] }>('/dashboard/stats'),
}

// IP Assets
export const ipAssets = {
  list: () => request<IPAsset[]>('/ip-assets'),
  get: (id: string) => request<IPAsset>(`/ip-assets/${id}`),
  create: (data: Omit<IPAsset, 'id' | 'creatorId' | 'createdAt' | 'updatedAt'>) =>
    request<IPAsset>('/ip-assets', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/ip-assets/${id}`, { method: 'DELETE' }),
}

// Stakeholders
export const stakeholders = {
  list: (ipAssetId?: string) =>
    request<Stakeholder[]>(`/stakeholders${ipAssetId ? `?ipAssetId=${ipAssetId}` : ''}`),
  create: (data: Omit<Stakeholder, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Stakeholder>('/stakeholders', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/stakeholders/${id}`, { method: 'DELETE' }),
}

// Royalties
export const royalties = {
  list: (params?: { status?: string; ipAssetId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return request<RoyaltyPayment[]>(`/royalties${qs ? `?${qs}` : ''}`)
  },
  stats: () =>
    request<{ total: number; completed: number; failed: number; pending: number; totalDistributed: number; successRate: number }>('/royalties/stats'),
}

// Usage
export const usage = {
  records: (params?: { ipAssetId?: string; platform?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return request<UsageRecord[]>(`/usage/records${qs ? `?${qs}` : ''}`)
  },
  track: (data: Omit<UsageRecord, 'id' | 'createdAt'>) =>
    request<UsageRecord>('/usage/track', { method: 'POST', body: JSON.stringify(data) }),
}
