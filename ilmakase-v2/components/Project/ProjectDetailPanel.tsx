'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { WorkLog } from '@/lib/mappers'
import type { Project, Subtask, Memo } from '@/types'
import { calculateProgressFromSubtasks } from '@/hooks/useWorkLogs'
import DueDatePicker from '@/components/UI/DueDatePicker'
import DateMovePicker from '@/components/UI/DateMovePicker'
import { useToast } from '@/contexts/ToastContext'

interface ProjectDetailPanelProps {
  project: Project | null
  workLogs: WorkLog[]
  stats: { totalTasks: number; completedTasks: number; completionRate: number }
  onUpdateWorkLog: (id: string, updates: Partial<WorkLog>) => Promise<WorkLog>
  onDeleteWorkLog: (id: string) => Promise<void>
  onMoveWorkLog?: (wl: WorkLog, newDate: string) => Promise<void>
  onEditProject?: (project: Project) => void
  onCompleteProject?: (project: Project) => void
  onDeleteProject?: (project: Project) => void
  onBack?: () => void // 모바일용
}

// 마감일 뱃지 (D-day 카운트다운)
function getDueDateDisplay(dueDate: string, isCompleted: boolean): { label: string; className: string } | null {
  if (isCompleted) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const dateStr = `${due.getMonth() + 1}/${due.getDate()}`

  if (diffDays < 0) return { label: `D+${Math.abs(diffDays)} 지남(${dateStr})`, className: 'text-red-500 bg-red-50' }
  if (diffDays === 0) return { label: '오늘까지', className: 'text-amber-600 bg-amber-50' }
  if (diffDays === 1) return { label: `내일까지(${dateStr})`, className: 'text-amber-500 bg-amber-50' }
  if (diffDays <= 6) return { label: `D-${diffDays}(${dateStr})`, className: diffDays <= 3 ? 'text-amber-500 bg-amber-50' : 'text-gray-500 bg-gray-100' }
  return { label: `${dateStr}까지`, className: 'text-gray-500 bg-gray-100' }
}

// 메모/세부업무 날짜 포맷
function formatEntryDate(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  const label = `${date.getMonth() + 1}/${date.getDate()}`
  if (diff === 0) return `${label} · 오늘`
  if (diff === 1) return `${label} · 어제`
  return label
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
  onDeleteProject,
  onBack,
}: ProjectDetailPanelProps) {
  const { toast } = useToast()

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [addingMemoFor, setAddingMemoFor] = useState<string | null>(null)
  const [newMemoText, setNewMemoText] = useState('')
  const [editingMemoKey, setEditingMemoKey] = useState<string | null>(null)
  const [editMemoText, setEditMemoText] = useState('')
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set())
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // 낙관적 업데이트용 로컬 상태
  const [localWorkLogs, setLocalWorkLogs] = useState<WorkLog[]>(workLogs)

  // prop 변경 시 sync
  useEffect(() => {
    setLocalWorkLogs(workLogs)
  }, [workLogs])

  const projectName = project?.name || '미분류'

  // 날짜별 그룹핑 (최신순) — localWorkLogs 기반
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, WorkLog[]>()
    for (const wl of localWorkLogs) {
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
    // 낙관적 업데이트
    setLocalWorkLogs(prev => prev.map(w =>
      w.id === wl.id ? { ...w, isCompleted: newCompleted, progress: newProgress } : w
    ))
    try {
      await onUpdateWorkLog(wl.id, { isCompleted: newCompleted, progress: newProgress })
    } catch (err) {
      console.error('[handleToggleComplete]', err)
      setLocalWorkLogs(prev => prev.map(w => w.id === wl.id ? wl : w))
      toast.error('업데이트에 실패했습니다.')
    }
  }, [onUpdateWorkLog, toast])

  const handleProgressChange = useCallback(async (wl: WorkLog, progress: number) => {
    // 낙관적 업데이트
    setLocalWorkLogs(prev => prev.map(w =>
      w.id === wl.id ? { ...w, progress } : w
    ))
    try {
      await onUpdateWorkLog(wl.id, { progress })
    } catch (err) {
      console.error('[handleProgressChange]', err)
      setLocalWorkLogs(prev => prev.map(w => w.id === wl.id ? wl : w))
      toast.error('업데이트에 실패했습니다.')
    }
  }, [onUpdateWorkLog, toast])

  const handleAddMemo = useCallback(async (wl: WorkLog, content: string) => {
    if (!content.trim()) return
    const newMemo: Memo = {
      id: crypto.randomUUID(),
      content: content.trim(),
      created_at: wl.workDate,
    }
    const updatedMemos = [...(wl.memos || []), newMemo]
    setAddingMemoFor(null)
    setNewMemoText('')
    await onUpdateWorkLog(wl.id, { memos: updatedMemos })
  }, [onUpdateWorkLog])

  const handleDeleteMemo = useCallback(async (wl: WorkLog, memoId: string) => {
    const updatedMemos = (wl.memos || []).filter(m => m.id !== memoId)
    await onUpdateWorkLog(wl.id, {
      memos: updatedMemos.length > 0 ? updatedMemos : null,
    })
  }, [onUpdateWorkLog])

  const handleEditMemoSave = useCallback(async (wl: WorkLog, memoId: string, newContent: string) => {
    if (!newContent.trim()) return
    const updatedMemos = (wl.memos || []).map(m =>
      m.id === memoId ? { ...m, content: newContent.trim() } : m
    )
    setEditingMemoKey(null)
    setEditMemoText('')
    await onUpdateWorkLog(wl.id, { memos: updatedMemos })
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

  const handleEditSubtask = useCallback(async (wl: WorkLog, subtaskId: string, newContent: string) => {
    if (!wl.subtasks) return
    const trimmed = newContent.trim()
    if (!trimmed) return
    const updated = wl.subtasks.map(s =>
      s.id === subtaskId ? { ...s, content: trimmed } : s
    )
    await onUpdateWorkLog(wl.id, {
      subtasks: updated as unknown as Subtask[],
    })
  }, [onUpdateWorkLog])

  const handleDeleteWorkLog = useCallback(async (id: string) => {
    const prevLogs = localWorkLogs
    // 낙관적 업데이트
    setLocalWorkLogs(prev => prev.filter(w => w.id !== id))
    setConfirmDelete(null)
    try {
      await onDeleteWorkLog(id)
    } catch (err) {
      console.error('[handleDeleteWorkLog]', err)
      setLocalWorkLogs(prevLogs)
      toast.error('삭제에 실패했습니다.')
    }
  }, [onDeleteWorkLog, localWorkLogs, toast])

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
              {wl.memos && wl.memos.length > 0 && !isTaskExpanded && (
                <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  메모 {wl.memos.length}
                </span>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-gray-400 flex-shrink-0">진척도</span>
                  <div className="flex gap-1">
                    {[0, 25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => handleProgressChange(wl, pct)}
                        className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
                          wl.progress === pct
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">마감</span>
                <DueDatePicker
                  value={wl.dueDate || null}
                  onChange={(date) => handleSetDueDate(wl, date)}
                  compact
                />
              </div>
              {onMoveWorkLog && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">이동</span>
                  <DateMovePicker
                    currentDate={wl.workDate}
                    onMove={(date) => onMoveWorkLog(wl, date)}
                    compact
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
                  <div key={st.id} className="flex items-center gap-2.5 py-1.5 px-1.5 -mx-1.5 rounded-lg group/sub border border-transparent focus-within:border-primary-300 focus-within:bg-primary-50/30 transition-colors">
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
                    <input
                      type="text"
                      defaultValue={st.content}
                      onBlur={(e) => {
                        const val = e.target.value.trim()
                        if (val && val !== st.content) {
                          handleEditSubtask(wl, st.id, val)
                        } else {
                          e.target.value = st.content
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') {
                          (e.target as HTMLInputElement).value = st.content;
                          (e.target as HTMLInputElement).blur()
                        }
                      }}
                      className={`text-[13px] flex-1 bg-transparent outline-none px-0 py-0.5 ${
                        st.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'
                      }`}
                    />
                    {st.created_at && (
                      <span className="text-[10px] text-gray-300 flex-shrink-0">
                        {formatEntryDate(st.created_at)}
                      </span>
                    )}
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
              <span className="text-[11px] font-semibold text-gray-500 mb-2 block">메모</span>
              <div className="space-y-2">
                {(wl.memos || []).map(memo => {
                  const isExpanded = expandedMemos.has(memo.id)
                  const isLong = memo.content.length > 120 || memo.content.split('\n').length > 3
                  const memoKey = `${wl.id}:${memo.id}`
                  const isEditingThis = editingMemoKey === memoKey
                  return (
                    <div key={memo.id} className="group bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-gray-400">{formatEntryDate(memo.created_at)}</span>
                        {!isEditingThis && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingMemoKey(memoKey); setEditMemoText(memo.content) }}
                              className="text-[11px] text-gray-400 hover:text-primary-500"
                            >수정</button>
                            <button
                              onClick={() => handleDeleteMemo(wl, memo.id)}
                              className="text-[11px] text-gray-400 hover:text-red-500"
                            >삭제</button>
                          </div>
                        )}
                      </div>
                      {isEditingThis ? (
                        <div className="space-y-1.5">
                          <textarea
                            value={editMemoText}
                            onChange={e => setEditMemoText(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full text-[13px] p-2 border border-primary-300 rounded-lg resize-none outline-none bg-white"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button onClick={() => { setEditingMemoKey(null); setEditMemoText('') }} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">취소</button>
                            <button
                              onClick={() => handleEditMemoSave(wl, memo.id, editMemoText)}
                              disabled={!editMemoText.trim()}
                              className="text-xs text-white bg-primary-500 hover:bg-primary-600 px-2.5 py-1 rounded-lg disabled:opacity-50"
                            >저장</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className={`text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>
                            {memo.content}
                          </p>
                          {isLong && (
                            <button
                              onClick={() => setExpandedMemos(prev => {
                                const next = new Set(prev)
                                if (next.has(memo.id)) next.delete(memo.id); else next.add(memo.id)
                                return next
                              })}
                              className="text-[11px] text-primary-500 hover:text-primary-600 mt-1"
                            >
                              {isExpanded ? '접기' : '더 보기'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}

                {/* 새 메모 추가 */}
                {addingMemoFor === wl.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={newMemoText}
                      onChange={e => setNewMemoText(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder="메모를 입력하세요..."
                      className="w-full text-[13px] p-2.5 border border-gray-200 rounded-lg resize-none outline-none focus:border-primary-400 bg-white"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => { setAddingMemoFor(null); setNewMemoText('') }} className="text-xs text-gray-500 px-2 py-1">취소</button>
                      <button
                        onClick={() => handleAddMemo(wl, newMemoText)}
                        disabled={!newMemoText.trim()}
                        className="text-xs text-white bg-primary-500 hover:bg-primary-600 px-2.5 py-1 rounded-lg disabled:opacity-50"
                      >저장</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingMemoFor(wl.id)}
                    className="w-full py-1.5 text-[13px] text-gray-400 hover:text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    + 메모 추가
                  </button>
                )}
              </div>
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
            {onCompleteProject && (
              <button
                onClick={() => onCompleteProject(project)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors border border-gray-200 ${
                  project.status === '완료'
                    ? 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                    : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {project.status === '완료' ? '진행 중으로 변경' : '프로젝트 완료'}
              </button>
            )}
            {onDeleteProject && (
              <button
                onClick={() => onDeleteProject(project)}
                className="text-xs px-3 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
              >
                삭제
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
