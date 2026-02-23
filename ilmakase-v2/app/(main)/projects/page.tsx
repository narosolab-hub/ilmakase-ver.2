'use client'

import { useState, useEffect, Suspense } from 'react'
import { useProjects, type Project } from '@/hooks/useProjects'
import { useProjectWorkLogs } from '@/hooks/useProjectWorkLogs'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useIsMobile'
import { createClient } from '@/lib/supabase/client'
import { dataCache, cacheKeys } from '@/lib/cache'
import { parseAllTasks, formatProjectLine } from '@/lib/parser'
import type { WorkLog } from '@/lib/mappers'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, CardContent, Input, MobileBottomNav, DesktopTabs } from '@/components/UI'
import { ProjectDetailModal, ProjectDetailPanel } from '@/components/Project'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'

function ProjectsPageInner() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectParam = searchParams.get('project')
  const isMobile = useIsMobile()
  const isGuest = !user
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const {
    createProject,
    updateProject,
    deleteProject,
  } = useProjects()
  const {
    projectWorkLogs,
    loading,
    initialLoadDone,
    updateWorkLog,
    deleteWorkLog,
    reload,
  } = useProjectWorkLogs()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // URL query param으로 프로젝트 자동 선택 (/projects?project=이름)
  useEffect(() => {
    if (!projectParam || !initialLoadDone || selectedProjectId) return
    const group = projectWorkLogs.find(g => g.project?.name === projectParam)
    if (group?.project) setSelectedProjectId(group.project.id)
  }, [projectParam, initialLoadDone, projectWorkLogs, selectedProjectId])

  const requireLogin = async () => {
    if (isGuest) {
      const ok = await confirm({ message: '이 기능을 사용하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?', confirmLabel: '로그인' })
      if (ok) router.push('/login')
      return true
    }
    return false
  }

  const handleCreateProject = async () => {
    if (await requireLogin()) return
    if (!newProjectName.trim()) return
    try {
      setCreating(true)
      await createProject(newProjectName.trim())
      setNewProjectName('')
      setShowNewProject(false)
      reload()
    } catch (err) {
      console.error('프로젝트 생성 실패:', err)
      toast.error('프로젝트 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleProjectStatus = async (project: Project) => {
    const isCompleting = project.status !== '완료'
    const msg = isCompleting
      ? '이 프로젝트를 완료 처리하시겠습니까?'
      : '이 프로젝트를 진행 중으로 되돌리시겠습니까?'
    const ok = await confirm({ message: msg, variant: isCompleting ? 'default' : 'default', confirmLabel: isCompleting ? '완료 처리' : '진행 중으로 변경' })
    if (!ok) return
    try {
      await updateProject(project.id, {
        status: isCompleting ? '완료' : '진행중',
        end_date: isCompleting ? new Date().toISOString().split('T')[0] : null,
      })
      reload()
    } catch (err) {
      console.error('프로젝트 상태 변경 실패:', err)
    }
  }

  const handleDeleteProject = async (project: Project) => {
    const taskCount = projectWorkLogs.find(g => g.project?.id === project.id)?.workLogs.length || 0
    const msg = taskCount > 0
      ? `이 프로젝트에 업무 ${taskCount}개가 연결되어 있습니다.\n프로젝트만 삭제되고 업무 기록은 유지됩니다.\n삭제하시겠습니까?`
      : '이 프로젝트를 삭제하시겠습니까?'
    const ok = await confirm({ message: msg, variant: 'danger', confirmLabel: '삭제' })
    if (!ok) return
    try {
      await deleteProject(project.id)
      setSelectedProjectId(null)
      reload()
    } catch (err) {
      console.error('프로젝트 삭제 실패:', err)
    }
  }

  const handleSaveProject = async (updates: Partial<Project>) => {
    if (!editingProject) return
    await updateProject(editingProject.id, updates)
    reload()
  }

  const handleMoveWorkLog = async (wl: WorkLog, newDate: string) => {
    if (!user) return
    const supabase = createClient()
    const oldDate = wl.workDate

    // 1. work_log.work_date 업데이트
    await updateWorkLog(wl.id, { workDate: newDate })

    // 2. 원본 날짜 daily_log에서 줄 제거
    const { data: sourceLog } = await supabase
      .from('daily_logs').select('*')
      .eq('user_id', user.id).eq('log_date', oldDate).maybeSingle()
    if (sourceLog?.raw_content) {
      const parsed = parseAllTasks(sourceLog.raw_content)
      const match = parsed.find(t => t.content === wl.content)
      if (match !== undefined) {
        const lines = sourceLog.raw_content.split('\n')
        const newLines = lines.filter((_, i) => i !== match.lineIndex)
        await supabase.from('daily_logs')
          .update({ raw_content: newLines.join('\n') }).eq('id', sourceLog.id)
      }
    }

    // 3. 대상 날짜 daily_log에 줄 추가
    const taskLine = formatProjectLine(wl.keywords[0] || '미분류', wl.content)
    const { data: targetLog } = await supabase
      .from('daily_logs').select('*')
      .eq('user_id', user.id).eq('log_date', newDate).maybeSingle()
    if (targetLog) {
      const content = targetLog.raw_content
        ? targetLog.raw_content + '\n' + taskLine : taskLine
      await supabase.from('daily_logs')
        .update({ raw_content: content }).eq('id', targetLog.id)
    } else {
      await supabase.from('daily_logs')
        .insert({ user_id: user.id, log_date: newDate, raw_content: taskLine })
    }

    // 4. 캐시 무효화 + reload
    dataCache.invalidate(cacheKeys.workLogs(user.id, oldDate))
    dataCache.invalidate(cacheKeys.workLogs(user.id, newDate))
    dataCache.invalidate(cacheKeys.dailyLog(user.id, oldDate))
    dataCache.invalidate(cacheKeys.dailyLog(user.id, newDate))
    dataCache.invalidatePattern('incomplete')
    dataCache.invalidatePattern('weeklyStats')
    dataCache.invalidate(cacheKeys.projectWorkLogs(user.id))
    reload()
  }

  // 분류
  const withProject = projectWorkLogs.filter(g => g.project !== null)
  const activeData = withProject.filter(g => g.project!.status === '진행중')
  const completedData = withProject.filter(g => g.project!.status === '완료')
  const uncategorizedData = projectWorkLogs.filter(g => g.project === null)

  // 선택된 프로젝트 데이터
  const selectedData = selectedProjectId
    ? projectWorkLogs.find(g => {
        if (selectedProjectId === '__uncategorized__') return g.project === null
        return g.project?.id === selectedProjectId
      })
    : null

  // 자동 선택: 데이터 로드 후 첫 번째 프로젝트
  if (!selectedProjectId && !isMobile && projectWorkLogs.length > 0 && initialLoadDone) {
    const first = activeData[0] || completedData[0] || uncategorizedData[0]
    if (first) {
      const id = first.project?.id || '__uncategorized__'
      // state setter in render - use setTimeout
      setTimeout(() => setSelectedProjectId(id), 0)
    }
  }

  // 모바일: 프로젝트 선택 시 디테일 화면
  if (isMobile && selectedData) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ProjectDetailPanel
          project={selectedData.project}
          workLogs={selectedData.workLogs}
          stats={selectedData.stats}
          onUpdateWorkLog={updateWorkLog}
          onDeleteWorkLog={deleteWorkLog}
          onMoveWorkLog={handleMoveWorkLog}
          onEditProject={setEditingProject}
          onCompleteProject={handleToggleProjectStatus}
          onDeleteProject={handleDeleteProject}
          onBack={() => setSelectedProjectId(null)}
        />

        {editingProject && (
          <ProjectDetailModal
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onSave={handleSaveProject}
          />
        )}
      </div>
    )
  }

  // 프로젝트 리스트 아이템 렌더
  const renderProjectItem = (g: typeof projectWorkLogs[0]) => {
    const id = g.project?.id || '__uncategorized__'
    const isActive = selectedProjectId === id
    const name = g.project?.name || '미분류'
    const status = g.project?.status

    return (
      <button
        key={id}
        onClick={() => setSelectedProjectId(id)}
        className={`w-full text-left px-4 py-3 transition-colors ${
          isActive
            ? 'bg-primary-50 border-r-2 border-primary-500'
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium truncate ${isActive ? 'text-primary-700' : 'text-gray-800'}`}>
            {name}
          </span>
          {status === '완료' && (
            <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded flex-shrink-0 ml-2">
              완료
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isActive ? 'bg-primary-500' : 'bg-gray-300'}`}
              style={{ width: `${g.stats.completionRate}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {g.stats.completedTasks}/{g.stats.totalTasks}
          </span>
        </div>
      </button>
    )
  }

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
                <p className="text-xs text-gray-500">프로젝트</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isGuest && (
                <>
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
                </>
              )}
              <Button
                variant="outline"
                onClick={async () => {
                  if (await requireLogin()) return
                  setShowNewProject(true)
                }}
              >
                + 새 프로젝트
              </Button>
            </div>
          </div>

          <DesktopTabs />
        </div>
      </header>

      {/* 새 프로젝트 폼 */}
      {showNewProject && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-4">
          <Card>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="프로젝트 이름 (예: 도매 플랫폼 런칭)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  className="flex-1"
                />
                <Button onClick={handleCreateProject} loading={creating} disabled={!newProjectName.trim()}>
                  만들기
                </Button>
                <Button variant="ghost" onClick={() => { setShowNewProject(false); setNewProjectName('') }}>
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      {!initialLoadDone && loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : projectWorkLogs.length === 0 ? (
        <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20 lg:pb-6">
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-4xl mb-4">📁</div>
              <p className="text-gray-500 mb-4">
                아직 프로젝트가 없습니다.<br />
                데일리 로그에서 업무를 기록하면 프로젝트가 자동 생성됩니다.
              </p>
              <Button variant="primary" onClick={() => setShowNewProject(true)}>
                + 새 프로젝트 만들기
              </Button>
            </CardContent>
          </Card>
        </main>
      ) : (
        <>
          {/* 모바일: 프로젝트 리스트만 표시 */}
          {isMobile ? (
            <main className="pb-20">
              {/* 통계 */}
              <div className="px-4 py-3 text-xs text-gray-400 flex gap-3">
                <span>프로젝트 {withProject.length}개</span>
                <span>업무 {projectWorkLogs.reduce((s, g) => s + g.stats.totalTasks, 0)}개</span>
              </div>

              {activeData.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                    진행 중 ({activeData.length})
                  </div>
                  <div className="bg-white divide-y divide-gray-100">
                    {activeData.map(renderProjectItem)}
                  </div>
                </div>
              )}

              {completedData.length > 0 && (
                <div className="mt-2">
                  <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                    완료 ({completedData.length})
                  </div>
                  <div className="bg-white divide-y divide-gray-100">
                    {completedData.map(renderProjectItem)}
                  </div>
                </div>
              )}

              {uncategorizedData.length > 0 && (
                <div className="mt-2">
                  <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                    미분류
                  </div>
                  <div className="bg-white divide-y divide-gray-100">
                    {uncategorizedData.map(renderProjectItem)}
                  </div>
                </div>
              )}
            </main>
          ) : (
            /* 데스크톱: 마스터-디테일 */
            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
              <div className="flex gap-4 h-[calc(100vh-160px)]">
                {/* 왼쪽: 프로젝트 목록 */}
                <div className="w-1/3 min-w-[280px] max-w-[360px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  {/* 프로젝트 목록 헤더 */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500">
                      프로젝트 ({withProject.length})
                    </span>
                  </div>

                  {/* 스크롤 영역 */}
                  <div className="flex-1 overflow-y-auto">
                    {activeData.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                          진행 중
                        </div>
                        {activeData.map(renderProjectItem)}
                      </div>
                    )}

                    {completedData.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                          완료
                        </div>
                        {completedData.map(renderProjectItem)}
                      </div>
                    )}

                    {uncategorizedData.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                          미분류
                        </div>
                        {uncategorizedData.map(renderProjectItem)}
                      </div>
                    )}
                  </div>

                  {/* 새 프로젝트 버튼 */}
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => setShowNewProject(true)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      + 새 프로젝트
                    </button>
                  </div>
                </div>

                {/* 오른쪽: 업무 상세 */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {selectedData ? (
                    <ProjectDetailPanel
                      project={selectedData.project}
                      workLogs={selectedData.workLogs}
                      stats={selectedData.stats}
                      onUpdateWorkLog={updateWorkLog}
                      onDeleteWorkLog={deleteWorkLog}
                      onMoveWorkLog={handleMoveWorkLog}
                      onEditProject={setEditingProject}
                      onCompleteProject={handleToggleProjectStatus}
                      onDeleteProject={handleDeleteProject}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-3">📁</div>
                        <p className="text-sm">프로젝트를 선택하세요</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </main>
          )}
        </>
      )}

      {/* 프로젝트 상세 편집 모달 */}
      {editingProject && (
        <ProjectDetailModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveProject}
        />
      )}

      {/* 모바일: 하단 탭 */}
      <MobileBottomNav />
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  )
}
