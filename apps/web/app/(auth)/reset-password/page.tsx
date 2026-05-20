'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/lib/api/auth';

const schema = z.object({
  new_password: z.string().min(6, 'Password minimal 6 karakter'),
  confirm: z.string(),
}).refine((d) => d.new_password === d.confirm, { message: 'Password tidak cocok', path: ['confirm'] });

function ResetForm() {
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
      setMessage('Password berhasil direset!');
    } catch {
      setStatus('error');
      setMessage('Token tidak valid atau sudah kedaluwarsa.');
    }
  };

  if (!token) {
    return <div className="text-center text-red-500">Token reset tidak ditemukan.</div>;
  }

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{message}</div>
        <a
          href="/login"
          className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Login sekarang
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
            placeholder="Password Baru"
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
            placeholder="Konfirmasi Password"
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
        {isSubmitting ? 'Menyimpan...' : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">EduPlay</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Buat Password Baru</p>
        </div>
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
