'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import type { Record } from '@/types'

interface WorkItem {
  id: string
  content: string
}

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default function EditRecordPage({ params }: EditPageProps) {
  const router = useRouter()
  const nextIdRef = useRef(1)
  const [recordId, setRecordId] = useState<string>('')
  const [record, setRecord] = useState<Record | null>(null)
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params
      setRecordId(resolvedParams.id)
    }
    init()
  }, [params])

  useEffect(() => {
    if (recordId) {
      loadRecord()
    }
  }, [recordId])

  const loadRecord = async () => {
    try {
      const response = await fetch(`/api/records/${recordId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '기록을 불러오는데 실패했습니다')
      }

      setRecord(data.record)
      
      // contents 배열을 WorkItem 배열로 변환
      const items: WorkItem[] = data.record.contents.map((content: string, index: number) => ({
        id: String(index + 1),
        content,
      }))
      setWorkItems(items)
      nextIdRef.current = items.length + 1
    } catch (error: any) {
      console.error('기록 조회 실패:', error)
      alert(error.message || '기록을 불러오는데 실패했습니다.')
      router.push('/home')
    } finally {
      setLoading(false)
    }
  }

  const addWorkItem = () => {
    if (workItems.length >= 10) {
      alert('업무는 최대 10개까지 추가할 수 있습니다.')
      return
    }
    const newId = String(nextIdRef.current)
    nextIdRef.current += 1
    setWorkItems([...workItems, { id: newId, content: '' }])
  }

  const removeWorkItem = (id: string) => {
    if (workItems.length <= 1) {
      alert('최소 1개의 업무는 작성해야 합니다.')
      return
    }
    setWorkItems(workItems.filter((item) => item.id !== id))
  }

  const updateWorkItem = (id: string, content: string) => {
    setWorkItems(
      workItems.map((item) => (item.id === id ? { ...item, content } : item))
    )
  }

  const handleSave = async () => {
    // 빈 항목 제거
    const filledItems = workItems.filter((item) => item.content.trim().length > 0)

    if (filledItems.length === 0) {
      alert('최소 1개의 업무를 작성해주세요.')
      return
    }

    // 각 항목 글자 수 검증
    for (const item of filledItems) {
      if (item.content.trim().length < 10) {
        alert('각 업무는 최소 10자 이상 작성해주세요.')
        return
      }
      if (item.content.trim().length > 500) {
        alert('각 업무는 최대 500자까지 작성할 수 있습니다.')
        return
      }
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: filledItems.map((item) => item.content.trim()),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '기록 수정에 실패했습니다')
      }

      // AI 분석 결과를 localStorage에 저장
      if (data.preview) {
        try {
          localStorage.setItem('lastPreview', JSON.stringify(data.preview))
        } catch (error) {
          console.error('localStorage 저장 실패:', error)
        }
      }

      // 프리뷰 화면으로 이동 (AI 분석 결과 표시)
      router.push(`/records/${recordId}/preview`)
    } catch (error: any) {
      console.error('기록 수정 실패:', error)
      alert(error.message || '기록 수정에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (confirm('수정을 취소하시겠어요?\n변경사항이 저장되지 않습니다.')) {
      router.push(`/records/${recordId}`)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${year}.${month}.${day}(${weekday})`
  }

  const filledCount = workItems.filter((item) => item.content.trim().length > 0).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!record) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="text-gray-500 p-1">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">업무 기록 수정</h1>
            <p className="text-xs text-gray-400">{formatDate(record.date)}</p>
          </div>
        </div>
        <span className="text-xs text-gray-400">
          {filledCount}/{workItems.length}개 작성
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✏️</div>
              <div className="flex-1 text-sm">
                <p className="font-bold text-blue-900 mb-1">업무 추가/수정</p>
                <p className="text-blue-700 text-xs">
                  오늘 깜빡한 업무를 추가하거나, 내용을 수정할 수 있어요.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 업무 항목들 */}
        <div className="space-y-4 mb-4">
          {workItems.map((item, index) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">
                  업무 {index + 1}
                </label>
                {workItems.length > 1 && (
                  <button
                    onClick={() => removeWorkItem(item.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <i className="fas fa-times"></i> 삭제
                  </button>
                )}
              </div>
              <Textarea
                value={item.content}
                onChange={(e) => updateWorkItem(item.id, e.target.value)}
                placeholder="예) 신규 캠페인 타겟 분석하고 기획서 작성했어요..."
                className="h-24 text-sm bg-gray-50"
                fullWidth
                showCount
                maxCount={500}
              />
            </div>
          ))}
        </div>

        {/* 업무 추가 버튼 */}
        {workItems.length < 10 && (
          <button
            onClick={addWorkItem}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
          >
            <i className="fas fa-plus mr-2"></i> 업무 추가 (최대 10개)
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-gray-100 flex gap-3">
        <Button variant="secondary" onClick={handleCancel} className="flex-1">
          취소
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          className="flex-[2]"
          disabled={filledCount === 0}
          loading={saving}
        >
          {saving ? 'AI가 분석 중이에요...' : '저장하기'}
        </Button>
      </div>
    </div>
  )
}

