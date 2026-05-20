'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DailyPrompt from './DailyPrompt';
import InterestSelector from './InterestSelector';
import PushPrompt from './PushPrompt';
import WelcomeStep from './WelcomeStep';

const STEPS = ['welcome', 'interests', 'daily', 'push'] as const;
const STORAGE_KEY = 'eduplay-onboarding-done';

export default function OnboardingFlow() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem(STORAGE_KEY);
      if (done || isGuest) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    }
  }, [isGuest]);

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const skip = completeOnboarding;

  if (dismissed) return null;

  const stepName = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md">
        {/* Progress dots */}
        <div className="mb-4 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step ? 'bg-indigo-500' : i < step ? 'bg-indigo-300' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {stepName === 'welcome' && (
          <WelcomeStep username={user?.username || 'Player'} onNext={next} onSkip={skip} />
        )}
        {stepName === 'interests' && <InterestSelector onNext={next} onSkip={skip} />}
        {stepName === 'daily' && <DailyPrompt onNext={next} onSkip={skip} />}
        {stepName === 'push' && <PushPrompt onDone={completeOnboarding} onSkip={skip} />}
      </div>
    </div>
  );
}
