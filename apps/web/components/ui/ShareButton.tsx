'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

interface ShareButtonProps {
  title: string
  text: string
  url?: string
  className?: string
}

export function ShareButton({ title, text, url, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl })
        return
      } catch {}
    }

    const waText = encodeURIComponent(`${text}\n\n${shareUrl}`)
    window.open(`https://wa.me/?text=${waText}`, '_blank')
  }

  const handleCopy = () => {
    const payload = `${text}\n\n${shareUrl}`
    navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={handleShare}
        className="flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-semibold text-white shadow-lg transition-all hover:bg-green-600 active:scale-95"
      >
        <Share2 className="h-4 w-4" />Bagikan ke WhatsApp
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Tersalin!' : 'Salin'}
      </button>
    </div>
  )
}
