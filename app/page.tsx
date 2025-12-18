'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { RankTable } from '@/components/RankTable';
import { RankChart } from '@/components/RankChart';
import { KeywordHistory } from '@/types';
import { parseCsvFile } from '@/utils/csvParser';
import { saveRankingData, getRankingData } from '@/app/actions';
import { BarChart2, CheckSquare, Square } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<KeywordHistory[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // フィルタリングとグラフ全表示用State
  const [filterText, setFilterText] = useState('');
  const [showAllFilteredInChart, setShowAllFilteredInChart] = useState(false);

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
    return Array.from(months).sort();
  }, [data]);

  const handleFileUpload = async (files: FileList) => {
    setIsProcessing(true);
    
    try {
      // Process files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { parsedData } = await parseCsvFile(file);
        
        const result = await saveRankingData(parsedData);
        if (!result.success) {
          console.error('Server Save Error Details:', result.error);
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

  const handleToggleSelect = (keyword: string) => {
    // 全表示モードのときは個別の選択操作を無効化、またはモードを解除する
    if (showAllFilteredInChart) {
      setShowAllFilteredInChart(false);
    }

    setSelectedKeywords((prev) => {
      if (prev.includes(keyword)) {
        return prev.filter((k) => k !== keyword);
      } else {
        if (prev.length >= 20) { // 少し上限を緩和
          alert('手動選択できるキーワードは最大20個までです。');
          return prev;
        }
        return [...prev, keyword];
      }
    });
  };

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    if (!filterText) return data;
    return data.filter((item) =>
      item.keyword.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [data, filterText]);

  // チャート用データ
  const chartData = useMemo(() => {
    if (showAllFilteredInChart) {
      // フィルタリング結果が多すぎる場合のガード
      if (filteredData.length > 50) {
        // ここでアラートを出すとレンダリング中に副作用になるので、UI側で制御するか、あるいはsliceする
        return filteredData.slice(0, 50); 
      }
      return filteredData;
    }
    return data.filter((item) => selectedKeywords.includes(item.keyword));
  }, [data, selectedKeywords, showAllFilteredInChart, filteredData]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">SEO Rank Visualizer</h1>
            <p className="text-gray-500 text-sm mt-1">
              CSVデータをアップロードして、キーワード順位の推移を可視化します
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <FileUpload onFileUpload={handleFileUpload} />
        
        {isProcessing && (
          <div className="text-center text-blue-600 py-4 font-medium animate-pulse">
            データをSupabaseに保存中...
          </div>
        )}

        {/* Chart Area */}
        {(selectedKeywords.length > 0 || showAllFilteredInChart) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                グラフ表示
                {showAllFilteredInChart && filteredData.length > 50 && (
                  <span className="text-xs text-red-500 font-normal ml-2">
                    ※表示数が多いため上位50件のみ表示しています
                  </span>
                )}
              </h2>
            </div>
            <RankChart data={chartData} allMonths={allMonths} />
          </div>
        )}

        {/* Table Area */}
        {isLoading ? (
           <div className="text-center py-20 text-gray-500">
            データを読み込み中...
          </div>
        ) : data.length > 0 ? (
          <div className="space-y-4">
            {/* Filter & Controls */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-96">
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

              <button
                onClick={() => {
                  if (!showAllFilteredInChart && filteredData.length > 100) {
                    if (!confirm(`現在の検索結果は ${filteredData.length} 件あります。すべてグラフに表示すると動作が重くなる可能性がありますが続行しますか？`)) {
                      return;
                    }
                  }
                  setShowAllFilteredInChart(!showAllFilteredInChart);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showAllFilteredInChart
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showAllFilteredInChart ? <CheckSquare size={18} /> : <Square size={18} />}
                検索結果をすべてグラフに表示
              </button>
            </div>

            <RankTable
              data={filteredData} // フィルタ済みのデータを渡す
              selectedKeywords={selectedKeywords}
              onToggleSelect={handleToggleSelect}
            />
          </div>
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
