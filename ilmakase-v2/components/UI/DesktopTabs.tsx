'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function DesktopTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠어요?')) return
    await signOut()
    router.push('/worklog')
  }

  return (
    <div className="hidden lg:flex items-center gap-2 mt-4">
      <div className="flex gap-2 flex-1">
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

      {user && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors"
          >
            <span className="text-sm">⚙️</span>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[160px] popover-enter">
                <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">
                  {user.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
