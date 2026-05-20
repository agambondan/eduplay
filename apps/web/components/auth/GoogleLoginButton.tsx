'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/authStore';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function GoogleLoginButton() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !btnRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            const res = await authApi.googleLogin(response.credential);
            setAuth(res.user as any, res.access_token, res.refresh_token);
            router.push('/');
          } catch {
            console.error('Google login failed');
          }
        },
      });
      google.accounts.id.renderButton(btnRef.current!, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 320,
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [router, setAuth]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex justify-center">
      <div ref={btnRef} />
    </div>
  );
}
