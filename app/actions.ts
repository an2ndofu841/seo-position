'use server';

import { createClient } from '@/utils/supabase/server';
import { KeywordHistory, MonthlyData } from '@/types';

export interface ParsedCsvData {
  keyword: string;
  volume: number;
  position: number | null;
  url: string;
  isAIOverview: boolean;
  dateStr: string; // YYYY-MM
}

export async function saveRankingData(data: ParsedCsvData[]) {
  const supabase = await createClient();

  try {
    // 1. Upsert Keywords
    // Get unique keywords from the batch
    const uniqueKeywords = Array.from(new Map(data.map(item => [item.keyword, item])).values());
    
    // Prepare keyword upsert data
    const keywordUpsertData = uniqueKeywords.map(item => ({
      keyword: item.keyword,
      volume: item.volume, // Update volume to latest
      updated_at: new Date().toISOString(),
    }));

    // Perform upsert on keywords
    const { data: keywordResults, error: keywordError } = await supabase
      .from('keywords')
      .upsert(keywordUpsertData, { onConflict: 'keyword' })
      .select('id, keyword');

    if (keywordError) throw keywordError;

    // Create a map of keyword text to ID
    const keywordIdMap = new Map<string, string>();
    keywordResults?.forEach(k => keywordIdMap.set(k.keyword, k.id));

    // 2. Upsert Rankings
    const rankingUpsertData = data.map(item => {
      const keywordId = keywordIdMap.get(item.keyword);
      if (!keywordId) return null;

      // Ensure date is first of the month YYYY-MM-01
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
      
      if (rankingError) throw rankingError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving data:', error);
    return { success: false, error };
  }
}

export async function getRankingData(): Promise<KeywordHistory[]> {
  const supabase = await createClient();

  // Fetch keywords and their rankings
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
    console.error('Error fetching data:', error);
    return [];
  }

  if (!keywords) return [];

  // Transform to KeywordHistory format
  const result: KeywordHistory[] = keywords.map((k: any) => {
    const history: { [monthKey: string]: MonthlyData } = {};
    
    // Sort rankings by date
    const sortedRankings = k.rankings.sort((a: any, b: any) => 
      new Date(a.ranking_date).getTime() - new Date(b.ranking_date).getTime()
    );

    sortedRankings.forEach((r: any) => {
      // Convert YYYY-MM-DD to YYYY-MM
      const dateStr = r.ranking_date.substring(0, 7);
      history[dateStr] = {
        position: r.position,
        url: r.url,
        isAIOverview: r.is_ai_overview,
        dateStr: dateStr,
      };
    });

    // Calculate diffs
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
}

