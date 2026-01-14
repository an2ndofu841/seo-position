'use server';

import { createClient } from '@supabase/supabase-js';

/**
 * サービスロール用のSupabaseクライアント。
 * 管理者アクション（ユーザー作成・権限付与など）でのみ利用する。
 */
export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません。');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
