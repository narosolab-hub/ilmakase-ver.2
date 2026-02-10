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

  // auto-grow (최대 3줄 ~= 72px)
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 72) + 'px'
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
    // reset height
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

  return (
    <div
      className="fixed left-0 right-0 z-50 bg-white border-t border-gray-200 px-3 py-2"
      style={{ bottom: 48 }}
    >
      <div className="flex items-end gap-2">
        {/* 확장 버튼 */}
        <button
          onClick={onExpand}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          title="전체 편집"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        {/* 입력 */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="#프로젝트/ 업무내용"
          rows={1}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-primary-400 resize-none bg-white transition-colors disabled:opacity-50"
          style={{ maxHeight: 72 }}
        />

        {/* 전송 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-40"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
