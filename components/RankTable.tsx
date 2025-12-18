import React, { useState } from 'react';
import { KeywordHistory, SortField, SortOrder } from '../types';
import { ArrowUp, ArrowDown, Minus, Bot, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

interface RankTableProps {
  data: KeywordHistory[];
  selectedKeywords: string[];
  onToggleSelect: (keyword: string) => void;
}

export const RankTable: React.FC<RankTableProps> = ({
  data,
  selectedKeywords,
  onToggleSelect,
}) => {
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterText, setFilterText] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc'); // Default for numbers usually asc (1 is best)
    }
  };

  const sortedData = [...data]
    .filter((item) =>
      item.keyword.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'keyword':
          valA = a.keyword;
          valB = b.keyword;
          break;
        case 'volume':
          valA = a.volume;
          valB = b.volume;
          // Volume usually desc is better
          break;
        case 'position':
          // Nulls should be at bottom usually
          valA = a.latestPosition ?? 999;
          valB = b.latestPosition ?? 999;
          break;
        case 'diff':
          valA = a.latestDiff ?? 0;
          valB = b.latestDiff ?? 0;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const getDiffIcon = (diff: number | null) => {
    if (diff === null || diff === 0) return <Minus className="w-4 h-4 text-gray-400" />;
    if (diff > 0) return <ArrowUp className="w-4 h-4 text-green-500" />; // Rank went up (number decreased, wait. Logic in parser: prev - current. If prev 10, cur 5, diff 5. Positive is Good)
    return <ArrowDown className="w-4 h-4 text-red-500" />;
  };

  const getLatestUrl = (item: KeywordHistory) => {
    const dates = Object.keys(item.history).sort();
    if (dates.length === 0) return '';
    return item.history[dates[dates.length - 1]].url;
  };

  const isAIOverview = (item: KeywordHistory) => {
    const dates = Object.keys(item.history).sort();
    if (dates.length === 0) return false;
    return item.history[dates[dates.length - 1]].isAIOverview;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">キーワード一覧 ({sortedData.length})</h2>
        <input
          type="text"
          placeholder="キーワードを検索..."
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                <input type="checkbox" disabled />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('keyword')}
              >
                Keyword {sortField === 'keyword' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
               <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('position')}
              >
                Rank {sortField === 'position' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('diff')}
              >
                Diff {sortField === 'diff' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('volume')}
              >
                Volume {sortField === 'volume' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL / Info
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item) => {
              const url = getLatestUrl(item);
              const ai = isAIOverview(item);
              const isSelected = selectedKeywords.includes(item.keyword);

              return (
                <tr
                  key={item.keyword}
                  className={clsx(
                    'hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-blue-50'
                  )}
                  onClick={() => onToggleSelect(item.keyword)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.keyword)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{item.keyword}</span>
                      {item.isNew && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-bold">
                      {item.latestPosition ?? '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm">
                      {getDiffIcon(item.latestDiff)}
                      <span className={clsx("ml-1 font-medium", 
                        (item.latestDiff ?? 0) > 0 ? "text-green-600" : 
                        (item.latestDiff ?? 0) < 0 ? "text-red-600" : "text-gray-500"
                      )}>
                        {item.latestDiff ? Math.abs(item.latestDiff) : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.volume.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      {ai && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200" title="AI Overview">
                          <Bot size={14} className="mr-1" />
                          AIO
                        </span>
                      )}
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-blue-500"
                          onClick={(e) => e.stopPropagation()}
                          title={url}
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

