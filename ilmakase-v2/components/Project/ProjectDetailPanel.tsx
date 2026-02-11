'use client'

import { useState, useMemo, useCallback } from 'react'
import type { WorkLog } from '@/lib/mappers'
import type { Project, Subtask } from '@/types'
import { calculateProgressFromSubtasks } from '@/hooks/useWorkLogs'

interface ProjectDetailPanelProps {
  project: Project | null
  workLogs: WorkLog[]
  stats: { totalTasks: number; completedTasks: number; completionRate: number }
  onUpdateWorkLog: (id: string, updates: Partial<WorkLog>) => Promise<WorkLog>
  onDeleteWorkLog: (id: string) => Promise<void>
  onMoveWorkLog?: (wl: WorkLog, newDate: string) => Promise<void>
  onEditProject?: (project: Project) => void
  onCompleteProject?: (project: Project) => void
  onBack?: () => void // 모바일용
}

// 마감일 뱃지
function getDueDateDisplay(dueDate: string, isCompleted: boolean): { label: string; className: string } | null {
  if (isCompleted) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: '지남', className: 'text-red-500 bg-red-50' }
  if (diffDays === 0) return { label: '오늘까지', className: 'text-amber-600 bg-amber-50' }
  const month = due.getMonth() + 1
  const day = due.getDate()
  return { label: `${month}/${day}까지`, className: 'text-gray-500 bg-gray-100' }
}

// 날짜 포맷
function formatDateLabel(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[date.getDay()]

  if (diffDays === 0) return `${month}/${day} (${weekday}) · 오늘`
  if (diffDays === 1) return `${month}/${day} (${weekday}) · 어제`
  return `${month}/${day} (${weekday})`
}

export default function ProjectDetailPanel({
  project,
  workLogs,
  stats,
  onUpdateWorkLog,
  onDeleteWorkLog,
  onMoveWorkLog,
  onEditProject,
  onCompleteProject,
  onBack,
}: ProjectDetailPanelProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [editingMemo, setEditingMemo] = useState<string | null>(null)
  const [memoText, setMemoText] = useState('')
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const projectName = project?.name || '미분류'

  // 날짜별 그룹핑 (최신순)
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, WorkLog[]>()
    for (const wl of workLogs) {
      const date = wl.workDate
      if (!groups.has(date)) groups.set(date, [])
      groups.get(date)!.push(wl)
    }
    // 최신 날짜순 정렬
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [workLogs])

  const toggleTask = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleComplete = useCallback(async (wl: WorkLog) => {
    const newCompleted = !wl.isCompleted
    const newProgress = calculateProgressFromSubtasks(
      wl.subtasks, newCompleted, newCompleted ? 100 : wl.progress
    )
    await onUpdateWorkLog(wl.id, { isCompleted: newCompleted, progress: newProgress })
  }, [onUpdateWorkLog])

  const handleProgressChange = useCallback(async (wl: WorkLog, progress: number) => {
    await onUpdateWorkLog(wl.id, { progress })
  }, [onUpdateWorkLog])

  const handleSaveMemo = useCallback(async (wl: WorkLog) => {
    await onUpdateWorkLog(wl.id, { detail: memoText || null })
    setEditingMemo(null)
  }, [onUpdateWorkLog, memoText])

  const handleDeleteMemo = useCallback(async (wl: WorkLog) => {
    await onUpdateWorkLog(wl.id, { detail: null })
    setEditingMemo(null)
    setMemoText('')
  }, [onUpdateWorkLog])

  const handleSetDueDate = useCallback(async (wl: WorkLog, dueDate: string | null) => {
    await onUpdateWorkLog(wl.id, { dueDate })
  }, [onUpdateWorkLog])

  const handleToggleSubtask = useCallback(async (wl: WorkLog, subtaskId: string) => {
    if (!wl.subtasks) return
    const updated = wl.subtasks.map(s =>
      s.id === subtaskId ? { ...s, is_completed: !s.is_completed } : s
    )
    const newProgress = calculateProgressFromSubtasks(updated, wl.isCompleted)
    await onUpdateWorkLog(wl.id, {
      subtasks: updated as unknown as Subtask[],
      progress: newProgress,
    })
  }, [onUpdateWorkLog])

  const handleAddSubtask = useCallback(async (wl: WorkLog) => {
    const text = newSubtaskText[wl.id]?.trim()
    if (!text) return
    const newSubtask: Subtask = { id: crypto.randomUUID(), content: text, is_completed: false }
    const updated = [...(wl.subtasks || []), newSubtask]
    const newProgress = calculateProgressFromSubtasks(updated, wl.isCompleted)
    await onUpdateWorkLog(wl.id, {
      subtasks: updated as unknown as Subtask[],
      progress: newProgress,
    })
    setNewSubtaskText(prev => ({ ...prev, [wl.id]: '' }))
  }, [onUpdateWorkLog, newSubtaskText])

  const handleDeleteSubtask = useCallback(async (wl: WorkLog, subtaskId: string) => {
    if (!wl.subtasks) return
    const updated = wl.subtasks.filter(s => s.id !== subtaskId)
    const newProgress = calculateProgressFromSubtasks(
      updated.length > 0 ? updated : null, wl.isCompleted, wl.progress
    )
    await onUpdateWorkLog(wl.id, {
      subtasks: updated.length > 0 ? updated as unknown as Subtask[] : null,
      progress: newProgress,
    })
  }, [onUpdateWorkLog])

  const handleDeleteWorkLog = useCallback(async (id: string) => {
    await onDeleteWorkLog(id)
    setConfirmDelete(null)
  }, [onDeleteWorkLog])

  // 업무 카드 렌더링
  const renderTaskCard = (wl: WorkLog) => {
    const isTaskExpanded = expandedTasks.has(wl.id)
    const hasSubtasks = wl.subtasks && wl.subtasks.length > 0
    const dueDateDisplay = wl.dueDate ? getDueDateDisplay(wl.dueDate, wl.isCompleted) : null
    const subtasksDone = hasSubtasks ? wl.subtasks!.filter(s => s.is_completed).length : 0
    const subtasksTotal = hasSubtasks ? wl.subtasks!.length : 0

    return (
      <div
        key={wl.id}
        className={`rounded-xl border transition-all ${
          isTaskExpanded
            ? 'border-primary-200 bg-white shadow-sm'
            : 'border-transparent hover:bg-gray-50'
        }`}
      >
        {/* 업무 헤더 */}
        <div className="flex items-start gap-2.5 px-3 py-2.5">
          {/* 체크박스 */}
          <button
            onClick={() => handleToggleComplete(wl)}
            className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              wl.isCompleted
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'border-gray-300 hover:border-primary-400'
            }`}
          >
            {wl.isCompleted && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* 내용 영역 */}
          <div className="flex-1 min-w-0">
            <button
              onClick={() => toggleTask(wl.id)}
              className="w-full text-left"
            >
              <span className={`text-sm leading-relaxed ${wl.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'}`}>
                {wl.content}
              </span>
            </button>

            {/* 뱃지들 */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {!wl.isCompleted && wl.progress > 0 && (
                <span className="text-[11px] text-primary-500 font-medium bg-primary-50 px-1.5 py-0.5 rounded">
                  {wl.progress}%
                </span>
              )}
              {hasSubtasks && (
                <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                  세부 {subtasksDone}/{subtasksTotal}
                </span>
              )}
              {dueDateDisplay && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${dueDateDisplay.className}`}>
                  {dueDateDisplay.label}
                </span>
              )}
              {wl.detail && !isTaskExpanded && (
                <span className="text-[11px] text-gray-300">📝</span>
              )}
            </div>
          </div>

          {/* 펼침 버튼 */}
          <button
            onClick={() => toggleTask(wl.id)}
            className="mt-1 text-gray-300 hover:text-gray-500 flex-shrink-0"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isTaskExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 상세 영역 */}
        {isTaskExpanded && (
          <div className="px-3 pb-3 space-y-2.5">
            {/* 구분선 */}
            <div className="border-t border-gray-100 pt-2.5" />

            {/* 진척도 + 마감일 - 한 줄 */}
            <div className="flex items-center gap-4 flex-wrap">
              {!hasSubtasks && (
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <span className="text-[11px] text-gray-400 flex-shrink-0">진척도</span>
                  <input
                    type="range" min="0" max="100" step="10"
                    value={wl.progress}
                    onChange={e => handleProgressChange(wl, Number(e.target.value))}
                    className="flex-1 h-1.5 accent-primary-500"
                  />
                  <span className="text-[11px] text-gray-500 w-7 text-right">{wl.progress}%</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">마감</span>
                <input
                  type="date"
                  value={wl.dueDate || ''}
                  onChange={e => handleSetDueDate(wl, e.target.value || null)}
                  className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                />
                {wl.dueDate && (
                  <button onClick={() => handleSetDueDate(wl, null)} className="text-[11px] text-gray-400 hover:text-red-400">
                    해제
                  </button>
                )}
              </div>
              {onMoveWorkLog && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">이동</span>
                  <input
                    type="date"
                    value=""
                    onChange={e => {
                      if (e.target.value && e.target.value !== wl.workDate) {
                        onMoveWorkLog(wl, e.target.value)
                      }
                    }}
                    className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-600"
                  />
                </div>
              )}
            </div>

            {/* 세부 업무 — 별도 카드 */}
            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
                <span className="text-[11px] font-semibold text-gray-500">세부 업무</span>
                {hasSubtasks && (
                  <span className="text-[10px] text-gray-400">
                    {subtasksDone}/{subtasksTotal} 완료
                  </span>
                )}
              </div>
              <div className="px-3 py-1.5">
                {wl.subtasks?.map(st => (
                  <div key={st.id} className="flex items-center gap-2.5 py-1.5 group/sub border-b border-gray-100/50 last:border-0">
                    <button
                      onClick={() => handleToggleSubtask(wl, st.id)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        st.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'
                      }`}
                    >
                      {st.is_completed && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`text-[13px] flex-1 ${st.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {st.content}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(wl, st.id)}
                      className="text-gray-300 hover:text-red-400 opacity-0 group-hover/sub:opacity-100 text-xs p-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {/* 세부 업무 추가 */}
                <div className="flex items-center gap-2 py-1.5">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-300 text-sm">+</span>
                  </div>
                  <input
                    type="text"
                    value={newSubtaskText[wl.id] || ''}
                    onChange={e => setNewSubtaskText(prev => ({ ...prev, [wl.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(wl) } }}
                    placeholder="세부 업무 추가..."
                    className="flex-1 text-[13px] bg-transparent placeholder-gray-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 메모 */}
            <div>
              <span className="text-[11px] font-semibold text-gray-500 mb-1 block">메모</span>
              {editingMemo === wl.id ? (
                <div className="space-y-1.5">
                  <textarea
                    value={memoText}
                    onChange={e => setMemoText(e.target.value)}
                    rows={3}
                    className="w-full text-[13px] p-2.5 border border-gray-200 rounded-lg resize-none focus:border-primary-400 focus:outline-none bg-white"
                    placeholder="메모를 입력하세요"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button onClick={() => handleSaveMemo(wl)} className="text-xs px-2.5 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600">저장</button>
                    <button onClick={() => setEditingMemo(null)} className="text-xs px-2.5 py-1 text-gray-500 hover:text-gray-700">취소</button>
                    {wl.detail && (
                      <button onClick={() => handleDeleteMemo(wl)} className="text-xs px-2.5 py-1 text-red-400 hover:text-red-500 ml-auto">삭제</button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingMemo(wl.id); setMemoText(wl.detail || '') }}
                  className="w-full text-left"
                >
                  {wl.detail ? (
                    <p className="text-[13px] text-gray-600 whitespace-pre-wrap bg-gray-50 border border-gray-100 p-2.5 rounded-lg leading-relaxed">{wl.detail}</p>
                  ) : (
                    <p className="text-[13px] text-gray-300 hover:text-gray-400 py-1">+ 메모 추가</p>
                  )}
                </button>
              )}
            </div>

            {/* 삭제 */}
            <div className="flex justify-end pt-1">
              {confirmDelete === wl.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">정말 삭제할까요?</span>
                  <button onClick={() => handleDeleteWorkLog(wl.id)} className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-lg">삭제</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400">취소</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(wl.id)} className="text-xs text-gray-300 hover:text-red-400">삭제</button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 프로젝트 헤더 */}
      <div className="flex-shrink-0 p-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition lg:hidden">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 truncate">{projectName}</h2>
              {project?.status === '완료' && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0">완료</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500">
                {stats.completedTasks}/{stats.totalTasks} 완료
              </span>
              <div className="flex-1 max-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
              <span className="text-sm font-medium text-primary-600">{stats.completionRate}%</span>
            </div>
          </div>
        </div>

        {/* 프로젝트 액션 */}
        {project && (
          <div className="flex gap-2">
            {onEditProject && (
              <button
                onClick={() => onEditProject(project)}
                className="text-xs px-3 py-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-gray-200"
              >
                상세 정보 편집
              </button>
            )}
            {onCompleteProject && project.status !== '완료' && (
              <button
                onClick={() => onCompleteProject(project)}
                className="text-xs px-3 py-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200"
              >
                프로젝트 완료
              </button>
            )}
          </div>
        )}
      </div>

      {/* 업무 목록 (날짜별) */}
      <div className="flex-1 overflow-y-auto">
        {workLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm">등록된 업무가 없습니다</p>
            <p className="text-xs mt-1">데일리 로그에서 업무를 기록하면 여기에 표시돼요</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupedByDate.map(([date, logs]) => (
              <div key={date} className="px-5 py-4">
                {/* 날짜 헤더 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-400">{formatDateLabel(date)}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] text-gray-300">
                    {logs.filter(l => l.isCompleted).length}/{logs.length}
                  </span>
                </div>

                {/* 업무 카드들 */}
                <div className="space-y-2">
                  {logs.map(wl => renderTaskCard(wl))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
