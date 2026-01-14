import { createClient } from '@supabase/supabase-js';

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} が未設定です。`);
  return v;
}

async function main() {
  const email = getArg('--email');
  const password = getArg('--password');
  const assignAllSites = process.argv.includes('--assign-all-sites');
  const confirm = process.argv.includes('--confirm');

  if (!email || !password) {
    throw new Error('使い方: node scripts/create-admin.mjs --email you@example.com --password "pass" --confirm [--assign-all-sites]');
  }
  if (!confirm) {
    throw new Error('安全のため --confirm が必須です。');
  }

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) ユーザー作成（存在してもエラーになるので、その場合はメールで検索して続行）
  let userId = null;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // 既存ユーザーの可能性があるので検索
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(`ユーザー作成失敗: ${createError.message} / 既存検索失敗: ${listErr.message}`);

    const found = list.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (!found) throw new Error(`ユーザー作成失敗: ${createError.message}`);
    userId = found.id;
  } else {
    userId = created.user?.id;
  }

  if (!userId) throw new Error('ユーザーIDが取得できませんでした。');

  // 2) profilesをadminに昇格（トリガーが未作成でもここで整合させる）
  const { error: upsertProfileErr } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      role: 'admin',
    },
    { onConflict: 'id' }
  );
  if (upsertProfileErr) throw new Error(`profiles更新失敗: ${upsertProfileErr.message}`);

  // 3) すべてのサイト閲覧権限を付与（任意）
  if (assignAllSites) {
    const { data: sites, error: sitesErr } = await supabase.from('sites').select('id');
    if (sitesErr) throw new Error(`sites取得失敗: ${sitesErr.message}`);
    const rows = (sites || []).map((s) => ({ user_id: userId, site_id: s.id }));
    if (rows.length > 0) {
      const { error: accessErr } = await supabase.from('user_site_access').upsert(rows);
      if (accessErr) throw new Error(`user_site_access付与失敗: ${accessErr.message}`);
    }
  }

  process.stdout.write(`OK: admin user created/updated: ${email} (id=${userId})\n`);
}

main().catch((e) => {
  process.stderr.write(`ERROR: ${e.message}\n`);
  process.exit(1);
});

