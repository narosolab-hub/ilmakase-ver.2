'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateForm = () => {
    if (!email) {
      setError('이메일을 입력해주세요')
      return false
    }
    if (!email.includes('@')) {
      setError('올바른 이메일 형식이 아닙니다')
      return false
    }
    if (!password) {
      setError('비밀번호를 입력해주세요')
      return false
    }
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다')
      return false
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다')
      return false
    }
    return true
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (data.user) {
        // 이메일 확인이 필요한 경우
        if (data.user.identities?.length === 0) {
          setError('이미 가입된 이메일입니다')
          return
        }

        // 회원가입 성공 - 온보딩으로 이동
        router.push('/onboarding')
      }
    } catch (error: any) {
      console.error('회원가입 에러:', error)
      if (error.message.includes('already registered')) {
        setError('이미 가입된 이메일입니다')
      } else {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.')
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
            일마카세 시작하기
          </h1>
          <p className="text-gray-500 text-sm">
            3초면 충분합니다
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            type="email"
            label="이메일"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />

          <Input
            type="password"
            label="비밀번호"
            placeholder="최소 8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />

          <Input
            type="password"
            label="비밀번호 확인"
            placeholder="비밀번호를 다시 입력해주세요"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            fullWidth
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
            <i className="fas fa-envelope"></i> 이메일로 시작하기
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          이미 계정이 있으신가요?{' '}
          <span
            onClick={() => router.push('/login')}
            className="text-primary-600 font-medium cursor-pointer hover:underline"
          >
            로그인
          </span>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4">
          가입하시면 일마카세의{' '}
          <a href="#" className="underline">
            이용약관
          </a>
          과{' '}
          <a href="#" className="underline">
            개인정보처리방침
          </a>
          에<br />
          동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}

