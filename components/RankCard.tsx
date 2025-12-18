import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { KeywordHistory } from '../types';
import { Bot, ExternalLink, ArrowUp, ArrowDown, Minus } from 'lucide-react';
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

  const getDiffIcon = (diff: number | null) => {
    if (diff === null || diff === 0) return <Minus className="w-3 h-3 text-gray-400" />;
    if (diff > 0) return <ArrowUp className="w-3 h-3 text-green-500" />;
    return <ArrowDown className="w-3 h-3 text-red-500" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-[200px] hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-sm font-bold text-gray-800 truncate" title={data.keyword}>
            {data.keyword}
          </h3>
          <div className="flex items-center gap-2 mt-1">
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
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {isAI && (
            <Bot size={14} className="text-purple-600" title="AI Overview" />
          )}
          {latestUrl && (
            <a href={latestUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500">
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Mini Chart */}
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="name" 
              hide 
            />
            <YAxis 
              reversed 
              hide 
              domain={[1, 'auto']} 
            />
            <Tooltip 
              contentStyle={{ fontSize: '12px', padding: '4px 8px' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: any) => [`${value}位`, 'Rank']}
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
      
      {/* Footer Info */}
      <div className="mt-2 text-xs text-gray-400 flex justify-between">
        <span>Vol: {data.volume.toLocaleString()}</span>
        <span>{allMonths[allMonths.length - 1]}</span>
      </div>
    </div>
  );
};

