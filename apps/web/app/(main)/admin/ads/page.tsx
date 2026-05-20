'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { adsApi, type DirectAd } from '@/lib/api/ads';
import { cn } from '@/lib/utils/cn';

const SLOT_LABELS: Record<string, string> = {
    banner: 'Banner (bottom strip)',
    interstitial: 'Interstitial (full-screen)',
    rewarded: 'Rewarded (watch for reward)',
};

const SLOT_COLORS: Record<string, string> = {
    banner: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    interstitial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    rewarded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function AdForm({ onSubmit, onCancel }: { onSubmit: (f: FormData) => void; onCancel: () => void }) {
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
    };

    return (
        <form
            onSubmit={handleSubmit}
            className='space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800'
        >
            <h3 className='text-lg font-bold text-gray-900 dark:text-white'>Tambah Iklan Baru</h3>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div>
                    <label className='mb-1 block text-xs font-bold text-gray-600 dark:text-slate-400'>
                        Judul Iklan *
                    </label>
                    <input
                        name='title'
                        required
                        placeholder='Contoh: Promo Premium Juli 2026'
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                    />
                </div>
                <div>
                    <label className='mb-1 block text-xs font-bold text-gray-600 dark:text-slate-400'>
                        Slot *
                    </label>
                    <select
                        name='slot_type'
                        required
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                    >
                        <option value='banner'>Banner</option>
                        <option value='interstitial'>Interstitial</option>
                        <option value='rewarded'>Rewarded</option>
                    </select>
                </div>
                <div className='sm:col-span-2'>
                    <label className='mb-1 block text-xs font-bold text-gray-600 dark:text-slate-400'>
                        URL Tujuan (klik iklan)
                    </label>
                    <input
                        name='click_url'
                        type='url'
                        placeholder='https://...'
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                    />
                </div>
                <div>
                    <label className='mb-1 block text-xs font-bold text-gray-600 dark:text-slate-400'>
                        Mulai Tayang
                    </label>
                    <input
                        name='start_at'
                        type='datetime-local'
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                    />
                </div>
                <div>
                    <label className='mb-1 block text-xs font-bold text-gray-600 dark:text-slate-400'>
                        Selesai Tayang
                    </label>
                    <input
                        name='end_at'
                        type='datetime-local'
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                    />
                </div>
                <div>
                    <label className='mb-1 block text-xs font-bold text-gray-600 dark:text-slate-400'>
                        Prioritas (angka lebih besar = lebih utama)
                    </label>
                    <input
                        name='priority'
                        type='number'
                        defaultValue={0}
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                    />
                </div>
                <div>
                    <label className='mb-1 block text-xs font-bold text-gray-600 dark:text-slate-400'>
                        Gambar Iklan
                    </label>
                    <input
                        name='image'
                        type='file'
                        accept='image/*'
                        onChange={handleFile}
                        className='w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                    />
                    {preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt='preview' className='mt-2 h-16 rounded-lg object-cover' />
                    )}
                </div>
            </div>

            <div className='flex justify-end gap-3 pt-2'>
                <button
                    type='button'
                    onClick={onCancel}
                    className='rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                >
                    Batal
                </button>
                <button
                    type='submit'
                    className='rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700'
                >
                    Simpan Iklan
                </button>
            </div>
        </form>
    );
}

export default function AdminAdsPage() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);

    const { data: ads = [], isLoading } = useQuery({
        queryKey: ['admin-ads'],
        queryFn: adsApi.list,
    });

    const createMut = useMutation({
        mutationFn: (form: FormData) => {
            // Convert datetime-local to RFC3339
            const start = form.get('start_at') as string;
            const end = form.get('end_at') as string;
            if (start) form.set('start_at', new Date(start).toISOString());
            if (end) form.set('end_at', new Date(end).toISOString());
            return adsApi.create(form);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-ads'] });
            setShowForm(false);
        },
    });

    const toggleMut = useMutation({
        mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
            adsApi.update(id, { is_active }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ads'] }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => adsApi.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ads'] }),
    });

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Manajemen Iklan</h1>
                    <p className='text-sm text-gray-500 dark:text-slate-400'>
                        Direct ads — prioritas lebih tinggi dari Google AdSense
                    </p>
                </div>
                <button
                    onClick={() => setShowForm((v) => !v)}
                    className='flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700'
                >
                    <Plus className='h-4 w-4' />
                    Tambah Iklan
                </button>
            </div>

            {showForm && (
                <AdForm
                    onSubmit={(f) => createMut.mutate(f)}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {isLoading ? (
                <div className='grid gap-4'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800' />
                    ))}
                </div>
            ) : ads.length === 0 ? (
                <div className='rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-slate-700'>
                    <ImageIcon className='mx-auto mb-3 h-10 w-10 text-gray-300' />
                    <p className='font-medium text-gray-400'>Belum ada iklan langsung.</p>
                    <p className='text-sm text-gray-400'>AdSense akan tampil sebagai fallback.</p>
                </div>
            ) : (
                <div className='space-y-3'>
                    {ads.map((ad: DirectAd) => (
                        <div
                            key={ad.id}
                            className={cn(
                                'flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-opacity dark:bg-slate-800',
                                !ad.is_active
                                    ? 'border-gray-100 opacity-60 dark:border-slate-700'
                                    : 'border-gray-200 dark:border-slate-600',
                            )}
                        >
                            {ad.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={ad.image_url}
                                    alt={ad.title}
                                    className='h-14 w-24 flex-shrink-0 rounded-lg object-cover'
                                />
                            ) : (
                                <div className='flex h-14 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700'>
                                    <ImageIcon className='h-6 w-6 text-gray-400' />
                                </div>
                            )}

                            <div className='min-w-0 flex-1'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <p className='truncate font-bold text-gray-900 dark:text-white'>
                                        {ad.title}
                                    </p>
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                                            SLOT_COLORS[ad.slot_type] ?? 'bg-gray-100 text-gray-600',
                                        )}
                                    >
                                        {SLOT_LABELS[ad.slot_type] ?? ad.slot_type}
                                    </span>
                                    {!ad.is_active && (
                                        <span className='rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600 dark:bg-red-900/30 dark:text-red-400'>
                                            Non-aktif
                                        </span>
                                    )}
                                </div>
                                <div className='mt-0.5 flex flex-wrap items-center gap-3 text-xs text-gray-400'>
                                    {ad.click_url && (
                                        <a
                                            href={ad.click_url}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='flex items-center gap-1 hover:text-indigo-500'
                                        >
                                            <ExternalLink className='h-3 w-3' />
                                            {ad.click_url.slice(0, 40)}…
                                        </a>
                                    )}
                                    <span>Prioritas: {ad.priority}</span>
                                    {ad.start_at && (
                                        <span>
                                            {new Date(ad.start_at).toLocaleDateString('id-ID')} –{' '}
                                            {ad.end_at
                                                ? new Date(ad.end_at).toLocaleDateString('id-ID')
                                                : '∞'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={() =>
                                        toggleMut.mutate({ id: ad.id, is_active: !ad.is_active })
                                    }
                                    title={ad.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                    className='rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-slate-700'
                                >
                                    {ad.is_active ? (
                                        <ToggleRight className='h-5 w-5 text-indigo-500' />
                                    ) : (
                                        <ToggleLeft className='h-5 w-5' />
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Hapus iklan ini?')) deleteMut.mutate(ad.id);
                                    }}
                                    title='Hapus'
                                    className='rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
                                >
                                    <Trash2 className='h-4 w-4' />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
