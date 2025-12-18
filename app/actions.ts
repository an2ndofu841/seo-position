'use server';

import { createNoCookieClient } from '@/utils/supabase/server';
import { KeywordHistory, MonthlyData, ParsedCsvData } from '@/types';

// 指定した月のランキングデータを削除する
export async function deleteRankingDataByMonth(monthStr: string) {
  try {
    const supabase = await createNoCookieClient();
    
    // monthStr format: YYYY-MM
    // Ensure we match the exact date format stored in DB: YYYY-MM-01
    const targetDate = `${monthStr}-01`;

    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      throw new Error('Invalid date format. Use YYYY-MM');
    }

    console.log(`Attempting to delete rankings for date: ${targetDate}`);

    const { error, count } = await supabase
      .from('rankings')
      .delete({ count: 'exact' }) // count records to verify deletion
      .eq('ranking_date', targetDate);

    if (error) {
      console.error('Delete Error:', error);
      throw new Error(`Delete Failed: ${error.message}`);
    }

    console.log(`Deleted ${count} records.`);
    
    if (count === 0) {
       // If exact match failed, try range query (just in case of timezone shift, though 'date' type shouldn't have it)
       // But 'date' type in Postgres is strictly YYYY-MM-01. 
       // If count is 0, it means no data found. Maybe the user sees data but date is different?
       return { success: true, message: '削除対象のデータが見つかりませんでした。' };
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
    const { error: rankError } = await supabase
      .from('rankings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (using neq id dummy is a common trick if filtered delete is required, but here we want all)
      // Actually, standard delete without where clause might be blocked by Supabase setting "Delete requires filter".
      // Safe way is to delete by some condition that covers all.
    
    if (rankError) {
      // If "Delete requires filter" is on, try deleting by date range or id is not null
      const { error: rankErrorRetry } = await supabase
        .from('rankings')
        .delete()
        .not('id', 'is', null);
        
      if (rankErrorRetry) throw rankErrorRetry;
    }

    // 2. Delete all keywords (Cascade delete should handle rankings but let's be explicit or just delete keywords)
    const { error: kwdError } = await supabase
      .from('keywords')
      .delete()
      .not('id', 'is', null);

    if (kwdError) {
      console.error('Delete All Keywords Error:', kwdError);
      throw new Error(`Delete Keywords Failed: ${kwdError.message}`);
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
