'use server';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/admin';

type UserRole = 'admin' | 'client';

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string | null;
  email: string;
  role: UserRole;
  siteIds: string[];
  isAdmin: boolean;
}

/**
 * 現在のセッション情報とプロファイルを取得する共通関数。
 * サーバーアクションからのみ利用することを想定。
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      userId: null,
      email: '',
      role: 'client',
      siteIds: [],
      isAdmin: false,
    };
  }

  // profiles.role がこのアプリの「権限の真実のソース」。
  // ただしRLS設定や既存データ都合で取得できない/存在しないことがあるので、
  // まずは通常クライアントで取得し、必要ならサービスロールで補助的に確認する。
  let { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createServiceClient();
      const { data: adminProfile } = await admin
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .maybeSingle();
      profile = adminProfile ?? profile;
    } catch {
      // サービスロール未設定/取得失敗時は無視（client扱いにフォールバック）
    }
  }

  const role = (profile?.role as UserRole) ?? 'client';

  const { data: siteAccess } = await supabase
    .from('user_site_access')
    .select('site_id')
    .eq('user_id', user.id);

  const siteIds = (siteAccess || []).map((s) => s.site_id);

  return {
    supabase,
    userId: user.id,
    email: profile?.email ?? user.email ?? '',
    role,
    siteIds,
    isAdmin: role === 'admin',
  };
}
