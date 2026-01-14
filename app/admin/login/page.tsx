'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signIn } from '@/app/auth/actions';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const checkSession = async () => {
      const res = await getCurrentUser();
      if (!res.user) return;
      if (res.user.role === 'admin') router.replace('/admin');
      else router.replace('/');
    };
    checkSession();
  }, [router]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn(email, password);
      if (!result.success) {
        setError(result.error || 'ログインに失敗しました。');
        return;
      }
      const res = await getCurrentUser();
      if (!res.user) {
        setError('ログインに失敗しました。');
        return;
      }
      if (res.user.role !== 'admin') {
        setError('管理者権限がありません。');
        return;
      }
      router.replace('/admin');
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 px-4">
      <div className="w-full max-w-screen-sm max-w-md bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-purple-700 font-semibold">管理者ログイン</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Admin</h1>
            <p className="text-sm text-gray-500 mt-1">管理者アカウントでログインしてください。</p>
          </div>
          <Link href="/login" className="text-xs text-blue-600 hover:underline">
            通常ログインへ
          </Link>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">パスワード</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-purple-300"
          >
            {isPending ? 'ログイン中...' : '管理者としてログイン'}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500">
          <Link href="/" className="hover:underline text-gray-600">
            トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

