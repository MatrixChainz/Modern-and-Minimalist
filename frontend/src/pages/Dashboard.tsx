import { StatsSkeleton, TableSkeleton } from '../components/Skeleton'
import { useState, useEffect } from 'react'
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import { DashboardStats, ActivityItem } from '../types'
import { dashboard, royalties as royaltiesApi } from '../api'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalIPAssets: 0,
    totalRoyalties: 0,
    activeStakeholders: 0,
    monthlyGrowth: 0,
  })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [earningsData, setEarningsData] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([dashboard.getStats(), royaltiesApi.list()])
      .then(([data, royaltyData]) => {
        setStats({
          totalIPAssets: data.totalIPAssets,
          totalRoyalties: data.totalRoyalties,
          activeStakeholders: data.activeStakeholders,
          monthlyGrowth: data.monthlyGrowth,
        })
        setActivity((data.recentActivity as ActivityItem[]) ?? [])
        
        const last30Days = [...Array(30)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();
        
        const earnings = last30Days.reduce((acc, date) => ({ ...acc, [date]: 0 }), {} as Record<string, number>);
        
        royaltyData.forEach(r => {
          const date = new Date(r.createdAt).toISOString().split('T')[0];
          if (earnings[date] !== undefined) {
            earnings[date] += r.amount;
          }
        });
        setEarningsData(earnings);
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { title: 'Total IP Assets', value: stats.totalIPAssets, icon: Package, change: `${stats.monthlyGrowth >= 0 ? '+' : ''}${stats.monthlyGrowth}%`, changeType: stats.monthlyGrowth >= 0 ? 'positive' : 'negative' as const },
    { title: 'Total Royalties', value: `$${stats.totalRoyalties.toLocaleString()}`, icon: DollarSign, change: null, changeType: 'positive' as const },
    { title: 'Active Stakeholders', value: stats.activeStakeholders, icon: Users, change: null, changeType: 'positive' as const },
    { title: 'Monthly Growth', value: `${stats.monthlyGrowth}%`, icon: TrendingUp, change: null, changeType: stats.monthlyGrowth >= 0 ? 'positive' : 'negative' as const },
  ]

  if (loading) return (<><StatsSkeleton count={4} /><div className="mt-6"><TableSkeleton columns={4} /></div></>)

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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Earnings (Last 30 Days)</h2>
          <div className="h-64 flex items-center justify-center">
            <Line
              data={{
                labels: Object.keys(earningsData).map(d => d.slice(5)),
                datasets: [
                  {
                    label: 'Earnings ($)',
                    data: Object.values(earningsData),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                  },
                ],
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
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
