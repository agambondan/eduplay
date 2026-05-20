'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Flame,
  Loader2,
  Mail,
  Search,
  Trophy,
  UserPlus,
  UserX,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { FriendResponse, SearchUserResult, friendsApi } from '@/lib/api/friends';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { cn } from '@/lib/utils/cn';

export default function FriendsPage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: friendsApi.list,
    enabled: !!user,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: friendsApi.listRequests,
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: (u: string) => friendsApi.sendRequest(u),
    onSuccess: () => {
      setUsername('');
      setSearchResults([]);
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => friendsApi.acceptRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => friendsApi.declineRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => friendsApi.removeFriend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  const handleSearch = async (val: string) => {
    setUsername(val);
    if (val.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await friendsApi.search(val.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectUser = (u: SearchUserResult) => {
    setUsername(u.username);
    setSearchResults([]);
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {t('friends.title')}
          </h1>
          <p className="text-gray-500 dark:text-slate-400">{t('friends.login_prompt')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('friends.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Terhubung dengan teman dan sesama pemain
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          {t('friends.add')}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/20 dark:bg-indigo-900/10">
          <div className="relative" ref={searchRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t('friends.add_placeholder')}
                  className="w-full rounded-xl border border-indigo-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <button
                onClick={() => {
                  if (username.trim()) sendMutation.mutate(username.trim());
                }}
                disabled={sendMutation.isPending || !username.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('friends.send_request')
                )}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: u.avatar_color || '#4F46E5' }}
                    >
                      {u.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{u.username}</p>
                      <p className="text-xs text-gray-500">
                        Level {u.level} &middot; {u.xp} XP
                      </p>
                    </div>
                    <UserPlus className="h-4 w-4 text-indigo-500" />
                  </button>
                ))}
              </div>
            )}

            {searching && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 flex items-center justify-center rounded-xl border border-gray-200 bg-white py-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {sendMutation.isError && (
            <p className="mt-2 text-sm text-red-500">{(sendMutation.error as Error).message}</p>
          )}
          {sendMutation.isSuccess && (
            <p className="mt-2 text-sm text-emerald-600">{t('friends.request_sent')}</p>
          )}
        </div>
      )}

      <div className="flex gap-4 border-b border-gray-100 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('friends')}
          className={cn(
            'relative flex items-center gap-2 px-2 pb-3 text-sm font-bold transition-all',
            activeTab === 'friends' ? 'text-indigo-600' : 'text-gray-500'
          )}
        >
          <Users className="h-4 w-4" />
          {t('friends.tab_friends')}
          {friends && friends.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-slate-700">
              {friends.length}
            </span>
          )}
          {activeTab === 'friends' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            'relative flex items-center gap-2 px-2 pb-3 text-sm font-bold transition-all',
            activeTab === 'requests' ? 'text-indigo-600' : 'text-gray-500'
          )}
        >
          <Mail className="h-4 w-4" />
          {t('friends.tab_requests')}
          {requests && requests.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              {requests.length}
            </span>
          )}
          {activeTab === 'requests' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />
          )}
        </button>
      </div>

      {activeTab === 'friends' && (
        <>
          {friendsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : friends && friends.length > 0 ? (
            <div className="space-y-3">
              {friends.map((f) => (
                <FriendCard key={f.id} friend={f} onRemove={() => removeMutation.mutate(f.id)} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500 dark:text-slate-400">{t('friends.no_friends')}</p>
              <p className="text-sm text-gray-400 dark:text-slate-500">
                Cari teman dengan username untuk memulai!
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <>
          {requestsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  onAccept={() => acceptMutation.mutate(r.id)}
                  onDecline={() => declineMutation.mutate(r.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <Mail className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500 dark:text-slate-400">{t('friends.no_requests')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FriendCard({ friend, onRemove }: { friend: FriendResponse; onRemove: () => void }) {
  const { t } = useLocale();
  const [removing, setRemoving] = useState(false);

  const lastActive = friend.last_active
    ? new Date(friend.last_active).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
    : null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-inner"
          style={{ backgroundColor: friend.avatar_color || '#4F46E5' }}
        >
          {friend.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{friend.username}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-0.5">
              <Zap className="h-3 w-3 text-indigo-500" />
              Lv.{friend.level}
            </span>
            <span className="flex items-center gap-0.5">
              <Trophy className="h-3 w-3 text-amber-500" />
              {friend.xp} XP
            </span>
            {friend.streak > 0 && (
              <span className="flex items-center gap-0.5">
                <Flame className="h-3 w-3 text-red-500" />
                {friend.streak}
              </span>
            )}
            {lastActive && (
              <span className="text-gray-400 dark:text-slate-500">Aktif: {lastActive}</span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          setRemoving(true);
          onRemove();
        }}
        disabled={removing}
        className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/20 dark:hover:bg-red-900/10"
      >
        {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
        {t('friends.remove')}
      </button>
    </div>
  );
}

function RequestCard({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendResponse;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-inner"
          style={{ backgroundColor: request.avatar_color || '#4F46E5' }}
        >
          {request.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{request.username}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-0.5">
              <Zap className="h-3 w-3 text-indigo-500" />
              Lv.{request.level}
            </span>
            <span className="flex items-center gap-0.5">
              <Trophy className="h-3 w-3 text-amber-500" />
              {request.xp} XP
            </span>
            <span>Ingin menjadi temanmu</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
        >
          <Check className="h-3 w-3" />
          {t('friends.accept')}
        </button>
        <button
          onClick={onDecline}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
        >
          <X className="h-3 w-3" />
          {t('friends.decline')}
        </button>
      </div>
    </div>
  );
}
