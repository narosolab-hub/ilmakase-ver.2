'use client'

import { useState, useMemo } from 'react'
import { Button, Card, CardContent } from '@/components/UI'
import type { Project, Company } from '@/types'
import { formatDate, calculatePeriodMonths } from '@/lib/utils'

interface ProjectSelectStepProps {
  company: Company
  projects: Project[]
  selectedProjectIds: string[]
  onSelect: (ids: string[]) => void
  onBack: () => void
  onNext: () => void
}

export default function ProjectSelectStep({
  company,
  projects,
  selectedProjectIds,
  onSelect,
  onBack,
  onNext,
}: ProjectSelectStepProps) {
  const [filter, setFilter] = useState<'all' | 'unlinked' | 'linked'>('all')

  // 필터링된 프로젝트
  const filteredProjects = useMemo(() => {
    switch (filter) {
      case 'linked':
        return projects.filter(p => p.company_id === company.id)
      case 'unlinked':
        return projects.filter(p => !p.company_id)
      default:
        return projects
    }
  }, [projects, filter, company.id])

  const toggleProject = (id: string) => {
    if (selectedProjectIds.includes(id)) {
      onSelect(selectedProjectIds.filter(pid => pid !== id))
    } else {
      onSelect([...selectedProjectIds, id])
    }
  }

  const selectAll = () => {
    onSelect(filteredProjects.map(p => p.id))
  }

  const deselectAll = () => {
    onSelect([])
  }

  const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">프로젝트 선택</h2>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-primary-600">{company.name}</span>에서 진행한 프로젝트를 선택하세요.
        </p>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            filter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체 ({projects.length})
        </button>
        <button
          onClick={() => setFilter('unlinked')}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            filter === 'unlinked'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          미분류 ({projects.filter(p => !p.company_id).length})
        </button>
        <button
          onClick={() => setFilter('linked')}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            filter === 'linked'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          이 회사 ({projects.filter(p => p.company_id === company.id).length})
        </button>
      </div>

      {/* 전체 선택/해제 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {selectedProjectIds.length}개 선택됨
        </span>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-primary-600 hover:underline"
          >
            전체 선택
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={deselectAll}
            className="text-sm text-gray-500 hover:underline"
          >
            선택 해제
          </button>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredProjects.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>표시할 프로젝트가 없습니다.</p>
            <p className="text-sm mt-1">데일리 로그에서 업무를 기록하면 프로젝트가 자동으로 생성돼요.</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isSelected = selectedProjectIds.includes(project.id)
            const isLinkedToOther = project.company_id && project.company_id !== company.id

            return (
              <Card
                key={project.id}
                variant="bordered"
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50'
                    : isLinkedToOther
                    ? 'opacity-60'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => toggleProject(project.id)}
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">{project.name}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          project.status === '완료'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-primary-100 text-primary-700'
                        }`}>
                          {project.status}
                        </span>
                      </div>

                      {project.summary && (
                        <p className="text-sm text-gray-500 mt-1 truncate">{project.summary}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {project.start_date && (
                          <span>
                            {formatDate(project.start_date, 'yyyy.MM')}
                            {project.end_date && ` ~ ${formatDate(project.end_date, 'yyyy.MM')}`}
                            {project.start_date && project.end_date && (
                              <span className="ml-1">
                                ({calculatePeriodMonths(project.start_date, project.end_date)}개월)
                              </span>
                            )}
                          </span>
                        )}
                        {project.role && (
                          <span className="text-gray-400">· {project.role}</span>
                        )}
                      </div>

                      {project.outcomes && project.outcomes.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                          <span>성과 {project.outcomes.length}개</span>
                        </div>
                      )}

                      {isLinkedToOther && (
                        <p className="mt-2 text-xs text-amber-600">
                          다른 회사에 연결됨
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* 선택된 프로젝트 요약 */}
      {selectedProjects.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-xl">
          <h4 className="text-sm font-medium text-gray-700 mb-2">선택된 프로젝트</h4>
          <div className="flex flex-wrap gap-2">
            {selectedProjects.map(p => (
              <span
                key={p.id}
                className="px-2 py-1 text-sm bg-white rounded-lg border border-gray-200"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 pt-4">
        <Button variant="ghost" onClick={onBack}>
          이전
        </Button>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={onNext}
          disabled={selectedProjectIds.length === 0}
        >
          다음: 우선순위 조정 ({selectedProjectIds.length}개 선택)
        </Button>
      </div>
    </div>
  )
}
