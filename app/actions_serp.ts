'use server';

import { getAuthContext } from '@/utils/auth';
import { manualAddRanking } from './actions_manual';
import { createServiceClient } from '@/utils/supabase/admin';

// SerpApi のAPIキー。環境差分を吸収するため複数名を許容（ハードコードはしない）。
const SERP_API_KEY =
  process.env.SERPAPI_API_KEY ||
  process.env.SERPAPI_KEY ||
  process.env.SERP_API_KEY ||
  '';

const normalizeToUrl = (raw: string) => {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export async function fetchLatestRankings(siteId: string, keyword: string, targetUrl?: string) {
  try {
    if (!SERP_API_KEY) {
      throw new Error('SerpApi APIキーが未設定です。環境変数 SERPAPI_KEY（推奨）を設定してください。');
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

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`SerpApi Request Failed: ${response.status} ${response.statusText}${text ? ` / ${text}` : ''}`);
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
            searchDomain = new URL(normalizeToUrl(targetUrl)).hostname;
        } catch (e) {
            console.warn('Invalid target URL for matching:', targetUrl);
        }
    } else {
        // Fetch site url from DB if not passed
        // sites はRLSの影響を受けやすいので、サービスロールがある場合はそれで確実に取得する
        const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : supabase;
        const { data: site } = await db.from('sites').select('url').eq('id', siteId).maybeSingle();
        if (site?.url) {
          try {
            searchDomain = new URL(normalizeToUrl(site.url)).hostname;
          } catch (e) {
            // ignore
          }
        }
    }

    if (!searchDomain) {
        throw new Error(
          `サイトのURLが取得できないため、順位を判定できません。サイト設定からURL（https://〜）を登録してください。（siteId: ${siteId}）`
        );
    }

    const normalizeDomain = (d: string) => d.replace(/^www\./i, '').toLowerCase();
    const needle = normalizeDomain(searchDomain);

    // Search for domain in results
    const foundItem = organicResults.find((item: any) => {
        try {
            const itemDomain = normalizeDomain(new URL(item.link).hostname);
            return itemDomain === needle || itemDomain.endsWith(`.${needle}`);
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
