'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { parseAllTasks, formatProjectLine } from '@/lib/parser'
import { ParsedTask, Subtask, Memo, ThinkingAnswers } from '@/types'
import { useDailyLog } from '@/hooks/useDailyLog'
import { useWorkLogs, calculateProgressFromSubtasks } from '@/hooks/useWorkLogs'
import { useCarryOver, IncompleteTaskData } from '@/hooks/useCarryOver'
import { useBacklog } from '@/hooks/useBacklog'
import type { WorkLog } from '@/lib/mappers'
import { useProjects } from '@/hooks/useProjects'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { dataCache, cacheKeys } from '@/lib/cache'
import { Button } from '@/components/UI'
import DueDatePicker from '@/components/UI/DueDatePicker'
import DateMovePicker from '@/components/UI/DateMovePicker'
import MobileQuickInput from './MobileQuickInput'
import MobileFullEditor from './MobileFullEditor'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'

const GUEST_DRAFT_KEY = 'ilmakase_guest_draft'

interface DailyLogEditorProps {
  targetDate: string
  onSave?: () => void
}

interface TaskWithDB extends ParsedTask {
  workLogId?: string
  detail?: string | null
  dueDate?: string | null
  subtasks?: Subtask[] | null
  memos?: Memo[] | null
  thinkingAnswers?: ThinkingAnswers | null
}

interface LocalTaskStatus {
  progress: number
  isCompleted: boolean
  detail?: string | null
  dueDate?: string | null
  subtasks?: Subtask[] | null
  memos?: Memo[] | null
}

// 마감일 뱃지 표시용 헬퍼 (D-day 카운트다운)
function getDueDateDisplay(dueDate: string, isCompleted: boolean): { label: string; className: string } | null {
  if (isCompleted) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const dateStr = `${due.getMonth() + 1}/${due.getDate()}`

  if (diffDays < 0) {
    return { label: `D+${Math.abs(diffDays)} 지남(${dateStr})`, className: 'text-red-500' }
  }
  if (diffDays === 0) {
    return { label: '오늘까지', className: 'text-amber-600' }
  }
  if (diffDays === 1) {
    return { label: `내일까지(${dateStr})`, className: 'text-amber-500' }
  }
  if (diffDays <= 6) {
    return { label: `D-${diffDays}(${dateStr})`, className: diffDays <= 3 ? 'text-amber-400' : 'text-gray-400' }
  }
  return { label: `${dateStr}까지`, className: 'text-gray-400' }
}

// 메모/세부업무 날짜 포맷 (M/D · 오늘/어제)
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

// 백로그 날짜 포맷 (YY.MM.DD(요일))
function formatBacklogDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const day = days[date.getDay()]
  return `${yy}.${mm}.${dd}(${day})`
}

// 사고 체크리스트 질문
const THINKING_CHECKLIST = [
  { id: 'why', icon: '🎯', question: '왜 해야 하지?', full: '이 업무의 목적과 배경은?' },
  { id: 'who', icon: '👤', question: '누가 보지?', full: '결과물을 받을 사람은?' },
  { id: 'done', icon: '✅', question: '언제 끝이지?', full: '완료 기준이 명확한가?' },
  { id: 'need', icon: '🔗', question: '뭐가 필요하지?', full: '누구한테 뭘 받아야 하지?' },
  { id: 'risk', icon: '⚠️', question: '늦으면?', full: '지연되면 어떤 영향이?' },
]

export default function DailyLogEditor({ targetDate, onSave }: DailyLogEditorProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { log, loading, saveLog } = useDailyLog(targetDate)
  const { workLogs, syncFromParsedTasks, updateWorkLog, deleteWorkLog } = useWorkLogs(targetDate)
  const { getIncompleteTasks, invalidateCache, carryingOver, moveToBacklog } = useCarryOver()
  const backlog = useBacklog()
  const { findProjectByName, createProject } = useProjects()
  const isMobile = useIsMobile()
  const isGuest = !user

  const [text, setText] = useState('')
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [incompleteTasks, setIncompleteTasks] = useState<IncompleteTaskData[]>([])
  const [showIncomplete, setShowIncomplete] = useState(false)
  const [showBacklogSheet, setShowBacklogSheet] = useState(false)
  const [backlogInput, setBacklogInput] = useState('')
  const [addingBacklog, setAddingBacklog] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [fullEditorOpen, setFullEditorOpen] = useState(false)
  const [thinkingDraft, setThinkingDraft] = useState<Partial<ThinkingAnswers>>({})
  const [savingThinking, setSavingThinking] = useState(false)

  // 메모 상태 (기존 단일 메모 → 메모 목록)
  const [addingMemoFor, setAddingMemoFor] = useState<string | null>(null)   // workLogId
  const [newMemoText, setNewMemoText] = useState('')
  const [editingMemoKey, setEditingMemoKey] = useState<string | null>(null)  // `${workLogId}:${memoId}`
  const [editMemoText, setEditMemoText] = useState('')
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set())

  // 세부 업무 추가 상태
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)
  const [newSubtaskText, setNewSubtaskText] = useState('')

  // 프로젝트 그룹 접기/펼치기 상태
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [expandedCompletedGroups, setExpandedCompletedGroups] = useState<Set<string>>(new Set())

  const localStatusCache = useRef<Map<string, LocalTaskStatus>>(new Map())
  const [cacheVersion, setCacheVersion] = useState(0)

  // 이미 추가한 미완료 업무 content 추적 (useEffect 재실행 시 필터용)
  const dismissedIncompleteRef = useRef<Set<string>>(new Set())

  // 로컬 캐시 업데이트 헬퍼 함수
  const updateLocalCache = (cacheKey: string, status: LocalTaskStatus) => {
    localStatusCache.current.set(cacheKey, status)
    setCacheVersion(v => v + 1)
  }

  const deleteLocalCache = (cacheKey: string) => {
    localStatusCache.current.delete(cacheKey)
    setCacheVersion(v => v + 1)
  }

  // 날짜 변경 시 모든 상태 초기화 + 텍스트 설정
  const lastLoadedRef = useRef<{ date: string; logId: string | null } | null>(null)

  useEffect(() => {
    // 날짜가 바뀌면 상태 초기화
    if (lastLoadedRef.current?.date !== targetDate) {
      localStatusCache.current.clear()
      dismissedIncompleteRef.current.clear()
      setHasUnsavedChanges(false)
      setAddingMemoFor(null)
      setEditingMemoKey(null)
      setIncompleteTasks([])
    }
  }, [targetDate])

  // 로그 로딩 완료 시 텍스트 설정
  useEffect(() => {
    if (loading) return

    const currentLogId = log?.id ?? null
    const lastLoaded = lastLoadedRef.current

    // 같은 날짜의 같은 로그면 스킵 (타이핑 중 덮어쓰기 방지)
    if (lastLoaded?.date === targetDate && lastLoaded?.logId === currentLogId) {
      return
    }

    lastLoadedRef.current = { date: targetDate, logId: currentLogId }
    setText(log?.raw_content || '')
    setInitialLoadDone(true)
  }, [log, loading, targetDate])

  // 게스트 모드: localStorage 드래프트 복원
  const postLoginSaveRef = useRef(false)
  useEffect(() => {
    if (isGuest && !loading) {
      try {
        const raw = localStorage.getItem(GUEST_DRAFT_KEY)
        if (raw) {
          const draft = JSON.parse(raw)
          if (draft.text) {
            setText(draft.text)
            setInitialLoadDone(true)
          }
        }
      } catch { /* ignore */ }
    }
  }, [isGuest, loading])

  // 포스트 로그인: 게스트 드래프트가 있으면 자동 저장
  useEffect(() => {
    if (user && !postLoginSaveRef.current) {
      try {
        const raw = localStorage.getItem(GUEST_DRAFT_KEY)
        if (raw) {
          const draft = JSON.parse(raw)
          if (draft.text) {
            postLoginSaveRef.current = true
            setText(draft.text)
            // 약간의 지연 후 저장 (훅 초기화 대기)
            setTimeout(() => {
              saveWithText(draft.text).then(() => {
                localStorage.removeItem(GUEST_DRAFT_KEY)
              })
            }, 500)
          }
        }
      } catch { /* ignore */ }
    }
  }, [user])

  // 미완료 업무 로딩 (병렬 실행)
  useEffect(() => {
    if (!loading) {
      getIncompleteTasks(targetDate).then(tasks => {
        // 이미 추가(dismiss)한 항목은 제외
        const dismissed = dismissedIncompleteRef.current
        const filtered = dismissed.size > 0
          ? tasks.filter(t => !dismissed.has(t.content))
          : tasks
        setIncompleteTasks(filtered)
      })
    }
  }, [loading, targetDate, getIncompleteTasks])

  useEffect(() => {
    const tasks = parseAllTasks(text)
    setParsedTasks(tasks)
  }, [text])

  // 선택된 업무 변경 시 사고 체크리스트 답변 로드
  useEffect(() => {
    if (selectedTask === null) {
      setThinkingDraft({})
      return
    }
    const task = tasksWithDBStatus.find(t => t.lineIndex === selectedTask)
    setThinkingDraft(task?.thinkingAnswers ?? {})
  }, [selectedTask]) // eslint-disable-line react-hooks/exhaustive-deps

  const tasksWithDBStatus: TaskWithDB[] = useMemo(() => {
    void cacheVersion

    const normalize = (s: string) => s.replace(/\s+/g, '')

    return parsedTasks.map(task => {
      const cacheKey = `${task.project_name}:${task.content}`
      const cachedStatus = localStatusCache.current.get(cacheKey)

      // 정확 매치 → 공백 제거 매치 → 포함 매치
      const matchingLog = workLogs.find(
        wl => wl.content === task.content && wl.keywords?.includes(task.project_name)
      ) || workLogs.find(
        wl => wl.keywords?.includes(task.project_name) &&
              normalize(wl.content) === normalize(task.content)
      )

      if (matchingLog) {
        const subtasks = cachedStatus?.subtasks ?? matchingLog.subtasks
        const isCompleted = cachedStatus?.isCompleted ?? matchingLog.isCompleted
        // 세부 업무가 있으면 자동 계산, 없으면 기존 진척도
        const progress = subtasks && subtasks.length > 0
          ? calculateProgressFromSubtasks(subtasks, isCompleted)
          : (cachedStatus?.progress ?? matchingLog.progress)

        return {
          ...task,
          workLogId: matchingLog.id,
          progress,
          isCompleted,
          detail: cachedStatus?.detail ?? matchingLog.detail,
          dueDate: cachedStatus?.dueDate !== undefined ? cachedStatus.dueDate : matchingLog.dueDate,
          subtasks,
          memos: cachedStatus?.memos !== undefined ? cachedStatus.memos : matchingLog.memos,
          thinkingAnswers: matchingLog.thinkingAnswers,
        }
      }

      if (cachedStatus) {
        const progress = cachedStatus.subtasks && cachedStatus.subtasks.length > 0
          ? calculateProgressFromSubtasks(cachedStatus.subtasks, cachedStatus.isCompleted)
          : cachedStatus.progress
        return {
          ...task,
          progress,
          isCompleted: cachedStatus.isCompleted,
          detail: cachedStatus.detail,
          dueDate: cachedStatus.dueDate,
          subtasks: cachedStatus.subtasks,
          memos: cachedStatus.memos,
        }
      }

      return task
    })
  }, [parsedTasks, workLogs, cacheVersion])

  const handleCheckboxToggle = async (task: TaskWithDB) => {
    const cacheKey = `${task.project_name}:${task.content}`
    const prevStatus = localStatusCache.current.get(cacheKey)
    const newCompleted = !task.isCompleted
    // 세부 업무가 있으면 자동 계산, 없으면 기존 로직
    const newProgress = task.subtasks && task.subtasks.length > 0
      ? calculateProgressFromSubtasks(task.subtasks, newCompleted)
      : (newCompleted ? 100 : 0)

    updateLocalCache(cacheKey, {
      progress: newProgress,
      isCompleted: newCompleted,
      detail: task.detail,
      dueDate: task.dueDate,
      subtasks: task.subtasks,
      memos: task.memos,
    })

    if (!task.workLogId) {
      await saveWithText(text)
      return
    }

    try {
      await updateWorkLog(task.workLogId, {
        isCompleted: newCompleted,
        progress: newProgress,
      })
      invalidateCache() // 미완료 업무 캐시 무효화
      onSave?.()
    } catch (err) {
      console.error('[handleCheckboxToggle]', err)
      if (prevStatus) updateLocalCache(cacheKey, prevStatus)
      else deleteLocalCache(cacheKey)
      toast.error('업데이트에 실패했습니다.')
    }
  }

  const handleProgressChange = async (task: TaskWithDB, newProgress: number) => {
    if (task.subtasks && task.subtasks.length > 0) return

    const cacheKey = `${task.project_name}:${task.content}`
    const prevStatus = localStatusCache.current.get(cacheKey)
    const newCompleted = newProgress >= 100

    updateLocalCache(cacheKey, {
      progress: newProgress,
      isCompleted: newCompleted,
      detail: task.detail,
      dueDate: task.dueDate,
      subtasks: task.subtasks,
      memos: task.memos,
    })

    if (!task.workLogId) {
      await saveWithText(text)
      return
    }

    try {
      await updateWorkLog(task.workLogId, {
        progress: newProgress,
        isCompleted: newCompleted,
      })
      invalidateCache() // 미완료 업무 캐시 무효화
      onSave?.()
    } catch (err) {
      console.error('[handleProgressChange]', err)
      if (prevStatus) updateLocalCache(cacheKey, prevStatus)
      else deleteLocalCache(cacheKey)
      toast.error('업데이트에 실패했습니다.')
    }
  }

  const handleAddMemo = async (task: TaskWithDB, content: string) => {
    if (!task.workLogId || !content.trim()) return
    const newMemo: Memo = {
      id: crypto.randomUUID(),
      content: content.trim(),
      created_at: targetDate,
    }
    const updatedMemos = [...(task.memos || []), newMemo]
    const cacheKey = `${task.project_name}:${task.content}`
    const existing = localStatusCache.current.get(cacheKey)
    updateLocalCache(cacheKey, {
      progress: existing?.progress ?? task.progress,
      isCompleted: existing?.isCompleted ?? task.isCompleted,
      detail: existing?.detail ?? task.detail,
      dueDate: existing?.dueDate !== undefined ? existing.dueDate : task.dueDate,
      subtasks: existing?.subtasks ?? task.subtasks,
      memos: updatedMemos,
    })
    setAddingMemoFor(null)
    setNewMemoText('')
    try {
      await updateWorkLog(task.workLogId, { memos: updatedMemos as unknown as null })
    } catch (err) {
      console.error('[handleAddMemo]', err)
      deleteLocalCache(cacheKey)
    }
  }

  const handleDeleteMemo = async (task: TaskWithDB, memoId: string) => {
    if (!task.workLogId) return
    const updatedMemos = (task.memos || []).filter(m => m.id !== memoId)
    const cacheKey = `${task.project_name}:${task.content}`
    const existing = localStatusCache.current.get(cacheKey)
    updateLocalCache(cacheKey, {
      progress: existing?.progress ?? task.progress,
      isCompleted: existing?.isCompleted ?? task.isCompleted,
      detail: existing?.detail ?? task.detail,
      dueDate: existing?.dueDate !== undefined ? existing.dueDate : task.dueDate,
      subtasks: existing?.subtasks ?? task.subtasks,
      memos: updatedMemos.length > 0 ? updatedMemos : null,
    })
    try {
      await updateWorkLog(task.workLogId, {
        memos: (updatedMemos.length > 0 ? updatedMemos : null) as unknown as null,
      })
    } catch (err) {
      console.error('[handleDeleteMemo]', err)
      deleteLocalCache(cacheKey)
    }
  }

  const handleEditMemoSave = async (task: TaskWithDB) => {
    if (!task.workLogId || !editingMemoKey || !editMemoText.trim()) return
    const memoId = editingMemoKey.split(':').slice(1).join(':')
    const updatedMemos = (task.memos || []).map(m =>
      m.id === memoId ? { ...m, content: editMemoText.trim() } : m
    )
    const cacheKey = `${task.project_name}:${task.content}`
    const existing = localStatusCache.current.get(cacheKey)
    updateLocalCache(cacheKey, {
      progress: existing?.progress ?? task.progress,
      isCompleted: existing?.isCompleted ?? task.isCompleted,
      detail: existing?.detail ?? task.detail,
      dueDate: existing?.dueDate !== undefined ? existing.dueDate : task.dueDate,
      subtasks: existing?.subtasks ?? task.subtasks,
      memos: updatedMemos,
    })
    setEditingMemoKey(null)
    setEditMemoText('')
    try {
      await updateWorkLog(task.workLogId, { memos: updatedMemos as unknown as null })
    } catch (err) {
      console.error('[handleEditMemoSave]', err)
      deleteLocalCache(cacheKey)
    }
  }

  const handleDueDateChange = async (task: TaskWithDB, newDueDate: string | null) => {
    if (!task.workLogId) return

    const cacheKey = `${task.project_name}:${task.content}`
    const existing = localStatusCache.current.get(cacheKey)
    updateLocalCache(cacheKey, {
      progress: existing?.progress ?? task.progress,
      isCompleted: existing?.isCompleted ?? task.isCompleted,
      detail: existing?.detail ?? task.detail,
      dueDate: newDueDate,
      subtasks: existing?.subtasks ?? task.subtasks,
      memos: existing?.memos ?? task.memos,
    })

    try {
      await updateWorkLog(task.workLogId, { dueDate: newDueDate })
    } catch (err) {
      console.error('[handleDueDateChange]', err)
      deleteLocalCache(cacheKey)
    }
  }

  const handleAddSubtask = async (task: TaskWithDB) => {
    if (!task.workLogId || !newSubtaskText.trim()) return

    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      content: newSubtaskText.trim(),
      is_completed: false,
      created_at: targetDate,
    }
    const updatedSubtasks = [...(task.subtasks || []), newSubtask]
    const newProgress = calculateProgressFromSubtasks(updatedSubtasks, task.isCompleted)
    const cacheKey = `${task.project_name}:${task.content}`

    updateLocalCache(cacheKey, {
      progress: newProgress,
      isCompleted: task.isCompleted,
      detail: task.detail,
      dueDate: task.dueDate,
      subtasks: updatedSubtasks,
      memos: task.memos,
    })
    setNewSubtaskText('')
    setAddingSubtaskFor(null)

    try {
      await updateWorkLog(task.workLogId, {
        subtasks: updatedSubtasks as unknown as null,
        progress: newProgress,
      })
      onSave?.()
    } catch (err) {
      console.error('[handleAddSubtask]', err)
      deleteLocalCache(cacheKey)
    }
  }

  const handleToggleSubtask = async (task: TaskWithDB, subtaskId: string) => {
    if (!task.workLogId || !task.subtasks) return

    const updatedSubtasks = task.subtasks.map(s =>
      s.id === subtaskId ? { ...s, is_completed: !s.is_completed } : s
    )
    const newProgress = calculateProgressFromSubtasks(updatedSubtasks, task.isCompleted)
    const cacheKey = `${task.project_name}:${task.content}`

    updateLocalCache(cacheKey, {
      progress: newProgress,
      isCompleted: task.isCompleted,
      detail: task.detail,
      dueDate: task.dueDate,
      subtasks: updatedSubtasks,
      memos: task.memos,
    })

    try {
      await updateWorkLog(task.workLogId, {
        subtasks: updatedSubtasks as unknown as null,
        progress: newProgress,
      })
      onSave?.()
    } catch (err) {
      console.error('[handleToggleSubtask]', err)
      deleteLocalCache(cacheKey)
    }
  }

  const handleDeleteSubtask = async (task: TaskWithDB, subtaskId: string) => {
    if (!task.workLogId || !task.subtasks) return

    const updatedSubtasks = task.subtasks.filter(s => s.id !== subtaskId)
    const newProgress = updatedSubtasks.length > 0
      ? calculateProgressFromSubtasks(updatedSubtasks, task.isCompleted)
      : (task.isCompleted ? 100 : 0)
    const cacheKey = `${task.project_name}:${task.content}`

    updateLocalCache(cacheKey, {
      progress: newProgress,
      isCompleted: task.isCompleted,
      detail: task.detail,
      dueDate: task.dueDate,
      subtasks: updatedSubtasks.length > 0 ? updatedSubtasks : null,
      memos: task.memos,
    })

    try {
      await updateWorkLog(task.workLogId, {
        subtasks: updatedSubtasks.length > 0 ? updatedSubtasks as unknown as null : null,
        progress: newProgress,
      })
      onSave?.()
    } catch (err) {
      console.error('[handleDeleteSubtask]', err)
      deleteLocalCache(cacheKey)
    }
  }

  const handleEditSubtask = async (task: TaskWithDB, subtaskId: string, newContent: string) => {
    if (!task.workLogId || !task.subtasks) return
    const trimmed = newContent.trim()
    if (!trimmed) return

    const updatedSubtasks = task.subtasks.map(s =>
      s.id === subtaskId ? { ...s, content: trimmed } : s
    )
    const cacheKey = `${task.project_name}:${task.content}`

    updateLocalCache(cacheKey, {
      progress: task.progress,
      isCompleted: task.isCompleted,
      detail: task.detail,
      dueDate: task.dueDate,
      subtasks: updatedSubtasks,
      memos: task.memos,
    })

    try {
      await updateWorkLog(task.workLogId, {
        subtasks: updatedSubtasks as unknown as null,
      })
      onSave?.()
    } catch (err) {
      console.error('[handleEditSubtask]', err)
      deleteLocalCache(cacheKey)
    }
  }

  const handleDeleteTask = async (task: TaskWithDB) => {
    if (!task.workLogId) return
    const ok = await confirm({ message: '이 업무를 삭제하시겠습니까?', variant: 'danger' })
    if (!ok) return

    try {
      await deleteWorkLog(task.workLogId)
      const lines = text.split('\n')
      const newLines = lines.filter((_, index) => index !== task.lineIndex)
      const newText = newLines.join('\n')
      setText(newText)
      setSelectedTask(null)
      await saveLog(newText, parseAllTasks(newText).length, 0)
    } catch (err) {
      console.error('업무 삭제 실패:', err)
      toast.error('삭제에 실패했습니다.')
    }
  }

  const handleMoveTask = async (task: TaskWithDB, newDate: string) => {
    if (!task.workLogId || !user) return
    if (newDate === targetDate) return

    try {
      // 1. work_log의 work_date 변경
      await updateWorkLog(task.workLogId, { workDate: newDate })

      // 2. 현재 날짜 raw_content에서 줄 제거 + 저장
      const lines = text.split('\n')
      const newLines = lines.filter((_, index) => index !== task.lineIndex)
      const newText = newLines.join('\n')
      setText(newText)
      setSelectedTask(null)
      await saveLog(newText, parseAllTasks(newText).length, 0)

      // 3. 대상 날짜 daily_log에 줄 추가
      const supabase = createClient()
      const taskLine = formatProjectLine(task.project_name, task.content)
      const { data: targetLog } = await supabase
        .from('daily_logs').select('*')
        .eq('user_id', user.id).eq('log_date', newDate).maybeSingle()

      if (targetLog) {
        const content = targetLog.raw_content
          ? targetLog.raw_content + '\n' + taskLine
          : taskLine
        await supabase.from('daily_logs')
          .update({ raw_content: content }).eq('id', targetLog.id)
      } else {
        await supabase.from('daily_logs')
          .insert({ user_id: user.id, log_date: newDate, raw_content: taskLine })
      }

      // 4. 캐시 무효화
      dataCache.invalidate(cacheKeys.workLogs(user.id, newDate))
      dataCache.invalidate(cacheKeys.dailyLog(user.id, newDate))
      dataCache.invalidatePattern('incomplete')
      dataCache.invalidatePattern('weeklyStats')
      dataCache.invalidate(cacheKeys.projectWorkLogs(user.id))

      onSave?.()
    } catch (err) {
      console.error('업무 이동 실패:', err)
      toast.error('날짜 이동에 실패했습니다.')
    }
  }

  const saveWithText = useCallback(async (textToSave: string) => {
    // 게스트 모드: localStorage에 저장 + 로그인 유도
    if (!user) {
      try {
        localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify({
          text: textToSave,
          date: targetDate,
          savedAt: new Date().toISOString(),
        }))
      } catch { /* ignore */ }
      setSaving(false)
      setHasUnsavedChanges(false)

      const ok = await confirm({
        message: '작성한 내용을 저장하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?\n\n(내용은 임시 저장됩니다)',
        confirmLabel: '로그인',
      })
      if (ok) router.push('/login')
      return
    }

    try {
      setSaving(true)
      const tasks = parseAllTasks(textToSave)
      const normalizeStr = (s: string) => s.replace(/\s+/g, '')

      // workLog 매칭 헬퍼 (정확 → 공백제거 매치)
      const findWorkLog = (content: string, project: string) => {
        return workLogs.find(wl => wl.content === content && wl.keywords?.includes(project))
          || workLogs.find(wl => wl.keywords?.includes(project) && normalizeStr(wl.content) === normalizeStr(content))
      }

      // localStatusCache 매칭 헬퍼 (정확 → 공백제거 매치)
      const findCached = (content: string, project: string) => {
        const exactKey = `${project}:${content}`
        const exact = localStatusCache.current.get(exactKey)
        if (exact) return exact
        const normalized = normalizeStr(content)
        for (const [key, value] of localStatusCache.current) {
          const colonIdx = key.indexOf(':')
          const keyProject = key.substring(0, colonIdx)
          const keyContent = key.substring(colonIdx + 1)
          if (keyProject === project && normalizeStr(keyContent) === normalized) {
            return value
          }
        }
        return undefined
      }

      const completedCount = tasks.filter(t => {
        const cached = findCached(t.content, t.project_name)
        if (cached) return cached.isCompleted
        const existing = findWorkLog(t.content, t.project_name)
        return existing?.isCompleted ?? false
      }).length
      const completionRate = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

      const uniqueProjectNames = [...new Set(tasks.map(t => t.project_name))]

      // saveLog + 프로젝트 조회/생성 병렬 실행
      const [, projectResults] = await Promise.all([
        saveLog(textToSave, tasks.length, completionRate),
        Promise.all(
          uniqueProjectNames.map(async (projectName) => {
            const existingProject = findProjectByName(projectName)
            if (existingProject) {
              return { name: projectName, id: existingProject.id }
            }
            try {
              const newProject = await createProject(projectName, {
                auto_matched: true,
                keywords: [projectName],
              })
              return { name: projectName, id: newProject?.id ?? null }
            } catch (err) {
              console.error(`프로젝트 "${projectName}" 생성 실패:`, err)
              return { name: projectName, id: null }
            }
          })
        ),
      ])

      const projectMappings: Record<string, string> = {}
      for (const { name, id } of projectResults) {
        if (id) projectMappings[name] = id
      }

      // localStatusCache를 carryOverData로 변환 (세부 업무/메모/마감일 복사용)
      // 새 task content 기준으로 키를 재매핑
      const carryOverData = new Map<string, { detail?: string | null; subtasks?: Subtask[] | null; progress?: number; dueDate?: string | null; memos?: Memo[] | null }>()
      for (const task of tasks) {
        const newKey = `${task.project_name}:${task.content}`
        const cached = findCached(task.content, task.project_name)
        if (cached) {
          carryOverData.set(newKey, {
            detail: cached.detail,
            subtasks: cached.subtasks,
            progress: cached.progress,
            dueDate: cached.dueDate,
            memos: cached.memos,
          })
        }
      }

      await syncFromParsedTasks(tasks, projectMappings, carryOverData)
      localStatusCache.current.clear()
      setHasUnsavedChanges(false)
      onSave?.()
    } catch (err) {
      console.error('저장 실패:', err)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [workLogs, saveLog, findProjectByName, createProject, syncFromParsedTasks, onSave])

  const handleManualSave = async () => {
    await saveWithText(text)
  }

  const handleQuickAdd = useCallback(async (line: string) => {
    const newText = text ? `${text}\n${line}` : line
    setText(newText)

    if (!user) {
      // 게스트: 텍스트만 누적 + localStorage 저장 (알럿 없음)
      try {
        localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify({
          text: newText,
          date: targetDate,
          savedAt: new Date().toISOString(),
        }))
      } catch { /* ignore */ }
      return
    }

    await saveWithText(newText)
  }, [text, saveWithText, user, targetDate])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    setHasUnsavedChanges(true)
  }

  const handleAddIncompleteTask = (task: IncompleteTaskData) => {
    const newLine = formatProjectLine(task.project, task.content)
    const newText = text ? `${text}\n${newLine}` : newLine
    setText(newText)

    // 세부 업무/메모/마감일을 localStatusCache에 저장 (저장 시 복사됨)
    const cacheKey = `${task.project}:${task.content}`
    localStatusCache.current.set(cacheKey, {
      progress: task.progress,
      isCompleted: false,
      detail: task.detail,
      dueDate: task.dueDate,
      subtasks: task.subtasks,
      memos: task.memos,
    })
    setCacheVersion(v => v + 1)

    dismissedIncompleteRef.current.add(task.content)
    setIncompleteTasks(prev => prev.filter(t => t.content !== task.content))
    invalidateCache(targetDate)

    // 모바일: 즉시 저장 / 데스크톱: 수동 저장 대기
    if (isMobile) {
      saveWithText(newText)
    } else {
      setHasUnsavedChanges(true)
    }
  }

  const handleAddAllIncompleteTasks = () => {
    const newLines = incompleteTasks.map(t => formatProjectLine(t.project, t.content)).join('\n')
    const newText = text ? `${text}\n${newLines}` : newLines
    setText(newText)

    // 모든 미완료 업무의 세부 업무/메모/마감일을 localStatusCache에 저장
    incompleteTasks.forEach(task => {
      const cacheKey = `${task.project}:${task.content}`
      localStatusCache.current.set(cacheKey, {
        progress: task.progress,
        isCompleted: false,
        detail: task.detail,
        dueDate: task.dueDate,
        subtasks: task.subtasks,
        memos: task.memos,
      })
    })
    setCacheVersion(v => v + 1)

    incompleteTasks.forEach(t => dismissedIncompleteRef.current.add(t.content))
    setIncompleteTasks([])
    invalidateCache(targetDate)

    // 모바일: 즉시 저장 / 데스크톱: 수동 저장 대기
    if (isMobile) {
      saveWithText(newText)
    } else {
      setHasUnsavedChanges(true)
    }
  }

  // 업무 카드 → 백로그로 이동 (텍스트에서 줄 제거 + DB status 변경)
  const handleTaskCardToBacklog = async (task: TaskWithDB) => {
    if (isGuest) {
      const ok = await confirm({ message: '로그인이 필요합니다. 로그인 페이지로 이동할까요?', confirmLabel: '로그인' })
      if (ok) router.push('/login')
      return
    }
    if (!task.workLogId) return

    // 텍스트에서 해당 줄 제거
    const lines = text.split('\n')
    const newLines = lines.filter((_, i) => i !== task.lineIndex)
    const newText = newLines.join('\n')
    setText(newText)

    await moveToBacklog(task.workLogId)
    await backlog.reload()

    if (isMobile) {
      saveWithText(newText)
    } else {
      setHasUnsavedChanges(true)
    }
  }

  // 미완료 업무 → 백로그로 이동
  const handleMoveToBacklog = async (task: IncompleteTaskData) => {
    if (isGuest) {
      const ok = await confirm({ message: '로그인이 필요합니다. 로그인 페이지로 이동할까요?', confirmLabel: '로그인' })
      if (ok) router.push('/login')
      return
    }
    await moveToBacklog(task.id)
    dismissedIncompleteRef.current.add(task.content)
    setIncompleteTasks(prev => prev.filter(t => t.content !== task.content))
    invalidateCache(targetDate)
    await backlog.reload()
  }

  // 백로그 → 오늘로 이동 (텍스트 에디터에 추가 + DB work_date 변경)
  const handleMoveBacklogToToday = async (item: WorkLog) => {
    if (isGuest) {
      const ok = await confirm({ message: '로그인이 필요합니다. 로그인 페이지로 이동할까요?', confirmLabel: '로그인' })
      if (ok) router.push('/login')
      return
    }
    const projectName = item.keywords?.[0] || '기타'
    const newLine = formatProjectLine(projectName, item.content)
    const newText = text ? `${text}\n${newLine}` : newLine
    setText(newText)

    const cacheKey = `${projectName}:${item.content}`
    localStatusCache.current.set(cacheKey, {
      progress: item.progress,
      isCompleted: false,
      detail: item.detail,
      dueDate: item.dueDate,
      subtasks: item.subtasks,
      memos: item.memos,
    })
    setCacheVersion(v => v + 1)

    await backlog.moveToToday(item, targetDate)

    if (isMobile) {
      saveWithText(newText)
    } else {
      setHasUnsavedChanges(true)
    }
  }

  // 백로그 아이템 메모 상태
  const [addingMemoForBacklogId, setAddingMemoForBacklogId] = useState<string | null>(null)
  const [backlogMemoInput, setBacklogMemoInput] = useState('')

  const handleSaveBacklogMemo = async (item: WorkLog) => {
    const trimmed = backlogMemoInput.trim()
    if (!trimmed) return
    const newMemo: Memo = {
      id: crypto.randomUUID(),
      content: trimmed,
      created_at: new Date().toISOString().split('T')[0],
    }
    const updatedMemos = [...(item.memos || []), newMemo]
    setAddingMemoForBacklogId(null)
    setBacklogMemoInput('')
    await backlog.updateBacklogMemo(item.id, updatedMemos)
  }

  const handleDeleteBacklogMemo = async (item: WorkLog, memoId: string) => {
    const updatedMemos = (item.memos || []).filter(m => m.id !== memoId)
    await backlog.updateBacklogMemo(item.id, updatedMemos.length > 0 ? updatedMemos : null)
  }

  // 백로그에 직접 추가
  const handleAddToBacklog = async () => {
    if (isGuest) {
      const ok = await confirm({ message: '로그인이 필요합니다. 로그인 페이지로 이동할까요?', confirmLabel: '로그인' })
      if (ok) router.push('/login')
      return
    }
    const trimmed = backlogInput.trim()
    if (!trimmed) return
    setAddingBacklog(true)
    try {
      const parsed = parseAllTasks(trimmed)
      const first = parsed[0]
      const content = first ? first.content : trimmed
      const projectName = first ? first.project_name : '기타'
      await backlog.addToBacklog(content, projectName)
      setBacklogInput('')
    } catch (err) {
      console.error('백로그 추가 실패:', err)
    } finally {
      setAddingBacklog(false)
    }
  }

  if (!isGuest && !initialLoadDone && (loading || carryingOver)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const completedCount = tasksWithDBStatus.filter(t => t.isCompleted).length
  const totalProgress = tasksWithDBStatus.reduce((sum, t) => sum + (t.progress || 0), 0)
  const maxProgress = tasksWithDBStatus.length * 100
  const overallProgressRate = maxProgress > 0 ? Math.round((totalProgress / maxProgress) * 100) : 0

  // 업무 카드 단일 렌더 (그룹 내부에서 재사용)
  const renderTaskCard = (task: TaskWithDB, idx: number) => (
    <div
      key={`${task.project_name}:${task.content}:${idx}`}
      className={`bg-white rounded-xl border transition-all cursor-pointer overflow-hidden ${
        selectedTask === task.lineIndex
          ? 'border-primary-400 shadow-md ring-1 ring-primary-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={() => setSelectedTask(selectedTask === task.lineIndex ? null : task.lineIndex)}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {/* 체크박스 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCheckboxToggle(task)
            }}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
              task.isCompleted
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-gray-300 hover:border-primary-400'
            }`}
          >
            {task.isCompleted && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* 내용 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {!task.isCompleted && task.progress > 0 && (
                <span className="text-xs text-gray-500">
                  {task.progress}%
                </span>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="text-xs text-gray-400">
                  {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}
                </span>
              )}
              {task.dueDate && (() => {
                const display = getDueDateDisplay(task.dueDate, task.isCompleted)
                if (!display) return null
                return (
                  <span className={`text-xs flex items-center gap-0.5 ${display.className}`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {display.label}
                  </span>
                )
              })()}
              {task.memos && task.memos.length > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  메모 {task.memos.length}
                </span>
              )}
            </div>
            <p className={`text-sm leading-relaxed ${
              task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'
            }`}>
              {task.content}
            </p>
          </div>

          {/* 펼침 아이콘 */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
              selectedTask === task.lineIndex ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

          {/* 상세 영역 */}
          {selectedTask === task.lineIndex && (
            <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
              {/* 진척도 바 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-700">
                    진척도
                  </label>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <span className="text-xs text-gray-400">
                      세부 업무 기반 자동 계산
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg transition-all ${
                          task.progress >= 100 ? 'bg-emerald-500' : 'bg-primary-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold w-12 text-right ${
                      task.progress >= 100 ? 'text-emerald-600' : 'text-gray-700'
                    }`}>
                      {task.progress}%
                    </span>
                  </div>
                  {/* 진척도 퀵셀렉트 버튼 (세부 업무 없고 미완료일 때) */}
                  {!task.isCompleted && (!task.subtasks || task.subtasks.length === 0) && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => handleProgressChange(task, pct)}
                          className={`flex-1 py-1 text-xs rounded-md transition-colors ${
                            task.progress === pct
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {task.subtasks && task.subtasks.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    세부 업무 {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length} 완료
                    {task.isCompleted ? ' + 메인 완료' : ''}
                  </p>
                )}
              </div>

              {/* 마감일 + 날짜 이동 */}
              {task.workLogId ? (
                <div className="flex items-center gap-3">
                  <DueDatePicker
                    value={task.dueDate || null}
                    onChange={(date) => handleDueDateChange(task, date)}
                  />
                  <DateMovePicker
                    currentDate={targetDate}
                    onMove={(date) => handleMoveTask(task, date)}
                  />
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-1">
                  먼저 저장 후 마감일/이동을 설정할 수 있습니다
                </p>
              )}

              {/* 세부 업무 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  세부 업무
                </label>
                <div className="space-y-1.5">
                  {task.subtasks && task.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 p-2 bg-white rounded-lg group border border-transparent focus-within:border-primary-300 focus-within:bg-primary-50/30 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleToggleSubtask(task, subtask.id)}
                        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                          subtask.is_completed
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {subtask.is_completed && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="text"
                        defaultValue={subtask.content}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val && val !== subtask.content) {
                            handleEditSubtask(task, subtask.id, val)
                          } else {
                            e.target.value = subtask.content
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') {
                            (e.target as HTMLInputElement).value = subtask.content;
                            (e.target as HTMLInputElement).blur()
                          }
                        }}
                        className={`flex-1 text-sm bg-transparent outline-none px-0 py-0.5 ${
                          subtask.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'
                        }`}
                      />
                      {subtask.created_at && (
                        <span className="text-[10px] text-gray-300 flex-shrink-0">
                          {formatEntryDate(subtask.created_at)}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteSubtask(task, subtask.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {/* 세부 업무 추가 */}
                  {addingSubtaskFor === task.workLogId ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSubtaskText.trim()) {
                            handleAddSubtask(task)
                          } else if (e.key === 'Escape') {
                            setAddingSubtaskFor(null)
                            setNewSubtaskText('')
                          }
                        }}
                        placeholder="세부 업무 내용"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400 bg-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddSubtask(task)}
                        disabled={!newSubtaskText.trim()}
                        className="px-2.5 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50"
                      >
                        추가
                      </button>
                      <button
                        onClick={() => {
                          setAddingSubtaskFor(null)
                          setNewSubtaskText('')
                        }}
                        className="px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAddingSubtaskFor(task.workLogId || null)
                      }}
                      className="w-full py-2 text-sm text-gray-400 hover:text-gray-500 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      + 세부 업무 추가
                    </button>
                  )}
                </div>
              </div>

              {/* 메모 영역 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">메모</label>
                <div className="space-y-2">
                  {(task.memos || []).map(memo => {
                    const isExpanded = expandedMemos.has(memo.id)
                    const isLong = memo.content.length > 120 || memo.content.split('\n').length > 3
                    const isEditingThis = editingMemoKey === `${task.workLogId}:${memo.id}`
                    return (
                      <div key={memo.id} className="group bg-white rounded-lg border border-gray-100 p-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-gray-400">{formatEntryDate(memo.created_at)}</span>
                          {!isEditingThis && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingMemoKey(`${task.workLogId}:${memo.id}`); setEditMemoText(memo.content) }}
                                className="text-[11px] text-gray-400 hover:text-primary-500"
                              >수정</button>
                              <button
                                onClick={() => handleDeleteMemo(task, memo.id)}
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
                              className="w-full text-sm p-2 border border-primary-300 rounded-lg resize-none outline-none bg-white"
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button onClick={() => { setEditingMemoKey(null); setEditMemoText('') }} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">취소</button>
                              <button onClick={() => handleEditMemoSave(task)} disabled={!editMemoText.trim()} className="text-xs text-white bg-primary-500 hover:bg-primary-600 px-2.5 py-1 rounded-lg disabled:opacity-50">저장</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className={`text-sm text-gray-600 whitespace-pre-wrap leading-relaxed ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>
                              {memo.content}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => setExpandedMemos(prev => { const next = new Set(prev); if (next.has(memo.id)) next.delete(memo.id); else next.add(memo.id); return next })}
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
                  {addingMemoFor === task.workLogId ? (
                    <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                      <textarea
                        value={newMemoText}
                        onChange={e => setNewMemoText(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="메모를 입력하세요..."
                        className="w-full text-sm p-2.5 border border-gray-200 rounded-lg resize-none outline-none focus:border-primary-400 bg-white"
                      />
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => { setAddingMemoFor(null); setNewMemoText('') }} className="text-xs text-gray-500 px-2 py-1">취소</button>
                        <button onClick={() => handleAddMemo(task, newMemoText)} disabled={!newMemoText.trim()} className="text-xs text-white bg-primary-500 hover:bg-primary-600 px-2.5 py-1 rounded-lg disabled:opacity-50">저장</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAddingMemoFor(task.workLogId || null) }}
                      className="w-full py-2 text-sm text-gray-400 hover:text-gray-500 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      + 메모 추가
                    </button>
                  )}
                </div>
              </div>

              {/* 하단 액션 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                {task.workLogId && !task.isCompleted ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTaskCardToBacklog(task)
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    나중에
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTask(task)
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  업무 삭제
                </button>
              </div>
            </div>
          )}
        </div>
  )

  // 업무 카드 목록 — 프로젝트별 그룹핑 (모바일/데스크톱 공용)
  const renderTaskCards = () => {
    if (tasksWithDBStatus.length === 0) {
      return (
        <div className={isMobile ? '' : 'flex-1 overflow-y-auto pr-1'}>
          <div className="h-48 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {isMobile ? '하단 입력 바에서 업무를 추가하세요' : '오늘의 업무를 입력해보세요'}
            </p>
            <p className="text-gray-400 text-xs mt-1">#프로젝트명/ 업무내용</p>
          </div>
        </div>
      )
    }

    // 프로젝트별 그룹핑 (입력 순서 유지, 원본 참조 유지)
    const groups: { name: string; tasks: TaskWithDB[] }[] = []
    const groupIndex: Record<string, number> = {}
    tasksWithDBStatus.forEach((task) => {
      const name = task.project_name
      if (groupIndex[name] === undefined) {
        groupIndex[name] = groups.length
        groups.push({ name, tasks: [] })
      }
      groups[groupIndex[name]].tasks.push(task)
    })

    return (
      <div className={`space-y-3 ${isMobile ? '' : 'flex-1 overflow-y-auto pr-1'}`}>
        {groups.map(({ name, tasks }) => {
          const incompleteTasks = tasks.filter(t => !t.isCompleted)
          const completedTasks = tasks.filter(t => t.isCompleted)
          const isCollapsed = collapsedGroups.has(name)
          const isCompletedExpanded = expandedCompletedGroups.has(name)

          return (
            <div key={name} className="rounded-xl border border-gray-200 overflow-hidden">
              {/* 그룹 헤더 */}
              <div
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setCollapsedGroups(prev => {
                  const next = new Set(prev)
                  if (next.has(name)) next.delete(name); else next.add(name)
                  return next
                })}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/projects?project=${encodeURIComponent(name)}`)
                    }}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                    title={`${name} 프로젝트 보기`}
                  >
                    #{name}
                  </button>
                  <span className="text-xs text-gray-400">
                    {completedTasks.length}/{tasks.length}
                  </span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* 그룹 내용 */}
              {!isCollapsed && (
                <div className="p-2 space-y-2 bg-white">
                  {/* 미완료 업무 */}
                  {incompleteTasks.map((task) => renderTaskCard(task, task.lineIndex))}

                  {/* 완료 업무 아코디언 */}
                  {completedTasks.length > 0 && (
                    <div>
                      <button
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => setExpandedCompletedGroups(prev => {
                          const next = new Set(prev)
                          if (next.has(name)) next.delete(name); else next.add(name)
                          return next
                        })}
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${isCompletedExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        완료 {completedTasks.length}개
                      </button>
                      {isCompletedExpanded && (
                        <div className="space-y-2 mt-1">
                          {completedTasks.map((task) => renderTaskCard(task, task.lineIndex))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 미완료 + 백로그 상태바 (하단 배치, 공용)
  const renderStatusBar = () => {
    const hasIncomplete = incompleteTasks.length > 0
    const hasBacklog = backlog.backlogItems.length > 0
    if (!hasIncomplete && !hasBacklog) return null

    return (
      <div className="mt-4 space-y-2">
        {/* 칩 버튼들 */}
        <div className="flex gap-2 flex-wrap">
          {hasIncomplete && (
            <button
              onClick={() => setShowIncomplete(!showIncomplete)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showIncomplete
                  ? 'bg-amber-100 border-amber-300 text-amber-700'
                  : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
              }`}
            >
              ⚠️ 미완료 {incompleteTasks.length}개
            </button>
          )}
          {hasBacklog && (
            <button
              onClick={() => setShowBacklogSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              📋 나중에 {backlog.backlogItems.length}개
            </button>
          )}
        </div>

        {/* 미완료 드롭다운 */}
        {showIncomplete && hasIncomplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between border-b border-amber-100">
              <span className="text-xs font-semibold text-amber-700">미완료 업무</span>
              <button
                onClick={handleAddAllIncompleteTasks}
                className="text-xs text-amber-600 hover:text-amber-800 hover:underline font-medium"
              >
                전체 추가
              </button>
            </div>
            <div className="px-3 py-2 space-y-1.5 max-h-36 overflow-y-auto">
              {incompleteTasks.map((task, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white rounded-lg border border-amber-100">
                  <span className="text-gray-700 truncate flex-1">
                    <span className="text-amber-600 font-medium">#{task.project}</span>{' '}{task.content}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleMoveToBacklog(task)}
                      className="px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 rounded font-medium"
                    >
                      나중에
                    </button>
                    <button
                      onClick={() => handleAddIncompleteTask(task)}
                      className="px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 rounded font-medium"
                    >
                      추가
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    )
  }

  // 백로그 시트/모달 오버레이 (모바일: 바텀시트, 데스크톱: 모달)
  const renderBacklogOverlay = () => {
    if (!showBacklogSheet) return null

    const sheetContent = (
      <>
        {/* 헤더 */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">나중에 할 일</h3>
            <p className="text-xs text-gray-400 mt-0.5">{backlog.backlogItems.length}개</p>
          </div>
          <button
            onClick={() => setShowBacklogSheet(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 백로그 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {backlog.backlogItems.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">아직 백로그가 없습니다.</p>
              <p className="text-xs text-gray-300 mt-1">미완료 업무에서 "나중에" 버튼을 눌러보세요.</p>
            </div>
          )}
          {backlog.backlogItems.map((item) => (
            <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              {/* 상단: 프로젝트/날짜 + 오늘추가/삭제 */}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-slate-500">#{item.keywords?.[0] || '기타'}</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">{formatBacklogDate(item.workDate)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-snug">{item.content}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      handleMoveBacklogToToday(item)
                      setShowBacklogSheet(false)
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    오늘 추가
                  </button>
                  <button
                    onClick={() => backlog.deleteBacklog(item.id)}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 메모 목록 */}
              {item.memos && item.memos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {item.memos.map(memo => (
                    <div key={memo.id} className="flex items-start gap-1.5 group">
                      <svg className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <p className="flex-1 text-xs text-gray-500 leading-relaxed">{memo.content}</p>
                      <button
                        onClick={() => handleDeleteBacklogMemo(item, memo.id)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 메모 추가 */}
              {addingMemoForBacklogId === item.id ? (
                <div className="mt-2">
                  <textarea
                    value={backlogMemoInput}
                    onChange={e => setBacklogMemoInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSaveBacklogMemo(item)
                      }
                      if (e.key === 'Escape') {
                        setAddingMemoForBacklogId(null)
                        setBacklogMemoInput('')
                      }
                    }}
                    onBlur={() => {
                      if (backlogMemoInput.trim()) handleSaveBacklogMemo(item)
                      else { setAddingMemoForBacklogId(null); setBacklogMemoInput('') }
                    }}
                    placeholder="왜 나중으로 미뤘나요?"
                    rows={2}
                    autoFocus
                    className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg resize-none outline-none focus:border-primary-300 bg-white"
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setAddingMemoForBacklogId(item.id); setBacklogMemoInput('') }}
                  className="mt-2 text-[10px] text-gray-300 hover:text-gray-500 transition-colors"
                >
                  + 메모
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 직접 추가 푸터 */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              value={backlogInput}
              onChange={e => setBacklogInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddToBacklog()}
              placeholder="#프로젝트/ 업무내용"
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-primary-400 bg-white"
            />
            <button
              onClick={handleAddToBacklog}
              disabled={addingBacklog || !backlogInput.trim()}
              className="px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl disabled:opacity-40 transition-colors"
            >
              추가
            </button>
          </div>
        </div>
      </>
    )

    if (isMobile) {
      return (
        <>
          {/* 백드롭 */}
          <div
            className="fixed inset-0 bg-black/40 z-[70]"
            onClick={() => setShowBacklogSheet(false)}
          />
          {/* 바텀 시트 */}
          <div
            className="fixed left-0 right-0 bottom-0 z-[75] bg-white rounded-t-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: '70vh' }}
          >
            {/* 드래그 핸들 */}
            <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {sheetContent}
          </div>
        </>
      )
    }

    // 데스크톱: 센터 모달
    return (
      <>
        {/* 백드롭 */}
        <div
          className="fixed inset-0 bg-black/40 z-50"
          onClick={() => setShowBacklogSheet(false)}
        />
        {/* 모달 */}
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-[440px] flex flex-col"
          style={{ maxHeight: '70vh' }}
        >
          {sheetContent}
        </div>
      </>
    )
  }

  // 사고 체크리스트 답변 저장 핸들러
  const handleSaveThinkingAnswer = async (itemId: string, value: string) => {
    const task = selectedTask !== null ? tasksWithDBStatus.find(t => t.lineIndex === selectedTask) : null
    if (!task?.workLogId) return

    const newAnswers: ThinkingAnswers = { ...thinkingDraft, [itemId]: value }
    setThinkingDraft(newAnswers)

    setSavingThinking(true)
    try {
      await updateWorkLog(task.workLogId, { thinkingAnswers: newAnswers })
    } catch (err) {
      console.error('[handleSaveThinkingAnswer]', err)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSavingThinking(false)
    }
  }

  // 사고 체크리스트 (데스크톱 전용)
  const renderChecklist = () => {
    const selectedTaskObj = selectedTask !== null ? tasksWithDBStatus.find(t => t.lineIndex === selectedTask) : null
    const hasWorkLog = !!selectedTaskObj?.workLogId

    return (
      <div className="mb-4 bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-100/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">💭</span>
            <span className="text-gray-600 text-xs font-medium">
              사고 체크리스트
              {selectedTaskObj && (
                <span className="ml-1.5 text-primary-500">· {selectedTaskObj.content.slice(0, 20)}{selectedTaskObj.content.length > 20 ? '...' : ''}</span>
              )}
            </span>
            {savingThinking && <span className="text-[10px] text-gray-400">저장 중...</span>}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showChecklist ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showChecklist && (
          <div className="px-4 pb-4">
            {hasWorkLog ? (
              // 업무 선택됨: 각 질문 아래 textarea 입력
              <div className="space-y-3">
                {THINKING_CHECKLIST.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-xs font-medium text-gray-600">{item.question}</span>
                      <span className="text-[10px] text-gray-400">({item.full})</span>
                    </div>
                    <textarea
                      value={thinkingDraft[item.id as keyof ThinkingAnswers] ?? ''}
                      onChange={(e) => setThinkingDraft(prev => ({ ...prev, [item.id]: e.target.value }))}
                      onBlur={(e) => handleSaveThinkingAnswer(item.id, e.target.value)}
                      rows={2}
                      placeholder="생각을 적어보세요..."
                      className="w-full text-xs p-2 border border-gray-200 rounded-lg resize-none outline-none focus:border-primary-400 bg-white transition-colors"
                    />
                  </div>
                ))}
                <p className="text-[10px] text-gray-400">업무 카드를 닫으면 자동 저장됩니다</p>
              </div>
            ) : (
              // 업무 미선택: 칩 + 툴팁
              <>
                <div className="flex flex-wrap gap-2">
                  {THINKING_CHECKLIST.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all cursor-default"
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-xs text-gray-600 font-medium">{item.question}</span>

                      {/* 툴팁 */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {item.full}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">업무 카드를 선택하면 각 질문에 답변을 기록할 수 있습니다</p>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── 모바일 레이아웃 ───
  if (isMobile) {
    return (
      <>
        {/* 오늘 업무 완수율 - 상단 */}
        {tasksWithDBStatus.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    overallProgressRate === 100 ? 'bg-emerald-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${overallProgressRate}%` }}
                />
              </div>
              <span className={`text-sm font-bold min-w-[3rem] text-right ${
                overallProgressRate === 100 ? 'text-emerald-600' : 'text-primary-600'
              }`}>
                {overallProgressRate}%
              </span>
            </div>
            {overallProgressRate === 100 ? (
              <p className="text-xs text-emerald-600 mt-1.5 text-center font-medium">
                오늘 업무를 모두 완료했습니다!
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1.5">
                {completedCount}/{tasksWithDBStatus.length} 완료
              </p>
            )}
          </div>
        )}

        {/* 업무 카드 목록 */}
        {renderTaskCards()}

        {/* 미완료 + 백로그 상태바 */}
        {renderStatusBar()}

        {/* 하단 고정 입력 바 */}
        <MobileQuickInput
          onSubmit={handleQuickAdd}
          onExpand={() => setFullEditorOpen(true)}
          disabled={saving}
          visible={!fullEditorOpen}
        />

        {/* 풀스크린 에디터 오버레이 */}
        <MobileFullEditor
          isOpen={fullEditorOpen}
          onClose={() => setFullEditorOpen(false)}
          text={text}
          onTextChange={(newText) => {
            setText(newText)
            setHasUnsavedChanges(true)
          }}
          onSave={() => {
            saveWithText(text)
            setFullEditorOpen(false)
          }}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          incompleteTasks={incompleteTasks}
          onAddIncompleteTask={handleAddIncompleteTask}
          onAddAllIncompleteTasks={handleAddAllIncompleteTasks}
        />

        {/* 백로그 바텀 시트 */}
        {renderBacklogOverlay()}
      </>
    )
  }

  // ─── 데스크톱 레이아웃 (기존) ───
  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
      {/* 왼쪽: 텍스트 입력 */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            오늘의 업무
          </label>
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-500 font-medium">
              저장되지 않은 변경사항
            </span>
          )}
        </div>

        <textarea
          value={text}
          onChange={handleTextChange}
          className="flex-1 p-4 border border-gray-200 rounded-xl outline-none ring-0 focus:border-primary-400 resize-none font-mono text-sm min-h-[280px] bg-white transition-colors"
          placeholder={`#프로젝트명/ 업무내용

예시:
#도매 플랫폼/ API 명세서 검토
#앱개발 로그인 API 연동
#UI 디자인/ 메인페이지 작업`}
        />

        <p className="mt-2 text-xs text-gray-400">
          #프로젝트명/ 업무내용 형식 · 프로젝트명에 띄어쓰기 가능
        </p>

        <Button
          onClick={handleManualSave}
          loading={saving}
          className={`mt-4 ${hasUnsavedChanges ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
          fullWidth
        >
          {hasUnsavedChanges ? '저장하기 (변경사항 있음)' : '저장하기'}
        </Button>
      </div>

      {/* 오른쪽: 업무 목록 */}
      <div className="flex flex-col">
        {/* 사고 체크리스트 */}
        {renderChecklist()}

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            업무 목록
          </h3>
          {tasksWithDBStatus.length > 0 && (
            <span className="text-xs text-gray-500">
              {completedCount}/{tasksWithDBStatus.length} 완료
            </span>
          )}
        </div>

        {renderTaskCards()}

        {/* 오늘 업무 진척도 */}
        {tasksWithDBStatus.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">오늘 업무 진척도</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    overallProgressRate === 100 ? 'bg-emerald-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${overallProgressRate}%` }}
                />
              </div>
              <span className={`text-lg font-bold min-w-[3.5rem] text-right ${
                overallProgressRate === 100 ? 'text-emerald-600' : 'text-primary-600'
              }`}>
                {overallProgressRate}%
              </span>
            </div>
            {overallProgressRate === 100 && (
              <p className="text-xs text-emerald-600 mt-2 text-center font-medium">
                오늘 업무를 모두 완료했습니다!
              </p>
            )}
          </div>
        )}

        {/* 미완료 + 백로그 상태바 */}
        {renderStatusBar()}
      </div>
    </div>

    {/* 백로그 모달 */}
    {renderBacklogOverlay()}
    </>
  )
}
