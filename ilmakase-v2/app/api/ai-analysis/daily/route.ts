import { createClient } from '@/lib/supabase/server'
import { generateDailyAnalysis } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

// 일일 AI 분석
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { workLogs } = await request.json()

    if (!workLogs || workLogs.length === 0) {
      return NextResponse.json({ error: '분석할 업무가 없습니다' }, { status: 400 })
    }

    // 사용자 정보 및 크레딧 확인
    const { data: userData } = await supabase
      .from('users')
      .select('plan, ai_credits_used, credits_reset_at')
      .eq('id', user.id)
      .single()

    // 무료 플랜 크레딧 확인 (월 3회)
    if (userData?.plan === 'free') {
      const now = new Date()
      const resetAt = userData.credits_reset_at ? new Date(userData.credits_reset_at) : null

      // 월이 바뀌면 크레딧 리셋
      if (!resetAt || resetAt.getMonth() !== now.getMonth()) {
        await supabase
          .from('users')
          .update({
            ai_credits_used: 0,
            credits_reset_at: now.toISOString(),
          })
          .eq('id', user.id)
      } else if ((userData.ai_credits_used ?? 0) >= 3) {
        return NextResponse.json(
          { error: '이번 달 무료 AI 분석 횟수를 모두 사용했습니다. 업그레이드하시면 무제한으로 사용할 수 있어요!' },
          { status: 403 }
        )
      }
    }

    // AI 분석 실행
    const analysis = await generateDailyAnalysis(workLogs)

    // 크레딧 사용 기록
    if (userData?.plan === 'free') {
      await supabase
        .from('users')
        .update({
          ai_credits_used: (userData.ai_credits_used || 0) + 1,
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      analysis,
      creditsRemaining: userData?.plan === 'free'
        ? Math.max(0, 3 - (userData.ai_credits_used || 0) - 1)
        : -1, // -1 = 무제한
    })
  } catch (error: unknown) {
    console.error('AI 분석 에러:', error)
    return NextResponse.json(
      { error: 'AI 분석에 실패했습니다' },
      { status: 500 }
    )
  }
}
