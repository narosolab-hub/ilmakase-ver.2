'use client'

import { useState, useEffect } from 'react'
import { Button, Input } from '@/components/UI'
import type { Project, ProjectOutcome } from '@/types'

interface ProjectDetailModalProps {
  project: Project
  onClose: () => void
  onSave: (updates: Partial<Project>) => Promise<void>
}

// 숫자가 포함되면 정량, 아니면 정성으로 자동 분류
function guessOutcomeType(text: string): 'quantitative' | 'qualitative' {
  return /\d/.test(text) ? 'quantitative' : 'qualitative'
}

// 아코디언 섹션 헤더
function SectionHeader({
  title,
  hint,
  isOpen,
  onToggle,
  preview,
  filled,
}: {
  title: string
  hint: string
  isOpen: boolean
  onToggle: () => void
  preview?: string
  filled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-3 cursor-pointer group"
    >
      <svg
        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {filled && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
          )}
        </div>
        {!isOpen && preview && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{preview}</p>
        )}
        {!isOpen && !preview && (
          <p className="text-xs text-gray-300 mt-0.5">{hint}</p>
        )}
      </div>
    </button>
  )
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

  // 성과 입력 (간소화 — 텍스트만)
  const [newOutcomeContent, setNewOutcomeContent] = useState('')

  // 아코디언 상태 — 기본 정보만 열림, 내용 있는 섹션도 열림
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initial = new Set(['basic'])
    if (role || teamSize) initial.add('team')
    if (techStack) initial.add('tech')
    if (contribution) initial.add('contribution')
    if (outcomes.length > 0) initial.add('outcomes')
    return initial
  })

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleAddOutcome = () => {
    const text = newOutcomeContent.trim()
    if (!text) return
    setOutcomes(prev => [
      ...prev,
      { type: guessOutcomeType(text), content: text }
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

  // 미리보기 텍스트
  const teamPreview = [role, teamSize].filter(Boolean).join(' · ')
  const techPreview = techStack
  const contributionPreview = contribution.split('\n')[0]
  const outcomesPreview = outcomes.length > 0
    ? `${outcomes.length}개 등록됨`
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

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
        <div className="px-6 py-2 overflow-y-auto max-h-[calc(90vh-140px)] divide-y divide-gray-100">

          {/* 기본 정보 */}
          <section>
            <SectionHeader
              title="기본 정보"
              hint="프로젝트명과 한 줄 소개"
              isOpen={openSections.has('basic')}
              onToggle={() => toggleSection('basic')}
              preview={summary || name}
              filled={!!(name && summary)}
            />
            {openSections.has('basic') && (
              <div className="pb-4 pl-7 space-y-3">
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
                  <p className="mt-1 text-[11px] text-gray-400">경력기술서에서 프로젝트 제목 옆에 표시됩니다</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="프로젝트 배경, 목표 등 자유롭게"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </section>

          {/* 역할 및 팀 */}
          <section>
            <SectionHeader
              title="역할 및 팀"
              hint="경력기술서에서 '어떤 역할로 참여했는지' 보여줍니다"
              isOpen={openSections.has('team')}
              onToggle={() => toggleSection('team')}
              preview={teamPreview}
              filled={!!(role || teamSize)}
            />
            {openSections.has('team') && (
              <div className="pb-4 pl-7">
                <p className="text-[11px] text-gray-400 mb-3">면접관이 가장 먼저 보는 항목 중 하나입니다</p>
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
              </div>
            )}
          </section>

          {/* 기술 스택 */}
          <section>
            <SectionHeader
              title="기술 스택"
              hint="사용한 기술, 도구, 프레임워크"
              isOpen={openSections.has('tech')}
              onToggle={() => toggleSection('tech')}
              preview={techPreview}
              filled={!!techStack}
            />
            {openSections.has('tech') && (
              <div className="pb-4 pl-7">
                <p className="text-[11px] text-gray-400 mb-3">개발 직군이 아니어도 사용한 도구가 있다면 작성해 보세요</p>
                <Input
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="예: React, TypeScript, Figma, Notion (쉼표로 구분)"
                />
              </div>
            )}
          </section>

          {/* 담당 업무 / 기여도 */}
          <section>
            <SectionHeader
              title="담당 업무 / 기여도"
              hint="내가 구체적으로 뭘 했는지 적어두면 경력기술서가 풍성해집니다"
              isOpen={openSections.has('contribution')}
              onToggle={() => toggleSection('contribution')}
              preview={contributionPreview}
              filled={!!contribution}
            />
            {openSections.has('contribution') && (
              <div className="pb-4 pl-7">
                <p className="text-[11px] text-gray-400 mb-3">
                  줄 바꿔서 항목별로 적으면 보기 편합니다
                </p>
                <textarea
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                  placeholder={"- 프론트엔드 아키텍처 설계\n- 결제 모듈 개발\n- 성능 최적화 (LCP 30% 개선)"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
            )}
          </section>

          {/* 성과 / 결과 */}
          <section>
            <SectionHeader
              title="성과 / 결과"
              hint="숫자가 있으면 경력기술서 임팩트가 확 올라갑니다"
              isOpen={openSections.has('outcomes')}
              onToggle={() => toggleSection('outcomes')}
              preview={outcomesPreview}
              filled={outcomes.length > 0}
            />
            {openSections.has('outcomes') && (
              <div className="pb-4 pl-7">
                <p className="text-[11px] text-gray-400 mb-3">
                  숫자가 포함되면 정량, 아니면 정성으로 자동 분류됩니다
                </p>

                {/* 기존 성과 목록 */}
                {outcomes.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {outcomes.map((outcome, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl group"
                      >
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full flex-shrink-0 mt-0.5 ${
                          outcome.type === 'quantitative'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {outcome.type === 'quantitative' ? '정량' : '정성'}
                        </span>
                        <p className="flex-1 text-sm text-gray-700">{outcome.content}</p>
                        <button
                          onClick={() => handleRemoveOutcome(idx)}
                          className="p-0.5 hover:bg-gray-200 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새 성과 추가 — 텍스트만 입력 */}
                <div className="flex gap-2">
                  <Input
                    value={newOutcomeContent}
                    onChange={(e) => setNewOutcomeContent(e.target.value)}
                    placeholder="예: MAU 200% 증가 / 고객 만족도 향상"
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
              </div>
            )}
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
