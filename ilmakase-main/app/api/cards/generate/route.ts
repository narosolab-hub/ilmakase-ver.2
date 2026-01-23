import { createClient } from '@/lib/supabase/server'
import { generateProjectCard } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

/**
 * 포트폴리오 카드 생성 API (4개 패턴 분석 = 20일 기록)
 * - project_id가 null인 패턴 분석 4개를 가져와서 1개의 포트폴리오 카드 생성
 * - 생성된 카드와 연결된 분석들의 project_id 업데이트 (ai_analyses에 project_id 필드 필요)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // project_id가 null인 패턴 분석 4개 조회 (날짜 오름차순)
    const { data: analyses, error: analysesError } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('user_id', user.id)
      .is('project_id', null)
      .order('created_at', { ascending: true })
      .limit(4)

    if (analysesError) {
      console.error('패턴 분석 조회 실패:', analysesError)
      throw analysesError
    }

    if (!analyses || analyses.length < 4) {
      console.log(`패턴 분석 부족: ${analyses?.length || 0}개 (필요: 4개)`)
      return NextResponse.json(
        { error: '포트폴리오 카드를 생성하려면 최소 4개의 패턴 분석이 필요합니다 (총 20일의 기록)' },
        { status: 400 }
      )
    }

    console.log(`패턴 분석 ${analyses.length}개 조회 성공`)

    // 4개 분석의 모든 기록 ID 수집
    const allRecordIds: string[] = []
    analyses.forEach(analysis => {
      if (analysis.record_ids && Array.isArray(analysis.record_ids)) {
        allRecordIds.push(...analysis.record_ids)
      } else {
        console.warn('record_ids가 배열이 아닙니다:', analysis.id, analysis.record_ids)
      }
    })

    console.log(`총 ${allRecordIds.length}개 기록 ID 수집`)

    if (allRecordIds.length < 20) {
      console.log(`기록 ID 부족: ${allRecordIds.length}개 (필요: 20개)`)
      return NextResponse.json(
        { error: `기록이 부족합니다. 현재 ${allRecordIds.length}개, 필요: 20개` },
        { status: 400 }
      )
    }

    // 모든 기록 조회
    const { data: records, error: recordsError } = await supabase
      .from('records')
      .select('*')
      .in('id', allRecordIds)
      .order('date', { ascending: true })

    if (recordsError) {
      console.error('기록 조회 실패:', recordsError)
      throw recordsError
    }

    if (!records || records.length < 20) {
      console.log(`기록 부족: ${records?.length || 0}개 (필요: 20개)`)
      return NextResponse.json(
        { error: `기록을 불러오는데 실패했습니다. ${records?.length || 0}개만 조회됨` },
        { status: 500 }
      )
    }

    console.log(`기록 ${records.length}개 조회 성공`)

    // AI로 포트폴리오 카드 생성 (20일 기록)
    console.log('AI 카드 생성 시작...')
    const cardData = await generateProjectCard(records)
    console.log('AI 카드 생성 완료:', cardData.title)

    // 기간 계산 (첫 날짜 ~ 마지막 날짜)
    const periodStart = records[0].date
    const periodEnd = records[records.length - 1].date

    // 카드 DB에 저장
    const { data: newCard, error: cardError } = await supabase
      .from('project_cards')
      .insert({
        user_id: user.id,
        analysis_ids: analyses.map((a) => a.id),
        record_ids: allRecordIds,
        title: cardData.title,
        period_start: periodStart,
        period_end: periodEnd,
        tasks: cardData.tasks,
        results: cardData.results || [],
        thinking_summary: cardData.thinking_summary,
      })
      .select()
      .single()

    if (cardError) throw cardError

    // 연결된 분석들의 project_id 업데이트
    const { error: updateAnalysisError } = await supabase
      .from('ai_analyses')
      .update({ project_id: newCard.id })
      .in('id', analyses.map((a) => a.id))

    if (updateAnalysisError) throw updateAnalysisError

    // 연결된 기록들의 project_id도 업데이트
    const { error: updateRecordsError } = await supabase
      .from('records')
      .update({ project_id: newCard.id })
      .in('id', allRecordIds)

    if (updateRecordsError) throw updateRecordsError

    return NextResponse.json({
      card: newCard,
      message: '포트폴리오 카드가 생성되었습니다!',
    })
  } catch (error: any) {
    console.error('카드 생성 실패:', error)
    console.error('에러 상세:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      { 
        error: error.message || '카드 생성에 실패했습니다',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
