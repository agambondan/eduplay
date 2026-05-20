'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Users, XCircle } from 'lucide-react';
import api from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

interface Tournament {
    id: string;
    name: string;
    game_slug: string;
    status: string;
    max_players: number;
    player_count: number;
    started_at: string | null;
    finished_at: string | null;
    created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    registration: { label: 'Pendaftaran', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    ongoing: { label: 'Berlangsung', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    finished: { label: 'Selesai', color: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400' },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AdminTournamentsPage() {
    const qc = useQueryClient();

    const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
        queryKey: ['admin-tournaments'],
        queryFn: () => api.get('/admin/tournaments').then((r) => r.data.data ?? []),
    });

    const cancelMut = useMutation({
        mutationFn: (id: string) => api.post(`/admin/tournaments/${id}/cancel`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tournaments'] }),
    });

    const active = tournaments.filter((t) => ['registration', 'ongoing'].includes(t.status));
    const finished = tournaments.filter((t) => ['finished', 'cancelled'].includes(t.status));

    const renderTable = (list: Tournament[]) => (
        <div className='overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700'>
            <table className='w-full text-sm'>
                <thead className='border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50'>
                    <tr>
                        <th className='px-4 py-3 text-left text-xs font-bold uppercase text-gray-500'>Nama</th>
                        <th className='px-4 py-3 text-left text-xs font-bold uppercase text-gray-500'>Game</th>
                        <th className='px-4 py-3 text-left text-xs font-bold uppercase text-gray-500'>Status</th>
                        <th className='px-4 py-3 text-left text-xs font-bold uppercase text-gray-500'>
                            <Users className='inline h-3.5 w-3.5' />
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-bold uppercase text-gray-500'>Dibuat</th>
                        <th className='px-4 py-3' />
                    </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 bg-white dark:divide-slate-700 dark:bg-slate-800'>
                    {list.map((t) => {
                        const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.registration;
                        const canCancel = ['registration', 'ongoing'].includes(t.status);
                        return (
                            <tr key={t.id} className='hover:bg-gray-50 dark:hover:bg-slate-700/50'>
                                <td className='px-4 py-3 font-medium text-gray-900 dark:text-white'>
                                    {t.name}
                                </td>
                                <td className='px-4 py-3 text-gray-500 dark:text-slate-400'>
                                    {t.game_slug}
                                </td>
                                <td className='px-4 py-3'>
                                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', cfg.color)}>
                                        {cfg.label}
                                    </span>
                                </td>
                                <td className='px-4 py-3 text-gray-600 dark:text-slate-400'>
                                    {t.player_count}/{t.max_players}
                                </td>
                                <td className='px-4 py-3 text-xs text-gray-400'>
                                    {new Date(t.created_at).toLocaleDateString('id-ID')}
                                </td>
                                <td className='px-4 py-3 text-right'>
                                    {canCancel && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`Batalkan turnamen "${t.name}"?`))
                                                    cancelMut.mutate(t.id);
                                            }}
                                            className='flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20'
                                        >
                                            <XCircle className='h-3.5 w-3.5' /> Batalkan
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Turnamen</h1>
                    <p className='text-sm text-gray-500 dark:text-slate-400'>
                        {tournaments.length} total · {active.length} aktif
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800' />
                    ))}
                </div>
            ) : tournaments.length === 0 ? (
                <div className='rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-slate-700'>
                    <Trophy className='mx-auto mb-3 h-10 w-10 text-gray-300' />
                    <p className='text-gray-400'>Belum ada turnamen</p>
                </div>
            ) : (
                <div className='space-y-6'>
                    {active.length > 0 && (
                        <div>
                            <h2 className='mb-3 text-sm font-bold uppercase tracking-wider text-gray-400'>
                                Aktif ({active.length})
                            </h2>
                            {renderTable(active)}
                        </div>
                    )}
                    {finished.length > 0 && (
                        <div>
                            <h2 className='mb-3 text-sm font-bold uppercase tracking-wider text-gray-400'>
                                Selesai / Dibatalkan ({finished.length})
                            </h2>
                            {renderTable(finished)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
