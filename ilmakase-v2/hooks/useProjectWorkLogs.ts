'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { dataCache, cacheKeys } from '@/lib/cache'
import { mapWorkLog, mapWorkLogToDB, type WorkLog } from '@/lib/mappers'
import type { Project } from '@/types'

export interface ProjectWithWorkLogs {
  project: Project | null // null = 미분류
  workLogs: WorkLog[]
  stats: {
    totalTasks: number
    completedTasks: number
    completionRate: number
  }
}

export function useProjectWorkLogs() {
  const { user } = useAuth()
  const [projectWorkLogs, setProjectWorkLogs] = useState<ProjectWithWorkLogs[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    const cacheKey = cacheKeys.projectWorkLogs(user.id)
    const cached = dataCache.getImmediate<ProjectWithWorkLogs[]>(cacheKey)
    if (cached) {
      setProjectWorkLogs(cached)
      setLoading(false)
      setInitialLoadDone(true)
    }

    try {
      if (!cached) setLoading(true)
      const supabase = createClient()

      // 프로젝트와 work_logs를 병렬 조회
      const [projectsRes, workLogsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('work_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('work_date', { ascending: false }),
      ])

      if (projectsRes.error) throw projectsRes.error
      if (workLogsRes.error) throw workLogsRes.error

      const projects = (projectsRes.data || []) as unknown as Project[]
      const allWorkLogs = (workLogsRes.data || []).map(mapWorkLog)

      // project_id별로 그룹핑
      const groupedByProject = new Map<string | null, WorkLog[]>()
      for (const wl of allWorkLogs) {
        const key = wl.projectId
        if (!groupedByProject.has(key)) {
          groupedByProject.set(key, [])
        }
        groupedByProject.get(key)!.push(wl)
      }

      // 프로젝트별 데이터 구성
      const result: ProjectWithWorkLogs[] = []

      for (const project of projects) {
        const logs = groupedByProject.get(project.id) || []
        const completedTasks = logs.filter(l => l.isCompleted).length
        result.push({
          project,
          workLogs: logs,
          stats: {
            totalTasks: logs.length,
            completedTasks,
            completionRate: logs.length > 0 ? Math.round((completedTasks / logs.length) * 100) : 0,
          },
        })
        groupedByProject.delete(project.id)
      }

      // 미분류 업무 (project_id가 null이거나 매칭 안 되는 것들)
      const uncategorized: WorkLog[] = []
      for (const [, logs] of groupedByProject) {
        uncategorized.push(...logs)
      }
      if (uncategorized.length > 0) {
        const completedTasks = uncategorized.filter(l => l.isCompleted).length
        result.push({
          project: null,
          workLogs: uncategorized,
          stats: {
            totalTasks: uncategorized.length,
            completedTasks,
            completionRate: Math.round((completedTasks / uncategorized.length) * 100),
          },
        })
      }

      dataCache.set(cacheKey, result)
      setProjectWorkLogs(result)
    } catch (err) {
      console.error('프로젝트별 업무 조회 실패:', err)
    } finally {
      setLoading(false)
      setInitialLoadDone(true)
    }
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const updateWorkLog = useCallback(async (
    id: string,
    updates: Partial<WorkLog>
  ) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()
    const dbUpdates = mapWorkLogToDB(updates)

    const { data, error } = await supabase
      .from('work_logs')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    const mapped = mapWorkLog(data)

    // 로컬 상태 업데이트
    setProjectWorkLogs(prev => prev.map(group => ({
      ...group,
      workLogs: group.workLogs.map(wl => wl.id === id ? mapped : wl),
      stats: {
        ...group.stats,
        completedTasks: group.workLogs.map(wl => wl.id === id ? mapped : wl).filter(wl => wl.isCompleted).length,
        completionRate: (() => {
          const logs = group.workLogs.map(wl => wl.id === id ? mapped : wl)
          const completed = logs.filter(wl => wl.isCompleted).length
          return logs.length > 0 ? Math.round((completed / logs.length) * 100) : 0
        })(),
      },
    })))

    // 캐시 무효화
    dataCache.invalidate(cacheKeys.projectWorkLogs(user.id))

    return mapped
  }, [user])

  const deleteWorkLog = useCallback(async (id: string) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    // 로컬 상태 업데이트
    setProjectWorkLogs(prev => prev.map(group => {
      const filteredLogs = group.workLogs.filter(wl => wl.id !== id)
      const completedTasks = filteredLogs.filter(wl => wl.isCompleted).length
      return {
        ...group,
        workLogs: filteredLogs,
        stats: {
          totalTasks: filteredLogs.length,
          completedTasks,
          completionRate: filteredLogs.length > 0 ? Math.round((completedTasks / filteredLogs.length) * 100) : 0,
        },
      }
    }).filter(group => group.workLogs.length > 0 || group.project !== null))

    // 캐시 무효화
    dataCache.invalidate(cacheKeys.projectWorkLogs(user.id))
  }, [user])

  return {
    projectWorkLogs,
    loading,
    initialLoadDone,
    updateWorkLog,
    deleteWorkLog,
    reload: fetchAll,
  }
}
