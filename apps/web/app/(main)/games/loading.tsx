import { Loader2 } from 'lucide-react'

export default function GamesLoading() {
  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8 px-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  )
}
