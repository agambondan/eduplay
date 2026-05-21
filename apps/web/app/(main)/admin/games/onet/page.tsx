'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';
import { DIFFICULTY, ICON_THEMES, type Gravity } from '@/lib/game-engines/onetEngine';

const THEME_NAMES: Record<string, string> = {
  fruit: 'Buah',
  sweet: 'Kue & Manis',
  animal: 'Hewan',
  sport: 'Olahraga',
  space: 'Alam & Luar Angkasa',
  shape: 'Bentuk & Warna',
};

export default function AdminOnetPage() {
  const { t } = useLocale();
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/admin/games/onet/config')
      .then((r) => setConfigs(r.data.data || {}))
      .catch(() => setConfigs({}))
      .finally(() => setLoading(false));
  }, []);

  const update = (diff: string, field: string, val: any) => {
    setConfigs((prev) => {
      const base = DIFFICULTY[diff];
      const current = prev[diff] || { ...base };
      return { ...prev, [diff]: { ...current, [field]: val } };
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.post('/admin/games/onet/config', configs);
      setMessage('Tersimpan!');
    } catch {
      setMessage('Gagal menyimpan');
    }
    setSaving(false);
  };

  const resetAll = () => {
    setConfigs({});
    setMessage('Semua direset ke default');
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Onet Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Kustomisasi grid size, tipe tile, timer, dan icon theme</p>
        </div>
        <div className="flex gap-3">
          <button onClick={resetAll} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300">
            Reset
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </div>
      )}

      <div className="grid gap-6">
        {Object.entries(DIFFICULTY).map(([diff, defaults]) => {
          const cfg = configs[diff] || defaults;
          const theme = cfg.iconTheme || defaults.iconTheme;
          const themeIcons = ICON_THEMES[theme] || ICON_THEMES.fruit;
          return (
            <div key={diff} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold capitalize text-gray-900 dark:text-white">{diff}</h2>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Rows</label>
                  <input
                    type="number" value={cfg.rows} min={4} max={20} step={2}
                    onChange={(e) => update(diff, 'rows', parseInt(e.target.value) || defaults.rows)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Cols</label>
                  <input
                    type="number" value={cfg.cols} min={4} max={20} step={2}
                    onChange={(e) => update(diff, 'cols', parseInt(e.target.value) || defaults.cols)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Tile Types</label>
                  <input
                    type="number" value={cfg.tileTypes} min={2} max={32}
                    onChange={(e) => update(diff, 'tileTypes', parseInt(e.target.value) || defaults.tileTypes)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Timer (dtk)</label>
                  <input
                    type="number" value={cfg.timeLimit} min={30} max={3600} step={30}
                    onChange={(e) => update(diff, 'timeLimit', parseInt(e.target.value) || defaults.timeLimit)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Gravity</label>
                  <select
                    value={cfg.gravity || defaults.gravity || 'none'}
                    onChange={(e) => update(diff, 'gravity', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="none">No Gravity</option>
                    <option value="down">Gravity Down</option>
                    <option value="up">Gravity Up</option>
                    <option value="left">Slide Left</option>
                    <option value="right">Slide Right</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">Tile bergeser setelah di-cocokkan</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Icon Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => update(diff, 'iconTheme', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    {Object.entries(ICON_THEMES).map(([key]) => (
                      <option key={key} value={key}>{THEME_NAMES[key] || key}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-0.5 flex-wrap">
                    {themeIcons.slice(0, 8).map((ic, i) => (
                      <span key={i} className="text-lg">{ic}</span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-400">
                {cfg.rows * cfg.cols} tile ({cfg.rows * cfg.cols / 2} pasang) &middot; {cfg.tileTypes} tipe &middot; theme: {THEME_NAMES[theme] || theme}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
