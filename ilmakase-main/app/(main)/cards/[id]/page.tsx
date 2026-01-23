'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import type { ProjectCard } from '@/types'

export default function CardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [card, setCard] = useState<ProjectCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [cardId, setCardId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (params.id) {
      setCardId(params.id as string)
    }
  }, [params])

  useEffect(() => {
    if (cardId) {
      loadCard()
    }
  }, [cardId])

  const loadCard = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // 이메일에서 닉네임 추출
        const emailUsername = user.email?.split('@')[0] || '익명'
        setUserName(emailUsername)

        const { data, error } = await supabase
          .from('project_cards')
          .select('*')
          .eq('id', cardId)
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        setCard(data)
      }
    } catch (error) {
      console.error('카드 로딩 실패:', error)
      router.push('/cards')
    } finally {
      setLoading(false)
    }
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const weeks = Math.floor(diffDays / 7)

    return `${start.slice(0, 10).replace(/-/g, '.')} ~ ${end.slice(0, 10).replace(/-/g, '.')} (${weeks > 0 ? `${weeks}주` : `${diffDays}일`})`
  }

  const handleDownload = () => {
    alert('이미지 다운로드 기능은 추후 구현 예정입니다')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!card) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center gap-4 sticky top-0 z-10 border-b border-gray-200">
        <button 
          onClick={() => router.push('/cards')} 
          className="text-gray-500"
        >
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-lg font-bold text-gray-800">포트폴리오 카드</h1>
      </header>

      <div className="p-5 pb-10 overflow-y-auto max-w-md mx-auto">
        {/* 상단 축하 메시지 */}
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-xs font-bold mb-3">
            🎉 포트폴리오 완성!
          </span>
          <h2 className="text-xl font-bold text-gray-800 leading-snug">
            {userName}님의 경험이<br />
            <span className="text-primary-600">자산</span>으로 정리되었어요.
          </h2>
        </div>

        {/* 티켓 스타일 카드 */}
        <div 
          ref={cardRef}
          className="relative bg-white shadow-2xl mx-1 mb-8 rounded-sm overflow-hidden transform transition hover:scale-[1.01] duration-300"
        >
          {/* 1. 상단 컬러 띠 */}
          <div className="h-2 bg-primary-500 w-full"></div>

          {/* 티켓 펀치 홀 (좌우 구멍) */}
          <div className="absolute top-[160px] -left-3 w-6 h-6 bg-gray-50 rounded-full shadow-inner"></div>
          <div className="absolute top-[160px] -right-3 w-6 h-6 bg-gray-50 rounded-full shadow-inner"></div>

          <div className="p-6 pt-7">
            {/* 2. 프로젝트 헤더 */}
            <div className="mb-5">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Project {String(card.created_at).slice(0, 2)}
                </span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 leading-tight mb-2">
                {card.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-mono bg-gray-50 inline-block px-2 py-1 rounded">
                <i className="far fa-calendar-alt"></i> {formatPeriod(card.period_start, card.period_end)}
              </div>
            </div>

            {/* 점선 구분선 */}
            <div className="border-b-2 border-dashed border-gray-200 mb-6 w-full"></div>

            {/* 3. 핵심 내용 */}
            <div className="space-y-5">
              {/* Action */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-primary-600 mb-2">
                  <i className="fas fa-briefcase"></i> 내가 한 일 (Actions)
                </h4>
                <ul className="text-sm text-gray-700 space-y-1.5 list-none pl-1">
                  {card.tasks.map((task, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Result (강조 박스) */}
              {card.results && card.results.length > 0 && (
                <div className="bg-primary-50 p-3 rounded-lg border border-primary-100">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-primary-800 mb-1">
                    <i className="fas fa-chart-line"></i> 성과 (Results)
                  </h4>
                  {card.results.map((result, idx) => (
                    <p key={idx} className="text-sm text-gray-800 font-medium">
                      {result}
                    </p>
                  ))}
                </div>
              )}

              {/* Thinking */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-2">
                  <i className="fas fa-brain"></i> 사고 방식 (Thinking)
                </h4>
                <div className="relative pl-3 border-l-2 border-gray-300">
                  <p className="text-sm text-gray-600 italic font-medium leading-relaxed">
                    "{card.thinking_summary}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. 푸터 (브랜딩) */}
          <div className="bg-gray-900 p-4 flex justify-between items-center text-white">
            <div>
              <p className="text-[10px] text-gray-400 font-mono tracking-widest">ARCHIVED BY</p>
              <p className="text-xs font-bold tracking-wider">ILMAKASE</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-mono">ID: #{cardId.slice(0, 6)}</p>
              <i className="fas fa-barcode text-2xl text-gray-400"></i>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={handleDownload}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
          >
            <i className="fas fa-download"></i> 이미지로 저장하기
          </button>
          <button
            onClick={() => router.push('/home')}
            className="w-full bg-white border border-gray-300 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition"
          >
            공유하기
          </button>
        </div>
      </div>
    </div>
  )
}

