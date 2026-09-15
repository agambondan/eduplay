'use client';

import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { useLocale } from '@/lib/i18n';

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-slate-800"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, type: 'spring', stiffness: 300 }}
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900"
      >
        {subscribed || permission === 'granted' ? (
          <Bell className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <BellOff className="h-8 w-8 text-gray-400" />
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.2 }}
        className="mb-2 text-xl font-bold text-gray-900 dark:text-white"
      >
        <h2>{t('onboarding.push_title')}</h2>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.2 }}
        className="mb-6 text-sm text-gray-500 dark:text-slate-400"
      >
        <p>{t('onboarding.push_desc')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.2 }}
        className="flex flex-col gap-3"
      >
        <button
          onClick={handleEnable}
          disabled={loading || subscribed}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading
            ? t('onboarding.push_processing')
            : subscribed
              ? t('onboarding.push_active')
              : t('onboarding.push_cta')}
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {subscribed ? t('onboarding.push_done') : t('onboarding.push_skip')}
        </button>
      </motion.div>
      {subscribed && <p className="mt-3 text-xs text-gray-400">{t('onboarding.push_info')}</p>}
    </motion.div>
  );
}
