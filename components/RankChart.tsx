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
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis reversed domain={[1, 'auto']} allowDecimals={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemSorter={(item) => (item.value as number)}
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
              isAnimationActive={false} // パフォーマンス向上のためアニメーションオフ
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
