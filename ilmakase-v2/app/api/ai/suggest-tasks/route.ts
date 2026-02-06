import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTaskSuggestions } from '@/lib/gemini/prompts'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    // 요청 바디 파싱
    const body = await request.json()
    const { tasks, projectContext } = body as {
      tasks: Array<{ project: string; content: string }>
      projectContext?: { name: string; description?: string }
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: '업무 목록이 필요합니다' },
        { status: 400 }
      )
    }

    // AI 제안 생성
    const result = await generateTaskSuggestions(tasks, projectContext)

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI 제안 생성 오류:', error)

    // Gemini API 429 에러 (할당량 초과) 감지
    const errorMessage = error instanceof Error ? error.message : ''
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
      return NextResponse.json(
        { error: 'API 할당량 초과 - 잠시 후 다시 시도해주세요' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'AI 제안 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
