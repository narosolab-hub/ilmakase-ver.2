'use client'

import { useState, useEffect } from 'react'
import { Button, Input } from '@/components/UI'
import type { Project, ProjectOutcome } from '@/types'

interface ProjectDetailModalProps {
  project: Project
  onClose: () => void
  onSave: (updates: Partial<Project>) => Promise<void>
}

export default function ProjectDetailModal({
  project,
  onClose,
  onSave,
}: ProjectDetailModalProps) {
  const [saving, setSaving] = useState(false)

  // 편집 상태
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [role, setRole] = useState(project.role || '')
  const [teamSize, setTeamSize] = useState(project.team_size || '')
  const [techStack, setTechStack] = useState(project.tech_stack?.join(', ') || '')
  const [contribution, setContribution] = useState(project.contribution || '')
  const [summary, setSummary] = useState(project.summary || '')
  const [outcomes, setOutcomes] = useState<ProjectOutcome[]>(
    project.outcomes || []
  )

  // 새 성과 입력
  const [newOutcomeType, setNewOutcomeType] = useState<'quantitative' | 'qualitative'>('quantitative')
  const [newOutcomeContent, setNewOutcomeContent] = useState('')

  const handleAddOutcome = () => {
    if (!newOutcomeContent.trim()) return

    setOutcomes(prev => [
      ...prev,
      { type: newOutcomeType, content: newOutcomeContent.trim() }
    ])
    setNewOutcomeContent('')
  }

  const handleRemoveOutcome = (index: number) => {
    setOutcomes(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({
        name,
        description: description || null,
        role: role || null,
        team_size: teamSize || null,
        tech_stack: techStack.split(',').map(s => s.trim()).filter(Boolean),
        contribution: contribution || null,
        summary: summary || null,
        outcomes,
      })
      onClose()
    } catch (err) {
      console.error('저장 실패:', err)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ESC로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">프로젝트 상세 정보</h2>
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
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
          {/* 기본 정보 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">프로젝트명</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="프로젝트명"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">한 줄 요약</label>
                <Input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="예: B2B 도매 플랫폼 신규 구축"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="프로젝트에 대한 상세 설명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* 역할 및 팀 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">역할 및 팀</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">담당 역할</label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="예: 프론트엔드 리드"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">팀 규모</label>
                <Input
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  placeholder="예: 5명 (FE 2, BE 2, 디자인 1)"
                />
              </div>
            </div>
          </section>

          {/* 기술 스택 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">기술 스택</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                사용 기술 (쉼표로 구분)
              </label>
              <Input
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="예: React, TypeScript, Next.js, Supabase"
              />
            </div>
          </section>

          {/* 담당 업무 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">담당 업무 / 기여도</h3>
            <textarea
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="프로젝트에서 담당한 주요 업무와 기여도를 작성하세요.&#10;예: - 프론트엔드 아키텍처 설계&#10;    - 결제 모듈 개발&#10;    - 성능 최적화 (LCP 30% 개선)"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={4}
            />
          </section>

          {/* 성과/결과 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              성과 / 결과
              <span className="text-xs font-normal text-gray-500 ml-2">
                경력기술서에 필수로 들어가는 항목입니다
              </span>
            </h3>

            {/* 기존 성과 목록 */}
            {outcomes.length > 0 && (
              <div className="space-y-2 mb-3">
                {outcomes.map((outcome, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl"
                  >
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                      outcome.type === 'quantitative'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {outcome.type === 'quantitative' ? '정량' : '정성'}
                    </span>
                    <p className="flex-1 text-sm text-gray-700">{outcome.content}</p>
                    <button
                      onClick={() => handleRemoveOutcome(idx)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 새 성과 추가 */}
            <div className="flex gap-2">
              <select
                value={newOutcomeType}
                onChange={(e) => setNewOutcomeType(e.target.value as 'quantitative' | 'qualitative')}
                className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="quantitative">정량적</option>
                <option value="qualitative">정성적</option>
              </select>
              <Input
                value={newOutcomeContent}
                onChange={(e) => setNewOutcomeContent(e.target.value)}
                placeholder={newOutcomeType === 'quantitative'
                  ? "예: MAU 200% 증가, 전환율 15% 개선"
                  : "예: 고객사 만족도 향상, 팀 협업 문화 개선"
                }
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddOutcome()}
              />
              <Button
                variant="outline"
                onClick={handleAddOutcome}
                disabled={!newOutcomeContent.trim()}
              >
                추가
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              정량적: 숫자로 표현 가능한 성과 (매출 증가, 시간 단축 등)<br />
              정성적: 정성적 개선 사항 (프로세스 개선, 협업 강화 등)
            </p>
          </section>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave} loading={saving}>
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}
