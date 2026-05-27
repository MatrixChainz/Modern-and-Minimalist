import { useState, useEffect } from 'react'
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import { DashboardStats, ActivityItem } from '../types'
import { dashboard, usage as usageApi } from '../api'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalIPAssets: 0,
    totalRoyalties: 0,
    activeStakeholders: 0,
    monthlyGrowth: 0,
  })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [platformData, setPlatformData] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([dashboard.getStats(), usageApi.records()])
      .then(([data, usageData]) => {
        setStats({
          totalIPAssets: data.totalIPAssets,
          totalRoyalties: data.totalRoyalties,
          activeStakeholders: data.activeStakeholders,
          monthlyGrowth: data.monthlyGrowth,
        })
        setActivity((data.recentActivity as ActivityItem[]) ?? [])
        
        const platformCounts = usageData.reduce((acc, curr) => {
          acc[curr.platform] = (acc[curr.platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        setPlatformData(platformCounts);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { title: 'Total IP Assets', value: stats.totalIPAssets, icon: Package, change: `${stats.monthlyGrowth >= 0 ? '+' : ''}${stats.monthlyGrowth}%`, changeType: stats.monthlyGrowth >= 0 ? 'positive' : 'negative' as const },
    { title: 'Total Royalties', value: `$${stats.totalRoyalties.toLocaleString()}`, icon: DollarSign, change: null, changeType: 'positive' as const },
    { title: 'Active Stakeholders', value: stats.activeStakeholders, icon: Users, change: null, changeType: 'positive' as const },
    { title: 'Monthly Growth', value: `${stats.monthlyGrowth}%`, icon: TrendingUp, change: null, changeType: stats.monthlyGrowth >= 0 ? 'positive' : 'negative' as const },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your royalty distribution platform</p>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg" role="alert">
          {error}
        </div>
      )}

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
                  {stat.change && (
                    <p className={`mt-2 text-sm ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change} from last month
                    </p>
                  )}
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Breakdown</h2>
          {Object.keys(platformData).length === 0 ? (
            <p className="text-sm text-gray-500">No platform data available.</p>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={{
                  labels: Object.keys(platformData),
                  datasets: [
                    {
                      data: Object.values(platformData),
                      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
                    },
                  ],
                }}
                options={{ maintainAspectRatio: false }}
              />
            </div>
          )}
        </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {activity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity.</p>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                    <p className="text-sm text-gray-500">{item.asset}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(item.time).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

export default Dashboard
