import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { KeywordHistory } from '../types';
import { Bot, ExternalLink, ArrowUp, ArrowDown, Minus, BarChart3, Crown, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface RankCardProps {
  data: KeywordHistory;
  allMonths: string[];
}

export const RankCard: React.FC<RankCardProps> = ({ data, allMonths }) => {
  // チャート用データ変換
  const chartData = allMonths.map((month) => ({
    name: month,
    rank: data.history[month]?.position ?? null,
  }));

  const latestUrl = data.history[allMonths[allMonths.length - 1]]?.url;
  const isAI = data.history[allMonths[allMonths.length - 1]]?.isAIOverview;
  
  // 期間の取得
  const startMonth = allMonths[0];
  const endMonth = allMonths[allMonths.length - 1];

  const getDiffIcon = (diff: number | null) => {
    if (diff === null || diff === 0) return <Minus className="w-3 h-3 text-gray-400" />;
    if (diff > 0) return <ArrowUp className="w-3 h-3 text-green-500" />;
    return <ArrowDown className="w-3 h-3 text-red-500" />;
  };
  
  const getRankCrown = (rank: number | null) => {
    if (!rank) return null;
    if (rank === 1) return <Crown size={16} className="text-yellow-500 fill-yellow-500" />;
    if (rank === 2) return <Crown size={16} className="text-gray-400 fill-gray-400" />;
    if (rank === 3) return <Crown size={16} className="text-orange-500 fill-orange-500" />;
    return null;
  };

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(data.keyword)}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-[220px] hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 min-w-0">
             {getRankCrown(data.latestPosition)}
             <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight flex-1" title={data.keyword}>
               {data.keyword}
             </h3>
          </div>
          
          <div className="flex items-center justify-between mt-1 pl-0.5">
             <div className="flex items-center gap-2">
               <div className="text-2xl font-bold text-gray-900 leading-none">
                {data.latestPosition ?? '-'}
                <span className="text-xs font-normal text-gray-500 ml-1">位</span>
              </div>
              <div className="flex items-center text-xs font-medium bg-gray-50 px-1.5 py-0.5 rounded">
                {getDiffIcon(data.latestDiff)}
                <span className={clsx("ml-1", 
                  (data.latestDiff ?? 0) > 0 ? "text-green-600" : 
                  (data.latestDiff ?? 0) < 0 ? "text-red-600" : "text-gray-500"
                )}>
                  {data.latestDiff ? Math.abs(data.latestDiff) : '-'}
                </span>
              </div>
             </div>
             
             {/* Volume moved here */}
             <div className="text-xs text-gray-400 flex items-center gap-1" title="Volume">
                <BarChart3 size={12} />
                {data.volume.toLocaleString()}
             </div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0 items-center">
          {/* Google Search Link */}
          <a 
            href={googleSearchUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title={`Google検索: ${data.keyword}`}
          >
            <div className="w-3.5 h-3.5 flex items-center justify-center font-serif font-bold text-[10px] border border-current rounded-sm leading-none">
              G
            </div>
          </a>

          {isAI && (
            <span title="AI Overview" className="text-purple-600 cursor-help">
              <Bot size={14} />
            </span>
          )}
          {latestUrl && (
            <a href={latestUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500" title="掲載ページへ">
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Mini Chart */}
      <div className="flex-1 w-full min-h-0 relative mb-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              hide 
            />
            <YAxis 
              reversed 
              domain={[1, 100]} 
              hide={false}
              width={25}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickCount={3}
              interval="preserveStartEnd"
            />
            <ReferenceLine y={10} stroke="#e5e7eb" strokeDasharray="3 3" />
            
            <Tooltip 
              contentStyle={{ fontSize: '12px', padding: '4px 8px' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: any, name: any, props: any) => [`${value}位`, props.payload.name]}
            />
            <Line
              type="monotone"
              dataKey="rank"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2, fill: '#3b82f6' }}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Footer Info: Start Month --- End Month */}
      <div className="mt-1 pt-2 border-t border-gray-100 flex justify-between text-[10px] text-gray-400 font-medium">
        <span>{startMonth}</span>
        <span>{endMonth}</span>
      </div>
    </div>
  );
};
