import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { KeywordHistory } from '../types';

interface RankChartProps {
  data: KeywordHistory[];
  allMonths: string[];
}

// 多数のキーワードに対応するために色を動的に生成する関数
const generateColor = (index: number, total: number) => {
  const hue = (index * 137.508) % 360; // 黄金角を使って色を分散させる
  return `hsl(${hue}, 70%, 50%)`;
};

export const RankChart: React.FC<RankChartProps> = ({ data, allMonths }) => {
  if (data.length === 0) return null;

  // Transform data for Recharts
  const sortedMonths = [...allMonths].sort();
  
  const chartData = sortedMonths.map((month) => {
    const entry: any = { name: month };
    data.forEach((kwd) => {
      const pos = kwd.history[month]?.position;
      entry[kwd.keyword] = pos;
    });
    return entry;
  });

  return (
    <div className="w-full h-[500px] bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        順位推移 ({data.length} キーワード)
      </h3>
      <div className="w-full h-[calc(100%-3rem)] min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          {/* Y軸を1位〜100位に固定 */}
          <YAxis 
            reversed 
            domain={[1, 100]} 
            allowDecimals={false} 
            tickCount={6} // 1, 20, 40, 60, 80, 100
          />
          {/* 10位のボーダーライン */}
          <ReferenceLine y={10} stroke="red" strokeDasharray="3 3" label={{ value: "10位", position: "insideTopLeft", fontSize: 10, fill: "red" }} />
          
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemSorter={(item) => (item.value as number)}
            formatter={(value: any) => [`${value}位`]}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {data.map((kwd, index) => (
            <Line
              key={kwd.keyword}
              connectNulls
              type="monotone"
              dataKey={kwd.keyword}
              stroke={generateColor(index, data.length)}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false} 
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
    </div>
  );
};
