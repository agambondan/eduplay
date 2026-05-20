'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { useLocale } from '@/lib/i18n';

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);

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
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: any) => {
    try {
      setError('');
      const res = await authApi.register(data);
      setAuth(res.user as any, res.access_token, res.refresh_token);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.register_error'));
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">{t('app.name')}</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{t('auth.register_title')}</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <input
                {...register('username')}
                type="text"
                placeholder="Username"
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">{errors.username.message as string}</p>
              )}
            </div>
            <div>
              <input
                {...register('email')}
                type="email"
                placeholder="Email"
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
                placeholder="Password"
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
              {isSubmitting ? t('common.loading') : t('auth.register')}
            </button>
          </div>
          <div className="text-center text-sm">
            <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
{t('auth.have_account')}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
