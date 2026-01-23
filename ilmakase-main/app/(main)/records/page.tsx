'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import type { Record } from '@/types'

export default function RecordsListPage() {
  const router = useRouter()
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 전체 기록 조회
      const { data: recordsData } = await supabase
        .from('records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      setRecords(recordsData || [])
    } catch (error) {
      console.error('기록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/home')}
              className="text-gray-600 hover:text-gray-900"
            >
              <i className="fas fa-arrow-left text-lg"></i>
            </button>
            <h1 className="text-lg font-bold text-gray-800">전체 기록</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 p-1.5 transition-colors"
            title="로그아웃"
          >
            <i className="fas fa-right-from-bracket text-sm"></i>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6">
        {records.length === 0 ? (
          <Card className="bg-white text-center py-12">
            <div className="text-gray-300 text-6xl mb-4">📝</div>
            <p className="text-gray-500 mb-6">아직 작성한 기록이 없어요</p>
            <button
              onClick={() => router.push('/write')}
              className="bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-600 transition"
            >
              첫 기록 작성하기
            </button>
          </Card>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
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

        {/* 통계 */}
        {records.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              총 <span className="font-bold text-primary-500">{records.length}개</span>의 기록을 작성했어요!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

