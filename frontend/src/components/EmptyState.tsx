import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="p-3 bg-gray-50 text-gray-400 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">{description}</p>
    {action}
  </div>
)
