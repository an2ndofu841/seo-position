import React, { useRef, useState } from 'react';
import { KeywordHistory } from '../types';
import { RankCard } from './RankCard';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FileDown, Loader2 } from 'lucide-react';

interface PdfExportButtonProps {
  data: KeywordHistory[];
  allMonths: string[];
  buttonClassName?: string;
}

export const PdfExportButton: React.FC<PdfExportButtonProps> = ({ 
  data, 
  allMonths,
  buttonClassName 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // 16:9 (1920x1080) に収めるための設定
  // ヘッダーやマージンを除いたエリアにカードを配置
  // 4列 x 3行 = 12枚 / ページ
  const ITEMS_PER_PAGE = 12;
  
  // データをページごとに分割
  const pages = [];
  for (let i = 0; i < data.length; i += ITEMS_PER_PAGE) {
    pages.push(data.slice(i, i + ITEMS_PER_PAGE));
  }

  const handleExport = async () => {
    if (!printRef.current || data.length === 0) return;
    setIsGenerating(true);

    try {
      // 1920x1080 px のPDFを作成
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080],
        compress: true,
      });

      const pageElements = printRef.current.children;
      const totalPages = pageElements.length;
      setProgress({ current: 0, total: totalPages });
      
      for (let i = 0; i < totalPages; i++) {
        const pageEl = pageElements[i] as HTMLElement;
        
        // Canvas生成
        const canvas = await html2canvas(pageEl, {
          scale: 1, // 高解像度すぎるとファイルサイズが大きくなるので等倍
          useCORS: true,
          logging: false,
          width: 1920,
          height: 1080,
          windowWidth: 1920,
          windowHeight: 1080,
          backgroundColor: '#f3f4f6', // bg-gray-100
        } as any); // Type definition for scale might be missing in some versions

        const imgData = canvas.toDataURL('image/jpeg', 0.8); // 品質80%

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
        
        // Update progress
        setProgress({ current: i + 1, total: totalPages });
        // UI更新のために少し待機
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      pdf.save(`seo-rank-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('PDF出力中にエラーが発生しました。');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isGenerating || data.length === 0}
        className={buttonClassName || "flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"}
      >
        {isGenerating ? (
          <Loader2 size={18} className="animate-spin text-blue-600" />
        ) : (
          <FileDown size={18} />
        )}
        {isGenerating ? (
          progress ? `出力中 (${progress.current}/${progress.total})` : '準備中...'
        ) : 'PDF出力'}
      </button>

      {/* PDF生成用隠しレンダリングエリア */}
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '1920px', 
          height: '1080px', // 16:9
          zIndex: -9999, 
          visibility: isGenerating ? 'visible' : 'hidden', // visibility:hiddenでもhtml2canvasは動くが、描画崩れのリスクがあるため
          // 画面外に配置してレンダリングさせる
          transform: 'translateX(-200vw)', 
          backgroundColor: '#f3f4f6',
          overflow: 'hidden'
        }}
      >
        <div ref={printRef}>
          {pages.map((pageData, pageIndex) => (
            <div 
              key={pageIndex}
              className="w-[1920px] h-[1080px] p-12 bg-gray-100 flex flex-col relative page-break-after-always"
            >
              {/* Header */}
              <div className="flex justify-between items-end mb-8 border-b border-gray-300 pb-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-800">SEO Rank Report</h1>
                  <p className="text-xl text-gray-500 mt-2">Page {pageIndex + 1} / {pages.length}</p>
                </div>
                <div className="text-right text-gray-400 text-lg">
                  {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Grid Content: 4 cols x 3 rows = 12 items */}
              <div className="grid grid-cols-4 grid-rows-3 gap-6 flex-1 content-start">
                {pageData.map((item) => (
                  <div key={item.keyword} className="overflow-hidden transform scale-100 origin-top-left">
                     {/* RankCardをそのまま使うと高さが足りないor余る可能性があるので、ラッパーで調整 */}
                     <RankCard 
                       data={item} 
                       allMonths={allMonths} 
                     />
                  </div>
                ))}
              </div>
              
              {/* Footer */}
              <div className="absolute bottom-4 left-0 w-full text-center text-gray-400 text-sm">
                Generated by SEO Rank Visualizer
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

