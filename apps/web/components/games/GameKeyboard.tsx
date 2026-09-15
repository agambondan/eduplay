'use client';

import { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

export interface KeyboardKey {
  key: string;
  label: string;
  wide?: boolean;
}

export interface GameKeyboardProps {
  onKeyPress: (key: string) => void;
  keyStates?: Record<string, 'correct' | 'present' | 'absent' | 'empty'>;
  disabled?: boolean;
  className?: string;
}

const KEYBOARD_LAYOUT: KeyboardKey[][] = [
  [
    { key: 'Q', label: 'Q' },
    { key: 'W', label: 'W' },
    { key: 'E', label: 'E' },
    { key: 'R', label: 'R' },
    { key: 'T', label: 'T' },
    { key: 'Y', label: 'Y' },
    { key: 'U', label: 'U' },
    { key: 'I', label: 'I' },
    { key: 'O', label: 'O' },
    { key: 'P', label: 'P' },
  ],
  [
    { key: 'A', label: 'A' },
    { key: 'S', label: 'S' },
    { key: 'D', label: 'D' },
    { key: 'F', label: 'F' },
    { key: 'G', label: 'G' },
    { key: 'H', label: 'H' },
    { key: 'J', label: 'J' },
    { key: 'K', label: 'K' },
    { key: 'L', label: 'L' },
  ],
  [
    { key: 'ENTER', label: 'ENTER', wide: true },
    { key: 'Z', label: 'Z' },
    { key: 'X', label: 'X' },
    { key: 'C', label: 'C' },
    { key: 'V', label: 'V' },
    { key: 'B', label: 'B' },
    { key: 'N', label: 'N' },
    { key: 'M', label: 'M' },
    { key: 'BACKSPACE', label: '⌫', wide: true },
  ],
];

const STATUS_COLORS: Record<string, string> = {
  correct: 'bg-emerald-500 text-white border-emerald-500',
  present: 'bg-amber-500 text-white border-amber-500',
  absent: 'bg-gray-400 text-white border-gray-400 dark:bg-slate-600',
  empty: 'bg-gray-200 text-gray-800 border-gray-300 dark:bg-slate-700 dark:text-white dark:border-slate-600',
};

export function GameKeyboard({
  onKeyPress,
  keyStates = {},
  disabled = false,
  className,
}: GameKeyboardProps) {
  const handleKey = useCallback(
    (key: string) => {
      if (!disabled) onKeyPress(key);
    },
    [onKeyPress, disabled]
  );

  return (
    <div
      className={cn('flex flex-col gap-1.5', className)}
      role="group"
      aria-label="Virtual keyboard"
    >
      {KEYBOARD_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1" role="row">
          {row.map((keyDef) => {
            const state = keyStates[keyDef.key] || 'empty';
            const baseClasses =
              'touch-target flex items-center justify-center rounded-md px-2.5 py-3 text-sm font-bold transition-colors';
            const wideClasses = keyDef.wide ? 'px-3 text-xs' : '';
            const stateClasses = STATUS_COLORS[state] || STATUS_COLORS.empty;

            return (
              <button
                key={keyDef.key}
                type="button"
                onClick={() => handleKey(keyDef.key)}
                disabled={disabled}
                className={cn(baseClasses, wideClasses, stateClasses)}
                aria-label={
                  keyDef.key === 'ENTER'
                    ? 'Submit'
                    : keyDef.key === 'BACKSPACE'
                      ? 'Delete'
                      : `Key ${keyDef.label}`
                }
              >
                {keyDef.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}