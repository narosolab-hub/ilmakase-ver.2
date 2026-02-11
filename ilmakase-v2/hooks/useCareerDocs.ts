'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { dataCache, cacheKeys } from '@/lib/cache'
import { mapCareerDocument, type CareerDocumentMapped } from '@/lib/mappers'
import type { Json } from '@/types/database'

export type { CareerDocumentMapped as CareerDocument }

export function useCareerDocs() {
  const { user } = useAuth()
  const [careerDocs, setCareerDocs] = useState<CareerDocumentMapped[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCareerDocs = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    const cacheKey = cacheKeys.careerDocs(user.id)
    const cached = dataCache.getImmediate<CareerDocumentMapped[]>(cacheKey)
    if (cached) {
      setCareerDocs(cached)
      setLoading(false)
    }

    try {
      if (!cached) setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('career_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map(mapCareerDocument)
      dataCache.set(cacheKey, mapped)
      setCareerDocs(mapped)
    } catch (err) {
      console.error('경력기술서 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchCareerDocs()
  }, [fetchCareerDocs])

  const saveCareerDoc = useCallback(async (doc: {
    companyId: string
    title: string
    content: string
    projectIds: string[]
    priorityConfig: { projectId: string; priority: string }[]
    periodStart?: string | null
    periodEnd?: string | null
    role?: string | null
  }) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const { data, error } = await supabase
      .from('career_documents')
      .insert({
        user_id: user.id,
        company_id: doc.companyId,
        title: doc.title,
        content: doc.content,
        project_ids: doc.projectIds,
        priority_config: doc.priorityConfig as unknown as Json,
        period_start: doc.periodStart ?? null,
        period_end: doc.periodEnd ?? null,
        role: doc.role ?? null,
      })
      .select()
      .single()

    if (error) throw error

    const mapped = mapCareerDocument(data)
    setCareerDocs(prev => [mapped, ...prev])
    dataCache.invalidate(cacheKeys.careerDocs(user.id))

    return mapped
  }, [user])

  const updateCareerDoc = useCallback(async (
    id: string,
    updates: { title?: string; content?: string }
  ) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const { data, error } = await supabase
      .from('career_documents')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    const mapped = mapCareerDocument(data)
    setCareerDocs(prev => prev.map(d => d.id === id ? mapped : d))
    dataCache.invalidate(cacheKeys.careerDocs(user.id))

    return mapped
  }, [user])

  const deleteCareerDoc = useCallback(async (id: string) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const { error } = await supabase
      .from('career_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    setCareerDocs(prev => prev.filter(d => d.id !== id))
    dataCache.invalidate(cacheKeys.careerDocs(user.id))
  }, [user])

  return {
    careerDocs,
    loading,
    saveCareerDoc,
    updateCareerDoc,
    deleteCareerDoc,
    reload: fetchCareerDocs,
  }
}
