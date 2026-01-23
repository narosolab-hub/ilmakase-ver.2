'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

// 일마카세 프롬프트 30개
const PROMPTS = [
  "오늘 당신이 내린 가장 중요한 '결정'은 무엇이었나요?",
  "오늘 어떤 문제를 발견했나요?",
  "오늘 새로 배운 것이 있다면?",
  "오늘 누구와 협업했고, 어떤 대화를 나눴나요?",
  "오늘 예상과 다르게 흘러간 일이 있었나요?",
  "오늘 가장 많은 시간을 쓴 일은?",
  "오늘의 나에게 피드백한다면?",
  "오늘 가장 어려웠던 순간은?",
  "오늘 내가 잘한 것 하나는?",
  "오늘 다르게 했으면 좋았을 것은?",
  "오늘 어떤 데이터를 확인했나요?",
  "오늘 누구에게 도움을 요청했나요?",
  "오늘 어떤 가설을 세웠나요?",
  "오늘 검증한 것이 있다면?",
  "오늘 우선순위를 어떻게 정했나요?",
  "오늘 마감은 지켰나요?",
  "오늘 어떤 도구를 사용했나요?",
  "오늘 팀원에게 공유한 내용은?",
  "오늘 리서치한 것이 있다면?",
  "오늘 회의에서 나온 중요한 포인트는?",
  "오늘 고객/사용자에 대해 알게 된 것은?",
  "오늘 시도한 새로운 방법은?",
  "오늘 개선한 것이 있다면?",
  "오늘 받은 피드백은?",
  "오늘 내가 제안한 아이디어는?",
  "오늘 실패한 것과 배운 점은?",
  "오늘 진행 상황을 어떻게 점검했나요?",
  "오늘 다음 단계를 어떻게 계획했나요?",
  "오늘 예상 밖의 결과가 나왔다면?",
  "오늘 하루를 한 단어로 표현한다면?",
]

interface WorkItem {
  id: string
  content: string
}

export default function WritePage() {
  const router = useRouter()
  const nextIdRef = useRef(4) // 초기 ID는 4부터 시작 (1,2,3은 이미 사용 중)
  const [workItems, setWorkItems] = useState<WorkItem[]>([
    { id: '1', content: '' },
    { id: '2', content: '' },
    { id: '3', content: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [promptExpanded, setPromptExpanded] = useState(true)

  useEffect(() => {
    // 랜덤 프롬프트 선택
    const randomPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
    setPrompt(randomPrompt)
  }, [])

  // 오늘 이미 작성했는지 확인
  useEffect(() => {
    const checkTodayRecord = async () => {
      try {
        // 로컬 타임존 기준으로 오늘 날짜 계산
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const today = `${year}-${month}-${day}`
        
        const response = await fetch(`/api/records?date=${today}`)
        const data = await response.json()
        
        if (data.records && data.records.length > 0) {
          const todayRecord = data.records[0]
          
          // 사용자에게 확인 요청
          const userConfirmed = confirm(
            '오늘은 이미 업무 기록을 했어요 😊\n\n더 작성하고 싶다면 수정하러 갈까요?'
          )
          
          if (userConfirmed) {
            router.push(`/records/${todayRecord.id}/edit`)
          } else {
            router.push('/home')
          }
        }
      } catch (error) {
        console.error('기록 확인 실패:', error)
      }
    }
    
    checkTodayRecord()
  }, [router])

  const addWorkItem = () => {
    if (workItems.length >= 10) {
      alert('업무는 최대 10개까지 추가할 수 있습니다.')
      return
    }
    const newId = String(nextIdRef.current)
    nextIdRef.current += 1 // 다음 ID 증가
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

    setLoading(true)
    try {
      // 로컬 타임존 기준 오늘 날짜
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const today = `${year}-${month}-${day}`

      // API 호출로 기록 저장 + AI 미리보기
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: filledItems.map((item) => item.content.trim()),
          date: today,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '기록 저장에 실패했습니다')
      }

      // 미리보기 데이터를 localStorage에 임시 저장
      if (data.preview) {
        try {
          localStorage.setItem('lastPreview', JSON.stringify(data.preview))
        } catch (error) {
          console.error('localStorage 저장 실패:', error)
          // localStorage 실패 시에도 계속 진행
        }
      }

      // 미리보기 화면으로 이동
      if (data.record) {
        router.push(`/records/${data.record.id}/preview`)
      }
    } catch (error: any) {
      console.error('기록 저장 실패:', error)
      alert(error.message || '기록 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    const hasContent = workItems.some((item) => item.content.trim().length > 0)
    if (hasContent) {
      if (confirm('작성 중인 내용이 사라집니다. 계속하시겠어요?')) {
        router.push('/home')
      }
    } else {
      router.push('/home')
    }
  }

  const filledCount = workItems.filter((item) => item.content.trim().length > 0).length

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="text-gray-500 p-1">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-lg font-bold text-gray-800">오늘의 업무 일지</h1>
        </div>
        <span className="text-xs text-gray-400">
          {filledCount}/{workItems.length}개 작성
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <h2 className="text-xl font-bold text-gray-800 mb-1">오늘 하루 어떤 일을 했나요?</h2>
        <p className="text-sm text-gray-400 mb-4">
          업무별로 나눠서 적어주시면
          <br />
          나중에 원하는 내용만 골라 쓸 수 있어요!
        </p>

        {/* 일마카세 프롬프트 */}
        <div className="mb-6">
          <details
            open={promptExpanded}
            onToggle={(e) => setPromptExpanded((e.target as HTMLDetailsElement).open)}
            className="group bg-primary-50 rounded-xl border border-primary-100 overflow-hidden"
          >
            <summary className="flex justify-between items-center p-4 cursor-pointer list-none text-primary-700 font-semibold text-sm select-none">
              <span className="flex items-center gap-2">
                <i className="far fa-lightbulb"></i> 💡 일마카세 프롬프트
              </span>
              <i className="fas fa-chevron-down transition-transform group-open:rotate-180"></i>
            </summary>
            <div className="px-4 pb-4 pt-0 text-sm text-gray-700 bg-primary-50">
              <p className="font-medium">{prompt}</p>
            </div>
          </details>
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
          나중에
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          className="flex-[2]"
          disabled={filledCount === 0}
          loading={loading}
        >
          저장하기
        </Button>
      </div>
    </div>
  )
}
