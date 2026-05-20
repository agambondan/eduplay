'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/i18n';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

interface Props {
  onDone: () => void;
  onSkip: () => void;
}

export default function PushPrompt({ onDone, onSkip }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const { subscribe, subscribed, permission } = usePushNotifications();

  const handleEnable = async () => {
    setLoading(true);
    try {
      await subscribe();
    } catch {
      // Permission denied or error
    } finally {
      setLoading(false);
      onDone();
    }
  };

  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-slate-800">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
        {subscribed || permission === 'granted' ? (
          <Bell className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <BellOff className="h-8 w-8 text-gray-400" />
        )}
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        {t('onboarding.push_title')}
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        {t('onboarding.push_desc')}
      </p>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleEnable}
          disabled={loading || subscribed}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? t('onboarding.push_processing') : subscribed ? t('onboarding.push_active') : t('onboarding.push_cta')}
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {subscribed ? t('onboarding.push_done') : t('onboarding.push_skip')}
        </button>
      </div>
      {subscribed && (
        <p className="mt-3 text-xs text-gray-400">{t('onboarding.push_info')}</p>
      )}
    </div>
  );
}
