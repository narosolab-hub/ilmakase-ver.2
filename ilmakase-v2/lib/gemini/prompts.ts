import { generateJSON } from './client'
import type {
  MentorFeedback,
  ProjectWorkGroup
} from '@/types'

/**
 * 월간 회고 - AI 사수 피드백
 * 실제 업무 내용(content, detail, subtasks)을 기반으로 구체적 피드백
 */
export async function generateMentorFeedback(
  yearMonth: string,
  projects: ProjectWorkGroup[],
  totalTasks: number,
  completedTasks: number
): Promise<MentorFeedback> {
  const systemPrompt = `당신은 같은 팀에서 3년 동안 함께 일한 믿음직한 사수예요.
후배의 한 달 업무를 보고 진심 어린 피드백을 주는 1:1 면담 자리입니다.

당신의 특징:
- 구체적인 업무명을 언급하면서 칭찬해요 ("XX 작업 잘했더라")
- 개선점은 부드럽지만 명확하게 ("이 부분은 이렇게 해보면 어때요?")
- 실제 업무 내용을 보고 말하지, 없는 얘기를 지어내지 않아요
- 가끔 "나도 그때 이랬는데~" 같은 공감 표현

절대 금지:
- "혁신적인", "체계적인", "효율적인" 같은 AI스러운 표현
- "~에 기여하셨습니다", "성공적으로 수행하셨습니다" 같은 딱딱한 표현
- 없는 내용을 지어내기 (데이터에 없으면 언급하지 말 것)
- 너무 뻔한 조언 ("계획을 세우세요", "소통을 잘 하세요")`

  // 프로젝트별 업무 내용 정리 (토큰 제한 대비: 프로젝트당 최대 15개, 최대 10개 프로젝트)
  const projectsText = projects.slice(0, 10).map(p => {
    const tasksText = p.tasks.slice(0, 15).map(t => {
      const status = t.isCompleted ? '완료' : `${t.progress}%`
      const detail = t.detail ? ` (메모: ${t.detail.slice(0, 80)})` : ''
      const subtaskInfo = t.subtasks && t.subtasks.length > 0
        ? ` [세부: ${t.subtasks.map(s => `${s.content}${s.is_completed ? '(완)' : ''}`).join(', ')}]`
        : ''
      return `  - [${status}] ${t.content}${detail}${subtaskInfo}`
    }).join('\n')

    return `[${p.projectName}] (${p.completedCount}/${p.totalCount} 완료)\n${tasksText}`
  }).join('\n\n')

  const prompt = `${yearMonth} 한 달 동안 후배가 한 업무예요. 피드백 부탁드려요.

전체: ${totalTasks}개 업무, ${completedTasks}개 완료 (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)

${projectsText}

위 업무 내용을 보고 피드백해주세요.
실제로 한 업무명을 언급하면서 구체적으로요.
없는 내용은 절대 지어내지 마세요.

JSON:
{
  "mentorSummary": "한 달 총평 2-3문장 (구체적인 업무 언급하면서)",
  "goodPoints": [
    {
      "title": "잘한 점 제목 (짧게)",
      "detail": "구체적으로 왜 잘했는지 (실제 업무명 언급)",
      "relatedWork": "관련 업무/프로젝트명"
    }
  ],
  "improvementPoints": [
    {
      "title": "개선할 점 제목 (짧게)",
      "detail": "어떻게 개선하면 좋을지 (부드럽게)",
      "relatedWork": "관련 업무/프로젝트명"
    }
  ],
  "nextMonthTips": [
    "다음 달에 실천할 수 있는 구체적인 제안 1",
    "다음 달에 실천할 수 있는 구체적인 제안 2"
  ]
}`

  return generateJSON<MentorFeedback>(prompt, systemPrompt)
}
