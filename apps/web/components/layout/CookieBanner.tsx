'use client'

import { useEffect, useState } from 'react'
import { X, Cookie } from 'lucide-react'

const STORAGE_KEY = 'eduplay-cookie-consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY)
    if (!v) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
    window.dispatchEvent(new Event('cookie-consent'))
  }

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
          <div className="text-sm text-gray-600 dark:text-slate-300">
            <p className="font-semibold text-gray-900 dark:text-white">Kami menggunakan cookie</p>
            <p className="mt-0.5">
              EduPlay menggunakan cookie untuk analitik dan iklan. Dengan melanjutkan, kamu menyetujui penggunaan cookie kami.{' '}
              <a href="/privacy-policy" className="text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400">
                Kebijakan Privasi
              </a>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={reject}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            Tolak
          </button>
          <button onClick={accept}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700">
            Terima
          </button>
        </div>
      </div>
    </div>
  )
}
