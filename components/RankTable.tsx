import React, { useState } from 'react';
import { KeywordHistory, SortField, SortOrder, KeywordGroup } from '../types';
import { ArrowUp, ArrowDown, Minus, Bot, ExternalLink, Crown, MoreHorizontal, Plus, Check, Edit3 } from 'lucide-react';
import { clsx } from 'clsx';

interface RankTableProps {
  data: KeywordHistory[];
  groups: KeywordGroup[];
  selectedKeywords: string[];
  onToggleSelect: (keyword: string) => void;
  onAddToGroup: (groupId: string, keywordId: string) => void;
  onManualEntry: (keyword: string) => void; // New prop
  // Sorting props from parent
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: SortField) => void;
}

export const RankTable: React.FC<RankTableProps> = ({
  data,
  groups,
  selectedKeywords,
  onToggleSelect,
  onAddToGroup,
  onManualEntry,
  sortField = 'position',
  sortOrder = 'asc',
  onSortChange,
}) => {
  const [activePopoverKeyword, setActivePopoverKeyword] = useState<string | null>(null);

  // Close popover when clicking outside is handled by CSS/Layout usually, 
  // but for simple implementation we can use a backdrop or just rely on mouse leave
  
  const handleHeaderClick = (field: SortField) => {
    if (onSortChange) {
      onSortChange(field);
    }
  };

  const getDiffIcon = (diff: number | null) => {
    if (diff === null || diff === 0) return <Minus className="w-4 h-4 text-gray-400" />;
    if (diff > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    return <ArrowDown className="w-4 h-4 text-red-500" />;
  };

  const getRankCrown = (rank: number | null) => {
    if (!rank) return null;
    if (rank === 1) return <Crown size={16} className="text-yellow-500 fill-yellow-500" />;
    if (rank === 2) return <Crown size={16} className="text-gray-400 fill-gray-400" />;
    if (rank === 3) return <Crown size={16} className="text-orange-500 fill-orange-500" />; 
    return null;
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                <input type="checkbox" disabled />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('keyword')}
              >
                Keyword {sortField === 'keyword' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
               <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('position')}
              >
                Rank {sortField === 'position' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('diff')}
              >
                Diff {sortField === 'diff' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('volume')}
              >
                Volume {sortField === 'volume' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => {
              const url = getLatestUrl(item);
              const ai = isAIOverview(item);
              const isSelected = selectedKeywords.includes(item.keyword);
              const crown = getRankCrown(item.latestPosition);
              const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.keyword)}`;
              
              const isInGroup = (groupId: string) => {
                const group = groups.find(g => g.id === groupId);
                return group?.keywords.includes(item.keyword);
              };

              return (
                <tr
                  key={item.keyword}
                  className={clsx(
                    'hover:bg-gray-50 transition-colors group/tr',
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
                      {crown && <span className="mr-2 shrink-0">{crown}</span>}
                      <span className="text-sm font-medium text-gray-900 line-clamp-2" title={item.keyword}>{item.keyword}</span>
                      {item.isNew && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 shrink-0">
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
                       {/* Google Search Link */}
                      <a 
                        href={googleSearchUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title={`Google検索: ${item.keyword}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-4 h-4 flex items-center justify-center font-serif font-bold text-[10px] border border-current rounded-sm leading-none">
                          G
                        </div>
                      </a>

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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative group-row">
                    <div className="flex justify-end gap-2">
                      {/* Manual Entry Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onManualEntry(item.keyword);
                        }}
                        className="p-1.5 rounded-full transition-all duration-200 border bg-white text-gray-400 border-gray-200 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover/tr:opacity-100"
                        title="順位データ追加"
                      >
                        <Edit3 size={16} />
                      </button>

                      {/* Add to Playlist Button - Show on Hover or when active */}
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePopoverKeyword(activePopoverKeyword === item.keyword ? null : item.keyword);
                          }}
                          className={clsx(
                            "p-1.5 rounded-full transition-all duration-200 border",
                            activePopoverKeyword === item.keyword 
                              ? "bg-blue-100 text-blue-600 border-blue-200 opacity-100" 
                              : "bg-white text-gray-400 border-gray-200 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover/tr:opacity-100"
                          )}
                          title="プレイリストに追加"
                        >
                          <Plus size={16} />
                        </button>

                      {/* Popover Menu */}
                      {activePopoverKeyword === item.keyword && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePopoverKeyword(null);
                            }} 
                          />
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-200 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-1">
                              プレイリストに追加
                            </div>
                            
                            <div className="max-h-60 overflow-y-auto">
                              {groups.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
                                  プレイリストがありません
                                </div>
                              ) : (
                                groups.map(group => {
                                  const added = isInGroup(group.id);
                                  return (
                                    <button
                                      key={group.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!added && item.id) {
                                          onAddToGroup(group.id, item.id);
                                          // Keep menu open to allow multiple selections or close it? 
                                          // Usually close is better UX for single action, but toggle might be better.
                                          // For now, let's close it to show feedback.
                                          setActivePopoverKeyword(null);
                                        }
                                      }}
                                      disabled={added}
                                      className={clsx(
                                        "w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors",
                                        added ? "text-blue-600 bg-blue-50 cursor-default" : "text-gray-700 hover:bg-gray-50"
                                      )}
                                    >
                                      <span className="truncate font-medium">{group.name}</span>
                                      {added && <Check size={16} className="shrink-0" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
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
