'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { RankTable } from '@/components/RankTable';
import { RankChart } from '@/components/RankChart';
import { RankCard } from '@/components/RankCard';
import { KeywordHistory, SortField, SortOrder } from '@/types'; // Import Sort Types
import { parseCsvFile } from '@/utils/csvParser';
import { saveRankingData, getRankingData, deleteRankingDataByMonth, deleteAllData } from '@/app/actions';
import { LayoutGrid, List, BarChart2, Settings, Trash2, AlertTriangle, ArrowUpDown } from 'lucide-react';

type ViewMode = 'list' | 'grid';

export default function Home() {
  const [data, setData] = useState<KeywordHistory[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // View Control
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterText, setFilterText] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  
  // Sorting Control (Moved to parent)
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Pagination / Limit for Grid View
  const [displayLimit, setDisplayLimit] = useState(20);

  // Load data from server on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const serverData = await getRankingData();
      setData(serverData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive all unique months from data for the chart axis
  const allMonths = useMemo(() => {
    const months = new Set<string>();
    data.forEach((item) => {
      Object.keys(item.history).forEach((m) => months.add(m));
    });
    return Array.from(months).sort().reverse();
  }, [data]);

  const sortedMonthsForChart = useMemo(() => {
     return [...allMonths].sort();
  }, [allMonths]);

  const handleFileUpload = async (files: FileList, dateOverride?: string) => {
    if (dateOverride === '') { }
    
    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { parsedData } = await parseCsvFile(file, dateOverride);
        const result = await saveRankingData(parsedData);
        if (!result.success) {
          throw new Error(`Failed to save data to database: ${result.error}`);
        }
      }
      await fetchData();
      alert('データのアップロードと保存が完了しました。');
    } catch (error: any) {
      console.error('Error processing files:', error);
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDeleteMonth = async (month: string) => {
    if (!confirm(`${month} のデータを完全に削除しますか？\nこの操作は取り消せません。`)) { return; }
    setIsProcessing(true);
    try {
      const result = await deleteRankingDataByMonth(month);
      if (!result.success) throw new Error(result.error as string);
      await fetchData();
      alert(`${month} のデータを削除しました。`);
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(`削除に失敗しました: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('【警告】すべてのデータを削除しますか？\n登録されているキーワードと順位履歴がすべて消去されます。')) { return; }
    if (!confirm('本当に削除してよろしいですか？\nこの操作は絶対に取り消せません。')) { return; }
    setIsProcessing(true);
    try {
      const result = await deleteAllData();
      if (!result.success) throw new Error(result.error as string);
      await fetchData();
      alert('すべてのデータを削除しました。');
      setShowAdmin(false);
    } catch (error: any) {
      console.error('Delete All error:', error);
      alert(`削除に失敗しました: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSelect = (keyword: string) => {
    setSelectedKeywords((prev) => {
      if (prev.includes(keyword)) return prev.filter((k) => k !== keyword);
      if (prev.length >= 20) {
        alert('手動選択できるキーワードは最大20個までです。');
        return prev;
      }
      return [...prev, keyword];
    });
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Set default order based on field
      if (field === 'volume' || field === 'diff') {
        setSortOrder('desc'); // High volume/diff first usually
      } else {
        setSortOrder('asc'); // Rank 1 is "lowest number" but highest rank
      }
    }
  };

  const filteredData = useMemo(() => {
    let result = [...data]; // Create a shallow copy to sort
    if (filterText) {
      result = result.filter((item) =>
        item.keyword.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    
    // Sort Logic
    result.sort((a, b) => {
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
          break;
        case 'position':
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

    return result;
  }, [data, filterText, sortField, sortOrder]);

  const listChartData = useMemo(() => {
    return data.filter((item) => selectedKeywords.includes(item.keyword));
  }, [data, selectedKeywords]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-lg shadow-sm border border-gray-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">SEO Rank Visualizer</h1>
            <p className="text-gray-500 text-sm mt-1">
              キーワード順位の推移を可視化・分析
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             <button
               onClick={() => setShowAdmin(!showAdmin)}
               className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${showAdmin ? 'bg-gray-100 text-blue-600' : 'text-gray-400'}`}
               title="データ管理"
             >
               <Settings size={20} />
             </button>
          
             {/* View Mode Toggle */}
             <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={18} />
                リスト
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={18} />
                パネル
              </button>
             </div>
          </div>
        </div>
        
        {/* Admin Panel ... (omitted same code) ... */}
        {showAdmin && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg animate-in fade-in slide-in-from-top-2 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <Trash2 size={16} />
                月別データの削除
              </h3>
              <p className="text-xs text-red-600 mb-4">
                指定した月のデータを削除します。キーワード自体は残ります。
              </p>
              {allMonths.length === 0 ? (
                 <div className="text-sm text-gray-500">削除可能なデータがありません。</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allMonths.map((month) => (
                    <button
                      key={month}
                      onClick={() => handleDeleteMonth(month)}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-700 rounded text-sm hover:bg-red-100 transition-colors shadow-sm"
                    >
                      {month}
                      <Trash2 size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-red-200 pt-4 mt-4">
               <h3 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} />
                危険な操作
              </h3>
              <button
                onClick={handleDeleteAll}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md text-sm font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                すべてのデータを削除（初期化）
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <FileUpload onFileUpload={handleFileUpload} />
        
        {isProcessing && (
          <div className="text-center text-blue-600 py-4 font-medium animate-pulse">
            処理中...
          </div>
        )}

        {/* Controls (Search Filter & Sort) */}
        {data.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="relative w-full sm:w-auto flex-1">
              <input
                type="text"
                placeholder="キーワードを検索..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <div className="absolute right-3 top-2.5 text-gray-400 text-xs">
                {filteredData.length} 件
              </div>
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-gray-500 whitespace-nowrap">並び順:</span>
              <select
                value={sortField}
                onChange={(e) => handleSortChange(e.target.value as SortField)}
                className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500"
              >
                <option value="position">順位</option>
                <option value="volume">ボリューム</option>
                <option value="diff">変動幅</option>
                <option value="keyword">キーワード</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600"
                title={sortOrder === 'asc' ? "昇順" : "降順"}
              >
                <ArrowUpDown size={16} className={sortOrder === 'asc' ? "" : "transform rotate-180"} />
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
           <div className="text-center py-20 text-gray-500">
            データを読み込み中...
          </div>
        ) : data.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              // --- LIST VIEW ---
              <div className="space-y-6">
                {selectedKeywords.length > 0 && (
                   <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      <BarChart2 className="w-5 h-5 text-gray-600" />
                      <h2 className="text-lg font-semibold text-gray-800">選択中キーワード比較</h2>
                    </div>
                    <RankChart data={listChartData} allMonths={sortedMonthsForChart} />
                  </div>
                )}
                
                <RankTable
                  data={filteredData}
                  selectedKeywords={selectedKeywords}
                  onToggleSelect={handleToggleSelect}
                  sortField={sortField} // Pass current sort
                  sortOrder={sortOrder} // Pass current order
                  onSortChange={handleSortChange} // Allow table headers to change sort
                />
              </div>
            ) : (
              // --- GRID VIEW ---
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredData.slice(0, displayLimit).map((item) => (
                    <RankCard 
                      key={item.keyword} 
                      data={item} 
                      allMonths={sortedMonthsForChart} 
                    />
                  ))}
                </div>
                
                {filteredData.length > displayLimit && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setDisplayLimit((prev) => prev + 20)}
                      className="px-6 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                    >
                      もっと表示する ({displayLimit} / {filteredData.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          !isProcessing && (
            <div className="text-center py-20 text-gray-400">
              データがありません。CSVファイルをアップロードしてください。
            </div>
          )
        )}
      </div>
    </main>
  );
}
