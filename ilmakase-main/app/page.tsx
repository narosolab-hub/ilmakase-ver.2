'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true)
  const [showLanding, setShowLanding] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setIsLoggedIn(true)
        
        // 온보딩 완료 여부 확인
        const { data: userData } = await supabase
          .from('users')
          .select('situation')
          .eq('id', user.id)
          .single()

        if (userData?.situation) {
          setIsOnboardingComplete(true)
        }
      }
    } catch (error) {
      console.error('인증 상태 확인 실패:', error)
    } finally {
      setIsLoading(false)
      showSplashScreen()
    }
  }

  const showSplashScreen = () => {
    // 2초 후 스플래시 종료
    setTimeout(() => {
      setShowSplash(false)
      setTimeout(() => {
        setShowLanding(true)
      }, 600)
    }, 2000)
  }

  const handleStart = () => {
    if (isLoggedIn) {
      // 로그인 O: 온보딩 완료 여부에 따라 분기
      if (isOnboardingComplete) {
        router.push('/home')
      } else {
        router.push('/onboarding')
      }
    } else {
      // 로그인 X: 회원가입으로
      router.push('/signup')
    }
  }

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠어요?')) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      // 로그아웃 성공 시 상태 업데이트
      setIsLoggedIn(false)
      setIsOnboardingComplete(false)
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃에 실패했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <>
      {/* 스플래시 화면 */}
      {showSplash && (
        <div className={`fixed inset-0 z-50 bg-primary-500 flex flex-col items-center justify-center text-white px-6 text-center ${!showSplash ? 'opacity-0 invisible' : ''} transition-opacity duration-600`}>
          <div className="text-5xl mb-5 animate-bounce">🍊</div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">일마카세 아카이브</h1>
          <div className="w-10 h-0.5 bg-white/50 mb-3 rounded-full"></div>
          <p className="text-sm font-medium text-white/90 leading-relaxed tracking-wide">
            오늘 한 일이<br />내일의 포트폴리오가 됩니다
          </p>
        </div>
      )}

      {/* 랜딩 화면 */}
      {showLanding && (
        <div className="flex flex-col justify-between p-6 h-screen overflow-hidden animate-slide-up">
          <div className="h-8"></div>
          
          <div className="text-center flex-1 flex flex-col justify-center">
            {/* 애니메이션 아이콘 영역 */}
            <div className="relative h-48 flex items-center justify-center mb-8">
              <div className="absolute w-40 h-40 bg-orange-100 rounded-full blur-2xl opacity-60 animate-pulse-slow"></div>
              <div className="relative z-10 flex items-center gap-3 animate-float">
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100 transform -rotate-6">
                    <span className="text-2xl">📝</span>
                  </div>
                  <span className="text-xs text-gray-400 font-bold">기록</span>
                </div>
                <i className="fas fa-chevron-right text-gray-300 text-sm"></i>
                <div className="flex flex-col items-center gap-2 mt-8">
                  <div className="bg-primary-500 p-3 rounded-2xl shadow-lg border border-primary-400 transform rotate-3 text-white">
                    <i className="fas fa-magic text-xl"></i>
                  </div>
                  <span className="text-xs text-primary-600 font-bold">AI 정리</span>
                </div>
                <i className="fas fa-chevron-right text-gray-300 text-sm"></i>
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-3 rounded-2xl shadow-lg border border-yellow-100 transform rotate-6">
                    <span className="text-2xl">💼</span>
                  </div>
                  <span className="text-xs text-gray-400 font-bold">자산</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-[28px] font-bold text-gray-900 leading-[1.35]">
                매일의 업무 기록이<br />
                <span className="text-primary-500 decoration-4 decoration-primary-200 underline-offset-4 underline">
                  커리어 자산
                </span>
                이 되는 곳
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                더 이상 고민하지 마세요.<br />
                오늘의 업무 기록을 <strong>근사한 포트폴리오</strong>로<br />
                만들어 드릴게요.
              </p>
            </div>
          </div>

          <div className="mb-8 w-full">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleStart}
              className="mb-3"
              disabled={isLoading}
            >
              {isLoggedIn ? (
                <>
                  <i className="fas fa-pencil-alt"></i> 기록하러 가기
                </>
              ) : (
                <>
                  <i className="fas fa-envelope"></i> 이메일로 3초 만에 시작하기
                </>
              )}
            </Button>
            {isLoggedIn && (
              <p className="text-center text-xs text-gray-400 mb-3">
                <span 
                  className="underline cursor-pointer hover:text-gray-600"
                  onClick={handleLogout}
                >
                  로그아웃
                </span>
              </p>
            )}
            {!isLoggedIn && (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => router.push('/try')}
                  className="mb-3"
                >
                  <i className="fas fa-play-circle"></i> 로그인 없이 체험하기
                </Button>
                <p className="text-center text-xs text-gray-400">
                  이미 계정이 있으신가요?{' '}
                  <span 
                    className="underline cursor-pointer hover:text-gray-600"
                    onClick={() => router.push('/login')}
                  >
                    로그인
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
