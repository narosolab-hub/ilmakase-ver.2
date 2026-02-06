'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCompanies } from '@/hooks/useCompanies'
import { useProjects } from '@/hooks/useProjects'
import {
  CompanyStep,
  ProjectSelectStep,
  PriorityStep,
  ResultStep,
} from '@/components/CareerDoc'
import type { ProjectWithPriority } from '@/components/CareerDoc'
import type { Company } from '@/types'

type Step = 'company' | 'projects' | 'priority' | 'result'

export default function CareerDocPage() {
  const { user } = useAuth()
  const { companies, createCompany } = useCompanies()
  const { projects } = useProjects()

  const [currentStep, setCurrentStep] = useState<Step>('company')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [orderedProjects, setOrderedProjects] = useState<ProjectWithPriority[]>([])
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id))

  const handleAnalyzePriority = async (projectIds: string[]) => {
    const response = await fetch('/api/career-doc/analyze-priority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds }),
    })

    if (!response.ok) {
      throw new Error('분석 실패')
    }

    return response.json()
  }

  const handleGenerate = async (projects: ProjectWithPriority[]) => {
    if (!selectedCompany) return

    setOrderedProjects(projects)
    setCurrentStep('result')
    setIsGenerating(true)

    try {
      const response = await fetch('/api/career-doc/generate-by-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          projects: projects.map(p => ({
            projectId: p.project.id,
            priority: p.priority,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '생성 실패')
      }

      const data = await response.json()
      setGeneratedContent(data.content)
    } catch (err) {
      console.error('경력기술서 생성 실패:', err)
      alert(err instanceof Error ? err.message : '경력기술서 생성에 실패했습니다')
      setCurrentStep('priority')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = () => {
    handleGenerate(orderedProjects)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const stepLabels = {
    company: '회사 선택',
    projects: '프로젝트 선택',
    priority: '우선순위',
    result: '완성',
  }

  const steps: Step[] = ['company', 'projects', 'priority', 'result']
  const currentStepIndex = steps.indexOf(currentStep)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <a href="/projects" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="text-lg font-bold text-gray-900">경력기술서 생성</h1>
              <p className="text-xs text-gray-500">회사별 경력기술서를 AI가 작성해드려요</p>
            </div>
          </div>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                    index === currentStepIndex
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : index < currentStepIndex
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-4 text-center">{index + 1}</span>
                  )}
                  <span className="hidden sm:inline">{stepLabels[step]}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    index < currentStepIndex ? 'bg-emerald-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {currentStep === 'company' && (
          <CompanyStep
            companies={companies}
            selectedCompany={selectedCompany}
            onSelect={setSelectedCompany}
            onCreate={createCompany}
            onNext={() => setCurrentStep('projects')}
          />
        )}

        {currentStep === 'projects' && selectedCompany && (
          <ProjectSelectStep
            company={selectedCompany}
            projects={projects}
            selectedProjectIds={selectedProjectIds}
            onSelect={setSelectedProjectIds}
            onBack={() => setCurrentStep('company')}
            onNext={() => setCurrentStep('priority')}
          />
        )}

        {currentStep === 'priority' && selectedCompany && (
          <PriorityStep
            company={selectedCompany}
            projects={selectedProjects}
            onBack={() => setCurrentStep('projects')}
            onNext={handleGenerate}
            onAnalyze={handleAnalyzePriority}
          />
        )}

        {currentStep === 'result' && selectedCompany && (
          <ResultStep
            company={selectedCompany}
            generatedContent={generatedContent}
            isGenerating={isGenerating}
            onBack={() => setCurrentStep('priority')}
            onRegenerate={handleRegenerate}
          />
        )}
      </main>
    </div>
  )
}
