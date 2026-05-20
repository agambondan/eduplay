'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useLocale } from '@/lib/i18n';

function VerifyContent() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('auth.verify_error'));
      return;
    }
    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage(t('auth.verify_success'));
      })
      .catch(() => {
        setStatus('error');
        setMessage(t('auth.verify_error'));
      });
  }, [token, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 text-center shadow-md">
        <h2 className="text-3xl font-extrabold text-gray-900">{t('app.name')}</h2>
        {status === 'loading' && <p className="text-gray-600">{t('auth.verify_checking')}</p>}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{message}</div>
            <a
              href="/login"
              className="block text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
{t('auth.login')}
            </a>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{message}</div>
            <a
              href="/"
              className="block text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
{t('common.back')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { t } = useLocale();
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>{t('common.loading')}</p></div>}>
      <VerifyContent />
    </Suspense>
  );
}
