'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/UI'
import type { CareerDocumentMapped } from '@/lib/mappers'

interface DocViewModalProps {
  doc: CareerDocumentMapped
  onClose: () => void
  onSave: (id: string, updates: { content: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function DocViewModal({ doc, onClose, onSave, onDelete }: DocViewModalProps) {
  const [content, setContent] = useState(doc.content || '')
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setContent(doc.content || '')
  }, [doc])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('복사에 실패했습니다.')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(doc.id, { content })
      setIsEditing(false)
    } catch {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await onDelete(doc.id)
      onClose()
    } catch {
      alert('삭제에 실패했습니다.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{doc.title}</h2>
            {doc.role && <p className="text-sm text-gray-500">{doc.role}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-5">
          {isEditing ? (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full h-[400px] p-4 border border-gray-300 rounded-xl text-sm font-mono leading-relaxed focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {content || '내용이 없습니다.'}
              </pre>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-5 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-sm text-red-500 py-2">정말 삭제할까요?</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    취소
                  </Button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600"
                  >
                    삭제
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm text-gray-400 hover:text-red-500 px-3 py-1.5"
                >
                  삭제
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setContent(doc.content || '') }}>
                    취소
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    편집
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleCopy}>
                    {copied ? '복사 완료!' : '복사하기'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
