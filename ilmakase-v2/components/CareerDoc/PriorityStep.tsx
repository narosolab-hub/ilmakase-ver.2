'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent } from '@/components/UI'
import type { Project, Company } from '@/types'

interface ProjectWithPriority {
  project: Project
  priority: 'high' | 'medium' | 'low'
  aiReason?: string
}

interface PriorityStepProps {
  company: Company
  projects: Project[]
  onBack: () => void
  onNext: (orderedProjects: ProjectWithPriority[]) => void
  onAnalyze: (projectIds: string[]) => Promise<{
    priorities: Array<{
      projectId: string
      priority: 'high' | 'medium' | 'low'
      reason: string
    }>
  }>
}

export default function PriorityStep({
  company,
  projects,
  onBack,
  onNext,
  onAnalyze,
}: PriorityStepProps) {
  const [orderedProjects, setOrderedProjects] = useState<ProjectWithPriority[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  // 초기 정렬: 성과 있는 것 > 완료된 것 > 진행중
  useEffect(() => {
    const sorted = [...projects].sort((a, b) => {
      // 성과 개수로 1차 정렬
      const aOutcomes = a.outcomes?.length || 0
      const bOutcomes = b.outcomes?.length || 0
      if (bOutcomes !== aOutcomes) return bOutcomes - aOutcomes

      // 완료 상태로 2차 정렬
      if (a.status === '완료' && b.status !== '완료') return -1
      if (b.status === '완료' && a.status !== '완료') return 1

      return 0
    })

    setOrderedProjects(sorted.map(p => ({
      project: p,
      priority: p.outcomes && p.outcomes.length > 0 ? 'high' : 'medium',
    })))
  }, [projects])

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true)
      const result = await onAnalyze(projects.map(p => p.id))

      setOrderedProjects(prev => {
        const updated = prev.map(item => {
          const analysis = result.priorities.find(p => p.projectId === item.project.id)
          if (analysis) {
            return {
              ...item,
              priority: analysis.priority,
              aiReason: analysis.reason,
            }
          }
          return item
        })

        // 우선순위로 정렬
        return updated.sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 }
          return order[a.priority] - order[b.priority]
        })
      })

      setAnalyzed(true)
    } catch (err) {
      console.error('AI 분석 실패:', err)
      alert('AI 분석에 실패했습니다. 수동으로 우선순위를 조정해주세요.')
    } finally {
      setAnalyzing(false)
    }
  }

  const changePriority = (index: number, priority: 'high' | 'medium' | 'low') => {
    setOrderedProjects(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], priority }

      // 우선순위로 재정렬
      return updated.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.priority] - order[b.priority]
      })
    })
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setOrderedProjects(prev => {
      const updated = [...prev]
      ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
      return updated
    })
  }

  const moveDown = (index: number) => {
    if (index === orderedProjects.length - 1) return
    setOrderedProjects(prev => {
      const updated = [...prev]
      ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
      return updated
    })
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const priorityLabels = {
    high: '핵심',
    medium: '보통',
    low: '간략히',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">우선순위 조정</h2>
        <p className="text-sm text-gray-600">
          경력기술서에서 강조할 프로젝트를 정해주세요.
          <br />
          <span className="text-primary-600">핵심</span>은 상세하게,{' '}
          <span className="text-gray-500">간략히</span>는 한 줄로 정리돼요.
        </p>
      </div>

      {/* AI 분석 버튼 */}
      {!analyzed && (
        <Button
          variant="outline"
          fullWidth
          onClick={handleAnalyze}
          loading={analyzing}
        >
          {analyzing ? 'AI가 분석 중...' : 'AI에게 우선순위 추천받기'}
        </Button>
      )}

      {analyzed && (
        <div className="p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
          AI가 이직에 어필될 프로젝트를 분석했어요. 필요하면 직접 조정하세요.
        </div>
      )}

      {/* 프로젝트 목록 */}
      <div className="space-y-3">
        {orderedProjects.map((item, index) => (
          <Card key={item.project.id} variant="bordered">
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                {/* 순서 조정 버튼 */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === orderedProjects.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* 프로젝트 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <h4 className="font-medium text-gray-900 truncate">{item.project.name}</h4>
                  </div>

                  {item.project.summary && (
                    <p className="text-sm text-gray-500 truncate mb-2">{item.project.summary}</p>
                  )}

                  {item.aiReason && (
                    <p className="text-xs text-primary-600 mb-2">AI: {item.aiReason}</p>
                  )}

                  {/* 우선순위 선택 */}
                  <div className="flex gap-2">
                    {(['high', 'medium', 'low'] as const).map((priority) => (
                      <button
                        key={priority}
                        onClick={() => changePriority(index, priority)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
                          item.priority === priority
                            ? priorityColors[priority]
                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {priorityLabels[priority]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 성과 표시 */}
                {item.project.outcomes && item.project.outcomes.length > 0 && (
                  <div className="text-xs text-emerald-600 flex-shrink-0">
                    성과 {item.project.outcomes.length}개
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 우선순위 요약 */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 mb-2">경력기술서 구성 미리보기</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors.high}`}>핵심</span>
            <span className="text-gray-600">
              {orderedProjects.filter(p => p.priority === 'high').length}개 - 상세 서술
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors.medium}`}>보통</span>
            <span className="text-gray-600">
              {orderedProjects.filter(p => p.priority === 'medium').length}개 - 2~3줄 요약
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors.low}`}>간략히</span>
            <span className="text-gray-600">
              {orderedProjects.filter(p => p.priority === 'low').length}개 - 한 줄 언급
            </span>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-4">
        <Button variant="ghost" onClick={onBack}>
          이전
        </Button>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={() => onNext(orderedProjects)}
        >
          경력기술서 생성하기
        </Button>
      </div>
    </div>
  )
}

export type { ProjectWithPriority }
