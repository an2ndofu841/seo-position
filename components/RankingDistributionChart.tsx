import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { KeywordHistory } from '../types';

interface RankingDistributionChartProps {
  data: KeywordHistory[];
  allMonths: string[];
}

const RANGES = [
  { key: 'range1_10', label: '1位〜10位', min: 1, max: 10, color: '#166534' },   // green-800
  { key: 'range11_20', label: '11位〜20位', min: 11, max: 20, color: '#15803d' }, // green-700
  { key: 'range21_30', label: '21位〜30位', min: 21, max: 30, color: '#16a34a' }, // green-600
  { key: 'range31_40', label: '31位〜40位', min: 31, max: 40, color: '#22c55e' }, // green-500
  { key: 'range41_50', label: '41位〜50位', min: 41, max: 50, color: '#4ade80' }, // green-400
  { key: 'range51_60', label: '51位〜60位', min: 51, max: 60, color: '#86efac' }, // green-300
  { key: 'range61_70', label: '61位〜70位', min: 61, max: 70, color: '#facc15' }, // yellow-400
  { key: 'range71_80', label: '71位〜80位', min: 71, max: 80, color: '#fbbf24' }, // yellow-500
  { key: 'range81_90', label: '81位〜90位', min: 81, max: 90, color: '#f59e0b' }, // yellow-600
  { key: 'range91_100', label: '91位〜100位', min: 91, max: 100, color: '#d97706' }, // yellow-700
];

export const RankingDistributionChart: React.FC<RankingDistributionChartProps> = ({ data, allMonths }) => {
  const chartData = useMemo(() => {
    // 日付順にソート（古い順）
    const sortedMonths = [...allMonths].sort();

    return sortedMonths.map((month) => {
      const counts: Record<string, number> = {
        range1_10: 0,
        range11_20: 0,
        range21_30: 0,
        range31_40: 0,
        range41_50: 0,
        range51_60: 0,
        range61_70: 0,
        range71_80: 0,
        range81_90: 0,
        range91_100: 0,
      };

      data.forEach((kwd) => {
        const pos = kwd.history[month]?.position;
        if (pos) {
          const range = RANGES.find(r => pos >= r.min && pos <= r.max);
          if (range) {
            counts[range.key]++;
          }
        }
      });

      return {
        name: month,
        ...counts,
      };
    });
  }, [data, allMonths]);

  if (data.length === 0) return null;

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold mb-6 text-gray-800">
        順位分布推移 (積み上げ棒グラフ)
      </h3>
      <div className="w-full h-[500px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'キーワード数', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {RANGES.map((range) => (
              <Bar
                key={range.key}
                dataKey={range.key}
                name={range.label}
                stackId="a"
                fill={range.color}
                animationDuration={1000}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

