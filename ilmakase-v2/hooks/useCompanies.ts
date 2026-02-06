'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { Company } from '@/types'

export function useCompanies() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // 회사 목록 로드
  const loadCompanies = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false, nullsFirst: false })

      if (fetchError) throw fetchError
      setCompanies(data || [])
    } catch (err) {
      console.error('회사 목록 로드 실패:', err)
      setError('회사 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  // 회사 생성
  const createCompany = async (companyData: {
    name: string
    position?: string
    department?: string
    start_date?: string
    end_date?: string
    is_current?: boolean
  }) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const { data, error } = await supabase
      .from('companies')
      .insert({
        user_id: user.id,
        name: companyData.name,
        position: companyData.position || null,
        department: companyData.department || null,
        start_date: companyData.start_date || null,
        end_date: companyData.is_current ? null : (companyData.end_date || null),
        is_current: companyData.is_current || false,
      })
      .select()
      .single()

    if (error) throw error

    setCompanies(prev => [data, ...prev])
    return data as Company
  }

  // 회사 수정
  const updateCompany = async (id: string, updates: Partial<Company>) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    setCompanies(prev => prev.map(c => c.id === id ? data : c))
    return data as Company
  }

  // 회사 삭제
  const deleteCompany = async (id: string) => {
    if (!user) throw new Error('로그인이 필요합니다')

    // 연결된 프로젝트의 company_id를 null로 설정
    await supabase
      .from('projects')
      .update({ company_id: null })
      .eq('company_id', id)

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    setCompanies(prev => prev.filter(c => c.id !== id))
  }

  // 프로젝트를 회사에 연결
  const linkProjectsToCompany = async (companyId: string, projectIds: string[]) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const { error } = await supabase
      .from('projects')
      .update({ company_id: companyId })
      .in('id', projectIds)
      .eq('user_id', user.id)

    if (error) throw error
  }

  // 프로젝트 회사 연결 해제
  const unlinkProjectFromCompany = async (projectId: string) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const { error } = await supabase
      .from('projects')
      .update({ company_id: null })
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (error) throw error
  }

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  return {
    companies,
    loading,
    error,
    createCompany,
    updateCompany,
    deleteCompany,
    linkProjectsToCompany,
    unlinkProjectFromCompany,
    reload: loadCompanies,
  }
}

export type { Company }
