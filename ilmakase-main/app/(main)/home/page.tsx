'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import type { Record, ProjectCard, AIAnalysis } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const [records, setRecords] = useState<Record[]>([])
  const [cards, setCards] = useState<ProjectCard[]>([])
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')
  const [unusedAnalysesCount, setUnusedAnalysesCount] = useState<number>(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 이메일 도메인에서 닉네임 추출
      const emailUsername = user.email?.split('@')[0] || '익명'
      setUserName(emailUsername)

      // 사용자 정보 (main_work는 유지)
      const { data: userData } = await supabase
        .from('users')
        .select('main_work')
        .eq('id', user.id)
        .single()

      // 기록 목록 (최근 10개)
      const { data: recordsData } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10)

      setRecords(recordsData || [])

      // 패턴 분석 목록 (프로젝트에 연결되지 않은 것만)
      const { data: analysesData } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('user_id', user.id)
        .is('project_id', null)
        .order('created_at', { ascending: false })

      // 모든 패턴 분석 목록 (표시용)
      const { data: allAnalysesData } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setAnalyses(allAnalysesData || [])

      // 포트폴리오 카드 목록
      const { data: cardsData } = await supabase
        .from('project_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setCards(cardsData || [])
      
      // 패턴 분석 개수 저장 (상태 관리용)
      setUnusedAnalysesCount(analysesData?.length || 0)
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 미사용 기록 수 계산 (패턴 분석에 사용되지 않은 기록)
  const unusedRecordsCount = records.filter((r) => {
    // analysis_id가 null인 기록만 카운트 (패턴 분석에 사용되지 않은 기록)
    return !r.analysis_id
  }).length

  // 다음 패턴 분석까지 남은 기록 수
  const recordsUntilNextAnalysis = 5 - (unusedRecordsCount % 5)

  // 진행률 계산 (5일 단위)
  const progressPercent = ((unusedRecordsCount % 5) / 5) * 100

  // 패턴 분석 가능 여부 (5개 기록)
  const canAnalyze = unusedRecordsCount >= 5

  // 포트폴리오 카드 생성 가능 여부 (4개 패턴 분석 = 20일 기록)
  const canGenerateCard = unusedAnalysesCount >= 4

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const recordDate = new Date(date)
    recordDate.setHours(0, 0, 0, 0)

    if (recordDate.getTime() === today.getTime()) {
      return '오늘'
    } else {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const weekdays = ['일', '월', '화', '수', '목', '금', '토']
      const weekday = weekdays[date.getDay()]
      return `${year}.${month}.${day}(${weekday})`
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
      
      // 로그아웃 성공 시 랜딩 페이지로 이동
      router.push('/')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃에 실패했습니다. 다시 시도해주세요.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">일마카세 아카이브</h1>
              <p className="text-sm text-gray-500 mt-1">
                안녕하세요, {userName}! 👋
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 p-1.5 transition-colors"
              title="로그아웃"
            >
              <i className="fas fa-right-from-bracket text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto px-5 py-6 space-y-5">
        {/* 현재 상태 카드 */}
        <Card className="bg-white">
          <div className="flex items-center gap-2 mb-4">
            <i className="fas fa-chart-line text-primary-500 text-lg"></i>
            <h3 className="font-bold text-gray-800">현재 상태</h3>
          </div>

          {/* 기록 일수 강조 */}
          <div className="mb-5">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
              {records.length}일 <span className="text-lg font-normal text-gray-600">동안 기록했어요</span>
            </h2>
          </div>

          {/* 통계 */}
          <div className="bg-orange-50 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">발견된 프로젝트</p>
                <p className="text-xl font-bold text-primary-600">{cards.length}개</p>
              </div>
              <div className="border-l border-primary-200 pl-4">
                <p className="text-xs text-gray-500 mb-1">다음 패턴 분석까지</p>
                <p className="text-base font-bold text-gray-700">기록 {recordsUntilNextAnalysis}개 남음</p>
              </div>
            </div>
          </div>

          {/* 진행 바 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">{unusedRecordsCount % 5}일 기록 완료</span>
              <span className="text-xs font-medium text-primary-600">
                {recordsUntilNextAnalysis}일 더 작성하면 패턴 분석!
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-400 to-primary-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </Card>

        {/* 알림 카드들 */}
        {canGenerateCard && (
          <Card
            className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 cursor-pointer hover:shadow-md transition-all"
            onClick={() => router.push('/cards/generate')}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-2xl">
                🎉
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-0.5 text-gray-900">패턴 분석 {unusedAnalysesCount}개 쌓였어요!</h3>
                <p className="text-sm text-gray-600">포트폴리오 카드를 만들 수 있어요 (총 {unusedAnalysesCount * 5}일 기록)</p>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </div>
          </Card>
        )}

        {canAnalyze && !canGenerateCard && (
          <Card
            className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-500 cursor-pointer hover:shadow-md transition-all"
            onClick={() => router.push('/analyses')}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl">
                ✨
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-0.5">기록 5개 쌓였어요!</h3>
                <p className="text-sm text-gray-600">일주일치 업무 패턴을 분석해봤어요</p>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </div>
          </Card>
        )}

        {cards.length > 0 && (
          <Card
            className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 cursor-pointer hover:shadow-md transition-all"
            onClick={() => router.push('/cards')}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-2xl">
                📁
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 mb-0.5">포트폴리오 카드가 완성되었어요!</h3>
                <p className="text-sm text-gray-600">지금 바로 확인해보세요</p>
              </div>
              <i className="fas fa-chevron-right text-gray-400"></i>
            </div>
          </Card>
        )}

        {/* 최근 기록 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-pencil-alt text-gray-500"></i>
              최근 기록
            </h3>
            {records.length > 3 && (
              <button
                onClick={() => router.push('/records')}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                전체보기 <i className="fas fa-chevron-right"></i>
              </button>
            )}
          </div>

          {records.length === 0 ? (
            <Card className="bg-white text-center py-12">
              <div className="text-gray-300 text-5xl mb-3">📝</div>
              <p className="text-gray-500 text-sm mb-4">아직 작성한 기록이 없어요</p>
              <button
                onClick={() => router.push('/write')}
                className="bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-600 transition"
              >
                첫 기록 작성하기
              </button>
            </Card>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 3).map((record) => (
                <Card
                  key={record.id}
                  className="bg-white hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/records/${record.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary-500">
                          {formatDate(record.date)}
                        </span>
                        {record.project_id && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                            카드 생성됨
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {record.contents && record.contents.length > 0 ? (
                          <>
                            {record.contents[0]}
                            {record.contents.length > 1 && (
                              <span className="text-gray-400 ml-1">
                                외 {record.contents.length - 1}개
                              </span>
                            )}
                          </>
                        ) : (
                          '내용 없음'
                        )}
                      </p>
                    </div>
                    <i className="fas fa-chevron-right text-gray-300 text-sm mt-1"></i>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 플로팅 버튼 */}
      <button
        onClick={() => router.push('/write')}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition active:scale-95"
      >
        <i className="fas fa-plus"></i>
      </button>
    </div>
  )
}
