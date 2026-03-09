'use client'

import { Button } from '@/components/UI'
import { stripMarkdown } from '@/lib/utils'
import type { MentorFeedback as MentorFeedbackType, MentorPoint } from '@/types'

interface Props {
  feedback: MentorFeedbackType | null
  generating: boolean
  hasWorkLogs: boolean
  onGenerate: () => void
}

function PointCard({ point, color }: { point: MentorPoint; color: 'emerald' | 'amber' }) {
  const borderColor = color === 'emerald' ? 'border-l-emerald-400' : 'border-l-amber-400'

  return (
    <div className={`border-l-4 ${borderColor} bg-white rounded-r-xl p-4`}>
      <h5 className="font-medium text-gray-900 mb-1">{stripMarkdown(point.title)}</h5>
      <p className="text-sm text-gray-600">{stripMarkdown(point.detail)}</p>
      {point.relatedWork && (
        <p className="text-xs text-gray-400 mt-2">
          관련: {stripMarkdown(point.relatedWork)}
        </p>
      )}
    </div>
  )
}

export function MentorFeedback({ feedback, generating, hasWorkLogs, onGenerate }: Props) {
  // 피드백 없을 때
  if (!feedback) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">AI 사수 피드백</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🧑‍💼</div>
          <p className="text-gray-500 mb-4">
            {hasWorkLogs
              ? '이번 달 업무를 보고 사수가 피드백해줄게요'
              : '업무 기록이 있어야 피드백을 받을 수 있어요'
            }
          </p>
          <Button
            variant="primary"
            onClick={onGenerate}
            loading={generating}
            disabled={!hasWorkLogs}
          >
            AI 사수에게 피드백 받기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">AI 사수 피드백</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerate}
          loading={generating}
        >
          다시 생성하기
        </Button>
      </div>

      {/* 총평 */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🧑‍💼</span>
          <p className="text-gray-800 leading-relaxed">{stripMarkdown(feedback.mentorSummary)}</p>
        </div>
      </div>

      {/* 잘한 점 */}
      {feedback.goodPoints.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-1.5">
            <span>👍</span> 잘한 점
          </h4>
          <div className="space-y-3">
            {feedback.goodPoints.map((point, i) => (
              <PointCard key={i} point={point} color="emerald" />
            ))}
          </div>
        </div>
      )}

      {/* 개선할 점 */}
      {feedback.improvementPoints.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
            <span>💪</span> 이렇게 해보면 어때요?
          </h4>
          <div className="space-y-3">
            {feedback.improvementPoints.map((point, i) => (
              <PointCard key={i} point={point} color="amber" />
            ))}
          </div>
        </div>
      )}

      {/* 다음 달 제안 */}
      {feedback.nextMonthTips.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <span>🎯</span> 다음 달 제안
          </h4>
          <ul className="space-y-2">
            {feedback.nextMonthTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary-500 mt-0.5 flex-shrink-0">•</span>
                <span>{stripMarkdown(tip)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
