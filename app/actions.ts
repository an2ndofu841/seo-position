'use server';

import { createNoCookieClient } from '@/utils/supabase/server';
import { KeywordHistory, MonthlyData, ParsedCsvData, KeywordGroup, Site } from '@/types';

// --- Site Actions ---

export async function getSites(): Promise<Site[]> {
  try {
    const supabase = await createNoCookieClient();
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get Sites Error:', error);
    return [];
  }
}

export async function createSite(name: string, url?: string) {
  try {
    const supabase = await createNoCookieClient();
    const { data, error } = await supabase
      .from('sites')
      .insert({ name, url })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Create Site Error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteSite(siteId: string) {
  try {
    const supabase = await createNoCookieClient();
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
    const supabase = await createNoCookieClient();
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
    const supabase = await createNoCookieClient();
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Delete Group Error:', error);
    return { success: false, error: error.message };
  }
}

export async function addKeywordsToGroup(groupId: string, keywordIds: string[]) {
  try {
    const supabase = await createNoCookieClient();
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
    const supabase = await createNoCookieClient();
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
    const supabase = await createNoCookieClient();
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
    const supabase = await createNoCookieClient();
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
    const supabase = await createNoCookieClient();

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

export async function saveRankingData(data: ParsedCsvData[], siteId: string) {
  try {
    const supabase = await createNoCookieClient();
    
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
    const supabase = await createNoCookieClient();

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
