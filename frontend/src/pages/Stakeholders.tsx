import { TableSkeleton } from '../components/Skeleton'
import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, MoreHorizontal, Mail, Wallet, UserPlus } from 'lucide-react'
import { Stakeholder } from '../types'
import { stakeholders as stakeholdersApi } from '../api'
import toast from 'react-hot-toast'

const ROLE_OPTIONS = ['CREATOR', 'PRODUCER', 'DISTRIBUTOR', 'PUBLISHER', 'OTHER'] as const

const roleColor: Record<string, string> = {
  CREATOR: 'bg-purple-100 text-purple-800',
  PRODUCER: 'bg-blue-100 text-blue-800',
  DISTRIBUTOR: 'bg-green-100 text-green-800',
  PUBLISHER: 'bg-orange-100 text-orange-800',
  OTHER: 'bg-gray-100 text-gray-800',
}

const Stakeholders = () => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', walletAddress: '', role: 'CREATOR' as Stakeholder['role'], royaltyPercentage: 0, ipAssetId: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    stakeholdersApi.list()
      .then(setStakeholders)
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    stakeholders.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()),
    ),
    [stakeholders, search],
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const stakeholder = await stakeholdersApi.create(form)
      setStakeholders((prev) => [stakeholder, ...prev])
      setShowForm(false)
      toast.success('Stakeholder created successfully')
      setForm({ name: '', email: '', walletAddress: '', role: 'CREATOR', royaltyPercentage: 0, ipAssetId: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add stakeholder')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this stakeholder?')) return
    try {
      await stakeholdersApi.delete(id)
      setStakeholders((prev) => prev.filter((s) => s.id !== id))
      toast.success('Stakeholder deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove stakeholder')
    }
  }

  if (loading) return (<TableSkeleton columns={6} />)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stakeholders</h1>
          <p className="mt-2 text-gray-600">Manage stakeholders and their royalty shares</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Stakeholder
        </button>
      </div>

      

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">New Stakeholder</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="Wallet Address" value={form.walletAddress} onChange={(e) => setForm((f) => ({ ...f, walletAddress: e.target.value }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="IP Asset ID" value={form.ipAssetId} onChange={(e) => setForm((f) => ({ ...f, ipAssetId: e.target.value }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Stakeholder['role'] }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input required type="number" min={0} max={100} step={0.01} placeholder="Royalty %" value={form.royaltyPercentage} onChange={(e) => setForm((f) => ({ ...f, royaltyPercentage: parseFloat(e.target.value) }))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search stakeholders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Stakeholders Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={<UserPlus className="w-8 h-8" />} title="No stakeholders found" description="Get started by adding a stakeholder." action={<button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">Add Stakeholder</button>} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((stakeholder) => (
            <div key={stakeholder.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{stakeholder.name}</h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${roleColor[stakeholder.role] ?? roleColor.OTHER}`}>
                    {stakeholder.role}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(stakeholder.id)}
                  aria-label={`Remove ${stakeholder.name}`}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  {stakeholder.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Wallet className="w-4 h-4 mr-2 flex-shrink-0" />
                  {stakeholder.walletAddress.slice(0, 10)}...
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-sm text-gray-600">Royalty Share</span>
                <span className="text-lg font-semibold text-gray-900">{stakeholder.royaltyPercentage}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Royalty Distribution Summary</h3>
          <div className="space-y-3">
            {filtered.map((stakeholder) => (
              <div key={stakeholder.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm text-gray-700">{stakeholder.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">{stakeholder.royaltyPercentage}%</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stakeholder.royaltyPercentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Stakeholders
