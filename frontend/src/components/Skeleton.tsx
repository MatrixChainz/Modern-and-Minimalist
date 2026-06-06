export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
)

export const TableSkeleton = ({ rows = 5, columns = 5 }) => (
  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
    <div className="w-full">
      <div className="bg-gray-50 border-b flex px-6 py-3 space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex space-x-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const StatsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
)
