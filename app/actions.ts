'use server';

import { KeywordHistory, MonthlyData, ParsedCsvData, KeywordGroup, Site } from '@/types';
import { getAuthContext } from '@/utils/auth';
import { createServiceClient } from '@/utils/supabase/admin';

async function ensureAuthenticated() {
  const ctx = await getAuthContext();
  if (!ctx.userId) {
    throw new Error('ログインが必要です。');
  }
  return ctx;
}

function assertSiteAccess(ctx: Awaited<ReturnType<typeof getAuthContext>>, siteId: string) {
  if (!ctx.isAdmin && !ctx.siteIds.includes(siteId)) {
    throw new Error('このサイトへのアクセス権限がありません。');
  }
}

async function ensureKeywordAccess(
  supabase: Awaited<ReturnType<typeof getAuthContext>>['supabase'],
  ctx: Awaited<ReturnType<typeof getAuthContext>>,
  keywordId: string
) {
  const { data: kw } = await supabase.from('keywords').select('site_id').eq('id', keywordId).single();
  if (!kw?.site_id) {
    throw new Error('対象キーワードが見つかりません。');
  }
  assertSiteAccess(ctx, kw.site_id);
  return kw.site_id as string;
}

// --- Site Actions ---

export async function getSites(): Promise<Site[]> {
  try {
    const ctx = await ensureAuthenticated();
    const supabase = ctx.supabase;

    // 管理者の「サイト一覧」はクライアント権限設定にも使うため、
    // RLS/ポリシーの状態に左右されず取得できるようサービスロールを優先する。
    if (ctx.isAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createServiceClient();

      const { data: ordered, error: orderedError } = await admin
        .from('sites')
        .select('*')
        .order('created_at', { ascending: true });

      if (!orderedError) return ordered ?? [];

      // 既存DBの都合で created_at が無い等の場合に備えて、並び替え無しでフォールバック
      const { data: fallback, error: fallbackError } = await admin.from('sites').select('*');
      if (fallbackError) throw fallbackError;
      return fallback ?? [];
    }

    let query = supabase.from('sites').select('*').order('created_at', { ascending: true });

    if (!ctx.isAdmin) {
      if (ctx.siteIds.length === 0) return [];
      query = query.in('id', ctx.siteIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Get Sites Error:', error);
    return [];
  }
}

export async function createSite(name: string, url?: string) {
  try {
    const ctx = await ensureAuthenticated();
    if (!ctx.isAdmin) {
      return { success: false, error: '管理者のみがサイトを作成できます。' };
    }
    const supabase = ctx.supabase;
    
    // Automatically fetch favicon if URL is provided
    let favicon = '';
    if (url) {
      try {
        // Simple favicon fetching: Google Favicon API
        // Format: https://www.google.com/s2/favicons?domain=example.com&sz=64
        const domain = new URL(url).hostname;
        favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch (e) {
        console.error('Invalid URL for favicon:', url);
      }
    }

    const { data, error } = await supabase
      .from('sites')
      .insert({ name, url, favicon })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Create Site Error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSite(siteId: string, updates: { name?: string; url?: string }) {
  try {
    const ctx = await ensureAuthenticated();
    if (!ctx.isAdmin) {
      return { success: false, error: '管理者のみがサイトを編集できます。' };
    }
    const supabase = ctx.supabase;
    
    const updateData: any = { ...updates };
    
    // Update favicon if URL changed
    if (updates.url) {
      try {
        const domain = new URL(updates.url).hostname;
        updateData.favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch (e) {
        console.error('Invalid URL for favicon:', updates.url);
        // Don't update favicon if URL is invalid, or maybe clear it?
        // updateData.favicon = null;
      }
    }

    const { data, error } = await supabase
      .from('sites')
      .update(updateData)
      .eq('id', siteId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Update Site Error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteSite(siteId: string) {
  try {
    const ctx = await ensureAuthenticated();
    if (!ctx.isAdmin) {
      return { success: false, error: '管理者のみがサイトを削除できます。' };
    }
    const supabase = ctx.supabase;
    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Delete Site Error:', error);
    return { success: false, error: error.message };
  }
}

// --- Group Actions ---

export async function createGroup(name: string, siteId: string) {
  try {
    const ctx = await ensureAuthenticated();
    assertSiteAccess(ctx, siteId);
    const supabase = ctx.supabase;
    const { data, error } = await supabase
      .from('groups')
      .insert({ name, site_id: siteId })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Create Group Error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteGroup(groupId: string) {
  try {
    const ctx = await ensureAuthenticated();
    const supabase = ctx.supabase;

    const { data: group } = await supabase.from('groups').select('site_id').eq('id', groupId).single();
    if (group?.site_id) {
      assertSiteAccess(ctx, group.site_id);
    }

    const { error } = await supabase.from('groups').delete().eq('id', groupId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Delete Group Error:', error);
    return { success: false, error: error.message };
  }
}

export async function addKeywordsToGroup(groupId: string, keywordIds: string[]) {
  try {
    const ctx = await ensureAuthenticated();
    const supabase = ctx.supabase;

    const { data: group } = await supabase.from('groups').select('site_id').eq('id', groupId).single();
    if (group?.site_id) {
      assertSiteAccess(ctx, group.site_id);
    }
    const rows = keywordIds.map(kid => ({
      group_id: groupId,
      keyword_id: kid
    }));

    const { error } = await supabase
      .from('group_members')
      .upsert(rows, { onConflict: 'group_id, keyword_id' });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Add Keywords Error:', error);
    return { success: false, error: error.message };
  }
}

export async function removeKeywordsFromGroup(groupId: string, keywordIds: string[]) {
  try {
    const ctx = await ensureAuthenticated();
    const supabase = ctx.supabase;

    const { data: group } = await supabase.from('groups').select('site_id').eq('id', groupId).single();
    if (group?.site_id) {
      assertSiteAccess(ctx, group.site_id);
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .in('keyword_id', keywordIds);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Remove Keywords Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getGroups(siteId: string): Promise<KeywordGroup[]> {
  try {
    const ctx = await ensureAuthenticated();
    assertSiteAccess(ctx, siteId);
    const supabase = ctx.supabase;
    // Get groups for the specific site
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        group_members (
          keyword_id,
          keywords (
            keyword
          )
        )
      `)
      .eq('site_id', siteId);

    if (error) throw error;
    if (!data) return [];

    return data.map((g: any) => ({
      id: g.id,
      name: g.name,
      keywords: g.group_members
        .map((kg: any) => kg.keywords?.keyword)
        .filter((k: any) => k !== null)
    }));
  } catch (error) {
    console.error('Get Groups Error:', error);
    return [];
  }
}

// --- Data Actions ---

export async function deleteRankingDataByMonth(monthStr: string, siteId: string) {
  try {
    const ctx = await ensureAuthenticated();
    assertSiteAccess(ctx, siteId);
    const supabase = ctx.supabase;
    const targetDate = `${monthStr}-01`;

    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      throw new Error('Invalid date format. Use YYYY-MM');
    }

    // Need to find rankings that belong to keywords of this site
    // Delete rankings via join is tricky in Supabase basic API, usually done via IN clause
    
    // 1. Get Keyword IDs for this site
    const { data: keywords, error: kwError } = await supabase
      .from('keywords')
      .select('id')
      .eq('site_id', siteId);

    if (kwError) throw kwError;
    const keywordIds = keywords.map(k => k.id);

    if (keywordIds.length === 0) {
      return { success: true, count: 0 };
    }

    // 2. Delete rankings for these keywords and date
    const { error, count } = await supabase
      .from('rankings')
      .delete({ count: 'exact' })
      .eq('ranking_date', targetDate)
      .in('keyword_id', keywordIds);


    if (error) {
      console.error('Delete Error:', error);
      throw new Error(`Delete Failed: ${error.message}`);
    }

    return { success: true, count };
  } catch (error: any) {
    console.error('Server Action Error (deleteRankingDataByMonth):', error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function deleteAllData(siteId: string) {
  try {
    const ctx = await ensureAuthenticated();
    assertSiteAccess(ctx, siteId);
    const supabase = ctx.supabase;

    // Delete keywords for this site (cascade will delete rankings and group members)
    const { error: kwdError, count: kwdCount } = await supabase
      .from('keywords')
      .delete({ count: 'exact' })
      .eq('site_id', siteId);

    if (kwdError) {
      throw new Error(`Keyword Delete Failed: ${kwdError.message}`);
    }

    // Also delete groups for this site
    const { error: groupError } = await supabase
      .from('groups')
      .delete()
      .eq('site_id', siteId);
      
    if (groupError) {
       console.error('Group Delete Warning:', groupError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Server Action Error (deleteAllData):', error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function deleteKeyword(keywordId: string) {
  try {
    const ctx = await ensureAuthenticated();
    const supabase = ctx.supabase;

    await ensureKeywordAccess(supabase, ctx, keywordId);

    const { error } = await supabase.from('keywords').delete().eq('id', keywordId);

    if (error) {
      console.error('Delete Keyword Error:', error);
      throw new Error(`Delete Keyword Failed: ${error.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Server Action Error (deleteKeyword):', error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function saveRankingData(data: ParsedCsvData[], siteId: string) {
  try {
    const ctx = await ensureAuthenticated();
    assertSiteAccess(ctx, siteId);
    const supabase = ctx.supabase;
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables are missing on server.');
    }

    const uniqueKeywords = Array.from(new Map(data.map(item => [item.keyword, item])).values());
    
    const keywordUpsertData = uniqueKeywords.map(item => ({
      site_id: siteId,
      keyword: item.keyword,
      volume: item.volume, 
      updated_at: new Date().toISOString(),
    }));

    // Upsert keywords with (site_id, keyword) constraint
    const { data: keywordResults, error: keywordError } = await supabase
      .from('keywords')
      .upsert(keywordUpsertData, { onConflict: 'site_id, keyword' })
      .select('id, keyword');

    if (keywordError) {
      console.error('Keyword Upsert Error:', keywordError);
      throw new Error(`Keyword Upsert Failed: ${keywordError.message}`);
    }

    const keywordIdMap = new Map<string, string>();
    keywordResults?.forEach(k => keywordIdMap.set(k.keyword, k.id));

    const rankingUpsertData = data.map(item => {
      const keywordId = keywordIdMap.get(item.keyword);
      if (!keywordId) return null;

      const dateParts = item.dateStr.split('-');
      const rankingDate = `${dateParts[0]}-${dateParts[1]}-01`;

      return {
        keyword_id: keywordId,
        ranking_date: rankingDate,
        position: item.position,
        url: item.url,
        is_ai_overview: item.isAIOverview,
      };
    }).filter(item => item !== null);

    if (rankingUpsertData.length > 0) {
      const { error: rankingError } = await supabase
        .from('rankings')
        .upsert(rankingUpsertData as any, { onConflict: 'keyword_id, ranking_date' });
      
      if (rankingError) {
        console.error('Ranking Upsert Error:', rankingError);
        throw new Error(`Ranking Upsert Failed: ${rankingError.message}`);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Server Action Error (saveRankingData):', error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function getRankingData(siteId: string): Promise<KeywordHistory[]> {
  try {
    const ctx = await ensureAuthenticated();
    assertSiteAccess(ctx, siteId);
    const supabase = ctx.supabase;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Environment variables missing in getRankingData');
      return [];
    }

    // Fetch keywords only for the specific site
    const { data: keywords, error } = await supabase
      .from('keywords')
      .select(`
        id,
        keyword,
        volume,
        rankings (
          ranking_date,
          position,
          url,
          is_ai_overview
        )
      `)
      .eq('site_id', siteId);

    if (error) {
      console.error('Fetch Error:', error);
      throw new Error(`Fetch Failed: ${error.message}`);
    }

    if (!keywords) return [];

    const result: KeywordHistory[] = keywords.map((k: any) => {
      const history: { [monthKey: string]: MonthlyData } = {};
      
      const sortedRankings = (k.rankings || []).sort((a: any, b: any) => 
        new Date(a.ranking_date).getTime() - new Date(b.ranking_date).getTime()
      );

      sortedRankings.forEach((r: any) => {
        const dateStr = r.ranking_date.substring(0, 7);
        history[dateStr] = {
          position: r.position,
          url: r.url,
          isAIOverview: r.is_ai_overview,
          dateStr: dateStr,
        };
      });

      const months = Object.keys(history).sort();
      const lastMonth = months[months.length - 1];
      const prevMonth = months.length > 1 ? months[months.length - 2] : null;

      const currentPos = lastMonth ? history[lastMonth].position : null;
      const prevPos = prevMonth ? history[prevMonth].position : null;

      let diff: number | null = null;
      if (currentPos !== null && prevPos !== null) {
        diff = prevPos - currentPos;
      } else if (currentPos !== null && prevPos === null) {
        diff = 999;
      } else if (currentPos === null && prevPos !== null) {
        diff = -999;
      }

      return {
        id: k.id, 
        keyword: k.keyword,
        volume: k.volume,
        history,
        latestPosition: currentPos,
        latestDiff: diff,
        siteId: siteId
      };
    });

    return result;
  } catch (error) {
    console.error('Error in getRankingData:', error);
    return [];
  }
}
