'use server';

import { UserProfile } from '@/types';
import { getAuthContext } from '@/utils/auth';
import { createServiceClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

type ActionResult = { success: boolean; error?: string };

export async function signIn(email: string, password: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error('SignIn Error:', error);
    return { success: false, error: error.message || 'ログインに失敗しました。' };
  }
}

export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error('SignOut Error:', error);
    return { success: false, error: error.message || 'ログアウトに失敗しました。' };
  }
}

export async function getCurrentUser(): Promise<{ user: UserProfile | null }> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) return { user: null };
    return {
      user: {
        id: ctx.userId,
        email: ctx.email,
        role: ctx.role,
        siteIds: ctx.siteIds,
      },
    };
  } catch (error) {
    console.error('GetCurrentUser Error:', error);
    return { user: null };
  }
}

export async function createClientUser(
  email: string,
  password: string,
  siteIds: string[] = []
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.isAdmin) {
      return { success: false, error: '管理者権限が必要です。' };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY を設定してください。' };
    }

    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'client' },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const userId = data.user?.id;
    if (!userId) {
      return { success: false, error: 'ユーザー作成に失敗しました。' };
    }

    if (siteIds.length > 0) {
      const accessRows = siteIds.map((siteId) => ({
        user_id: userId,
        site_id: siteId,
      }));
      const { error: accessError } = await admin.from('user_site_access').upsert(accessRows);
      if (accessError) {
        return { success: false, error: accessError.message };
      }
    }

    // 念のためprofilesテーブルにもメール/roleを同期（トリガー未整備でも壊れないようupsert）
    await admin.from('profiles').upsert(
      {
        id: userId,
        email,
        role: 'client',
      },
      { onConflict: 'id' }
    );

    return { success: true };
  } catch (error: any) {
    console.error('CreateClientUser Error:', error);
    return { success: false, error: error.message || 'クライアント作成に失敗しました。' };
  }
}

export async function listUsersWithAccess(): Promise<
  { success: true; users: UserProfile[] } | { success: false; error: string }
> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.isAdmin) {
      return { success: false, error: '管理者権限が必要です。' };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY を設定してください。' };
    }

    const admin = createServiceClient();
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, email, role')
      .order('created_at', { ascending: true });

    if (profilesError) {
      return { success: false, error: profilesError.message };
    }

    const { data: accessRows, error: accessError } = await admin
      .from('user_site_access')
      .select('user_id, site_id');

    if (accessError) {
      return { success: false, error: accessError.message };
    }

    const users: UserProfile[] =
      profiles?.map((p) => ({
        id: p.id,
        email: p.email ?? '',
        role: (p.role as UserProfile['role']) ?? 'client',
        siteIds:
          accessRows
            ?.filter((a) => a.user_id === p.id)
            .map((a) => a.site_id) ?? [],
      })) ?? [];

    return { success: true, users };
  } catch (error: any) {
    console.error('ListUsersWithAccess Error:', error);
    return { success: false, error: error.message || 'ユーザー取得に失敗しました。' };
  }
}

export async function updateUserSiteAccess(userId: string, siteIds: string[]): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.isAdmin) {
      return { success: false, error: '管理者権限が必要です。' };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY を設定してください。' };
    }

    const admin = createServiceClient();

    // 既存アクセスを削除
    await admin.from('user_site_access').delete().eq('user_id', userId);

    if (siteIds.length > 0) {
      const rows = siteIds.map((siteId) => ({
        user_id: userId,
        site_id: siteId,
      }));
      const { error } = await admin.from('user_site_access').upsert(rows);
      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('UpdateUserSiteAccess Error:', error);
    return { success: false, error: error.message || '閲覧範囲の更新に失敗しました。' };
  }
}
