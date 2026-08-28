'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import api from '@/lib/api/client';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPosts = () => {
    setLoading(true);
    api
      .get(`/admin/blog?page=${page}&limit=20`)
      .then((r) => {
        setPosts(r.data.data.posts);
        setTotal(r.data.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, [page]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus "${title}"?`)) return;
    try {
      await api.delete(`/admin/blog/${id}`);
      fetchPosts();
    } catch {
      alert('Gagal menghapus');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Posts</h1>
        <button
          onClick={() => router.push('/admin/blog/new')}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white transition-all hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="bg-white transition-colors hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                    {post.title}
                  </td>
                  <td className="px-5 py-4 text-gray-500">{post.category || '-'}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${post.is_published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-700'}`}
                    >
                      {post.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString('id-ID')
                      : '-'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:border-slate-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        className="rounded-lg border border-gray-200 p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:border-slate-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm disabled:opacity-30 dark:border-slate-700"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm disabled:opacity-30 dark:border-slate-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
