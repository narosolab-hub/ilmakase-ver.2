'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // 로그인 성공 - 온보딩 여부 확인
      if (data.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('situation')
          .eq('id', data.user.id)
          .single()

        // 온보딩 완료 여부 확인
        if (userData?.situation) {
          router.push('/home')
        } else {
          router.push('/onboarding')
        }
      }
    } catch (error: any) {
      console.error('로그인 에러:', error)
      if (error.message === 'Email not confirmed') {
        setError('이메일 인증이 필요합니다. 가입 시 받은 이메일을 확인해주세요.')
      } else if (error.message === 'Invalid login credentials') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다')
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
      {/* Header */}
      <button 
        onClick={() => router.push('/')}
        className="mb-8 text-gray-500 self-start"
      >
        <i className="fas fa-arrow-left"></i>
      </button>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🍊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            다시 만나서 반가워요!
          </h1>
          <p className="text-gray-500 text-sm">
            일마카세 아카이브에 로그인하세요
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            label="이메일"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            error={error && !email ? '이메일을 입력해주세요' : ''}
          />

          <Input
            type="password"
            label="비밀번호"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            error={error && !password ? '비밀번호를 입력해주세요' : ''}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            className="mt-6"
          >
            로그인
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          아직 계정이 없으신가요?{' '}
          <span
            onClick={() => router.push('/signup')}
            className="text-primary-600 font-medium cursor-pointer hover:underline"
          >
            회원가입
          </span>
        </p>
      </div>
    </div>
  )
}

