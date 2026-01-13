'use server';

import { createNoCookieClient } from '@/utils/supabase/server';
import { ParsedCsvData } from '@/types';

// Manual Add Ranking Action
export async function manualAddRanking(
  siteId: string,
  keyword: string,
  rankingDate: string, // YYYY-MM
  position: number | null,
  url: string,
  isAIOverview: boolean
) {
  try {
    const supabase = await createNoCookieClient();
    
    // 1. Ensure keyword exists for this site
    // Upsert keyword
    const { data: keywordData, error: keywordError } = await supabase
      .from('keywords')
      .upsert({
        site_id: siteId,
        keyword: keyword,
        updated_at: new Date().toISOString()
      }, { onConflict: 'site_id, keyword' })
      .select('id')
      .single();

    if (keywordError) throw new Error(`Keyword upsert failed: ${keywordError.message}`);
    const keywordId = keywordData.id;

    // 2. Insert/Update ranking
    // Convert YYYY-MM to YYYY-MM-01
    const dateParts = rankingDate.split('-');
    const dbDate = `${dateParts[0]}-${dateParts[1]}-01`;

    const { error: rankingError } = await supabase
      .from('rankings')
      .upsert({
        keyword_id: keywordId,
        ranking_date: dbDate,
        position: position,
        url: url,
        is_ai_overview: isAIOverview
      }, { onConflict: 'keyword_id, ranking_date' });

    if (rankingError) throw new Error(`Ranking upsert failed: ${rankingError.message}`);

    return { success: true };
  } catch (error: any) {
    console.error('Manual Add Ranking Error:', error);
    return { success: false, error: error.message };
  }
}
