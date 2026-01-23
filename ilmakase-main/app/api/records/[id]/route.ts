import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateInstantPreview } from '@/lib/gemini/prompts'

// 기록 상세 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params

    const { data: record, error } = await supabase
      .from('records')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    if (!record) {
      return NextResponse.json({ error: '기록을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ record })
  } catch (error: any) {
    console.error('기록 조회 에러:', error)
    return NextResponse.json(
      { error: '기록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// 기록 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { contents } = body

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return NextResponse.json(
        { error: '업무 내용을 입력해주세요' },
        { status: 400 }
      )
    }

    // 기존 기록 조회
    const { data: existingRecord, error: fetchError } = await supabase
      .from('records')
      .select('date')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { error: '기록을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 오늘 날짜인지 확인 (로컬 타임존 기준)
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    
    if (existingRecord.date !== today) {
      return NextResponse.json(
        { error: '오늘 작성한 기록만 수정할 수 있어요' },
        { status: 403 }
      )
    }

    // AI 재분석 실행
    const cleanedContents = contents.filter(c => c.trim()).map(c => c.trim())
    let preview = null
    try {
      preview = await generateInstantPreview(cleanedContents)
    } catch (aiError: any) {
      console.error('AI 분석 실패:', aiError)
      console.error('에러 상세:', {
        message: aiError.message,
        stack: aiError.stack,
        contentsCount: cleanedContents.length,
        contentsLength: cleanedContents.map(c => c.length).join(', ')
      })
      // AI 실패해도 기록은 저장되도록 계속 진행
    }

    // 수정 실행 (contents + ai_preview)
    const { data: record, error } = await supabase
      .from('records')
      .update({ 
        contents: cleanedContents,
        ai_preview: preview as any,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ record, preview })
  } catch (error: any) {
    console.error('기록 수정 에러:', error)
    return NextResponse.json(
      { error: error.message || '기록 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// 기록 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('기록 삭제 에러:', error)
    return NextResponse.json(
      { error: '기록 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}

