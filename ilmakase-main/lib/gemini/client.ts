import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export function getGeminiModel() {
  // gemini-flash-latest: 항상 최신 Flash 버전을 자동으로 사용
  // 현재 gemini-2.5-flash를 가리킴 (1M+ 입력 토큰, 65K 출력 토큰)
  // 무료 API 키에서도 안정적으로 작동
  return genAI.getGenerativeModel({ 
    model: 'gemini-flash-latest',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192, // 5개 이상 업무 분석을 위해 증가 (기본 2048 → 8192)
    },
  })
}

// JSON 응답을 강제하는 프롬프트 헬퍼
export async function generateJSON<T>(prompt: string, systemPrompt: string): Promise<T> {
  const model = getGeminiModel()
  
  const fullPrompt = `${systemPrompt}

중요: 반드시 JSON 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.

${prompt}

JSON 응답:`

  try {
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    
    // JSON 추출 (```json ... ``` 형태로 올 수 있음)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('AI 응답 텍스트:', text.substring(0, 500))
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다')
    }
    
    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch (parseError: any) {
      console.error('JSON 파싱 에러:', parseError.message)
      console.error('파싱 시도한 JSON:', jsonMatch[0].substring(0, 500))
      throw new Error(`JSON 파싱 실패: ${parseError.message}`)
    }
  } catch (error: any) {
    // Gemini API 에러 처리
    if (error.message?.includes('SAFETY') || error.message?.includes('safety')) {
      throw new Error('AI 응답이 안전 필터에 걸렸습니다. 내용을 수정해주세요.')
    }
    if (error.message?.includes('QUOTA') || error.message?.includes('quota')) {
      throw new Error('AI API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.')
    }
    if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT')) {
      throw new Error('AI 응답 시간이 초과되었습니다. 다시 시도해주세요.')
    }
    throw error
  }
}

