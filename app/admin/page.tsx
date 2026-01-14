'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientUser, getCurrentUser, listUsersWithAccess, updateUserSiteAccess, signOut } from '@/app/auth/actions';
import { getSites } from '@/app/actions';
import { Site, UserProfile } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserSites, setNewUserSites] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const init = async () => {
      const { user } = await getCurrentUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.role !== 'admin') {
        router.replace('/');
        return;
      }
      setAuthUser(user);
      await loadData();
    };

    init();
  }, [router]);

  const loadData = async () => {
    setError(null);
    const [siteList, userList] = await Promise.all([getSites(), listUsersWithAccess()]);
    setSites(siteList);
    if (userList.success) {
      setUsers(userList.users);
    } else {
      setError(userList.error);
    }
  };

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!newUserEmail || !newUserPassword) {
      setError('メールとパスワードを入力してください。');
      return;
    }

    startTransition(async () => {
      const result = await createClientUser(newUserEmail, newUserPassword, newUserSites);
      if (!result.success) {
        setError(result.error || '作成に失敗しました。');
        return;
      }
      setMessage('クライアントを作成しました。');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserSites([]);
      await loadData();
    });
  };

  const handleSiteToggle = (siteId: string, currentIds: string[], userId: string) => {
    const updatedIds = currentIds.includes(siteId)
      ? currentIds.filter((id) => id !== siteId)
      : [...currentIds, siteId];

    startTransition(async () => {
      const result = await updateUserSiteAccess(userId, updatedIds);
      if (!result.success) {
        setError(result.error || '閲覧範囲の更新に失敗しました。');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, siteIds: updatedIds } : u))
      );
      setMessage('閲覧範囲を更新しました。');
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-blue-600 font-semibold">管理者ページ</p>
          <h1 className="text-xl font-bold text-gray-900">クライアント管理</h1>
          <p className="text-sm text-gray-500">閲覧アカウントの作成とサイト権限を設定します。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            {authUser?.email} ({authUser?.role})
          </div>
          <Link
            href="/"
            className="px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
          >
            ダッシュボードへ
          </Link>
          <button
            onClick={handleSignOut}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-100"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-md p-3 text-sm">
            {message}
          </div>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">クライアントアカウントの作成</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">初期パスワード</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="******"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">閲覧可能なサイト</label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {sites.map((site) => (
                  <label key={site.id} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={newUserSites.includes(site.id)}
                      onChange={() =>
                        setNewUserSites((prev) =>
                          prev.includes(site.id)
                            ? prev.filter((id) => id !== site.id)
                            : [...prev, site.id]
                        )
                      }
                    />
                    <span className="text-sm text-gray-700 truncate">{site.name}</span>
                  </label>
                ))}
                {sites.length === 0 && (
                  <div className="text-sm text-gray-500">サイトがありません。先にサイトを作成してください。</div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isPending ? '作成中...' : '作成する'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ユーザー一覧</h2>
            <p className="text-xs text-gray-500">チェックを切り替えて閲覧範囲を更新できます。</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="px-3 py-2">メール</th>
                  <th className="px-3 py-2">ロール</th>
                  <th className="px-3 py-2">閲覧範囲</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-none">
                    <td className="px-3 py-2 text-gray-900">{user.email}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {sites.map((site) => (
                          <label key={site.id} className="flex items-center gap-1 text-xs text-gray-700 border border-gray-200 rounded-md px-2 py-1">
                            <input
                              type="checkbox"
                              checked={user.siteIds.includes(site.id)}
                              onChange={() => handleSiteToggle(site.id, user.siteIds, user.id)}
                              disabled={isPending || user.role === 'admin'}
                            />
                            <span className="truncate max-w-[140px]">{site.name}</span>
                          </label>
                        ))}
                        {user.siteIds.length === 0 && (
                          <span className="text-xs text-gray-400">閲覧範囲なし</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                      ユーザーがいません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
