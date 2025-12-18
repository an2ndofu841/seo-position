'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { RankTable } from '@/components/RankTable';
import { RankChart } from '@/components/RankChart';
import { KeywordHistory } from '@/types';
import { parseCsvFile } from '@/utils/csvParser';
import { saveRankingData, getRankingData } from '@/app/actions';
// import { Trash2 } from 'lucide-react'; // Removing clear button for now

export default function Home() {
  const [data, setData] = useState<KeywordHistory[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        // Parse locally
        const { parsedData } = await parseCsvFile(file);
        
        // Save to server
        const result = await saveRankingData(parsedData);
        if (!result.success) {
          throw new Error('Failed to save data to database');
        }
      }
      
      // Refresh data from server
      await fetchData();
      alert('データのアップロードと保存が完了しました。');
      
    } catch (error) {
      console.error('Error processing files:', error);
      alert('ファイルの処理中にエラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSelect = (keyword: string) => {
    setSelectedKeywords((prev) => {
      if (prev.includes(keyword)) {
        return prev.filter((k) => k !== keyword);
      } else {
        if (prev.length >= 10) {
          alert('グラフに表示できるキーワードは最大10個までです。');
          return prev;
        }
        return [...prev, keyword];
      }
    });
  };

  const chartData = useMemo(() => {
    return data.filter((item) => selectedKeywords.includes(item.keyword));
  }, [data, selectedKeywords]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">SEO Rank Visualizer</h1>
            <p className="text-gray-500 text-sm mt-1">
              CSVデータをアップロードして、キーワード順位の推移を可視化します (Supabase連携済み)
            </p>
          </div>
          <div className="flex items-center gap-4">
             {/* Clear button disabled for persistence mode */}
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
        {selectedKeywords.length > 0 && (
          <RankChart data={chartData} allMonths={allMonths} />
        )}

        {/* Table Area */}
        {isLoading ? (
           <div className="text-center py-20 text-gray-500">
            データを読み込み中...
          </div>
        ) : data.length > 0 ? (
          <RankTable
            data={data}
            selectedKeywords={selectedKeywords}
            onToggleSelect={handleToggleSelect}
          />
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
