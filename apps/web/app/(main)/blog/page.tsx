'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';
import { Calendar, User, Tag, ChevronRight, ArrowLeft, Search } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  image_url: string;
  category: string;
  tags: string;
  is_published: boolean;
  published_at: string;
}

interface ListResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  categories: string[];
}

const CAT_NAMES: Record<string, string> = {
  'tips-belajar': 'Tips Belajar',
  'panduan-game': 'Panduan Game',
  'berita': 'Berita',
};

export default function BlogPage() {
  const { t } = useLocale();
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [cat, setCat] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (cat) params.set('cat', cat);
    api.get(`/blog?${params}`)
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, cat]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blog EduPlay</h1>
        <p className="mt-2 text-gray-500 dark:text-slate-400">Tips belajar, panduan game, dan artikel edukatif</p>
      </div>

      {data && data.categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => { setCat(''); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            Semua
          </button>
          {data.categories.map((c) => (
            <button
              key={c}
              onClick={() => { setCat(c); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${cat === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {CAT_NAMES[c] || c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : data && data.posts.length > 0 ? (
        <>
          <div className="space-y-6">
            {data.posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(post.published_at)}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {post.author}</span>
                  {post.category && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                      {CAT_NAMES[post.category] || post.category}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-xl font-bold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {post.title}
                </h2>
                {post.excerpt && <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-slate-400">{post.excerpt}</p>}
                {post.tags && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.split(',').map((tag) => (
                      <span key={tag} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" /> Sebelumnya
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
              >
                Selanjutnya <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          <p className="text-gray-400">Belum ada artikel</p>
        </div>
      )}
    </div>
  );
}
