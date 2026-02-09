import { createClient } from '@/lib/supabase/server'
import { suggestProjectMatch } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: '업무 내용이 필요합니다' }, { status: 400 })
    }

    // 사용자의 진행 중인 프로젝트 가져오기
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, keywords')
      .eq('user_id', user.id)
      .eq('status', '진행중')

    if (!projects || projects.length === 0) {
      // 프로젝트가 없으면 새 프로젝트 제안
      return NextResponse.json({
        matched: false,
        project: null,
        alternatives: [],
        suggestNew: true,
        suggestedName: extractProjectName(content),
      })
    }

    // AI를 사용한 매칭 (API 키가 있는 경우)
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        const result = await suggestProjectMatch(content, projects.map(p => ({ ...p, keywords: p.keywords ?? [] })))

        if (result.matched_project_id && result.confidence >= 0.8) {
          const matchedProject = projects.find(p => p.id === result.matched_project_id)
          return NextResponse.json({
            matched: true,
            project: matchedProject ? {
              id: matchedProject.id,
              name: matchedProject.name,
              score: result.confidence,
            } : null,
            alternatives: [],
            suggestNew: false,
          })
        }

        // 신뢰도가 낮으면 대안 제시
        return NextResponse.json({
          matched: false,
          project: null,
          alternatives: projects.slice(0, 3).map(p => ({
            id: p.id,
            name: p.name,
            score: 0.5,
          })),
          suggestNew: true,
          suggestedName: result.suggested_new_name || extractProjectName(content),
        })
      } catch (err) {
        console.error('AI 매칭 실패, 규칙 기반으로 대체:', err)
      }
    }

    // 규칙 기반 매칭 (폴백)
    const keywords = extractKeywords(content)
    const matches = projects
      .map(project => {
        const score = calculateMatchScore(keywords, project.keywords ?? [], project.name)
        return { ...project, score }
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)

    if (matches.length > 0 && matches[0].score >= 0.8) {
      return NextResponse.json({
        matched: true,
        project: {
          id: matches[0].id,
          name: matches[0].name,
          score: matches[0].score,
        },
        alternatives: matches.slice(1, 3).map(m => ({
          id: m.id,
          name: m.name,
          score: m.score,
        })),
        suggestNew: false,
      })
    }

    return NextResponse.json({
      matched: false,
      project: null,
      alternatives: matches.slice(0, 3).map(m => ({
        id: m.id,
        name: m.name,
        score: m.score,
      })),
      suggestNew: matches.length === 0,
      suggestedName: extractProjectName(content),
    })
  } catch (error: unknown) {
    console.error('프로젝트 자동 매칭 에러:', error)
    return NextResponse.json(
      { error: '프로젝트 매칭에 실패했습니다' },
      { status: 500 }
    )
  }
}

// 키워드 추출
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/)
  return words.filter(w => w.length >= 2 && !w.startsWith('#'))
}

// 프로젝트명 추출
function extractProjectName(text: string): string {
  // #태그가 있으면 그것을 사용
  const tagMatch = text.match(/#(\S+)/)
  if (tagMatch) return tagMatch[1]

  // 첫 2-3 단어를 프로젝트명으로
  const words = text.split(/\s+/).filter(w => w.length >= 2)
  return words.slice(0, 3).join(' ')
}

// 매칭 점수 계산
function calculateMatchScore(
  keywords: string[],
  projectKeywords: string[],
  projectName: string
): number {
  const lowerProjectName = projectName.toLowerCase()
  const lowerProjectKeywords = projectKeywords.map(k => k.toLowerCase())

  let score = 0
  let matches = 0

  for (const keyword of keywords) {
    // 프로젝트명에 포함
    if (lowerProjectName.includes(keyword)) {
      score += 0.4
      matches++
    }
    // 프로젝트 키워드에 포함
    if (lowerProjectKeywords.some(pk => pk.includes(keyword) || keyword.includes(pk))) {
      score += 0.3
      matches++
    }
  }

  // 정규화 (최대 1.0)
  return Math.min(1.0, score / Math.max(1, keywords.length))
}
