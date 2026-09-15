'use client';

import { useRouter } from 'next/navigation';
import { Sun, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocale } from '@/lib/i18n';

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export default function DailyPrompt({ onNext, onSkip }: Props) {
  const { t } = useLocale();
  const router = useRouter();

  const handleGo = () => {
    router.push('/daily');
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
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900"
      >
        <Sun className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.2 }}
        className="mb-2 text-xl font-bold text-gray-900 dark:text-white"
      >
        <h2>{t('daily.prompt_title')}</h2>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.2 }}
        className="mb-6 text-sm text-gray-500 dark:text-slate-400"
      >
        <p>{t('daily.prompt_desc')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.2 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      >
        <Zap size={16} />
        {t('daily.bonus')}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.2 }}
        className="flex flex-col gap-3"
      >
        <button
          onClick={handleGo}
          className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600"
        >
          {t('daily.prompt_cta')}
        </button>
        <button
          onClick={onNext}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {t('daily.prompt_later')}
        </button>
      </motion.div>
    </motion.div>
  );
}
