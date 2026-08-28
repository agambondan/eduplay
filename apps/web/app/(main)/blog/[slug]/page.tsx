'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Tag, User } from 'lucide-react';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';

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

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useLocale();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/blog/${slug}`)
      .then((r) => setPost(r.data.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Artikel tidak ditemukan
        </h1>
        <Link
          href="/blog"
          className="mt-4 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/blog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Blog
      </Link>

      <article>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {formatDate(post.published_at)}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {post.author}
          </span>
          {post.category && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
              {post.category}
            </span>
          )}
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-gray-900 dark:text-white">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-3 text-lg leading-relaxed text-gray-500 dark:text-slate-400">
            {post.excerpt}
          </p>
        )}

        <div
          className="prose prose-gray dark:prose-invert mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.tags && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-gray-200 pt-6 dark:border-slate-700">
            {post.tags.split(',').map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <Tag className="h-3 w-3" /> {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
