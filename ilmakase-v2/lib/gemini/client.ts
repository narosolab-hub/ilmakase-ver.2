import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

/**
 * Gemini 모델 설정
 * - gemini-2.0-flash: 무료 tier 사용 가능
 */
export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.5,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 4096, // 경력기술서 등 긴 응답 지원
  },
})

export async function generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt

  const result = await geminiModel.generateContent(fullPrompt)
  const response = await result.response
  const text = response.text()

  // JSON 추출 (여러 패턴 시도)
  let jsonStr: string | null = null

  // 1. ```json ... ``` 블록
  const jsonBlockMatch = text.match(/```json\n?([\s\S]*?)\n?```/)
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1]
  }

  // 2. ``` ... ``` 블록 (언어 지정 없이)
  if (!jsonStr) {
    const codeBlockMatch = text.match(/```\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch && codeBlockMatch[1].trim().startsWith('{')) {
      jsonStr = codeBlockMatch[1]
    }
  }

  // 3. 순수 JSON 객체
  if (!jsonStr) {
    const jsonObjMatch = text.match(/\{[\s\S]*\}/)
    if (jsonObjMatch) {
      jsonStr = jsonObjMatch[0]
    }
  }

  if (!jsonStr) {
    console.error('AI 응답 (JSON 추출 실패):', text.slice(0, 500))
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다')
  }

  try {
    return JSON.parse(jsonStr) as T
  } catch (parseError) {
    console.error('JSON 파싱 실패:', jsonStr.slice(0, 500))
    throw new Error('AI 응답 JSON 파싱 실패')
  }
}
