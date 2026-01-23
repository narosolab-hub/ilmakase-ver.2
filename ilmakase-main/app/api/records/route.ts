import { createClient } from '@/lib/supabase/server'
import { generateInstantPreview } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

// 기록 목록 조회
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const date = searchParams.get('date')

    let query = supabase
      .from('records')
      .select('*')
      .eq('user_id', user.id)

    // 특정 날짜 조회
    if (date) {
      query = query.eq('date', date)
    }

    const { data: records, error } = await query
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ records })
  } catch (error: any) {
    console.error('기록 조회 에러:', error)
    return NextResponse.json(
      { error: '기록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// 기록 작성 + AI 즉시 미리보기
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const { contents, date } = body

    // 입력 검증
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return NextResponse.json(
        { error: '최소 1개의 업무를 작성해주세요' },
        { status: 400 }
      )
    }

    // 각 항목 검증
    for (const item of contents) {
      if (!item || item.trim().length < 10) {
        return NextResponse.json(
          { error: '각 업무는 최소 10자 이상 입력해주세요' },
          { status: 400 }
        )
      }
      if (item.length > 500) {
        return NextResponse.json(
          { error: '각 업무는 최대 500자까지 입력 가능합니다' },
          { status: 400 }
        )
      }
    }

    // 로컬 타임존 기준 오늘 날짜
    let recordDate = date
    if (!recordDate) {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      recordDate = `${year}-${month}-${day}`
    }

    // 오늘 이미 작성했는지 확인 (하루 1회 제한)
    const { data: existingRecords } = await supabase
      .from('records')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', recordDate)
      .limit(1)

    if (existingRecords && existingRecords.length > 0) {
      return NextResponse.json(
        { error: '오늘은 이미 업무 일지를 작성했습니다' },
        { status: 400 }
      )
    }

    // AI 즉시 미리보기 생성
    let preview = null
    try {
      preview = await generateInstantPreview(contents)
    } catch (aiError: any) {
      console.error('AI 미리보기 생성 실패:', aiError)
      console.error('에러 상세:', {
        message: aiError.message,
        stack: aiError.stack,
        contentsCount: contents.length,
        contentsLength: contents.map(c => c.length).join(', ')
      })
      // AI 실패해도 기록은 저장되도록 계속 진행
    }

    // 기록 저장 (contents + ai_preview)
    const { data: record, error: recordError } = await supabase
      .from('records')
      .insert({
        user_id: user.id,
        contents: contents.map((c: string) => c.trim()),
        date: recordDate,
        ai_preview: preview as any,
      })
      .select()
      .single()

    if (recordError) throw recordError

    return NextResponse.json({
      record,
      preview,
    })
  } catch (error: any) {
    console.error('기록 작성 에러:', error)
    return NextResponse.json(
      { error: error.message || '기록 저장에 실패했습니다' },
      { status: 500 }
    )
  }
}

