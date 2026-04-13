import { useState } from 'react'
import { Plus, Search, MoreHorizontal, Mail, Wallet } from 'lucide-react'
import { Stakeholder } from '../types'

const Stakeholders = () => {
  const [stakeholders] = useState<Stakeholder[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      walletAddress: 'GABC123...',
      role: 'creator',
      royaltyPercentage: 60.0,
      ipAssetId: 'ip-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      walletAddress: 'GDEF456...',
      role: 'producer',
      royaltyPercentage: 25.0,
      ipAssetId: 'ip-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      walletAddress: 'GHI789...',
      role: 'distributor',
      royaltyPercentage: 15.0,
      ipAssetId: 'ip-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
  ])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'creator':
        return 'bg-purple-100 text-purple-800'
      case 'producer':
        return 'bg-blue-100 text-blue-800'
      case 'distributor':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stakeholders</h1>
          <p className="mt-2 text-gray-600">Manage stakeholders and their royalty shares</p>
        </div>
        <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Stakeholder
        </button>
      </div>

      {/* Search */}
      <div className="flex-1 relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search stakeholders..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Stakeholders Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stakeholders.map((stakeholder) => (
          <div key={stakeholder.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{stakeholder.name}</h3>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getRoleColor(stakeholder.role)}`}>
                  {stakeholder.role}
                </span>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {stakeholder.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Wallet className="w-4 h-4 mr-2" />
                {stakeholder.walletAddress.slice(0, 10)}...
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Royalty Share</span>
                <span className="text-lg font-semibold text-gray-900">{stakeholder.royaltyPercentage}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Royalty Distribution Summary</h3>
        <div className="space-y-3">
          {stakeholders.map((stakeholder) => (
            <div key={stakeholder.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">{stakeholder.name}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{stakeholder.royaltyPercentage}%</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${stakeholder.royaltyPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Stakeholders
