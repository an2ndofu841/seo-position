import React, { useState } from 'react';
import { KeywordHistory } from '../types';
import { Sparkles, Copy, Check, X } from 'lucide-react';

interface GensparkExportProps {
  data: KeywordHistory[];
  allMonths: string[];
  siteName: string;
}

export const GensparkExport: React.FC<GensparkExportProps> = ({ data, allMonths, siteName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePrompt = () => {
    if (allMonths.length === 0) return 'データがありません。';

    const latestMonth = allMonths[allMonths.length - 1]; // sortedMonthsForChart is usually passed, which is ascending? 
    // Wait, allMonths in page.tsx is sorted descending in `allMonths` memo, but `sortedMonthsForChart` is ascending.
    // Let's assume input `allMonths` is ascending (oldest -> newest) based on typical chart usage, 
    // but we should verify. In page.tsx: sortedMonthsForChart = [...allMonths].sort().
    
    // Let's ensure we get the latest two months correctly.
    const sortedMonths = [...allMonths].sort();
    const currentMonth = sortedMonths[sortedMonths.length - 1];
    const prevMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null;

    // --- Statistics Calculation ---
    const getStats = (month: string) => {
      const monthData = data.filter(d => d.history[month]?.position);
      return {
        total: monthData.length,
        rank1: monthData.filter(d => d.history[month]?.position === 1),
        rank2: monthData.filter(d => d.history[month]?.position === 2),
        rank3: monthData.filter(d => d.history[month]?.position === 3),
        top10: monthData.filter(d => (d.history[month]?.position ?? 999) <= 10),
        rank11_30: monthData.filter(d => {
            const p = d.history[month]?.position ?? 999;
            return p >= 11 && p <= 30;
        }),
      };
    };

    const currentStats = getStats(currentMonth);
    const prevStats = prevMonth ? getStats(prevMonth) : null;

    // --- Formatting the Prompt ---
    let prompt = `あなたはプロのSEOコンサルタントです。
以下のデータは、Webサイト「${siteName}」のSEO検索順位の推移データです。
このデータを分析し、現状の評価、課題、および今後の対策案を含む詳細なSEOレポートを作成してください。
Gensparkとして、最新のSEOトレンドやアルゴリズムの動向も踏まえてアドバイスしてください。

【対象サイト】
サイト名: ${siteName}
対象月: ${currentMonth} (比較対象: ${prevMonth || 'なし'})

【順位サマリー】
■ ${currentMonth}の状況
- 計測キーワード総数: ${currentStats.total}個
- 1位 獲得数: ${currentStats.rank1.length}個
- 2位 獲得数: ${currentStats.rank2.length}個
- 3位 獲得数: ${currentStats.rank3.length}個
- TOP10 (1位-10位) 獲得数: ${currentStats.top10.length}個
- 11位-30位 獲得数: ${currentStats.rank11_30.length}個

`;

    if (prevStats) {
      prompt += `■ 前月(${prevMonth})との比較
- 1位: ${prevStats.rank1.length} → ${currentStats.rank1.length} (${currentStats.rank1.length - prevStats.rank1.length > 0 ? '+' : ''}${currentStats.rank1.length - prevStats.rank1.length})
- 2位: ${prevStats.rank2.length} → ${currentStats.rank2.length} (${currentStats.rank2.length - prevStats.rank2.length > 0 ? '+' : ''}${currentStats.rank2.length - prevStats.rank2.length})
- 3位: ${prevStats.rank3.length} → ${currentStats.rank3.length} (${currentStats.rank3.length - prevStats.rank3.length > 0 ? '+' : ''}${currentStats.rank3.length - prevStats.rank3.length})
- TOP10: ${prevStats.top10.length} → ${currentStats.top10.length} (${currentStats.top10.length - prevStats.top10.length > 0 ? '+' : ''}${currentStats.top10.length - prevStats.top10.length})

`;
    }

    prompt += `【注目キーワード】
■ 現在1位のキーワード (一部抜粋)
${currentStats.rank1.slice(0, 20).map(d => `- ${d.keyword}`).join('\n') || 'なし'}

■ 現在2位-3位のキーワード (一部抜粋 - 順位上昇のチャンス)
${[...currentStats.rank2, ...currentStats.rank3].slice(0, 20).map(d => `- ${d.keyword} (${d.history[currentMonth].position}位)`).join('\n') || 'なし'}

■ 順位が大きく上昇したキーワード (前月から5ランク以上アップ)
`;

    if (prevMonth) {
        const improved = data.filter(d => {
            const curr = d.history[currentMonth]?.position;
            const prev = d.history[prevMonth]?.position;
            return curr && prev && (prev - curr >= 5);
        }).sort((a, b) => (b.history[prevMonth]!.position! - b.history[currentMonth]!.position!) - (a.history[prevMonth]!.position! - a.history[currentMonth]!.position!));
        
        prompt += improved.slice(0, 15).map(d => `- ${d.keyword}: ${d.history[prevMonth]!.position}位 → ${d.history[currentMonth]!.position}位`).join('\n') || '特になし';
    }

    prompt += `

【依頼事項】
1. 全体的な順位傾向の分析（好調・不調の要因推測）
2. 特に成果が出ているキーワード群の特徴
3. 惜しくもTOP3に入っていないキーワード（4位-10位、11位-20位）への具体的な改善提案
4. 競合に勝つための、コンテンツSEOまたはテクニカルSEOの観点からのアドバイス

以上、よろしくお願いします。`;

    return prompt;
  };

  const handleCopy = () => {
    const text = generatePrompt();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 shadow-sm transition-colors"
      >
        <Sparkles size={18} />
        <span className="hidden sm:inline">AI分析プロンプト</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="text-purple-600" size={20} />
                Genspark / AI分析用プロンプト
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                以下のテキストをコピーして、Genspark (または ChatGPT, Claude, Gemini) に貼り付けてください。
                SEOレポートの草案を自動生成できます。
              </p>
              <textarea
                className="w-full flex-1 p-3 text-sm font-mono border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                readOnly
                value={generatePrompt()}
              />
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                閉じる
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'コピーしました' : 'クリップボードにコピー'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
