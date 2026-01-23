import { generateInstantPreview } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

// 게스트용 AI 미리보기 (인증 불필요, DB 저장 없음)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contents } = body

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

    // AI 즉시 미리보기 생성 (DB 저장 없음)
    let preview = null
    try {
      preview = await generateInstantPreview(contents)
    } catch (aiError: any) {
      console.error('게스트 AI 미리보기 생성 실패:', aiError)
      return NextResponse.json(
        { error: 'AI 분석에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      preview,
      message: '체험 모드입니다. 결과를 저장하려면 회원가입이 필요해요!',
    })
  } catch (error: any) {
    console.error('게스트 체험 에러:', error)
    return NextResponse.json(
      { error: error.message || '처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}


