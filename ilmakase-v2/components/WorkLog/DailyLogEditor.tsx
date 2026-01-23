'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { parseAllTasks } from '@/lib/parser'
import { ParsedTask, AICoachingResponse } from '@/types'
import { useDailyLog } from '@/hooks/useDailyLog'
import { useWorkLogs } from '@/hooks/useWorkLogs'
import { useCarryOver } from '@/hooks/useCarryOver'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/UI'
import { dataCache, cacheKeys, hashTasks } from '@/lib/cache'

interface DailyLogEditorProps {
  targetDate: string
  onSave?: () => void
}

interface TaskWithDB extends ParsedTask {
  workLogId?: string
  detail?: string | null
}

interface IncompleteTask {
  content: string
  project: string
}

// 로컬 캐시용 타입
interface LocalTaskStatus {
  progress: number
  isCompleted: boolean
  detail?: string | null
}

export default function DailyLogEditor({ targetDate, onSave }: DailyLogEditorProps) {
  const { log, loading, saveLog } = useDailyLog(targetDate)
  const { workLogs, syncFromParsedTasks, updateWorkLog, deleteWorkLog, reload } = useWorkLogs(targetDate)
  const { generateCarryOverText, carryingOver } = useCarryOver()
  const { findProjectByName, createProject, projects } = useProjects()

  const [text, setText] = useState('')
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [incompleteTasks, setIncompleteTasks] = useState<IncompleteTask[]>([])
  const [showIncomplete, setShowIncomplete] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // AI 코칭 상태
  const [aiCoaching, setAiCoaching] = useState<AICoachingResponse | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [showCoaching, setShowCoaching] = useState(true)
  const [aiError, setAiError] = useState<string | null>(null)
  const lastTasksHashRef = useRef<string>('')

  // 로컬 상태 캐시 (UI 즉시 반영용)
  const localStatusCache = useRef<Map<string, LocalTaskStatus>>(new Map())
  // 로컬 캐시 변경 트리거 (리렌더링용)
  const [cacheVersion, setCacheVersion] = useState(0)

  // 날짜 변경 시 로컬 캐시 초기화 (initialLoadDone은 유지 - 탭 전환 시 로딩 방지)
  useEffect(() => {
    localStatusCache.current.clear()
    setHasUnsavedChanges(false)
    setAiCoaching(null)  // AI 코칭도 초기화
    setAiError(null)
    lastTasksHashRef.current = ''
  }, [targetDate])

  // AI 코칭 요청 함수 (스마트 호출 - 캐싱 + 에러 처리)
  // TODO: 개발 완료 후 USE_MOCK_AI를 false로 변경
  const USE_MOCK_AI = true

  const requestAICoaching = async (tasks: Array<{ project: string; content: string }>, forceRefresh = false) => {
    if (tasks.length === 0) return

    // 🧪 더미 데이터 모드 (API 호출 없이 UI 테스트)
    if (USE_MOCK_AI) {
      setLoadingAI(true)
      // 로딩 효과를 위해 약간의 딜레이
      await new Promise(resolve => setTimeout(resolve, 800))

      const mockData: AICoachingResponse = {
        coaching: tasks.map(t => ({
          task: t.content,
          suggestions: getMockSuggestions(t.project, t.content),
          why: getMockWhy(t.project),
        })),
        overall_tip: getMockOverallTip(tasks),
      }

      setAiCoaching(mockData)
      setShowCoaching(true)
      setAiError(null)
      setLoadingAI(false)
      return
    }

    const tasksHash = hashTasks(tasks)

    // 같은 업무면 캐시 사용 (강제 새로고침이 아닌 경우)
    if (!forceRefresh && tasksHash === lastTasksHashRef.current && aiCoaching) {
      return
    }

    // 캐시에서 확인
    if (!forceRefresh) {
      const cached = dataCache.get<AICoachingResponse>(cacheKeys.aiCoaching(tasksHash))
      if (cached) {
        setAiCoaching(cached)
        setShowCoaching(true)
        setAiError(null)
        lastTasksHashRef.current = tasksHash
        return
      }
    }

    try {
      setLoadingAI(true)
      setAiError(null)

      const response = await fetch('/api/ai/suggest-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Rate limit 에러 감지
        if (response.status === 429 || errorData.error?.includes('quota') || errorData.error?.includes('limit')) {
          throw new Error('RATE_LIMIT')
        }
        throw new Error(errorData.error || 'AI 코칭 요청 실패')
      }

      const data: AICoachingResponse = await response.json()

      // 캐시에 저장 (10분 TTL)
      dataCache.set(cacheKeys.aiCoaching(tasksHash), data, 10 * 60 * 1000)
      lastTasksHashRef.current = tasksHash

      setAiCoaching(data)
      setShowCoaching(true)
    } catch (err) {
      console.error('AI 코칭 요청 오류:', err)

      if (err instanceof Error && err.message === 'RATE_LIMIT') {
        setAiError('요청이 많아 잠시 후 다시 시도해주세요 (1분 후)')
      } else {
        setAiError('AI 코칭을 불러오지 못했습니다')
      }
    } finally {
      setLoadingAI(false)
    }
  }

  // 🧪 더미 데이터 생성 함수들
  function getMockSuggestions(project: string, content: string): string[] {
    const contentLower = content.toLowerCase()

    // 기획 관련
    if (contentLower.includes('기획') || contentLower.includes('prd') || contentLower.includes('요구사항')) {
      return [
        '타겟 사용자 페르소나는 정의되어 있나요?',
        '경쟁사 벤치마킹 자료 첨부했는지 확인해보세요',
        '개발팀과 기술적 제약사항 사전 협의 필요해요',
        '런칭 후 성공 지표(KPI)도 미리 정해두면 좋아요',
      ]
    }

    // API/개발 관련
    if (contentLower.includes('api') || contentLower.includes('개발') || contentLower.includes('구현')) {
      return [
        '에러 케이스별 응답 처리는 정의되어 있나요?',
        'API 문서화 (Swagger/Notion 등) 같이 진행하면 좋아요',
        '테스트 코드도 함께 작성하는 습관 들여보세요',
        '보안 관련 체크리스트 확인해보셨나요? (인증, 권한 등)',
      ]
    }

    // 디자인 관련
    if (contentLower.includes('디자인') || contentLower.includes('ui') || contentLower.includes('ux')) {
      return [
        '모바일/태블릿 반응형도 고려되어 있나요?',
        '다크모드 대응 필요한지 확인해보세요',
        '접근성(a11y) 체크리스트 한번 훑어보세요',
        '디자인 시스템/컴포넌트 재사용 가능한지 검토해보세요',
      ]
    }

    // 회의 관련
    if (contentLower.includes('회의') || contentLower.includes('미팅') || contentLower.includes('논의')) {
      return [
        '회의 전 안건 미리 공유하면 효율적이에요',
        '회의록 작성 담당자 정해두셨나요?',
        '회의 후 액션 아이템과 담당자 명확히 정리해보세요',
        '다음 회의 일정도 미리 잡아두면 좋아요',
      ]
    }

    // 문서 관련
    if (contentLower.includes('문서') || contentLower.includes('정리') || contentLower.includes('작성')) {
      return [
        '문서 버전 관리는 어떻게 하고 계신가요?',
        '관련 담당자들에게 공유 및 피드백 요청했나요?',
        '나중에 찾기 쉽게 태그/폴더 정리해두세요',
      ]
    }

    // 테스트/QA 관련
    if (contentLower.includes('테스트') || contentLower.includes('qa') || contentLower.includes('검수')) {
      return [
        '엣지 케이스(예외 상황) 테스트도 포함되어 있나요?',
        '테스트 결과 기록/스크린샷 남겨두세요',
        '버그 발견 시 재현 조건 상세히 기록해두면 좋아요',
      ]
    }

    // 기본 제안
    return [
      '이 업무의 완료 기준이 명확한가요?',
      '관련 담당자에게 진행 상황 공유했나요?',
      '예상 소요 시간 산정해보셨나요?',
      '이 업무가 다른 업무에 영향을 주진 않나요?',
    ]
  }

  function getMockWhy(project: string): string {
    const whyOptions = [
      '주니어 때 이런 부분을 놓치기 쉬워요',
      '시니어들은 이런 것들을 습관적으로 체크해요',
      '나중에 문제 생기면 이 부분에서 원인을 찾게 돼요',
      '미리 챙겨두면 리뷰 때 좋은 피드백 받을 수 있어요',
      '이런 디테일이 프로와 아마추어를 구분해요',
    ]
    return whyOptions[Math.floor(Math.random() * whyOptions.length)]
  }

  function getMockOverallTip(tasks: Array<{ project: string; content: string }>): string {
    if (tasks.length >= 5) {
      return '오늘 할 일이 많네요! 우선순위 정해서 중요한 것부터 처리해보세요.'
    }
    if (tasks.length >= 3) {
      return '적당한 업무량이에요. 각 업무 사이에 짧은 휴식 넣으면 집중력 유지에 좋아요.'
    }
    if (tasks.length === 1) {
      return '하나의 업무에 집중하는 날이네요. 깊이 있게 파고들어보세요!'
    }
    return '오늘도 화이팅! 작은 성취감들이 모여 큰 성장이 돼요.'
  }

  // 로그 불러오기 & 미완료 업무 가져오기
  useEffect(() => {
    const initializeLog = async () => {
      if (log?.raw_content) {
        setText(log.raw_content)
      } else {
        // 미완료 업무를 텍스트에 직접 넣지 않고 별도로 보여줌
        setText('')
      }

      // 미완료 업무 가져오기 (별도 표시용)
      const carryOverText = await generateCarryOverText(targetDate)
      if (carryOverText) {
        const tasks = carryOverText.split('\n')
          .filter(line => line.trim().startsWith('#'))
          .map(line => {
            // 먼저 / 구분자 패턴 시도 (띄어쓰기 있는 프로젝트명)
            const slashMatch = line.match(/^#(.+?)\/\s*(.+)$/)
            if (slashMatch) {
              return { project: slashMatch[1].trim(), content: slashMatch[2].trim() }
            }
            // 기존 방식 (띄어쓰기 없는 프로젝트명)
            const spaceMatch = line.match(/^#(\S+)\s+(.+)$/)
            if (spaceMatch) {
              return { project: spaceMatch[1], content: spaceMatch[2].trim() }
            }
            return null
          })
          .filter((t): t is IncompleteTask => t !== null)
        setIncompleteTasks(tasks)
      }
    }

    if (!loading) {
      initializeLog().then(() => {
        setInitialLoadDone(true)
      })
    }
  }, [log, loading, targetDate, generateCarryOverText])

  // 텍스트 변경 시 실시간 파싱
  useEffect(() => {
    const tasks = parseAllTasks(text)
    setParsedTasks(tasks)
  }, [text])

  // 파싱된 태스크와 DB의 workLogs를 매칭하여 진행도/완료 상태 반영
  // 로컬 캐시를 우선 사용하여 입력 중 깜빡임 방지
  // cacheVersion으로 로컬 변경 시에만 리렌더링
  const tasksWithDBStatus: TaskWithDB[] = useMemo(() => {
    // cacheVersion을 의존성에 추가해서 로컬 캐시 변경 시 리렌더링
    void cacheVersion

    return parsedTasks.map(task => {
      const cacheKey = `${task.project_name}:${task.content}`
      const cachedStatus = localStatusCache.current.get(cacheKey)

      // content로 매칭 (같은 내용의 업무 찾기)
      const matchingLog = workLogs.find(
        wl => wl.content === task.content && wl.keywords?.includes(task.project_name)
      )

      if (matchingLog) {
        // 로컬 캐시가 있으면 우선 사용 (UI 즉시 반영)
        const status = cachedStatus || {
          progress: matchingLog.progress,
          isCompleted: matchingLog.is_completed,
          detail: matchingLog.detail,
        }
        return {
          ...task,
          workLogId: matchingLog.id,
          progress: status.progress,
          isCompleted: status.isCompleted,
          detail: status.detail ?? matchingLog.detail,
        }
      }

      // DB에 없는 새 태스크 - 로컬 캐시 확인
      if (cachedStatus) {
        return {
          ...task,
          progress: cachedStatus.progress,
          isCompleted: cachedStatus.isCompleted,
          detail: cachedStatus.detail,
        }
      }

      return task
    })
  }, [parsedTasks, workLogs, cacheVersion])


  // 체크박스 토글 - 로컬 캐시 먼저 업데이트 후 DB 저장
  const handleCheckboxToggle = async (task: TaskWithDB) => {
    const cacheKey = `${task.project_name}:${task.content}`
    const newCompleted = !task.isCompleted
    const newProgress = newCompleted ? 100 : 0

    // 로컬 캐시 즉시 업데이트 (UI 반영)
    localStatusCache.current.set(cacheKey, {
      progress: newProgress,
      isCompleted: newCompleted,
      detail: task.detail,
    })
    // 캐시 버전 증가로 리렌더링 트리거
    setCacheVersion(v => v + 1)

    if (!task.workLogId) {
      // 먼저 저장이 필요함
      await handleManualSave()
      return
    }

    try {
      await updateWorkLog(task.workLogId, {
        is_completed: newCompleted,
        progress: newProgress,
      })
      // WeeklySummary 갱신
      onSave?.()
    } catch (err) {
      console.error('체크박스 토글 실패:', err)
      // 실패 시 캐시 롤백
      localStatusCache.current.delete(cacheKey)
      setCacheVersion(v => v + 1)
    }
  }

  // 진척도 변경 - 로컬 캐시 먼저 업데이트 후 DB 저장
  const handleProgressChange = async (task: TaskWithDB, newProgress: number) => {
    const cacheKey = `${task.project_name}:${task.content}`
    const newCompleted = newProgress >= 100

    // 로컬 캐시 즉시 업데이트 (UI 반영)
    localStatusCache.current.set(cacheKey, {
      progress: newProgress,
      isCompleted: newCompleted,
      detail: task.detail,
    })
    // 캐시 버전 증가로 리렌더링 트리거
    setCacheVersion(v => v + 1)

    if (!task.workLogId) {
      // 먼저 저장이 필요함
      await handleManualSave()
      return
    }

    try {
      await updateWorkLog(task.workLogId, {
        progress: newProgress,
        is_completed: newCompleted,
      })
      // WeeklySummary 갱신
      onSave?.()
    } catch (err) {
      console.error('진척도 변경 실패:', err)
      // 실패 시 캐시 롤백
      localStatusCache.current.delete(cacheKey)
      setCacheVersion(v => v + 1)
    }
  }

  // 상세 내용 변경 - 로컬 캐시 먼저 업데이트 후 DB 저장
  const handleDetailChange = async (task: TaskWithDB, newDetail: string) => {
    const cacheKey = `${task.project_name}:${task.content}`

    // 로컬 캐시 즉시 업데이트
    const existing = localStatusCache.current.get(cacheKey)
    localStatusCache.current.set(cacheKey, {
      progress: existing?.progress ?? task.progress,
      isCompleted: existing?.isCompleted ?? task.isCompleted,
      detail: newDetail || null,
    })

    if (!task.workLogId) return

    try {
      await updateWorkLog(task.workLogId, {
        detail: newDetail || null,
      })
    } catch (err) {
      console.error('상세 내용 저장 실패:', err)
    }
  }

  // 업무 삭제
  const handleDeleteTask = async (task: TaskWithDB) => {
    if (!task.workLogId) return

    if (!confirm('이 업무를 삭제하시겠습니까?')) return

    try {
      await deleteWorkLog(task.workLogId)
      // 텍스트에서도 해당 줄 제거
      const lines = text.split('\n')
      const newLines = lines.filter((_, index) => index !== task.lineIndex)
      const newText = newLines.join('\n')
      setText(newText)
      setSelectedTask(null)
      // 저장
      await saveLog(newText, parseAllTasks(newText).length, 0)
    } catch (err) {
      console.error('업무 삭제 실패:', err)
      alert('삭제에 실패했습니다.')
    }
  }

  // 수동 저장 (전체 동기화)
  const handleManualSave = async () => {
    try {
      setSaving(true)
      console.log('1. 저장 시작')
      const tasks = parseAllTasks(text)
      console.log('2. 파싱 완료:', tasks.length, '개')

      // 로컬 캐시와 기존 workLogs에서 progress/completion 정보 가져오기
      const completedCount = tasks.filter(t => {
        const cacheKey = `${t.project_name}:${t.content}`
        const cached = localStatusCache.current.get(cacheKey)
        if (cached) return cached.isCompleted

        const existing = workLogs.find(wl => wl.content === t.content)
        return existing?.is_completed ?? false
      }).length
      const completionRate = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

      console.log('3. saveLog 시작')
      await saveLog(text, tasks.length, completionRate)
      console.log('4. saveLog 완료')

      // 프로젝트 매칭 + 새 프로젝트 자동 생성
      console.log('5. 프로젝트 매칭 시작')
      const projectMappings: Record<string, string> = {}
      const uniqueProjectNames = [...new Set(tasks.map(t => t.project_name))]
      console.log('5-1. 프로젝트 목록:', uniqueProjectNames)

      for (const projectName of uniqueProjectNames) {
        const existingProject = findProjectByName(projectName)
        if (existingProject) {
          projectMappings[projectName] = existingProject.id
          console.log(`5-2. 기존 프로젝트 매칭: ${projectName}`)
        } else {
          // 새 프로젝트 자동 생성 (auto_matched=true)
          try {
            console.log(`5-3. 새 프로젝트 생성 시도: ${projectName}`)
            const newProject = await createProject(projectName, {
              auto_matched: true,
              keywords: [projectName],
            })
            projectMappings[projectName] = newProject.id
            console.log(`5-4. 새 프로젝트 생성 완료: ${projectName}`)
          } catch (err) {
            console.error(`프로젝트 "${projectName}" 생성 실패:`, err)
          }
        }
      }
      console.log('6. 프로젝트 매핑 완료:', projectMappings)

      // 전체 동기화 - DB 상태로 갱신
      console.log('7. syncFromParsedTasks 시작')
      await syncFromParsedTasks(tasks, projectMappings)
      console.log('8. syncFromParsedTasks 완료')

      // 로컬 캐시 클리어 (DB 상태로 동기화됨)
      localStatusCache.current.clear()
      setHasUnsavedChanges(false)

      // 상위 컴포넌트에 저장 완료 알림 (WeeklySummary 갱신용)
      onSave?.()

      // AI 코칭 요청 (저장 후 자동)
      const tasksForAI = tasks.map(t => ({
        project: t.project_name,
        content: t.content,
      }))
      requestAICoaching(tasksForAI)
    } catch (err) {
      console.error('저장 실패:', err)
      if (err instanceof Error) {
        console.error('에러 메시지:', err.message)
        console.error('에러 스택:', err.stack)
      }
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 텍스트 변경 핸들러
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    setHasUnsavedChanges(true)
  }

  // 프로젝트명 포맷팅 헬퍼 (띄어쓰기 있으면 / 구분자 사용)
  const formatProjectLine = (project: string, content: string) => {
    const hasSpace = project.includes(' ')
    return hasSpace
      ? `#${project}/ ${content}`
      : `#${project} ${content}`
  }

  // 미완료 업무 추가
  const handleAddIncompleteTask = (task: IncompleteTask) => {
    const newLine = formatProjectLine(task.project, task.content)
    const newText = text ? `${text}\n${newLine}` : newLine
    setText(newText)
    setHasUnsavedChanges(true)
    // 추가한 업무는 목록에서 제거
    setIncompleteTasks(prev => prev.filter(t => t.content !== task.content))
  }

  // 모든 미완료 업무 추가
  const handleAddAllIncompleteTasks = () => {
    const newLines = incompleteTasks.map(t => formatProjectLine(t.project, t.content)).join('\n')
    const newText = text ? `${text}\n${newLines}` : newLines
    setText(newText)
    setHasUnsavedChanges(true)
    setIncompleteTasks([])
  }


  // 초기 로딩 시에만 로딩 화면 표시 (탭 전환 시에는 기존 UI 유지)
  if (!initialLoadDone && (loading || carryingOver)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const completedCount = tasksWithDBStatus.filter(t => t.isCompleted).length

  // 오늘 업무 진척도 계산 (각 업무 진척도 합산 / 최대 가능 진척도)
  const totalProgress = tasksWithDBStatus.reduce((sum, t) => sum + (t.progress || 0), 0)
  const maxProgress = tasksWithDBStatus.length * 100
  const overallProgressRate = maxProgress > 0
    ? Math.round((totalProgress / maxProgress) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
      {/* 왼쪽: 텍스트 입력 */}
      <div className="flex flex-col">
        {/* 미완료 업무 아코디언 */}
        {incompleteTasks.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            {/* 아코디언 헤더 */}
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

            {/* 아코디언 내용 */}
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
          className="flex-1 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm min-h-[280px] bg-white"
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

          {tasksWithDBStatus.map((task) => {
            // 해당 업무에 대한 AI 코칭 찾기
            const taskCoaching = aiCoaching?.coaching.find(
              c => c.task === task.content
            )

            return (
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
                        {/* AI 코칭 있으면 표시 */}
                        {taskCoaching && (
                          <span className="text-xs text-blue-500 flex items-center gap-0.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${
                        task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'
                      }`}>
                        {task.content}
                      </p>
                      {task.detail && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {task.detail}
                        </p>
                      )}
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
                  <div className="border-t border-gray-100">
                    {/* AI 체크리스트 (있을 때만) */}
                    {taskCoaching && (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-blue-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </span>
                          <span className="text-xs font-semibold text-blue-800">AI 사수의 체크리스트</span>
                        </div>
                        <div className="space-y-2">
                          {taskCoaching.suggestions.map((suggestion, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5 flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </span>
                              <p className="text-sm text-gray-700">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                        {taskCoaching.why && (
                          <p className="text-xs text-blue-600/70 mt-3 italic pl-6">
                            {taskCoaching.why}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 진척도 & 상세 내용 */}
                    <div className="p-4 bg-gray-50 space-y-4">
                      {/* 진척도 (미완료 시에만) */}
                      {!task.isCompleted && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            진척도
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 relative h-2 bg-gray-200 rounded-lg">
                              <div
                                className="absolute h-full bg-primary-500 rounded-lg transition-all"
                                style={{ width: `${task.progress}%` }}
                              />
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={task.progress}
                                onChange={(e) => handleProgressChange(task, parseInt(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                              {task.progress}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 상세 내용 입력 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          상세 내용
                        </label>
                        <textarea
                          placeholder="업무 상세 내용을 작성하세요..."
                          defaultValue={task.detail || ''}
                          onBlur={(e) => handleDetailChange(task, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white"
                          rows={2}
                        />
                      </div>

                      {/* 삭제 버튼 */}
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTask(task)
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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

        {/* AI 로딩 상태 */}
        {loadingAI && (
          <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-3 text-blue-600">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">업무를 분석하고 있어요...</span>
              </div>
            </div>
          </div>
        )}

        {/* AI 에러 */}
        {!loadingAI && aiError && (
          <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-sm text-amber-700 mb-3">{aiError}</p>
            <button
              onClick={() => {
                const tasks = parsedTasks.map(t => ({
                  project: t.project_name,
                  content: t.content,
                }))
                requestAICoaching(tasks, true)
              }}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* AI 전체 팁 (간단히) */}
        {!loadingAI && aiCoaching?.overall_tip && (
          <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-800 mb-1">AI 사수의 한마디</p>
                <p className="text-sm text-blue-700">{aiCoaching.overall_tip}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
