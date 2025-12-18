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

export const RankChart: React.FC<RankChartProps> = ({ data, allMonths }) => {
  if (data.length === 0) return null;

  // Transform data for Recharts
  // We want an array of objects where key is month, and values are positions for each keyword
  const sortedMonths = [...allMonths].sort();
  
  const chartData = sortedMonths.map((month) => {
    const entry: any = { name: month };
    data.forEach((kwd) => {
      const pos = kwd.history[month]?.position;
      // Recharts doesn't handle nulls in line charts well for connecting lines sometimes, 
      // but "connectNulls" prop helps. 
      entry[kwd.keyword] = pos;
    });
    return entry;
  });

  const colors = [
    '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', 
    '#0891b2', '#be123c', '#4d7c0f', '#4338ca', '#be185d'
  ];

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">順位推移 ({data.length} キーワード)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis reversed domain={[1, 'auto']} allowDecimals={false} />
          <Tooltip />
          <Legend />
          {data.map((kwd, index) => (
            <Line
              key={kwd.keyword}
              connectNulls
              type="monotone"
              dataKey={kwd.keyword}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

