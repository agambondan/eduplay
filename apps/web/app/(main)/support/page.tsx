'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportApi } from '@/lib/api/support';
import { cn } from '@/lib/utils/cn';

const supportSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  email: z.string().email('Email tidak valid'),
  category: z.enum(['bug', 'feedback', 'saran']),
  message: z.string().min(10, 'Minimal 10 karakter').max(2000, 'Maksimal 2000 karakter'),
});

type SupportForm = z.infer<typeof supportSchema>;

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupportForm>({
    resolver: zodResolver(supportSchema),
    defaultValues: { category: 'bug' },
  });

  const onSubmit = async (data: SupportForm) => {
    setError('');
    try {
      await supportApi.submit(data);
      setSubmitted(true);
    } catch {
      setError('Gagal mengirim laporan. Silakan coba lagi.');
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mb-4 text-5xl">✓</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Terima Kasih!</h1>
        <p className="text-gray-500 dark:text-slate-400">
          Laporan Anda telah kami terima. Tim kami akan menindaklanjuti segera.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Bantuan & Dukungan</h1>
      <p className="mb-8 text-gray-500 dark:text-slate-400">
        Laporkan bug, berikan feedback, atau ajukan saran.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Nama
          </label>
          <input
            id="name"
            {...register('name')}
            className={cn(
              'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-2 focus:outline-indigo-400 dark:bg-slate-800 dark:text-white',
              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
            )}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={cn(
              'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-2 focus:outline-indigo-400 dark:bg-slate-800 dark:text-white',
              errors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
            )}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Kategori
          </label>
          <select
            id="category"
            {...register('category')}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="bug">Bug / Error</option>
            <option value="feedback">Feedback</option>
            <option value="saran">Saran</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Pesan
          </label>
          <textarea
            id="message"
            rows={5}
            {...register('message')}
            className={cn(
              'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-2 focus:outline-indigo-400 dark:bg-slate-800 dark:text-white',
              errors.message ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
            )}
          />
          {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="touch-target w-full rounded-lg bg-indigo-600 px-6 py-2.5 font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
        </button>
      </form>
    </div>
  );
}
