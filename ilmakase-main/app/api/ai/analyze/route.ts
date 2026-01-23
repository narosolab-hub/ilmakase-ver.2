import { createClient } from '@/lib/supabase/server'
import { generateAnalysis } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

// AI 분석 실행 (5개 기록 → 패턴 분석 카드)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 최근 기록 가져오기 (분석에 사용되지 않은 것만, 날짜 오름차순)
    const { data: records, error: recordsError } = await supabase
      .from('records')
      .select('*')
      .eq('user_id', user.id)
      .is('analysis_id', null)  // 패턴 분석에 사용되지 않은 기록
      .order('date', { ascending: true })
      .limit(5)

    if (recordsError) throw recordsError

    if (!records || records.length < 5) {
      return NextResponse.json(
        { error: '패턴 분석을 위해 최소 5일의 기록이 필요합니다' },
        { status: 400 }
      )
    }

    // AI 분석 실행
    const analysisResult = await generateAnalysis(
      records.map(r => ({
        date: r.date,
        contents: r.contents,
      }))
    )

    // 분석 결과 저장
    const { data: analysis, error: analysisError } = await supabase
      .from('ai_analyses')
      .insert({
        user_id: user.id,
        record_ids: records.map(r => r.id),
        pattern: analysisResult.pattern,
        workflow: analysisResult.workflow,
        top_keywords: analysisResult.keywords,
        insight: analysisResult.insight,
      })
      .select()
      .single()

    if (analysisError) throw analysisError

    // 기록에 키워드 업데이트 및 분석 연결
    for (const record of records) {
      await supabase
        .from('records')
        .update({ 
          keywords: analysisResult.keywords,
          analysis_id: analysis.id
        })
        .eq('id', record.id)
    }

    return NextResponse.json({ 
      analysis,
      message: '패턴 분석 카드가 생성되었습니다! 4개가 모이면 포트폴리오 카드를 만들 수 있어요.'
    })
  } catch (error: any) {
    console.error('AI 분석 에러:', error)
    return NextResponse.json(
      { error: 'AI 분석에 실패했습니다' },
      { status: 500 }
    )
  }
}

