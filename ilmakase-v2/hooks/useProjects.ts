'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { Project, ProjectOutcome } from '@/types'

export type { Project, ProjectOutcome }

export function useProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProjects(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = useCallback(async (
    name: string,
    options?: {
      description?: string
      keywords?: string[]
      auto_matched?: boolean
      // 경력기술서용 필드
      role?: string
      team_size?: string
      tech_stack?: string[]
      outcomes?: ProjectOutcome[]
      contribution?: string
      summary?: string
    }
  ) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: options?.description,
        keywords: options?.keywords || [],
        auto_matched: options?.auto_matched || false,
        start_date: new Date().toISOString().split('T')[0],
        // 경력기술서용 필드
        role: options?.role,
        team_size: options?.team_size,
        tech_stack: options?.tech_stack || [],
        outcomes: options?.outcomes || [],
        contribution: options?.contribution,
        summary: options?.summary,
      })
      .select()
      .single()

    if (error) {
      console.error('createProject 에러:', JSON.stringify(error, null, 2))
      console.error('에러 코드:', error.code)
      console.error('에러 메시지:', error.message)
      throw error
    }

    setProjects(prev => [data, ...prev])
    return data
  }, [user])

  const updateProject = useCallback(async (
    id: string,
    updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>
  ) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    setProjects(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [user])

  const deleteProject = useCallback(async (id: string) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    setProjects(prev => prev.filter(p => p.id !== id))
  }, [user])

  // 프로젝트명으로 검색/매칭
  const findProjectByName = useCallback((name: string): Project | undefined => {
    const lowerName = name.toLowerCase()
    return projects.find(p =>
      p.name.toLowerCase() === lowerName ||
      p.keywords.some(k => k.toLowerCase() === lowerName)
    )
  }, [projects])

  // 키워드로 유사 프로젝트 검색
  const findSimilarProjects = useCallback((keywords: string[]): Project[] => {
    const lowerKeywords = keywords.map(k => k.toLowerCase())
    return projects.filter(p =>
      p.keywords.some(pk => lowerKeywords.includes(pk.toLowerCase())) ||
      lowerKeywords.some(k => p.name.toLowerCase().includes(k))
    )
  }, [projects])

  // 진행 중인 프로젝트만
  const activeProjects = projects.filter(p => p.status === '진행중')

  // 완료된 프로젝트만
  const completedProjects = projects.filter(p => p.status === '완료')

  return {
    projects,
    activeProjects,
    completedProjects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    findProjectByName,
    findSimilarProjects,
    reload: fetchProjects,
  }
}
