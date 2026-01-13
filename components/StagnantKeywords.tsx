import React, { useMemo, useState } from 'react';
import { KeywordHistory } from '../types';
import { Minus, ExternalLink, Bot, ArrowRight, AlertCircle } from 'lucide-react';

interface StagnantKeywordsProps {
  data: KeywordHistory[];
  allMonths: string[];
}

export const StagnantKeywords: React.FC<StagnantKeywordsProps> = ({ data, allMonths }) => {
  const [stagnantPeriod, setStagnantPeriod] = useState(3); // Default 3 months
  
  // Logic to identify stagnant keywords
  const stagnantKeywords = useMemo(() => {
    if (allMonths.length < stagnantPeriod) return [];

    // Consider the latest N months
    const targetMonths = [...allMonths].sort().slice(-stagnantPeriod);
    
    return data.filter(item => {
      // 1. Must rank in all target months
      const hasRankings = targetMonths.every(m => item.history[m]?.position !== undefined);
      if (!hasRankings) return false;

      // 2. Must not be rank 1 in the latest month (already successful)
      const latestRank = item.history[targetMonths[targetMonths.length - 1]]?.position;
      if (latestRank === 1) return false;

      // 3. Check variance or range of movement
      const positions = targetMonths.map(m => item.history[m]!.position!);
      const minPos = Math.min(...positions);
      const maxPos = Math.max(...positions);
      
      // Criteria: Fluctuation within +/- 2 ranks over the period? Or strictly range <= 2?
      // Let's say range <= 2 (e.g. 4 -> 5 -> 4 is stagnant, 4 -> 8 -> 4 is volatile)
      const range = maxPos - minPos;
      
      return range <= 2;
    }).map(item => {
        const latestMonth = targetMonths[targetMonths.length - 1];
        return {
            ...item,
            latestPos: item.history[latestMonth]?.position,
            positions: targetMonths.map(m => ({ month: m, pos: item.history[m]?.position }))
        };
    }).sort((a, b) => (a.latestPos ?? 999) - (b.latestPos ?? 999)); // Sort by current rank
  }, [data, allMonths, stagnantPeriod]);

  if (allMonths.length < 2) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
           <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="text-orange-500" />
            停滞キーワード（対策候補）
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            直近{stagnantPeriod}ヶ月間で順位変動が少なく、1位を獲得できていないキーワード。
            リライトや内部リンク強化の候補です。
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <span className="text-xs font-bold text-gray-600">期間設定:</span>
            <select 
                value={stagnantPeriod}
                onChange={(e) => setStagnantPeriod(Number(e.target.value))}
                className="text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 py-1"
            >
                <option value={2}>直近 2ヶ月</option>
                <option value={3}>直近 3ヶ月</option>
                <option value={6}>直近 6ヶ月</option>
            </select>
        </div>
      </div>

      {stagnantKeywords.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
          該当する停滞キーワードはありません。順調に変動しているか、データ不足です。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">キーワード</th>
                <th className="px-4 py-2 text-center font-medium text-gray-500">現在順位</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">推移 ({stagnantPeriod}ヶ月)</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Volume</th>
                <th className="px-4 py-2 text-center font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {stagnantKeywords.slice(0, 10).map((k) => (
                <tr key={k.id || k.keyword} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {k.keyword}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {k.latestPos}位
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        {k.positions.map((p, idx) => (
                            <React.Fragment key={p.month}>
                                <span className="font-mono">{p.pos}</span>
                                {idx < k.positions.length - 1 && <ArrowRight size={12} className="text-gray-300" />}
                            </React.Fragment>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {k.volume.toLocaleString()}
                  </td>
                   <td className="px-4 py-3 text-center">
                    <a 
                        href={`https://www.google.com/search?q=${encodeURIComponent(k.keyword)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs"
                    >
                        確認 <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stagnantKeywords.length > 10 && (
              <div className="text-center py-2 text-xs text-gray-400 border-t border-gray-100">
                  他 {stagnantKeywords.length - 10} 件の停滞キーワードがあります
              </div>
          )}
        </div>
      )}
    </div>
  );
};
