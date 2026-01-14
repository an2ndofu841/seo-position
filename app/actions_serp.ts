'use server';

import { getAuthContext } from '@/utils/auth';
import { manualAddRanking } from './actions_manual';

const SERP_API_KEY = process.env.SERP_API_KEY || 'b4b74badd880afe6d78843cb2ce68884374c24756fe5648c445af0a0a20e4685';

export async function fetchLatestRankings(siteId: string, keyword: string, targetUrl?: string) {
  try {
    if (!SERP_API_KEY) {
      throw new Error('SerpApi API Key is not configured.');
    }

    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return { success: false, error: 'ログインが必要です。' };
    }
    if (!ctx.isAdmin && !ctx.siteIds.includes(siteId)) {
      return { success: false, error: 'このサイトへのアクセス権限がありません。' };
    }
    const supabase = ctx.supabase;

    console.log(`Fetching ranking for: ${keyword}`);

    // SerpApi Request
    const params = new URLSearchParams({
      engine: 'google',
      q: keyword,
      api_key: SERP_API_KEY,
      num: '100', // Top 100 results
      gl: 'jp',   // Country: Japan
      hl: 'ja',   // Language: Japanese
    });

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`SerpApi Request Failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`SerpApi Error: ${data.error}`);
    }

    // Find ranking
    let position: number | null = null;
    let foundUrl = '';
    let isAIOverview = false; // Note: SerpApi might structure this differently, checking organic_results

    const organicResults = data.organic_results || [];
    
    // Check if targetUrl is provided (from site settings)
    // If not, we just save the top result? No, usually we look for *our* site.
    // We need the domain to match.
    
    // First, let's get the site domain to check against results
    let searchDomain = '';
    
    if (targetUrl) {
        try {
            searchDomain = new URL(targetUrl).hostname;
        } catch (e) {
            console.warn('Invalid target URL for matching:', targetUrl);
        }
    } else {
        // Fetch site url from DB if not passed
        const { data: site } = await supabase.from('sites').select('url').eq('id', siteId).single();
        if (site?.url) {
             try {
                searchDomain = new URL(site.url).hostname;
            } catch (e) { /* ignore */ }
        }
    }

    if (!searchDomain) {
        throw new Error('サイトのURLが設定されていないため、順位を判定できません。サイト設定からURLを登録してください。');
    }

    // Search for domain in results
    const foundItem = organicResults.find((item: any) => {
        try {
            const itemDomain = new URL(item.link).hostname;
            return itemDomain.includes(searchDomain);
        } catch (e) {
            return false;
        }
    });

    if (foundItem) {
        position = foundItem.position;
        foundUrl = foundItem.link;
    }

    // Check for AI Overview (Answer Box / Knowledge Graph could be proxies in SerpApi structure)
    // SerpApi often puts SGE/AI Overview in 'sports_results' or specific keys, 
    // but standard organic check is safest for now. 
    // If 'organic_results' contains it, it's ranked.
    // Specific 'isAIOverview' flag would require checking specific SerpApi keys like 'knowledge_graph' or 'answer_box' if they link to us.
    
    // Save the result
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await manualAddRanking(
        siteId,
        keyword,
        currentMonth,
        position,
        foundUrl,
        isAIOverview // Hard to determine exactly without complex logic, default false
    );

    return { success: true, position, url: foundUrl };

  } catch (error: any) {
    console.error('Fetch Ranking Error:', error);
    return { success: false, error: error.message };
  }
}
