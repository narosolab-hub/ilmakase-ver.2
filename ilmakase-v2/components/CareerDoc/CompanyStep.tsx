'use client'

import { useState } from 'react'
import { Button, Input, Card, CardContent } from '@/components/UI'
import type { Company } from '@/types'

interface CompanyStepProps {
  companies: Company[]
  selectedCompany: Company | null
  onSelect: (company: Company) => void
  onCreate: (data: {
    name: string
    position?: string
    department?: string
    start_date?: string
    end_date?: string
    is_current?: boolean
  }) => Promise<Company>
  onNext: () => void
}

export default function CompanyStep({
  companies,
  selectedCompany,
  onSelect,
  onCreate,
  onNext,
}: CompanyStepProps) {
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)

  // 새 회사 폼 상태
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isCurrent, setIsCurrent] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return

    try {
      setCreating(true)
      const newCompany = await onCreate({
        name: name.trim(),
        position: position.trim() || undefined,
        department: department.trim() || undefined,
        start_date: startDate || undefined,
        end_date: isCurrent ? undefined : (endDate || undefined),
        is_current: isCurrent,
      })
      onSelect(newCompany)
      setShowForm(false)
      resetForm()
    } catch (err) {
      console.error('회사 생성 실패:', err)
      alert('회사 추가에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setName('')
    setPosition('')
    setDepartment('')
    setStartDate('')
    setEndDate('')
    setIsCurrent(false)
  }

  const formatPeriod = (company: Company) => {
    if (!company.start_date) return ''
    const start = company.start_date.slice(0, 7).replace('-', '.')
    if (company.is_current) return `${start} ~ 현재`
    if (company.end_date) {
      const end = company.end_date.slice(0, 7).replace('-', '.')
      return `${start} ~ ${end}`
    }
    return start
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">회사 선택</h2>
        <p className="text-sm text-gray-600">
          경력기술서를 작성할 회사를 선택하세요. 없으면 새로 추가할 수 있어요.
        </p>
      </div>

      {/* 기존 회사 목록 */}
      {companies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">등록된 회사</h3>
          <div className="grid gap-3">
            {companies.map((company) => (
              <Card
                key={company.id}
                variant="bordered"
                className={`cursor-pointer transition-all ${
                  selectedCompany?.id === company.id
                    ? 'ring-2 ring-primary-500 border-primary-500'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => onSelect(company)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{company.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {company.position && (
                          <span className="text-sm text-gray-600">{company.position}</span>
                        )}
                        {company.department && (
                          <span className="text-sm text-gray-500">· {company.department}</span>
                        )}
                      </div>
                      {company.start_date && (
                        <p className="text-xs text-gray-500 mt-1">{formatPeriod(company)}</p>
                      )}
                    </div>
                    {selectedCompany?.id === company.id && (
                      <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 새 회사 추가 버튼 / 폼 */}
      {!showForm ? (
        <Button
          variant="outline"
          fullWidth
          onClick={() => setShowForm(true)}
        >
          + 새 회사 추가
        </Button>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-gray-900">새 회사 추가</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회사명 <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 카카오, 네이버, 스타트업명"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직무/직급</label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="예: 프론트엔드 개발자"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="예: 개발팀"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">퇴사일</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isCurrent}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">현재 재직중</span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleCreate}
                loading={creating}
                disabled={!name.trim()}
              >
                추가
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 다음 버튼 */}
      <div className="pt-4">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={onNext}
          disabled={!selectedCompany}
        >
          다음: 프로젝트 선택
        </Button>
      </div>
    </div>
  )
}
