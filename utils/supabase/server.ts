import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cookieを使用しないシンプルなクライアント（認証不要な操作用）
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentからの呼び出し時は無視
          }
        },
      },
    }
  )
}

// 認証を使用しない、単純なデータアクセス用クライアント
// Cookieエラーを回避するためにこちらを使用することを推奨
export async function createNoCookieClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll(cookiesToSet) {
          // 何もしない
        },
      },
    }
  )
}
