'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/lib/api/auth';
import { useLocale } from '@/lib/i18n';

const schema = z.object({
  email: z.string().email(),
});

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    try {
      setStatus('idle');
      await authApi.forgotPassword(data.email);
      setStatus('sent');
      setMessage(t('auth.forgot_sent'));
    } catch {
      setStatus('error');
      setMessage(t('common.error'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">{t('app.name')}</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{t('auth.forgot_title')}</p>
        </div>
        {status === 'sent' ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{message}</div>
            <a
              href="/login"
              className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
{t('common.back')}
            </a>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <input
                {...register('email')}
                type="email"
                placeholder={t('auth.email')}
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message as string}</p>
              )}
            </div>
            {status === 'error' && <div className="text-center text-sm text-red-500">{message}</div>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? t('common.loading') : t('auth.forgot_title')}
            </button>
            <div className="text-center text-sm">
              <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
{t('common.back')}
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
