'use client'

import { useState, useEffect } from 'react'
import type { MonthlyWorkSummary as MonthlyWorkSummaryType, DailyActivity } from '@/types'
import { getHolidays, buildHolidayMap } from '@/lib/holidays'

interface Props {
  workSummary: MonthlyWorkSummaryType
  yearMonth: string // 'yyyy-MM'
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function ActivityHeatmap({ yearMonth, dailyActivity, holidayMap }: {
  yearMonth: string
  dailyActivity: DailyActivity[]
  holidayMap: Map<string, string>
}) {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay()

  const activityMap = new Map(dailyActivity.map(d => [d.date, d]))

  const cells: Array<{ day: number | null }> = [
    ...Array.from({ length: firstDow }, () => ({ day: null })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1 })),
  ]

  function getDateStr(day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function getCellStyle(day: number | null) {
    if (!day) return ''
    const dateStr = getDateStr(day)
    const activity = activityMap.get(dateStr)
    if (!activity) return holidayMap.has(dateStr) ? 'bg-red-50 text-red-400' : 'bg-gray-100 text-gray-400'
    const rate = activity.taskCount > 0 ? activity.completedCount / activity.taskCount : 0
    if (rate >= 0.8) return 'bg-primary-500 text-white font-medium'
    if (rate >= 0.4) return 'bg-primary-300 text-white font-medium'
    return 'bg-primary-100 text-primary-700 font-medium'
  }

  function getTooltip(day: number | null) {
    if (!day) return undefined
    const dateStr = getDateStr(day)
    const holidayName = holidayMap.get(dateStr)
    const activity = activityMap.get(dateStr)
    const parts: string[] = []
    if (holidayName) parts.push(`🎌 ${holidayName}`)
    parts.push(activity ? `${activity.completedCount}/${activity.taskCount}개 완료` : '기록 없음')
    return `${day}일 — ${parts.join(' · ')}`
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {WEEKDAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => (
          <div
            key={i}
            title={getTooltip(cell.day)}
            className={`aspect-square rounded-md flex items-center justify-center text-[11px] transition-colors ${
              cell.day ? `cursor-default ${getCellStyle(cell.day)}` : ''
            }`}
          >
            {cell.day}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 mt-2">
        <span className="text-[10px] text-gray-400">완료율</span>
        {[
          { cls: 'bg-gray-100', label: '없음' },
          { cls: 'bg-primary-100', label: '낮음' },
          { cls: 'bg-primary-300', label: '보통' },
          { cls: 'bg-primary-500', label: '높음' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-0.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            <span className="text-[10px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MonthlyWorkSummary({ workSummary, yearMonth }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [holidayMap, setHolidayMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const year = parseInt(yearMonth.split('-')[0])
    getHolidays(year).then(h => setHolidayMap(buildHolidayMap(h)))
  }, [yearMonth])

  const toggleProject = (key: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (workSummary.totalTasks === 0) return null

  const completionRate = workSummary.totalTasks > 0
    ? Math.round((workSummary.completedTasks / workSummary.totalTasks) * 100)
    : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 헤더 — 클릭으로 토글 */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-gray-900">이번 달 뭐 했지?</span>
          <span className="text-sm text-gray-400">
            {workSummary.completedTasks}/{workSummary.totalTasks}개 완료 · {completionRate}%
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 펼쳤을 때: 2분할 레이아웃 (데스크톱) */}
      {isOpen && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] lg:divide-x divide-gray-100">
            {/* 좌: 활동 히트맵 */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">활동 캘린더</p>
              <ActivityHeatmap yearMonth={yearMonth} dailyActivity={workSummary.dailyActivity} holidayMap={holidayMap} />
            </div>

            {/* 우: 상세 업무 목록 */}
            <div className="p-5 border-t lg:border-t-0 border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">상세 업무</p>
              <div className="space-y-2 max-h-[36rem] overflow-y-auto pr-1">
                {workSummary.projects.map((project) => {
                  const key = project.projectId || '__none__'
                  const isExpanded = expandedProjects.has(key)
                  const rate = project.totalCount > 0
                    ? Math.round((project.completedCount / project.totalCount) * 100)
                    : 0

                  return (
                    <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleProject(key)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm flex-shrink-0">{isExpanded ? '📂' : '📁'}</span>
                          <span className="text-sm font-medium text-gray-900 truncate">{project.projectName}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{project.completedCount}/{project.totalCount}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-7 text-right">{rate}%</span>
                          <svg
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100">
                          {project.tasks.map((task, i) => (
                            <div
                              key={i}
                              className={`flex items-start gap-1.5 text-xs px-3 py-2 ${
                                i % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'
                              } ${i < project.tasks.length - 1 ? 'border-b border-gray-100' : ''}`}
                            >
                              <span className={`mt-0.5 flex-shrink-0 ${task.isCompleted ? 'text-emerald-500' : 'text-gray-300'}`}>
                                {task.isCompleted ? '✓' : '○'}
                              </span>
                              <span className={`flex-1 min-w-0 ${task.isCompleted ? 'text-gray-500' : 'text-gray-700'}`}>
                                {task.content}
                              </span>
                              {task.subtasks && task.subtasks.length > 0 && (
                                <span className="text-gray-400 flex-shrink-0">
                                  {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}
                                </span>
                              )}
                              {!task.isCompleted && task.progress > 0 && (
                                <span className="text-primary-500 flex-shrink-0">{task.progress}%</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
