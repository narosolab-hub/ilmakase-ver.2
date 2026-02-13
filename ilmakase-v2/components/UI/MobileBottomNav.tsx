'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuth } from '@/hooks/useAuth'
import { NAV_ITEMS } from '@/lib/navigation'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  if (!isMobile) return null

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠어요?')) return
    await signOut()
    setShowMenu(false)
    router.push('/worklog')
  }

  return (
    <>
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/30 mobile-backdrop-enter" onClick={() => setShowMenu(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 popover-enter"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            onClick={e => e.stopPropagation()}
          >
            {user ? (
              <>
                <p className="text-xs text-gray-400 mb-3 px-1">{user.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm text-red-500 bg-red-50 font-medium"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    router.push('/login')
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm text-primary-600 bg-primary-50 font-medium"
                >
                  로그인
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    router.push('/signup')
                  }}
                  className="w-full mt-2 text-left px-4 py-3 rounded-xl text-sm text-primary-600 bg-primary-50 font-medium"
                >
                  회원가입
                </button>
              </>
            )}
            <button
              onClick={() => setShowMenu(false)}
              className="w-full mt-2 px-4 py-3 rounded-xl text-sm text-gray-500 bg-gray-100 font-medium text-center"
            >
              닫기
            </button>
          </div>
        </div>
      )}

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
                  {item.mobileLabel}
                </span>
              </a>
            )
          })}
          <button
            onClick={() => setShowMenu(true)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-lg">⚙️</span>
            <span className="text-[10px] font-medium text-gray-500">설정</span>
          </button>
        </div>
      </nav>
    </>
  )
}
