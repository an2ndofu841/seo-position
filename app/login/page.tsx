'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, signIn } from '@/app/auth/actions';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const checkSession = async () => {
      const res = await getCurrentUser();
      if (res.user) {
        router.replace('/');
      }
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
      router.replace('/');
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-screen-sm max-w-md bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-blue-600 font-semibold">SEO Rank Visualizer</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">ログイン</h1>
            <p className="text-sm text-gray-500 mt-1">メールアドレスとパスワードを入力してください。</p>
          </div>
          <Link
            href="/"
            className="text-xs text-blue-600 hover:underline"
          >
            ホームへ
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="you@example.com"
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {isPending ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs">
          <Link href="/admin/login" className="text-purple-700 hover:underline font-semibold">
            管理者ログインはこちら
          </Link>
          <Link href="/" className="text-gray-600 hover:underline">
            トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
