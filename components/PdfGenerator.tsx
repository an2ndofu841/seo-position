import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { KeywordHistory } from '../types';
import { RankCard } from './RankCard';

interface PdfGeneratorProps {
  data: KeywordHistory[];
  allMonths: string[];
  onComplete: () => void;
  onClose: () => void;
}

export const PdfGenerator: React.FC<PdfGeneratorProps> = ({
  data,
  allMonths,
  onComplete,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('準備中...');

  useEffect(() => {
    const generatePdf = async () => {
      if (!containerRef.current) return;

      try {
        setStatusText('チャート描画中...');
        // チャートのアニメーション完了などを待つための待機時間
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [297, 167], // 16:9 (Approx A4 width, adjusted height)
        });

        const cards = Array.from(containerRef.current.children) as HTMLElement[];
        // 16:9 スライドに配置する数 (4列 x 2行 = 8枚)
        const cols = 4;
        const rows = 2;
        const cardsPerPage = cols * rows;
        const totalPages = Math.ceil(cards.length / cardsPerPage);

        // レイアウト設定
        const pageWidth = 297;
        const pageHeight = 167;
        const marginX = 10;
        const marginY = 15;
        const headerHeight = 10;
        
        const contentWidth = pageWidth - (marginX * 2);
        const contentHeight = pageHeight - (marginY * 2) - headerHeight;
        
        const cardWidth = (contentWidth - ((cols - 1) * 5)) / cols; // 5mm gap
        const cardHeight = (contentHeight - ((rows - 1) * 5)) / rows;

        setStatusText('PDF生成中...');

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();

          // ヘッダー (ページ番号)
          pdf.setFontSize(10);
          pdf.setTextColor(100);
          pdf.text(`SEO Rank Report - Page ${i + 1}/${totalPages}`, marginX, 10);
          pdf.text(new Date().toLocaleDateString(), pageWidth - marginX, 10, { align: 'right' });

          const startIndex = i * cardsPerPage;
          const endIndex = Math.min(startIndex + cardsPerPage, cards.length);
          
          for (let j = startIndex; j < endIndex; j++) {
            const localIndex = j - startIndex;
            const col = localIndex % cols;
            const row = Math.floor(localIndex / cols);

            const x = marginX + col * (cardWidth + 5);
            const y = marginY + headerHeight + row * (cardHeight + 5);

            // 更新: プログレス表示
            setProgress(Math.round(((j + 1) / cards.length) * 100));
            
            const card = cards[j];
            
            // html2canvasでキャプチャ
            const canvas = await html2canvas(card, {
              scale: 2, // 高解像度
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight);
          }
        }

        pdf.save(`ranking_report_${new Date().toISOString().slice(0, 10)}.pdf`);
        onComplete();
      } catch (error) {
        console.error('PDF Generation failed:', error);
        alert('PDF生成に失敗しました');
        onClose();
      }
    };

    // レンダリングが完了した次のサイクルで実行開始
    const timer = setTimeout(generatePdf, 100);
    return () => clearTimeout(timer);
  }, []); // onComplete, onClose, data.length などの依存はループ防止のため外すか慎重に扱う

  return (
    <div className="fixed inset-0 z-50 bg-white/90 flex flex-col items-center justify-center">
      <div className="text-xl font-bold mb-4 text-gray-700">
        PDF出力中... {progress}%
      </div>
      <div className="text-sm text-gray-500 mb-8">{statusText}</div>
      
      {/* プログレスバー */}
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 
        隠しレンダリング領域 
        画面外に配置するが、display:noneだとhtml2canvasが動かないため
        absolute配置で隠す。
      */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '-10000px', 
          left: '-10000px',
          width: '1280px', // 固定幅でレンダリングの一貫性を保つ
        }}
      >
        <div ref={containerRef} className="grid grid-cols-4 gap-4">
          {data.map((item) => (
            <div key={item.keyword} style={{ width: '300px', height: '220px' }}>
              <RankCard data={item} allMonths={allMonths} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

