'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCompanies } from '@/hooks/useCompanies'
import { useProjects } from '@/hooks/useProjects'
import { useCareerDocs } from '@/hooks/useCareerDocs'
import { useRouter } from 'next/navigation'
import { MobileBottomNav, DesktopTabs, Button } from '@/components/UI'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import {
  CompanyStep,
  ProjectSelectStep,
  PriorityStep,
  ResultStep,
  SavedDocCard,
  DocViewModal,
} from '@/components/CareerDoc'
import type { ProjectWithPriority } from '@/components/CareerDoc'
import type { Company } from '@/types'
import type { CareerDocumentMapped } from '@/lib/mappers'

type Mode = 'landing' | 'wizard'
type Step = 'company' | 'projects' | 'priority' | 'result'

export default function CareerDocPage() {
  const { user } = useAuth()
  const router = useRouter()
  const isGuest = !user
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { companies, createCompany } = useCompanies()
  const { projects } = useProjects()
  const { careerDocs, loading: docsLoading, saveCareerDoc, updateCareerDoc, deleteCareerDoc } = useCareerDocs()

  // 모드 관리
  const [mode, setMode] = useState<Mode>('landing')

  // 위저드 상태
  const [currentStep, setCurrentStep] = useState<Step>('company')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [orderedProjects, setOrderedProjects] = useState<ProjectWithPriority[]>([])
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // 문서 보기 모달
  const [viewingDoc, setViewingDoc] = useState<CareerDocumentMapped | null>(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<CareerDocumentMapped | null>(null)

  const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id))

  // 위저드 시작
  const startWizard = async () => {
    if (isGuest) {
      const ok = await confirm({ message: '경력기술서를 생성하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?', confirmLabel: '로그인' })
      if (ok) router.push('/login')
      return
    }
    setMode('wizard')
    setCurrentStep('company')
    setSelectedCompany(null)
    setSelectedProjectIds([])
    setOrderedProjects([])
    setGeneratedContent('')
  }

  // 위저드 종료 → 랜딩으로 복귀
  const exitWizard = () => {
    setMode('landing')
  }

  const handleAnalyzePriority = async (projectIds: string[]) => {
    const response = await fetch('/api/career-doc/analyze-priority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds }),
    })
    if (!response.ok) throw new Error('분석 실패')
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
      toast.error(err instanceof Error ? err.message : '경력기술서 생성에 실패했습니다')
      setCurrentStep('priority')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = () => {
    handleGenerate(orderedProjects)
  }

  // 생성된 문서 자동 저장
  const handleSaveGenerated = async (content: string) => {
    if (!selectedCompany) return

    await saveCareerDoc({
      companyId: selectedCompany.id,
      title: selectedCompany.name,
      content,
      projectIds: orderedProjects.map(p => p.project.id),
      priorityConfig: orderedProjects.map(p => ({
        projectId: p.project.id,
        priority: p.priority,
      })),
      periodStart: selectedCompany.start_date,
      periodEnd: selectedCompany.is_current ? null : selectedCompany.end_date,
      role: selectedCompany.position,
    })
  }

  // 문서 삭제
  const handleDeleteDoc = async (doc: CareerDocumentMapped) => {
    setConfirmDeleteDoc(doc)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteDoc) return
    try {
      await deleteCareerDoc(confirmDeleteDoc.id)
      setConfirmDeleteDoc(null)
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  // 문서 모달에서 저장
  const handleUpdateDoc = async (id: string, updates: { content: string }) => {
    await updateCareerDoc(id, updates)
  }

  // 문서 모달에서 삭제
  const handleDeleteFromModal = async (id: string) => {
    await deleteCareerDoc(id)
  }

  // 위저드 모드
  if (mode === 'wizard') {
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
        {/* 위저드 헤더 */}
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={exitWizard} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
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

        {/* 위저드 컨텐츠 */}
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
              onSave={handleSaveGenerated}
            />
          )}
        </main>
      </div>
    )
  }

  // 랜딩 모드
  // 회사별로 문서 그룹핑
  const companyMap = new Map(companies.map(c => [c.id, c]))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">🍊</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">일마카세</h1>
                <p className="text-xs text-gray-500">경력기술서</p>
              </div>
            </div>

            {isGuest && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  로그인
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors shadow-sm"
                >
                  시작하기
                </button>
              </div>
            )}
          </div>

          <DesktopTabs />
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 lg:px-6 py-6 pb-20 lg:pb-6">
        {/* 히어로 */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-xl font-bold mb-2">경력기술서</h2>
          <p className="text-sm text-white/80 mb-4">
            업무 기록을 바탕으로 AI가 경력기술서를 작성해드려요
          </p>
          <button
            onClick={startWizard}
            className="px-5 py-2.5 bg-white text-primary-600 font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            새 경력기술서 생성하기
          </button>
        </div>

        {/* 저장된 경력기술서 목록 */}
        {docsLoading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : careerDocs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📄</div>
            <p className="text-gray-500 mb-2">아직 생성된 경력기술서가 없어요</p>
            <p className="text-sm text-gray-400">위의 버튼을 눌러 첫 경력기술서를 만들어보세요!</p>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3">
              저장된 경력기술서 ({careerDocs.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {careerDocs.map(doc => (
                <SavedDocCard
                  key={doc.id}
                  doc={doc}
                  company={doc.companyId ? companyMap.get(doc.companyId) : undefined}
                  onView={setViewingDoc}
                  onDelete={handleDeleteDoc}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 문서 보기/편집 모달 */}
      {viewingDoc && (
        <DocViewModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onSave={handleUpdateDoc}
          onDelete={handleDeleteFromModal}
        />
      )}

      {/* 삭제 확인 */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteDoc(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">경력기술서 삭제</h3>
            <p className="text-sm text-gray-600 mb-4">
              &quot;{confirmDeleteDoc.title}&quot; 경력기술서를 삭제할까요?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setConfirmDeleteDoc(null)}>
                취소
              </Button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모바일: 하단 탭 */}
      <MobileBottomNav />
    </div>
  )
}
