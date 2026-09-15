'use client';

import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocale } from '@/lib/i18n';

interface Props {
  username: string;
  onNext: () => void;
  onSkip: () => void;
}

export default function WelcomeStep({ username, onNext, onSkip }: Props) {
  const { t } = useLocale();
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
        <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.2 }}
        className="mb-2 text-2xl font-bold text-gray-900 dark:text-white"
      >
        <h1>{t('onboarding.welcome_title').replace('{name}', username)}</h1>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.2 }}
        className="mb-6 space-y-2 text-sm text-gray-500 dark:text-slate-400"
      >
        <p>{t('onboarding.welcome_desc_1')}</p>
        <p>{t('onboarding.welcome_desc_2')}</p>
        <p>{t('onboarding.welcome_desc_3')}</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.2 }}
        className="flex flex-col gap-3"
      >
        <button
          onClick={onNext}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          {t('onboarding.welcome_cta')}
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {t('onboarding.skip')}
        </button>
      </motion.div>
    </motion.div>
  );
}
