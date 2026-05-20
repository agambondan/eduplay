'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/lib/api/auth';
import { useLocale } from '@/lib/i18n';

const schema = z
  .object({
    new_password: z.string().min(6),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: 'konfirmasi password tidak cocok',
    path: ['confirm'],
  });

function ResetForm() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    try {
      setStatus('idle');
      await authApi.resetPassword(token, data.new_password);
      setStatus('success');
      setMessage(t('auth.reset_success'));
    } catch {
      setStatus('error');
      setMessage(t('auth.reset_error'));
    }
  };

  if (!token) {
    return <div className="text-center text-red-500">{t('auth.reset_error')}</div>;
  }

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{message}</div>
        <a
          href="/login"
          className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          {t('auth.login')}
        </a>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <input
            {...register('new_password')}
            type="password"
            placeholder={t('auth.password')}
            className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          />
          {errors.new_password && (
            <p className="mt-1 text-xs text-red-500">{errors.new_password.message as string}</p>
          )}
        </div>
        <div>
          <input
            {...register('confirm')}
            type="password"
            placeholder={t('auth.password')}
            className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          />
          {errors.confirm && (
            <p className="mt-1 text-xs text-red-500">{errors.confirm.message as string}</p>
          )}
        </div>
      </div>
      {status === 'error' && <div className="text-center text-sm text-red-500">{message}</div>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? t('common.loading') : t('auth.reset_title')}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">{t('app.name')}</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{t('auth.reset_title')}</p>
        </div>
        <Suspense fallback={<div className="text-center">{t('common.loading')}</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
