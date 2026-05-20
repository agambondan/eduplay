'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token verifikasi tidak ditemukan.');
      return;
    }
    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email berhasil diverifikasi!');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Token tidak valid atau sudah kedaluwarsa.');
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 text-center shadow-md">
        <h2 className="text-3xl font-extrabold text-gray-900">EduPlay</h2>
        {status === 'loading' && <p className="text-gray-600">Memverifikasi email...</p>}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{message}</div>
            <a
              href="/login"
              className="block text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Login sekarang
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
              Kembali ke Beranda
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>}>
      <VerifyContent />
    </Suspense>
  );
}
