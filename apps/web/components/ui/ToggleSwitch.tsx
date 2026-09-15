'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ToggleSwitchProps {
  checked: boolean;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onClick,
  loading = false,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'
      )}
    >
      {loading ? (
        <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-gray-500" />
      ) : (
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-5' : 'left-0.5'
          )}
        />
      )}
    </button>
  );
}
