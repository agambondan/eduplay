'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { getThemeClass, useThemeStore } from '@/lib/stores/themeStore';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

// The GSI client is a page-wide singleton — it installs the `google` global and
// its own iframes. Injecting it per mount (and ripping the <script> back out on
// unmount) leaves those globals behind while breaking the next mount, so the
// whole app shares a single load promise instead.
let gsiLoader: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (gsiLoader) return gsiLoader;

  gsiLoader = new Promise<void>((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.id) {
      resolve();
      return;
    }

    const onError = () => reject(new Error('Failed to load Google Identity Services'));
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', onError);
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = onError;
    document.head.appendChild(script);
  }).catch((err) => {
    // Let a later mount retry instead of caching the failure forever.
    gsiLoader = null;
    throw err;
  });

  return gsiLoader;
}

export default function GoogleLoginButton() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t, locale } = useLocale();
  const appTheme = useThemeStore((state) => state.theme);
  const btnRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  const handleCredential = useCallback(
    async (credential: string) => {
      try {
        setError('');
        const res = await authApi.googleLogin(credential);
        // The API returns the refresh token as an HttpOnly cookie, never
        // in the body — there is nothing to persist client-side here.
        setAuth(res.user as any, res.access_token, res.refresh_token);
        router.push('/');
      } catch (err: any) {
        setError(err?.response?.data?.message || t('auth.google_error'));
      }
    },
    [router, setAuth, t]
  );

  // initialize() captures the callback once, so read it through a ref to avoid
  // pinning the first render's closure.
  const handleCredentialRef = useRef(handleCredential);
  handleCredentialRef.current = handleCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !btnRef.current) return;

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            void handleCredentialRef.current(response.credential);
          },
          error_callback: () => {
            if (!cancelled) setError(t('auth.google_error'));
          },
        });

        // renderButton appends an iframe; without clearing, a re-render
        // (locale switch, fast refresh) stacks a second button.
        btnRef.current.replaceChildren();
        // Google paints this button itself, so a light-themed one would stay
        // white on a dark card unless we tell it which theme is active.
        google.accounts.id.renderButton(btnRef.current, {
          theme: getThemeClass(appTheme) ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320,
          locale,
        });
      })
      .catch(() => {
        if (!cancelled) setError(t('auth.google_error'));
      });

    return () => {
      cancelled = true;
    };
  }, [appTheme, locale, t]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={btnRef} />
      {error && (
        <p role="alert" className="text-center text-sm text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
