'use client'

interface MobileProgressStripProps {
  completedCount: number
  totalCount: number
  overallProgressRate: number
}

export default function MobileProgressStrip({ completedCount, totalCount, overallProgressRate }: MobileProgressStripProps) {
  if (totalCount === 0) return null

  return (
    <div
      className="fixed left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-2"
      style={{ bottom: 56 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              overallProgressRate === 100 ? 'bg-emerald-500' : 'bg-primary-500'
            }`}
            style={{ width: `${overallProgressRate}%` }}
          />
        </div>
        <span className={`text-xs font-semibold whitespace-nowrap ${
          overallProgressRate === 100 ? 'text-emerald-600' : 'text-gray-500'
        }`}>
          {completedCount}/{totalCount} 완료 · {overallProgressRate}%
        </span>
      </div>
    </div>
  )
}
