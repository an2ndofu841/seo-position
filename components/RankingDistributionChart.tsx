import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
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
  { key: 'range1_10', label: '1位〜10位', min: 1, max: 10, color: '#2563eb' },   // blue-600
  { key: 'range11_20', label: '11位〜20位', min: 11, max: 20, color: '#3b82f6' }, // blue-500
  { key: 'range21_30', label: '21位〜30位', min: 21, max: 30, color: '#0ea5e9' }, // sky-500
  { key: 'range31_40', label: '31位〜40位', min: 31, max: 40, color: '#06b6d4' }, // cyan-500
  { key: 'range41_50', label: '41位〜50位', min: 41, max: 50, color: '#14b8a6' }, // teal-500
  { key: 'range51_60', label: '51位〜60位', min: 51, max: 60, color: '#84cc16' }, // lime-500
  { key: 'range61_70', label: '61位〜70位', min: 61, max: 70, color: '#eab308' }, // yellow-500
  { key: 'range71_80', label: '71位〜80位', min: 71, max: 80, color: '#f97316' }, // orange-500
  { key: 'range81_90', label: '81位〜90位', min: 81, max: 90, color: '#ef4444' }, // red-500
  { key: 'range91_100', label: '91位〜100位', min: 91, max: 100, color: '#b91c1c' }, // red-700
];

export const RankingDistributionChart: React.FC<RankingDistributionChartProps> = ({ data, allMonths }) => {
  const chartData = useMemo(() => {
    const sortedMonths = [...allMonths].sort();
    
    // 積み上げ順序（下から）: 91-100 -> 81-90 -> ... -> 1-10
    const reversedRanges = [...RANGES].reverse();

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

      // 1. 各ランク帯の個数を集計
      data.forEach((kwd) => {
        const pos = kwd.history[month]?.position;
        if (pos) {
          const range = RANGES.find(r => pos >= r.min && pos <= r.max);
          if (range) {
            counts[range.key]++;
          }
        }
      });

      // 2. 累積値を計算（下から積み上げる順序で計算）
      let cumulative = 0;
      const cumValues: Record<string, number> = {};
      
      reversedRanges.forEach((range) => {
        const val = counts[range.key];
        cumulative += val;
        cumValues[`cum_${range.key}`] = cumulative;
      });

      return {
        name: month,
        ...counts,
        ...cumValues,
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
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barSize={40}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'キーワード数', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              // ツールチップにはカウント値のみ表示（累積線は除外）
              filterNull={true}
              formatter={(value, name) => {
                 // 累積値のLineのデータはツールチップに出さない
                 if (typeof name === 'string' && name.startsWith('cum_')) return [null, null];
                 return [value, name];
              }}
              // 並び順制御
              itemSorter={(item) => RANGES.findIndex(r => r.key === item.dataKey)}
            />
            <Legend 
              content={
                <ul className="flex flex-wrap justify-center gap-4 pt-5">
                  {RANGES.map((entry) => (
                    <li key={entry.key} className="flex items-center text-sm text-gray-600">
                      <span 
                        className="w-3 h-3 mr-2 inline-block" 
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.label}
                    </li>
                  ))}
                </ul>
              }
            />
            
            {/* 積み上げ棒グラフ */}
            {[...RANGES].reverse().map((range) => (
              <Bar
                key={range.key}
                dataKey={range.key}
                name={range.label}
                stackId="a"
                fill={range.color}
                animationDuration={1000}
              />
            ))}

            {/* 境界線（点線） */}
            {[...RANGES].reverse().map((range) => (
              <Line
                key={`line_${range.key}`}
                type="monotone"
                dataKey={`cum_${range.key}`}
                stroke="#9ca3af" // 薄いグレー (gray-400)
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                legendType="none" // 凡例に出さない
                tooltipType="none" // ツールチップに出さない(Line側プロパティで指定できる場合があるが、Rechartsは一括制御が多い)
                name={`cum_${range.key}`} // formatterで除外するためのキー
              />
            ))}

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
