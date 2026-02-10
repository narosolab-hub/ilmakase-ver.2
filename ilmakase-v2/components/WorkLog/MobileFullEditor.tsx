'use client'

import { useState, useEffect, useRef } from 'react'
import { IncompleteTaskData } from '@/hooks/useCarryOver'

interface MobileFullEditorProps {
  isOpen: boolean
  onClose: () => void
  text: string
  onTextChange: (text: string) => void
  onSave: () => void
  saving: boolean
  hasUnsavedChanges: boolean
  incompleteTasks: IncompleteTaskData[]
  onAddIncompleteTask: (task: IncompleteTaskData) => void
  onAddAllIncompleteTasks: () => void
}

export default function MobileFullEditor({
  isOpen,
  onClose,
  text,
  onTextChange,
  onSave,
  saving,
  hasUnsavedChanges,
  incompleteTasks,
  onAddIncompleteTask,
  onAddAllIncompleteTasks,
}: MobileFullEditorProps) {
  const [showIncomplete, setShowIncomplete] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setAnimating(true)
      // focus textarea after animation
      const timer = setTimeout(() => {
        setAnimating(false)
        textareaRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    } else if (visible) {
      // exit animation
      setAnimating(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setAnimating(false)
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible])

  // body scroll lock
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [visible])

  if (!visible) return null

  // 부모의 handleAddIncompleteTask / handleAddAllIncompleteTasks가
  // 이미 text 상태를 갱신하므로, 여기서는 호출만 위임
  const handleAddIncomplete = (task: IncompleteTaskData) => {
    onAddIncompleteTask(task)
  }

  const handleAddAll = () => {
    onAddAllIncompleteTasks()
  }

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-[59] bg-black/40 ${isOpen ? 'mobile-backdrop-enter' : 'mobile-backdrop-exit'}`}
        onClick={onClose}
      />

      {/* 풀스크린 패널 */}
      <div
        className={`fixed inset-0 z-[60] bg-white flex flex-col ${isOpen ? 'mobile-fullscreen-enter' : 'mobile-fullscreen-exit'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm font-medium">닫기</span>
          </button>
          <h2 className="text-sm font-semibold text-gray-900">전체 편집</h2>
          <div className="w-16" /> {/* spacer for centering */}
        </div>

        {/* 미완료 업무 아코디언 */}
        {incompleteTasks.length > 0 && (
          <div className="border-b border-gray-100 bg-amber-50">
            <button
              onClick={() => setShowIncomplete(!showIncomplete)}
              className="w-full px-4 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 text-amber-600 transition-transform ${showIncomplete ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-amber-700 text-sm font-semibold">
                  미완료 업무 {incompleteTasks.length}개
                </span>
              </div>
              {showIncomplete && (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddAll()
                  }}
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                >
                  전체 추가
                </span>
              )}
            </button>

            {showIncomplete && (
              <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
                {incompleteTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm p-2 bg-white rounded-lg border border-amber-100"
                  >
                    <span className="text-gray-700 truncate flex-1">
                      <span className="text-amber-600 font-medium">#{task.project}</span>{' '}
                      {task.content}
                    </span>
                    <button
                      onClick={() => handleAddIncomplete(task)}
                      className="ml-2 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 rounded font-medium flex-shrink-0"
                    >
                      추가
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 텍스트 에디터 */}
        <div className="flex-1 p-4 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-full h-full p-3 border border-gray-200 rounded-xl outline-none focus:border-primary-400 resize-none font-mono text-sm bg-white transition-colors"
            placeholder={`#프로젝트명/ 업무내용

예시:
#도매 플랫폼/ API 명세서 검토
#앱개발 로그인 API 연동
#UI 디자인/ 메인페이지 작업`}
            style={{ minHeight: 200 }}
          />
          <p className="mt-2 text-xs text-gray-400">
            #프로젝트명/ 업무내용 형식 · 프로젝트명에 띄어쓰기 가능
          </p>
        </div>

        {/* 하단 저장 버튼 */}
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={onSave}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-all ${
              saving
                ? 'bg-gray-400'
                : hasUnsavedChanges
                  ? 'bg-primary-500 hover:bg-primary-600 ring-2 ring-amber-400 ring-offset-2'
                  : 'bg-primary-500 hover:bg-primary-600'
            }`}
          >
            {saving ? '저장 중...' : hasUnsavedChanges ? '저장하기 (변경사항 있음)' : '저장하기'}
          </button>
        </div>
      </div>
    </>
  )
}
