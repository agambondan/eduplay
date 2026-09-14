'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useToastStore, ToastType } from '@/lib/stores/toastStore';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<ToastType, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  warning: <AlertCircle className="h-4 w-4 text-amber-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
};

const BORDERS: Record<ToastType, string> = {
  info: 'border-blue-200 bg-blue-50/90 text-blue-900 dark:border-blue-900/40 dark:bg-slate-800 dark:text-blue-300',
  success:
    'border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-900/40 dark:bg-slate-800 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-900/40 dark:bg-slate-800 dark:text-amber-300',
  error:
    'border-red-200 bg-red-50/90 text-red-900 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-300',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md',
              BORDERS[t.type]
            )}
          >
            {ICONS[t.type]}
            <span className="flex-1 text-xs font-semibold leading-relaxed">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="rounded p-1 opacity-60 hover:opacity-100"
              aria-label="Tutup"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
