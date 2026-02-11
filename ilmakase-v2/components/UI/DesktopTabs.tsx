'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/navigation'

export default function DesktopTabs() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex gap-2 mt-4">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <a
            key={item.href}
            href={item.href}
            className={`px-5 py-2 rounded-xl font-medium ${
              isActive
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </span>
          </a>
        )
      })}
    </div>
  )
}
