'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { useLocale } from '@/lib/i18n';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setGuest = useAuthStore((state) => state.setGuest);
  const user = useAuthStore((state) => state.user);
  const { t } = useLocale();

  useEffect(() => {
    if (user) {
      router.replace('/profile');
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: any) => {
    try {
      setError('');
      const res = await authApi.login(data);
      setAuth(res.user as any, res.access_token, res.refresh_token);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.login_error'));
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">EduPlay</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{t('auth.login_title')}</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
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
            <div>
              <input
                {...register('password')}
                type="password"
                placeholder={t('auth.password')}
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message as string}</p>
              )}
            </div>
          </div>
          {error && <div className="text-center text-sm text-red-500">{error}</div>}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? t('common.loading') : t('auth.login')}
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <a href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              {t('auth.forgot_password')}
            </a>
            <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              {t('auth.register')}
            </a>
          </div>
        </form>
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">{t('common.or')}</span>
              </div>
            </div>
            <GoogleLoginButton />
          </>
        )}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">{t('common.or')} {t('auth.guest').toLowerCase()}</span>
          </div>
        </div>
        <button
          onClick={async () => {
            setGuestLoading(true);
            try {
              const res = await authApi.guestLogin();
              setGuest(res.user as any, res.access_token);
              router.push('/');
            } catch {
              setError(t('auth.guest_error'));
            } finally {
              setGuestLoading(false);
            }
          }}
          disabled={guestLoading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {guestLoading ? t('common.loading') : (
            <>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('auth.guest')}
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          {t('auth.guest_desc')}
        </p>
      </div>
    </div>
  );
}
