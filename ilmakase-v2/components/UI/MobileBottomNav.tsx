'use client'

import { usePathname } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'

const NAV_ITEMS = [
  { href: '/worklog', label: '데일리 로그', icon: '📝' },
  { href: '/projects', label: '프로젝트', icon: '📁' },
  { href: '/review', label: '회고', icon: '📊' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
