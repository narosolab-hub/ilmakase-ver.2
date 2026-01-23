'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export function useCarryOver() {
  const { user } = useAuth()
  const [carryingOver, setCarryingOver] = useState(false)

  const generateCarryOverText = useCallback(async (targetDate: string): Promise<string> => {
    if (!user) return ''

    setCarryingOver(true)

    try {
      const supabase = createClient()

      // 최근 7일간의 미완료 업무 가져오기
      const targetDateObj = new Date(targetDate)
      const sevenDaysAgo = new Date(targetDateObj)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: workLogs } = await supabase
        .from('work_logs')
        .select('content, keywords, work_date, progress, is_completed')
        .eq('user_id', user.id)
        .gte('work_date', sevenDaysAgo.toISOString().split('T')[0])
        .lt('work_date', targetDate)
        .eq('is_completed', false)
        .order('work_date', { ascending: false })

      if (!workLogs || workLogs.length === 0) return ''

      // 중복 제거 (content 기준)
      const uniqueTasks = new Map<string, { content: string; project: string; date: string }>()

      workLogs.forEach(log => {
        if (!uniqueTasks.has(log.content)) {
          uniqueTasks.set(log.content, {
            content: log.content,
            project: log.keywords?.[0] || '기타',
            date: log.work_date
          })
        }
      })

      if (uniqueTasks.size === 0) return ''

      // 미완료 업무 텍스트 생성
      // 프로젝트명에 띄어쓰기가 있으면 / 구분자 사용
      const incompleteTasks = Array.from(uniqueTasks.values())
        .map(task => {
          const hasSpace = task.project.includes(' ')
          return hasSpace
            ? `#${task.project}/ ${task.content}`
            : `#${task.project} ${task.content}`
        })
        .join('\n')

      return `${incompleteTasks}\n`
    } catch (err) {
      console.error('Carry over failed:', err)
      return ''
    } finally {
      setCarryingOver(false)
    }
  }, [user])

  return { generateCarryOverText, carryingOver }
}
