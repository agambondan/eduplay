'use client';

import { Delete } from 'lucide-react';

export type KeyStatus = 'correct' | 'present' | 'absent' | 'unused';

interface VirtualKeyboardProps {
    onKey: (key: string) => void;
    onEnter: () => void;
    onDelete: () => void;
    keyStatuses?: Record<string, KeyStatus>;
    disabled?: boolean;
}

const ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

const STATUS_CLASSES: Record<KeyStatus, string> = {
    correct: 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600',
    present: 'bg-amber-400 text-white border-amber-500 dark:bg-amber-500',
    absent: 'bg-gray-500 text-white border-gray-600 dark:bg-gray-600',
    unused: 'bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:hover:bg-slate-600',
};

export function VirtualKeyboard({
    onKey,
    onEnter,
    onDelete,
    keyStatuses = {},
    disabled = false,
}: VirtualKeyboardProps) {
    const handlePress = (key: string) => {
        if (disabled) return;
        if (key === 'ENTER') onEnter();
        else if (key === 'DEL') onDelete();
        else onKey(key);
    };

    return (
        <div className='flex flex-col items-center gap-1.5' role='group' aria-label='Keyboard virtual'>
            {ROWS.map((row, ri) => (
                <div key={ri} className='flex gap-1'>
                    {row.map((key) => {
                        const status: KeyStatus = keyStatuses[key] ?? 'unused';
                        const isWide = key === 'ENTER' || key === 'DEL';

                        return (
                            <button
                                key={key}
                                onClick={() => handlePress(key)}
                                disabled={disabled}
                                aria-label={key === 'DEL' ? 'Hapus' : key === 'ENTER' ? 'Kirim' : key}
                                className={`flex h-14 items-center justify-center rounded-lg border text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${
                                    isWide ? 'min-w-[3.25rem] px-2' : 'w-9'
                                } ${STATUS_CLASSES[status]}`}
                            >
                                {key === 'DEL' ? (
                                    <Delete className='h-4 w-4' />
                                ) : key === 'ENTER' ? (
                                    <span className='text-xs'>KIRIM</span>
                                ) : (
                                    key
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
