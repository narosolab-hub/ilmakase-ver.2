'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { createClient } from '@/lib/supabase/client'
import type { Situation, TimePreference } from '@/types'

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    situation: '' as Situation | '',
    main_work: '',
    record_reason: '',
    time_preference: '' as TimePreference | '',
    emotional_phrase: '',
  })
  const [loading, setLoading] = useState(false)

  const totalSteps = 5

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else if (currentStep === totalSteps) {
      // 마지막 단계: 완료 화면으로
      setCurrentStep(6) // Final step
    } else {
      // 온보딩 데이터 저장
      await saveOnboarding()
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const saveOnboarding = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            situation: formData.situation as Situation,
            main_work: formData.main_work,
            record_reason: formData.record_reason,
            time_preference: formData.time_preference as TimePreference,
            emotional_phrase: formData.emotional_phrase,
          })
          .eq('id', user.id)

        if (error) throw error
        router.push('/home')
      }
    } catch (error) {
      console.error('온보딩 저장 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return !!formData.situation
      case 2:
        return formData.main_work.length > 0
      case 3:
        return !!formData.record_reason
      case 4:
        return !!formData.time_preference
      case 5:
        return !!formData.emotional_phrase
      case 6:
        return true
      default:
        return false
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      {currentStep <= totalSteps && (
        <header className="pt-6 pb-2 px-6 bg-white sticky top-0 z-10">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrev}
              className={`text-gray-400 hover:text-gray-600 transition ${currentStep === 1 ? 'opacity-0 cursor-default' : ''}`}
              disabled={currentStep === 1}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <span className="text-xs font-bold text-gray-400 tracking-widest">
              {currentStep} / {totalSteps}
            </span>
            <div className="w-4"></div>
          </div>
          <ProgressBar current={currentStep} total={totalSteps} />
        </header>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-28">
        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              지금 당신의<br />상황은 어떤가요?
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              당신에게 딱 맞는 기록 가이드를 드릴게요.
            </p>
            <div className="space-y-3">
              <SelectionCard
                icon="🏢"
                label="회사 다니는 중이에요"
                selected={formData.situation === 'working'}
                onClick={() => setFormData({ ...formData, situation: 'working' })}
              />
              <SelectionCard
                icon="🔍"
                label="취업/이직 준비 중이에요"
                selected={formData.situation === 'job_seeking'}
                onClick={() => setFormData({ ...formData, situation: 'job_seeking' })}
              />
              <SelectionCard
                icon="💼"
                label="프리랜서 / 사이드 프로젝트"
                selected={formData.situation === 'freelance'}
                onClick={() => setFormData({ ...formData, situation: 'freelance' })}
              />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              요즘 가장<br />자주 하는 일은 뭐예요?
            </h2>
            <div className="relative mt-8">
              <input
                type="text"
                value={formData.main_work}
                onChange={(e) => setFormData({ ...formData, main_work: e.target.value })}
                className="w-full text-lg border-b-2 border-gray-200 py-3 focus:outline-none focus:border-primary-500 bg-transparent placeholder-gray-300 transition-colors"
                placeholder="예: 기획, 마케팅, 개발..."
                maxLength={50}
              />
              <p className="text-xs text-gray-400 mt-3">💡 구체적이지 않아도 괜찮아요.</p>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              기록을 남기고 싶은<br />진짜 이유는?
            </h2>
            <div className="space-y-3 mt-8">
              <SelectionCard
                label="📄 나중에 이직/취업할 때 쓰려고"
                selected={formData.record_reason === '이직취업'}
                onClick={() => setFormData({ ...formData, record_reason: '이직취업' })}
              />
              <SelectionCard
                label="🗂️ 내가 뭘 해왔는지 정리하고 싶어서"
                selected={formData.record_reason === '정리'}
                onClick={() => setFormData({ ...formData, record_reason: '정리' })}
              />
              <SelectionCard
                label="📈 성장하고 있는지 알고 싶어서"
                selected={formData.record_reason === '성장'}
                onClick={() => setFormData({ ...formData, record_reason: '성장' })}
              />
              <SelectionCard
                label="💡 그냥 추천 받아서 / 궁금해서"
                selected={formData.record_reason === '궁금'}
                onClick={() => setFormData({ ...formData, record_reason: '궁금' })}
              />
            </div>
          </div>
        )}

        {/* Step 4 */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              기록하는 데<br />얼마나 쓰고 싶으세요?
            </h2>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <SelectionCard
                icon="⚡"
                label="하루 3분"
                selected={formData.time_preference === '3min'}
                onClick={() => setFormData({ ...formData, time_preference: '3min' })}
                vertical
              />
              <SelectionCard
                icon="☕"
                label="하루 5분"
                selected={formData.time_preference === '5min'}
                onClick={() => setFormData({ ...formData, time_preference: '5min' })}
                vertical
              />
            </div>
          </div>
        )}

        {/* Step 5 */}
        {currentStep === 5 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              마지막으로,<br />이 문장 중 마음에 드는 건?
            </h2>
            <div className="space-y-3 mt-8">
              <SelectionCard
                label='"나는 아직 정리되지 않았을 뿐이다"'
                selected={formData.emotional_phrase === '정리되지않음'}
                onClick={() => setFormData({ ...formData, emotional_phrase: '정리되지않음' })}
              />
              <SelectionCard
                label='"잘하고 있는지 확인받고 싶다"'
                selected={formData.emotional_phrase === '확인받고싶음'}
                onClick={() => setFormData({ ...formData, emotional_phrase: '확인받고싶음' })}
              />
              <SelectionCard
                label='"회사 밖에서도 통하는 사람이 되고 싶다"'
                selected={formData.emotional_phrase === '통하는사람'}
                onClick={() => setFormData({ ...formData, emotional_phrase: '통하는사람' })}
              />
              <SelectionCard
                label='"내 경험을 말로 설명하고 싶다"'
                selected={formData.emotional_phrase === '설명하고싶음'}
                onClick={() => setFormData({ ...formData, emotional_phrase: '설명하고싶음' })}
              />
            </div>
          </div>
        )}

        {/* Final Step */}
        {currentStep === 6 && (
          <div className="text-center pt-10 animate-fade-in">
            <div className="mb-6 animate-bounce text-5xl">🙌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">좋아요.</h2>
            <div className="bg-gray-50 p-6 rounded-2xl mx-2 mb-8 border border-gray-100">
              <p className="text-gray-600 leading-relaxed">
                완벽하게 쓸 필요 없어요.<br /><br />
                오늘 한 일,<br />
                간단하게 기록해 보세요.<br /><br />
                일마카세가<br />
                <span className="text-primary-600 font-bold">'쓸 수 있는 이야기'</span>로 바꿔줄게요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 max-w-[420px] mx-auto z-20">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleNext}
          disabled={!isStepValid()}
          loading={loading}
        >
          {currentStep === 6 ? '일마카세 시작하기' : '다음으로'}
        </Button>
      </div>
    </div>
  )
}

// Selection Card Component
function SelectionCard({
  icon,
  label,
  selected,
  onClick,
  vertical = false,
}: {
  icon?: string
  label: string
  selected: boolean
  onClick: () => void
  vertical?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-5 cursor-pointer hover:bg-gray-50 transition flex items-center gap-4 ${
        selected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'
      } ${vertical ? 'flex-col text-center' : ''}`}
    >
      {icon && (
        <div className={`${vertical ? 'text-3xl mb-2' : 'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl'}`}>
          {icon}
        </div>
      )}
      <span className={`font-medium ${selected ? 'text-primary-700' : 'text-gray-700'} ${vertical ? 'text-lg font-bold' : ''}`}>
        {label}
      </span>
    </div>
  )
}

