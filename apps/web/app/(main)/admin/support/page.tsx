'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Inbox, XCircle } from 'lucide-react';
import api from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

interface Ticket {
    id: string;
    name: string;
    email: string;
    category: string;
    message: string;
    status: string;
    created_at: string;
}

const STATUS_TABS = [
    { key: '', label: 'Semua' },
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Inbox }> = {
    open: { label: 'Open', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
    closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400', icon: XCircle },
};

const CATEGORY_LABELS: Record<string, string> = {
    bug: 'Bug Report',
    feedback: 'Feedback',
    suggestion: 'Suggestion',
};

export default function AdminSupportPage() {
    const qc = useQueryClient();
    const [tab, setTab] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);

    const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
        queryKey: ['admin-support', tab],
        queryFn: () =>
            api.get(`/admin/support${tab ? `?status=${tab}` : ''}`).then((r) => r.data.data ?? []),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch(`/admin/support/${id}`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-support'] }),
    });

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Support Tickets</h1>
                <p className='text-sm text-gray-500 dark:text-slate-400'>
                    Laporan & feedback dari pengguna
                </p>
            </div>

            {/* Tabs */}
            <div className='flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800'>
                {STATUS_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={cn(
                            'flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all',
                            tab === t.key
                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400',
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800' />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className='rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-slate-700'>
                    <Inbox className='mx-auto mb-3 h-10 w-10 text-gray-300' />
                    <p className='text-gray-400'>Tidak ada tiket</p>
                </div>
            ) : (
                <div className='space-y-3'>
                    {tickets.map((ticket) => {
                        const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
                        const Icon = cfg.icon;
                        const isOpen = expanded === ticket.id;

                        return (
                            <div
                                key={ticket.id}
                                className='overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800'
                            >
                                <button
                                    onClick={() => setExpanded(isOpen ? null : ticket.id)}
                                    className='flex w-full items-start gap-4 p-4 text-left'
                                >
                                    <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ticket.status === 'open' ? 'text-yellow-500' : ticket.status === 'resolved' ? 'text-emerald-500' : 'text-gray-400')} />
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <span className='font-bold text-gray-900 dark:text-white'>
                                                {ticket.name}
                                            </span>
                                            <span className='text-xs text-gray-400'>{ticket.email}</span>
                                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', cfg.color)}>
                                                {cfg.label}
                                            </span>
                                            <span className='rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'>
                                                {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                                            </span>
                                        </div>
                                        <p className='mt-1 truncate text-sm text-gray-500 dark:text-slate-400'>
                                            {ticket.message}
                                        </p>
                                    </div>
                                    <span className='shrink-0 text-xs text-gray-400'>
                                        {new Date(ticket.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                </button>

                                {isOpen && (
                                    <div className='border-t border-gray-100 px-4 pb-4 pt-3 dark:border-slate-700'>
                                        <p className='mb-4 whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300'>
                                            {ticket.message}
                                        </p>
                                        <div className='flex flex-wrap gap-2'>
                                            {['open', 'resolved', 'closed'].map((s) => (
                                                <button
                                                    key={s}
                                                    disabled={ticket.status === s}
                                                    onClick={() => updateMut.mutate({ id: ticket.id, status: s })}
                                                    className={cn(
                                                        'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                                                        ticket.status === s
                                                            ? 'cursor-default bg-gray-100 text-gray-400 dark:bg-slate-700'
                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700',
                                                    )}
                                                >
                                                    Tandai {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
