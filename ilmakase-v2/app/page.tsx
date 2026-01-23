'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI'
import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true)
  const [showLanding, setShowLanding] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    } catch (error) {
      console.error('인증 상태 확인 실패:', error)
    } finally {
      setIsLoading(false)
      showSplashScreen()
    }
  }

  const showSplashScreen = () => {
    setTimeout(() => {
      setShowSplash(false)
      setTimeout(() => setShowLanding(true), 300)
    }, 1500)
  }

  const handleStart = () => {
    if (isLoggedIn) {
      router.push('/worklog')
    } else {
      router.push('/signup')
    }
  }

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠어요?')) return

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setIsLoggedIn(false)
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃에 실패했습니다.')
    }
  }

  return (
    <>
      {/* 스플래시 화면 */}
      <div
        className={`fixed inset-0 z-50 bg-primary-500 flex flex-col items-center justify-center text-white px-6 text-center transition-all duration-500 ${
          showSplash ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="text-5xl mb-5 animate-bounce">🍊</div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">일마카세 v2</h1>
        <div className="w-10 h-0.5 bg-white/50 mb-3 rounded-full" />
        <p className="text-sm font-medium text-white/90 leading-relaxed">
          오늘 한 일이<br />내일의 포트폴리오가 됩니다
        </p>
      </div>

      {/* 랜딩 화면 */}
      <div
        className={`flex flex-col justify-between p-6 h-screen overflow-hidden transition-all duration-500 ${
          showLanding ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="h-8" />

        <div className="text-center flex-1 flex flex-col justify-center animate-slide-up">
          {/* 아이콘 영역 */}
          <div className="relative h-48 flex items-center justify-center mb-8">
            <div className="absolute w-40 h-40 bg-orange-100 rounded-full blur-2xl opacity-60 animate-pulse-slow" />
            <div className="relative z-10 flex items-center gap-4 animate-float">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100 transform -rotate-6">
                  <span className="text-2xl">📝</span>
                </div>
                <span className="text-xs text-gray-400 font-bold">기록</span>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <div className="flex flex-col items-center gap-2 mt-8">
                <div className="bg-primary-500 p-3 rounded-2xl shadow-lg text-white transform rotate-3">
                  <span className="text-2xl">✨</span>
                </div>
                <span className="text-xs text-primary-600 font-bold">AI 정리</span>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-2xl shadow-lg border border-yellow-100 transform rotate-6">
                  <span className="text-2xl">💼</span>
                </div>
                <span className="text-xs text-gray-400 font-bold">자산</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-[28px] font-bold text-gray-900 leading-tight">
              매일의 업무 기록이<br />
              <span className="text-primary-500 underline decoration-4 decoration-primary-200 underline-offset-4">
                커리어 자산
              </span>
              이 되는 곳
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              더 이상 고민하지 마세요.<br />
              오늘의 업무 기록을 <strong>근사한 경력기술서</strong>로<br />
              만들어 드릴게요.
            </p>
          </div>
        </div>

        <div className="mb-8 w-full space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleStart}
            disabled={isLoading}
          >
            {isLoggedIn ? (
              <>📝 기록하러 가기</>
            ) : (
              <>✉️ 이메일로 시작하기</>
            )}
          </Button>

          {isLoggedIn ? (
            <p className="text-center text-xs text-gray-400">
              <span
                className="underline cursor-pointer hover:text-gray-600"
                onClick={handleLogout}
              >
                로그아웃
              </span>
            </p>
          ) : (
            <p className="text-center text-xs text-gray-400">
              이미 계정이 있으신가요?{' '}
              <span
                className="underline cursor-pointer hover:text-gray-600"
                onClick={() => router.push('/login')}
              >
                로그인
              </span>
            </p>
          )}
        </div>
      </div>
    </>
  )
}
