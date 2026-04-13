import { useState, useEffect } from 'react'
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import { DashboardStats } from '../types'

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalIPAssets: 0,
    totalRoyalties: 0,
    activeStakeholders: 0,
    monthlyGrowth: 0,
  })

  useEffect(() => {
    // Mock data - replace with API call
    setStats({
      totalIPAssets: 42,
      totalRoyalties: 125430,
      activeStakeholders: 18,
      monthlyGrowth: 23.5,
    })
  }, [])

  const statCards = [
    {
      title: 'Total IP Assets',
      value: stats.totalIPAssets,
      icon: Package,
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Royalties',
      value: `$${stats.totalRoyalties.toLocaleString()}`,
      icon: DollarSign,
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      title: 'Active Stakeholders',
      value: stats.activeStakeholders,
      icon: Users,
      change: '+3',
      changeType: 'positive' as const,
    },
    {
      title: 'Monthly Growth',
      value: `${stats.monthlyGrowth}%`,
      icon: TrendingUp,
      change: '+5.2%',
      changeType: 'positive' as const,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your royalty distribution platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`mt-2 text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} from last month
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { action: 'New IP asset registered', asset: 'Summer Vibes', time: '2 hours ago' },
              { action: 'Royalty payment processed', asset: 'Digital Art Collection', time: '5 hours ago' },
              { action: 'Stakeholder added', asset: 'Music Album', time: '1 day ago' },
              { action: 'Usage spike detected', asset: 'Video Content', time: '2 days ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.asset}</p>
                </div>
                <span className="text-sm text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
