'use server';

import { createNoCookieClient } from '@/utils/supabase/server';
import { KeywordHistory, MonthlyData, ParsedCsvData } from '@/types';

export async function saveRankingData(data: ParsedCsvData[]) {
  try {
    const supabase = await createNoCookieClient();
    
    // Check if client is initialized correctly
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
