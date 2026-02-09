'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/UI'
import type { KPTReflection as KPTReflectionType } from '@/types'

interface Props {
  initialKPT: KPTReflectionType
  saving: boolean
  onSave: (kpt: KPTReflectionType) => void
}

const KPT_ITEMS = [
  {
    key: 'keep' as const,
    label: 'Keep',
    subtitle: '잘했고 계속할 것',
    icon: '✅',
    color: 'emerald',
    placeholder: '이번 달 잘한 점, 계속하고 싶은 습관이나 방식을 적어보세요.\n\n예) 매일 업무 기록을 빠뜨리지 않았다, 세부 업무 체크리스트를 활용해서 빠짐없이 처리했다',
  },
  {
    key: 'problem' as const,
    label: 'Problem',
    subtitle: '아쉬웠던 것',
    icon: '🔍',
    color: 'amber',
    placeholder: '이번 달 아쉬웠던 점, 개선하고 싶은 부분을 적어보세요.\n\n예) 마감 직전에 몰아서 하는 경향이 있었다, 회의 후 정리를 바로 하지 않아서 까먹을 뻔했다',
  },
  {
    key: 'try' as const,
    label: 'Try',
    subtitle: '다음 달 시도할 것',
    icon: '🚀',
    color: 'blue',
    placeholder: '다음 달에 시도해볼 것, 실천 계획을 적어보세요.\n\n예) 업무 시작 전 10분 계획 세우기, 주 1회 업무 정리 시간 갖기',
  },
]

export function KPTReflection({ initialKPT, saving, onSave }: Props) {
  const [kpt, setKpt] = useState<KPTReflectionType>(initialKPT)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setKpt(initialKPT)
    setIsDirty(false)
  }, [initialKPT])

  const handleChange = (key: keyof KPTReflectionType, value: string) => {
    setKpt(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = () => {
    onSave(kpt)
    setIsDirty(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">내 회고 (KPT)</h3>

      <div className="space-y-5">
        {KPT_ITEMS.map(item => (
          <div key={item.key}>
            <label className="flex items-center gap-2 mb-2">
              <span>{item.icon}</span>
              <span className="font-semibold text-gray-900">{item.label}</span>
              <span className="text-sm text-gray-500">{item.subtitle}</span>
            </label>
            <textarea
              value={kpt[item.key]}
              onChange={e => handleChange(item.key, e.target.value)}
              placeholder={item.placeholder}
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 focus:outline-none resize-none transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        {isDirty && (
          <span className="text-xs text-gray-400">저장하지 않은 변경사항이 있어요</span>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={!isDirty}
        >
          저장
        </Button>
      </div>
    </div>
  )
}
