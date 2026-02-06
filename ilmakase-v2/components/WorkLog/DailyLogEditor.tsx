'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { parseAllTasks } from '@/lib/parser'
import { ParsedTask, Subtask } from '@/types'
import { useDailyLog } from '@/hooks/useDailyLog'
import { useWorkLogs, calculateProgressFromSubtasks } from '@/hooks/useWorkLogs'
import { useCarryOver, IncompleteTaskData } from '@/hooks/useCarryOver'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/UI'

interface DailyLogEditorProps {
  targetDate: string
  onSave?: () => void
}

interface TaskWithDB extends ParsedTask {
  workLogId?: string
  detail?: string | null
  subtasks?: Subtask[] | null
}

interface LocalTaskStatus {
  progress: number
  isCompleted: boolean
  detail?: string | null
  subtasks?: Subtask[] | null
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
  const { log, loading, saveLog } = useDailyLog(targetDate)
  const { workLogs, syncFromParsedTasks, updateWorkLog, deleteWorkLog } = useWorkLogs(targetDate)
  const { getIncompleteTasks, invalidateCache, carryingOver } = useCarryOver()
  const { findProjectByName, createProject } = useProjects()

  const [text, setText] = useState('')
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [incompleteTasks, setIncompleteTasks] = useState<IncompleteTaskData[]>([])
  const [showIncomplete, setShowIncomplete] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)

  // 메모 편집 상태
  const [editingMemo, setEditingMemo] = useState<string | null>(null)
  const [memoText, setMemoText] = useState('')
  const [savingMemo, setSavingMemo] = useState(false)

  // 세부 업무 추가 상태
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)
  const [newSubtaskText, setNewSubtaskText] = useState('')

  const localStatusCache = useRef<Map<string, LocalTaskStatus>>(new Map())
  const [cacheVersion, setCacheVersion] = useState(0)

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
      setHasUnsavedChanges(false)
      setEditingMemo(null)
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

  // 미완료 업무 로딩 (병렬 실행)
  useEffect(() => {
    if (!loading) {
      getIncompleteTasks(targetDate).then(tasks => {
        setIncompleteTasks(tasks)
      })
    }
  }, [loading, targetDate, getIncompleteTasks])

  useEffect(() => {
    const tasks = parseAllTasks(text)
    setParsedTasks(tasks)
  }, [text])

  const tasksWithDBStatus: TaskWithDB[] = useMemo(() => {
    void cacheVersion

    return parsedTasks.map(task => {
      const cacheKey = `${task.project_name}:${task.content}`
      const cachedStatus = localStatusCache.current.get(cacheKey)

      const matchingLog = workLogs.find(
        wl => wl.content === task.content && wl.keywords?.includes(task.project_name)
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
          subtasks,
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
          subtasks: cachedStatus.subtasks,
        }
      }

      return task
    })
  }, [parsedTasks, workLogs, cacheVersion])

  const handleCheckboxToggle = async (task: TaskWithDB) => {
    const cacheKey = `${task.project_name}:${task.content}`
    const newCompleted = !task.isCompleted
    // 세부 업무가 있으면 자동 계산, 없으면 기존 로직
    const newProgress = task.subtasks && task.subtasks.length > 0
      ? calculateProgressFromSubtasks(task.subtasks, newCompleted)
      : (newCompleted ? 100 : 0)

    updateLocalCache(cacheKey, {
      progress: newProgress,
      isCompleted: newCompleted,
      detail: task.detail,
      subtasks: task.subtasks,
    })

    if (!task.workLogId) {
      await handleManualSave()
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
      deleteLocalCache(cacheKey)
    }
  }

  const handleProgressChange = async (task: TaskWithDB, newProgress: number) => {
    if (task.subtasks && task.subtasks.length > 0) return

    const cacheKey = `${task.project_name}:${task.content}`
    const newCompleted = newProgress >= 100

    updateLocalCache(cacheKey, {
      progress: newProgress,
      isCompleted: newCompleted,
      detail: task.detail,
      subtasks: task.subtasks,
    })

    if (!task.workLogId) {
      await handleManualSave()
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
      deleteLocalCache(cacheKey)
    }
  }

  const handleStartEditMemo = (task: TaskWithDB) => {
    setEditingMemo(task.workLogId || null)
    setMemoText(task.detail || '')
  }

  const handleSaveMemo = async (task: TaskWithDB) => {
    if (!task.workLogId) return

    setSavingMemo(true)
    try {
      const cacheKey = `${task.project_name}:${task.content}`
      const existing = localStatusCache.current.get(cacheKey)
      updateLocalCache(cacheKey, {
        progress: existing?.progress ?? task.progress,
        isCompleted: existing?.isCompleted ?? task.isCompleted,
        detail: memoText || null,
        subtasks: existing?.subtasks ?? task.subtasks,
      })

      await updateWorkLog(task.workLogId, { detail: memoText || null })
      setEditingMemo(null)
    } catch (err) {
      console.error('[handleSaveMemo]', err)
      alert('메모 저장에 실패했습니다.')
    } finally {
      setSavingMemo(false)
    }
  }

  const handleCancelMemo = () => {
    setEditingMemo(null)
    setMemoText('')
  }

  const handleDeleteMemo = async (task: TaskWithDB) => {
    if (!task.workLogId) return
    if (!confirm('메모를 삭제하시겠습니까?')) return

    try {
      const cacheKey = `${task.project_name}:${task.content}`
      const existing = localStatusCache.current.get(cacheKey)
      updateLocalCache(cacheKey, {
        progress: existing?.progress ?? task.progress,
        isCompleted: existing?.isCompleted ?? task.isCompleted,
        detail: null,
        subtasks: existing?.subtasks ?? task.subtasks,
      })

      await updateWorkLog(task.workLogId, { detail: null })
      setEditingMemo(null)
    } catch (err) {
      console.error('[handleDeleteMemo]', err)
    }
  }

  const handleAddSubtask = async (task: TaskWithDB) => {
    if (!task.workLogId || !newSubtaskText.trim()) return

    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      content: newSubtaskText.trim(),
      is_completed: false,
    }
    const updatedSubtasks = [...(task.subtasks || []), newSubtask]
    const newProgress = calculateProgressFromSubtasks(updatedSubtasks, task.isCompleted)
    const cacheKey = `${task.project_name}:${task.content}`

    updateLocalCache(cacheKey, {
      progress: newProgress,
      isCompleted: task.isCompleted,
      detail: task.detail,
      subtasks: updatedSubtasks,
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
      subtasks: updatedSubtasks,
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
      subtasks: updatedSubtasks.length > 0 ? updatedSubtasks : null,
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

  const handleDeleteTask = async (task: TaskWithDB) => {
    if (!task.workLogId) return
    if (!confirm('이 업무를 삭제하시겠습니까?')) return

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
      alert('삭제에 실패했습니다.')
    }
  }

  const handleManualSave = async () => {
    try {
      setSaving(true)
      const tasks = parseAllTasks(text)

      const completedCount = tasks.filter(t => {
        const cacheKey = `${t.project_name}:${t.content}`
        const cached = localStatusCache.current.get(cacheKey)
        if (cached) return cached.isCompleted
        const existing = workLogs.find(wl => wl.content === t.content)
        return existing?.isCompleted ?? false
      }).length
      const completionRate = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

      await saveLog(text, tasks.length, completionRate)

      const projectMappings: Record<string, string> = {}
      const uniqueProjectNames = [...new Set(tasks.map(t => t.project_name))]

      for (const projectName of uniqueProjectNames) {
        const existingProject = findProjectByName(projectName)
        if (existingProject) {
          projectMappings[projectName] = existingProject.id
        } else {
          try {
            const newProject = await createProject(projectName, {
              auto_matched: true,
              keywords: [projectName],
            })
            projectMappings[projectName] = newProject.id
          } catch (err) {
            console.error(`프로젝트 "${projectName}" 생성 실패:`, err)
          }
        }
      }

      // localStatusCache를 carryOverData로 변환 (세부 업무/메모 복사용)
      const carryOverData = new Map<string, { detail?: string | null; subtasks?: Subtask[] | null; progress?: number }>()
      localStatusCache.current.forEach((value, key) => {
        carryOverData.set(key, {
          detail: value.detail,
          subtasks: value.subtasks,
          progress: value.progress,
        })
      })

      await syncFromParsedTasks(tasks, projectMappings, carryOverData)
      localStatusCache.current.clear()
      setHasUnsavedChanges(false)
      onSave?.()
    } catch (err) {
      console.error('저장 실패:', err)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    setHasUnsavedChanges(true)
  }

  const formatProjectLine = (project: string, content: string) => {
    const hasSpace = project.includes(' ')
    return hasSpace ? `#${project}/ ${content}` : `#${project} ${content}`
  }

  const handleAddIncompleteTask = (task: IncompleteTaskData) => {
    const newLine = formatProjectLine(task.project, task.content)
    const newText = text ? `${text}\n${newLine}` : newLine
    setText(newText)
    setHasUnsavedChanges(true)

    // 세부 업무/메모를 localStatusCache에 저장 (저장 시 복사됨)
    const cacheKey = `${task.project}:${task.content}`
    localStatusCache.current.set(cacheKey, {
      progress: task.progress,
      isCompleted: false,
      detail: task.detail,
      subtasks: task.subtasks,
    })
    setCacheVersion(v => v + 1)

    setIncompleteTasks(prev => prev.filter(t => t.content !== task.content))
  }

  const handleAddAllIncompleteTasks = () => {
    const newLines = incompleteTasks.map(t => formatProjectLine(t.project, t.content)).join('\n')
    const newText = text ? `${text}\n${newLines}` : newLines
    setText(newText)
    setHasUnsavedChanges(true)

    // 모든 미완료 업무의 세부 업무/메모를 localStatusCache에 저장
    incompleteTasks.forEach(task => {
      const cacheKey = `${task.project}:${task.content}`
      localStatusCache.current.set(cacheKey, {
        progress: task.progress,
        isCompleted: false,
        detail: task.detail,
        subtasks: task.subtasks,
      })
    })
    setCacheVersion(v => v + 1)

    setIncompleteTasks([])
  }

  if (!initialLoadDone && (loading || carryingOver)) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
      {/* 왼쪽: 텍스트 입력 */}
      <div className="flex flex-col">
        {/* 미완료 업무 아코디언 */}
        {incompleteTasks.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowIncomplete(!showIncomplete)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 text-amber-600 transition-transform ${showIncomplete ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-amber-700 text-sm font-semibold">
                  미완료 업무 {incompleteTasks.length}개
                </span>
              </div>
              {showIncomplete && (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddAllIncompleteTasks()
                  }}
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium hover:underline"
                >
                  전체 추가
                </span>
              )}
            </button>

            {showIncomplete && (
              <div className="px-4 pb-3 space-y-1.5 max-h-32 overflow-y-auto">
                {incompleteTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm p-2 bg-white rounded-lg border border-amber-100"
                  >
                    <span className="text-gray-700 truncate flex-1">
                      <span className="text-amber-600 font-medium">#{task.project}</span>{' '}
                      {task.content}
                    </span>
                    <button
                      onClick={() => handleAddIncompleteTask(task)}
                      className="ml-2 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 rounded font-medium flex-shrink-0"
                    >
                      추가
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
        {/* 사고 체크리스트 - 항상 표시 */}
        <div className="mb-4 bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-100/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">💭</span>
                <span className="text-gray-600 text-xs font-medium">
                  사고 체크리스트
                </span>
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
                <p className="text-xs text-gray-400 mt-3">
                  각 항목에 마우스를 올려 자세한 질문을 확인하세요
                </p>
              </div>
            )}
        </div>

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

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {tasksWithDBStatus.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">오늘의 업무를 입력해보세요</p>
              <p className="text-gray-400 text-xs mt-1">#프로젝트명 업무내용</p>
            </div>
          )}

          {tasksWithDBStatus.map((task) => (
            <div
              key={task.lineIndex}
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                        #{task.project_name}
                      </span>
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
                      {task.detail && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          메모
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
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative h-2 bg-gray-200 rounded-lg">
                        <div
                          className={`absolute h-full rounded-lg transition-all ${
                            task.progress >= 100 ? 'bg-emerald-500' : 'bg-primary-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                        {/* 세부 업무 없을 때만 수동 조정 가능 */}
                        {!task.isCompleted && (!task.subtasks || task.subtasks.length === 0) && (
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value={task.progress}
                            onChange={(e) => handleProgressChange(task, parseInt(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        )}
                      </div>
                      <span className={`text-sm font-semibold w-12 text-right ${
                        task.progress >= 100 ? 'text-emerald-600' : 'text-gray-700'
                      }`}>
                        {task.progress}%
                      </span>
                    </div>
                    {task.subtasks && task.subtasks.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        세부 업무 {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length} 완료
                        {task.isCompleted ? ' + 메인 완료' : ''}
                      </p>
                    )}
                  </div>

                  {/* 세부 업무 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      세부 업무
                    </label>
                    <div className="space-y-1.5">
                      {task.subtasks && task.subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center gap-2 p-2 bg-white rounded-lg group"
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
                          <span className={`flex-1 text-sm ${
                            subtask.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}>
                            {subtask.content}
                          </span>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-700">
                        메모
                      </label>
                      {task.detail && editingMemo !== task.workLogId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteMemo(task)
                          }}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          삭제
                        </button>
                      )}
                    </div>

                    {editingMemo === task.workLogId ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={memoText}
                          onChange={(e) => setMemoText(e.target.value)}
                          placeholder="메모를 입력하세요..."
                          className="w-full p-3 text-sm border border-gray-200 rounded-lg outline-none ring-0 focus:border-primary-400 resize-none bg-white transition-colors"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleCancelMemo}
                            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveMemo(task)}
                            disabled={savingMemo}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50"
                          >
                            {savingMemo ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </div>
                    ) : task.detail ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEditMemo(task)
                        }}
                        className="p-3 bg-white rounded-lg text-sm text-gray-600 cursor-text hover:bg-gray-100 transition-colors"
                      >
                        {task.detail}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEditMemo(task)
                        }}
                        className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-500 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        + 메모 추가
                      </button>
                    )}
                  </div>

                  {/* 삭제 */}
                  <div className="flex justify-end pt-2 border-t border-gray-100">
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
          ))}
        </div>

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
      </div>
    </div>
  )
}
