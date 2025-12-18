'use server';

import { createNoCookieClient } from '@/utils/supabase/server';
import { KeywordHistory, MonthlyData, ParsedCsvData } from '@/types';

// 指定した月のランキングデータを削除する
export async function deleteRankingDataByMonth(monthStr: string) {
  try {
    const supabase = await createNoCookieClient();
    const targetDate = `${monthStr}-01`;

    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      throw new Error('Invalid date format. Use YYYY-MM');
    }

    console.log(`Attempting to delete rankings for date: ${targetDate}`);

    const { error, count } = await supabase
      .from('rankings')
      .delete({ count: 'exact' })
      .eq('ranking_date', targetDate);

    if (error) {
      console.error('Delete Error:', error);
      throw new Error(`Delete Failed: ${error.message}`);
    }

    console.log(`Deleted ${count} records.`);
    
    // RLSなどでブロックされた場合もcountは0になる可能性がある
    // 実際にデータがあるはずなのに0だった場合はエラーとみなす
    // ただし、「本当にデータがない」場合との区別がつかないが、UI上はボタンがある＝データがあるはず
    if (count === 0) {
       return { success: false, error: '削除対象が見つからないか、削除権限がありません(RLSポリシーを確認してください)。' };
    }

    return { success: true, count };
  } catch (error: any) {
    console.error('Server Action Error (deleteRankingDataByMonth):', error);
    return { success: false, error: error.message || String(error) };
  }
}

// 全データを削除する
export async function deleteAllData() {
  try {
    const supabase = await createNoCookieClient();

    // 1. Delete all rankings
    // Supabase (PostgREST) requires a filter for delete unless configured otherwise.
    // Use a filter that is always true like "id is not null"
    const { error: rankError, count: rankCount } = await supabase
      .from('rankings')
      .delete({ count: 'exact' })
      .not('id', 'is', null);
    
    if (rankError) {
       throw new Error(`Ranking Delete Failed: ${rankError.message}`);
    }

    // 2. Delete all keywords
    const { error: kwdError, count: kwdCount } = await supabase
      .from('keywords')
      .delete({ count: 'exact' })
      .not('id', 'is', null);

    if (kwdError) {
      throw new Error(`Keyword Delete Failed: ${kwdError.message}`);
    }

    if (rankCount === 0 && kwdCount === 0) {
        // Maybe already empty, or RLS blocked it
        // We can check if any data exists to distinguish
        const { count: checkCount } = await supabase.from('keywords').select('*', { count: 'exact', head: true });
        if (checkCount && checkCount > 0) {
            return { success: false, error: '削除権限がありません(RLSポリシーを確認してください)。' };
        }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Server Action Error (deleteAllData):', error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function saveRankingData(data: ParsedCsvData[]) {
  try {
    const supabase = await createNoCookieClient();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables are missing on server.');
    }

    // 1. Upsert Keywords
    const uniqueKeywords = Array.from(new Map(data.map(item => [item.keyword, item])).values());
    
    const keywordUpsertData = uniqueKeywords.map(item => ({
      keyword: item.keyword,
      volume: item.volume, 
      updated_at: new Date().toISOString(),
    }));

    const { data: keywordResults, error: keywordError } = await supabase
      .from('keywords')
      .upsert(keywordUpsertData, { onConflict: 'keyword' })
      .select('id, keyword');

    if (keywordError) {
      console.error('Keyword Upsert Error:', keywordError);
      throw new Error(`Keyword Upsert Failed: ${keywordError.message}`);
    }

    const keywordIdMap = new Map<string, string>();
    keywordResults?.forEach(k => keywordIdMap.set(k.keyword, k.id));

    // 2. Upsert Rankings
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

export async function getRankingData(): Promise<KeywordHistory[]> {
  try {
    const supabase = await createNoCookieClient();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Environment variables missing in getRankingData');
      return [];
    }

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
      `);

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
        keyword: k.keyword,
        volume: k.volume,
        history,
        latestPosition: currentPos,
        latestDiff: diff,
      };
    });

    return result;
  } catch (error) {
    console.error('Error in getRankingData:', error);
    return [];
  }
}
