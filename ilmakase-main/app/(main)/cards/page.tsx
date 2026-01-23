'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { ProjectCard } from '@/types'

export default function CardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase
          .from('project_cards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCards(data || [])
      }
    } catch (error) {
      console.error('카드 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCard = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/cards/generate', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        // 새 카드 추가
        setCards([data.card, ...cards])
        
        // 성공 알림
        alert('🎉 포트폴리오 카드가 생성되었습니다!')
        
        // 카드 상세로 이동
        router.push(`/cards/${data.card.id}`)
      } else {
        alert(data.error || '카드 생성에 실패했습니다')
        // 에러 시 홈으로
        if (data.error.includes('최소 5개')) {
          router.push('/home')
        }
      }
    } catch (error) {
      console.error('카드 생성 실패:', error)
      alert('카드 생성에 실패했습니다')
    } finally {
      setGenerating(false)
    }
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const weeks = Math.floor(diffDays / 7)

    return `${start.slice(5).replace('-', '.')} ~ ${end.slice(5).replace('-', '.')} (${weeks > 0 ? `${weeks}주` : `${diffDays}일`})`
  }

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠어요?')) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      router.push('/')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃에 실패했습니다. 다시 시도해주세요.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="p-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/home')} className="text-gray-500 p-1">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-lg font-bold text-gray-800">내 포트폴리오 카드</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-gray-600 p-1.5 transition-colors"
          title="로그아웃"
        >
          <i className="fas fa-right-from-bracket text-sm"></i>
        </button>
      </header>

      <div className="p-5">
        {cards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📂</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              아직 포트폴리오 카드가 없어요
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              기록을 5개 이상 작성하면<br />
              AI가 자동으로 포트폴리오 카드를 만들어드려요
            </p>
            <Button variant="secondary" onClick={() => router.push('/write')}>
              기록 작성하러 가기
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700">완성된 프로젝트</h3>
            {cards.map((card) => (
              <Card
                key={card.id}
                hoverable
                onClick={() => router.push(`/cards/${card.id}`)}
                className="relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
                <div className="pl-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-gray-900 flex-1">
                      📁 {card.title}
                    </h4>
                    <i className="fas fa-chevron-right text-gray-300 text-sm mt-1"></i>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    ⏱️ {formatPeriod(card.period_start, card.period_end)}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {card.tasks.slice(0, 2).map((task, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        • {task.length > 20 ? task.slice(0, 20) + '...' : task}
                      </span>
                    ))}
                    {card.tasks.length > 2 && (
                      <span className="text-xs text-gray-400">+{card.tasks.length - 2}개</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

