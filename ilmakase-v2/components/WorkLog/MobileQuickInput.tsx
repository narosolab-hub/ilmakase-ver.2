'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface MobileQuickInputProps {
  onSubmit: (line: string) => void
  onExpand: () => void
  disabled?: boolean
  visible?: boolean
}

export default function MobileQuickInput({ onSubmit, onExpand, disabled, visible = true }: MobileQuickInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 80) + 'px'
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!visible) return null

  const hasValue = value.trim().length > 0

  return (
    <div
      className="fixed left-0 right-0 z-50 bg-white px-3 py-2"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)',
        boxShadow: '0 -1px 0 0 rgba(0,0,0,0.06), 0 -4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-1.5">
        {/* 전체 편집 버튼 — 연필 아이콘 */}
        <button
          onClick={onExpand}
          className="flex-shrink-0 text-gray-400 hover:text-primary-500 transition-colors pb-1"
          title="전체 편집"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>

        {/* 텍스트 입력 */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="#프로젝트/ 업무내용"
          rows={1}
          className="flex-1 bg-transparent text-sm outline-none resize-none py-1.5 placeholder-gray-400 text-gray-800 disabled:opacity-50"
          style={{ maxHeight: 80 }}
        />

        {/* 전송 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!hasValue || disabled}
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all mb-0.5 ${
            hasValue
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-gray-300 text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
