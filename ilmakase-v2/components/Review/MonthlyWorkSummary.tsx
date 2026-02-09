'use client'

import { useState } from 'react'
import type { MonthlyWorkSummary as MonthlyWorkSummaryType } from '@/types'

interface Props {
  workSummary: MonthlyWorkSummaryType
}

export function MonthlyWorkSummary({ workSummary }: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (key: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (workSummary.totalTasks === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">이번 달 뭐 했지?</h3>
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">📭</div>
          <p>이번 달은 아직 업무 기록이 없어요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">이번 달 뭐 했지?</h3>

      <div className="space-y-3">
        {workSummary.projects.map((project) => {
          const key = project.projectId || '__none__'
          const isExpanded = expandedProjects.has(key)
          const completionRate = project.totalCount > 0
            ? Math.round((project.completedCount / project.totalCount) * 100)
            : 0

          return (
            <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* 프로젝트 헤더 */}
              <button
                onClick={() => toggleProject(key)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isExpanded ? '📂' : '📁'}</span>
                  <div className="text-left">
                    <span className="font-medium text-gray-900">{project.projectName}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      {project.completedCount}/{project.totalCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{completionRate}%</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* 업무 목록 (펼침) */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50/50">
                  {project.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 ${task.isCompleted ? 'text-emerald-500' : 'text-gray-300'}`}>
                        {task.isCompleted ? '✓' : '○'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={task.isCompleted ? 'text-gray-500' : 'text-gray-700'}>
                          {task.content}
                        </span>
                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="ml-1.5 text-xs text-gray-400">
                            (세부 {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length})
                          </span>
                        )}
                      </div>
                      {!task.isCompleted && task.progress > 0 && (
                        <span className="text-xs text-primary-500 flex-shrink-0">{task.progress}%</span>
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
  )
}
