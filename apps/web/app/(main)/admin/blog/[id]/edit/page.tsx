'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api/client';

export default function AdminEditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('tips-belajar');
  const [tags, setTags] = useState('');
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/admin/blog?page=1&limit=50`)
      .then((r) => {
        const posts = r.data.data.posts || [];
        const post = posts.find((p: any) => p.id === id);
        if (post) {
          setTitle(post.title);
          setContent(post.content);
          setExcerpt(post.excerpt || '');
          setCategory(post.category || 'tips-belajar');
          setTags(post.tags || '');
          setPublish(post.is_published);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return alert('Title & content required');
    setSaving(true);
    try {
      await api.patch(`/admin/blog/${id}`, {
        title,
        content,
        excerpt,
        cat: category,
        tags,
        is_published: publish,
      });
      router.push('/admin/blog');
    } catch {
      alert('Gagal menyimpan');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Blog Post</h1>

      <div className="grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="tips-belajar">Tips Belajar</option>
              <option value="panduan-game">Panduan Game</option>
              <option value="berita">Berita</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Tags
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Excerpt
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-indigo-600"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Published</span>
        </label>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update'}
          </button>
          <button
            onClick={() => router.push('/admin/blog')}
            className="rounded-xl border border-gray-200 px-6 py-3 font-medium text-gray-600 dark:border-slate-600 dark:text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
