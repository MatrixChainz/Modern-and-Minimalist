import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, MoreHorizontal } from 'lucide-react'
import { IPAsset } from '../types'
import { ipAssets as ipAssetsApi } from '../api'
import toast from 'react-hot-toast'

const TYPE_OPTIONS = ['MUSIC', 'VIDEO', 'ART', 'TEXT', 'SOFTWARE'] as const

const IPManagement = () => {
  const [assets, setAssets] = useState<IPAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', tokenId: '', contractAddress: '', type: 'MUSIC' as IPAsset['type'] })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ipAssetsApi.list()
      .then(setAssets)
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    assets.filter((a) => {
      const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase())
      const matchesType = !typeFilter || a.type === typeFilter
      return matchesSearch && matchesType
    }),
    [assets, search, typeFilter],
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const asset = await ipAssetsApi.create({ ...form, metadata: {} })
      setAssets((prev) => [asset, ...prev])
      setShowForm(false)
      setForm({ title: '', description: '', tokenId: '', contractAddress: '', type: 'MUSIC' })
      toast.success('Asset created successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create asset')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this IP asset?')) return
    try {
      await ipAssetsApi.delete(id)
      setAssets((prev) => prev.filter((a) => a.id !== id))
      toast.success('Asset deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete asset')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IP Management</h1>
          <p className="mt-2 text-gray-600">Manage your intellectual property assets</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add IP Asset
        </button>
      </div>

      

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">New IP Asset</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="Token ID" value={form.tokenId} onChange={(e) => setForm((f) => ({ ...f, tokenId: e.target.value }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="Contract Address" value={form.contractAddress} onChange={(e) => setForm((f) => ({ ...f, contractAddress: e.target.value }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as IPAsset['type'] }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 sm:col-span-2" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search IP assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* IP Assets Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Title', 'Type', 'Token ID', 'Created', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No IP assets found.</td></tr>
              ) : filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{asset.title}</div>
                    <div className="text-sm text-gray-500">{asset.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{asset.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.tokenId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleDelete(asset.id)}
                      aria-label={`Delete ${asset.title}`}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default IPManagement
