'use client'

import type { CareerDocumentMapped } from '@/lib/mappers'
import type { Company } from '@/types'

interface SavedDocCardProps {
  doc: CareerDocumentMapped
  company?: Company
  onView: (doc: CareerDocumentMapped) => void
  onDelete: (doc: CareerDocumentMapped) => void
}

export default function SavedDocCard({ doc, company, onView, onDelete }: SavedDocCardProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const formatPeriod = () => {
    if (!company?.start_date) return null
    const start = company.start_date.slice(0, 7).replace('-', '.')
    if (company.is_current) return `${start} ~ 현재`
    if (company.end_date) {
      const end = company.end_date.slice(0, 7).replace('-', '.')
      return `${start} ~ ${end}`
    }
    return start
  }

  const preview = doc.content
    ? doc.content.split('\n').filter(l => l.trim()).slice(0, 3).join('\n')
    : '내용 없음'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            {company?.position && <span>{company.position}</span>}
            {company?.department && <span>· {company.department}</span>}
          </div>
          {formatPeriod() && (
            <p className="text-xs text-gray-400 mt-0.5">{formatPeriod()}</p>
          )}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
          {formatDate(doc.createdAt)}
        </span>
      </div>

      {/* 미리보기 */}
      <div className="p-3 bg-gray-50 rounded-xl mb-3">
        <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">
          {preview}
        </p>
      </div>

      {/* 프로젝트 수 */}
      {doc.projectIds.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">
          프로젝트 {doc.projectIds.length}개 포함
        </p>
      )}

      {/* 액션 */}
      <div className="flex gap-2">
        <button
          onClick={() => onView(doc)}
          className="flex-1 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
        >
          보기 / 편집
        </button>
        <button
          onClick={() => onDelete(doc)}
          className="px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  )
}
