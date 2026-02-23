'use client'

import { useToast } from '@/contexts/ToastContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const ICONS = {
  success: (
    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const BORDER_COLORS = {
  success: 'border-emerald-200',
  error: 'border-red-200',
  info: 'border-blue-200',
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()
  const isMobile = useIsMobile()

  if (toasts.length === 0) return null

  return (
    <div
      className={`fixed z-[200] flex flex-col gap-2 ${
        isMobile
          ? 'bottom-20 left-4 right-4'
          : 'top-4 right-4 w-full max-w-sm'
      }`}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 bg-white rounded-xl shadow-lg border px-4 py-3 fade-in ${BORDER_COLORS[t.type]}`}
        >
          {ICONS[t.type]}
          <p className="flex-1 text-sm text-gray-700">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="p-1 -mr-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
