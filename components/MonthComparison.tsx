import React, { useState, useMemo } from 'react';
import { KeywordHistory } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Crown, Trophy, Target, ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MonthComparisonProps {
  data: KeywordHistory[];
  allMonths: string[];
}

interface MonthlyStats {
  month: string;
  totalRanked: number;
  rank1: string[];
  rank2: string[];
  rank3: string[];
  top10: number;
  avgRank: number;
}

export const MonthComparison: React.FC<MonthComparisonProps> = ({ data, allMonths }) => {
  // Default to comparing the latest two months
  const [monthA, setMonthA] = useState<string>(allMonths.length > 1 ? allMonths[1] : allMonths[0] || '');
  const [monthB, setMonthB] = useState<string>(allMonths[0] || '');

  const getStats = (month: string): MonthlyStats => {
    if (!month) return { month: '', totalRanked: 0, rank1: [], rank2: [], rank3: [], top10: 0, avgRank: 0 };

    const rankedItems = data.filter(item => {
      const pos = item.history[month]?.position;
      return pos !== undefined && pos !== null;
    });

    const rank1 = rankedItems.filter(i => i.history[month]?.position === 1).map(i => i.keyword);
    const rank2 = rankedItems.filter(i => i.history[month]?.position === 2).map(i => i.keyword);
    const rank3 = rankedItems.filter(i => i.history[month]?.position === 3).map(i => i.keyword);
    const top10 = rankedItems.filter(i => (i.history[month]?.position ?? 999) <= 10).length;

    const totalPos = rankedItems.reduce((acc, curr) => acc + (curr.history[month]?.position || 0), 0);
    const avgRank = rankedItems.length > 0 ? totalPos / rankedItems.length : 0;

    return {
      month,
      totalRanked: rankedItems.length,
      rank1,
      rank2,
      rank3,
      top10,
      avgRank
    };
  };

  const statsA = useMemo(() => getStats(monthA), [monthA, data]);
  const statsB = useMemo(() => getStats(monthB), [monthB, data]);

  // Chart Data
  const chartData = [
    {
      name: '1位',
      [monthA]: statsA.rank1.length,
      [monthB]: statsB.rank1.length,
    },
    {
      name: '2位',
      [monthA]: statsA.rank2.length,
      [monthB]: statsB.rank2.length,
    },
    {
      name: '3位',
      [monthA]: statsA.rank3.length,
      [monthB]: statsB.rank3.length,
    },
    {
      name: 'TOP 10',
      [monthA]: statsA.top10,
      [monthB]: statsB.top10,
    }
  ];

  const getDiffIcon = (valA: number, valB: number) => {
    const diff = valB - valA;
    if (diff > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (diff < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const KeywordList = ({ keywords, colorClass }: { keywords: string[], colorClass: string }) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {keywords.length > 0 ? (
        keywords.map(k => (
          <span key={k} className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
            {k}
          </span>
        ))
      ) : (
        <span className="text-xs text-gray-400 pl-1">-</span>
      )}
    </div>
  );

  if (allMonths.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <ArrowRight className="text-blue-500" />
        月次比較レポート
      </h3>

      {/* Selectors */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="relative">
          <label className="block text-xs font-bold text-gray-500 mb-1">比較元 (Month A)</label>
          <select 
            value={monthA} 
            onChange={(e) => setMonthA(e.target.value)}
            className="block w-40 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        
        <div className="pt-5 text-gray-400">
          <ArrowRight size={24} />
        </div>

        <div className="relative">
          <label className="block text-xs font-bold text-gray-500 mb-1">比較先 (Month B)</label>
          <select 
            value={monthB} 
            onChange={(e) => setMonthB(e.target.value)}
            className="block w-40 px-3 py-2 bg-white border border-blue-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          >
            {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Metrics Table */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2">主要指標の比較</h4>
            <div className="grid grid-cols-4 gap-4 text-center text-sm mb-2 font-medium text-gray-500">
              <div className="text-left">Metrics</div>
              <div>{monthA}</div>
              <div>{monthB}</div>
              <div>Diff</div>
            </div>
            
            <div className="space-y-3">
              {/* Rank 1 */}
              <div className="grid grid-cols-4 gap-4 items-center bg-white p-3 rounded shadow-sm">
                <div className="flex items-center gap-2 font-bold text-gray-700">
                  <Crown size={16} className="text-yellow-500 fill-yellow-500" />
                  1位
                </div>
                <div className="text-center font-mono text-gray-600">{statsA.rank1.length}</div>
                <div className="text-center font-mono font-bold text-gray-900">{statsB.rank1.length}</div>
                <div className="flex justify-center items-center gap-1">
                  {getDiffIcon(statsA.rank1.length, statsB.rank1.length)}
                  <span className={statsB.rank1.length - statsA.rank1.length > 0 ? 'text-green-600' : 'text-gray-600'}>
                    {Math.abs(statsB.rank1.length - statsA.rank1.length)}
                  </span>
                </div>
              </div>

              {/* Rank 2 */}
              <div className="grid grid-cols-4 gap-4 items-center bg-white p-3 rounded shadow-sm">
                <div className="flex items-center gap-2 font-bold text-gray-700">
                  <Trophy size={16} className="text-gray-400 fill-gray-400" />
                  2位
                </div>
                <div className="text-center font-mono text-gray-600">{statsA.rank2.length}</div>
                <div className="text-center font-mono font-bold text-gray-900">{statsB.rank2.length}</div>
                <div className="flex justify-center items-center gap-1">
                  {getDiffIcon(statsA.rank2.length, statsB.rank2.length)}
                  <span className={statsB.rank2.length - statsA.rank2.length > 0 ? 'text-green-600' : 'text-gray-600'}>
                    {Math.abs(statsB.rank2.length - statsA.rank2.length)}
                  </span>
                </div>
              </div>

              {/* Rank 3 */}
              <div className="grid grid-cols-4 gap-4 items-center bg-white p-3 rounded shadow-sm">
                <div className="flex items-center gap-2 font-bold text-gray-700">
                  <Target size={16} className="text-orange-500 fill-orange-500" />
                  3位
                </div>
                <div className="text-center font-mono text-gray-600">{statsA.rank3.length}</div>
                <div className="text-center font-mono font-bold text-gray-900">{statsB.rank3.length}</div>
                <div className="flex justify-center items-center gap-1">
                  {getDiffIcon(statsA.rank3.length, statsB.rank3.length)}
                  <span className={statsB.rank3.length - statsA.rank3.length > 0 ? 'text-green-600' : 'text-gray-600'}>
                    {Math.abs(statsB.rank3.length - statsA.rank3.length)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Keyword Details - Side by Side */}
          <div className="space-y-4">
             <h4 className="font-bold text-gray-700 border-b border-gray-200 pb-2">TOPキーワード内訳比較</h4>
             
             <div className="grid grid-cols-2 gap-4">
                {/* Month A Column */}
                <div className="space-y-4">
                   <div className="text-center text-xs font-bold text-gray-500 mb-2">{monthA}</div>
                   
                   <div className="bg-yellow-50 p-2 rounded border border-yellow-100 min-h-[80px]">
                     <div className="text-xs font-bold text-yellow-700 mb-1 flex items-center gap-1">
                       <Crown size={12} className="fill-yellow-500" /> 1位
                     </div>
                     <KeywordList keywords={statsA.rank1} colorClass="bg-white border-yellow-200 text-yellow-800" />
                   </div>

                   <div className="bg-gray-50 p-2 rounded border border-gray-200 min-h-[80px]">
                     <div className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                       <Trophy size={12} className="fill-gray-400" /> 2位
                     </div>
                     <KeywordList keywords={statsA.rank2} colorClass="bg-white border-gray-200 text-gray-700" />
                   </div>

                   <div className="bg-orange-50 p-2 rounded border border-orange-100 min-h-[80px]">
                     <div className="text-xs font-bold text-orange-700 mb-1 flex items-center gap-1">
                       <Target size={12} className="fill-orange-500" /> 3位
                     </div>
                     <KeywordList keywords={statsA.rank3} colorClass="bg-white border-orange-200 text-orange-800" />
                   </div>
                </div>

                {/* Month B Column */}
                <div className="space-y-4">
                   <div className="text-center text-xs font-bold text-blue-600 mb-2">{monthB}</div>

                   <div className="bg-yellow-50 p-2 rounded border border-yellow-100 min-h-[80px]">
                     <div className="text-xs font-bold text-yellow-700 mb-1 flex items-center gap-1">
                       <Crown size={12} className="fill-yellow-500" /> 1位
                     </div>
                     <KeywordList keywords={statsB.rank1} colorClass="bg-white border-yellow-200 text-yellow-800" />
                   </div>

                   <div className="bg-gray-50 p-2 rounded border border-gray-200 min-h-[80px]">
                     <div className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                       <Trophy size={12} className="fill-gray-400" /> 2位
                     </div>
                     <KeywordList keywords={statsB.rank2} colorClass="bg-white border-gray-200 text-gray-700" />
                   </div>

                   <div className="bg-orange-50 p-2 rounded border border-orange-100 min-h-[80px]">
                     <div className="text-xs font-bold text-orange-700 mb-1 flex items-center gap-1">
                       <Target size={12} className="fill-orange-500" /> 3位
                     </div>
                     <KeywordList keywords={statsB.rank3} colorClass="bg-white border-orange-200 text-orange-800" />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right: Comparative Chart */}
        <div className="bg-white rounded-lg p-4 border border-gray-100 h-[400px]">
          <h4 className="font-bold text-gray-700 mb-4 text-center">獲得数の推移比較</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={monthA} name={monthA} fill="#9ca3af" radius={[4, 4, 0, 0]} />
              <Bar dataKey={monthB} name={monthB} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
