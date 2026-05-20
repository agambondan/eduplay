'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Mail, UserPlus, UserX, Users, X } from 'lucide-react';
import { FriendResponse, friendsApi } from '@/lib/api/friends';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { cn } from '@/lib/utils/cn';

export default function FriendsPage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');

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

  if (!user) {
    return (
      <div className="container max-w-md py-20 text-center">
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (username.trim()) sendMutation.mutate(username.trim());
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('friends.add_placeholder')}
              className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={sendMutation.isPending || !username.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('friends.send_request')
              )}
            </button>
          </form>
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
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-inner"
          style={{ backgroundColor: friend.avatar_color || '#4F46E5' }}
        >
          {friend.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{friend.username}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">{t('friends.tab_friends')}</p>
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
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-inner"
          style={{ backgroundColor: request.avatar_color || '#4F46E5' }}
        >
          {request.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{request.username}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Ingin menjadi temanmu</p>
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
