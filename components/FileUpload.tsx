import React, { useCallback, useState } from 'react';
import { Upload, Calendar } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (files: FileList, dateOverride?: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // YYYY-MM
  const [useAutoDate, setUseAutoDate] = useState(true);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileUpload(e.dataTransfer.files, useAutoDate ? undefined : selectedMonth);
      }
    },
    [onFileUpload, selectedMonth, useAutoDate]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files, useAutoDate ? undefined : selectedMonth);
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Selection Control */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-fit">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="radio"
            checked={useAutoDate}
            onChange={() => setUseAutoDate(true)}
            className="text-blue-600 focus:ring-blue-500"
          />
          ファイル名から日付を自動判定
        </label>
        
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="radio"
            checked={!useAutoDate}
            onChange={() => setUseAutoDate(false)}
            className="text-blue-600 focus:ring-blue-500"
          />
          日付を指定:
        </label>
        
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setUseAutoDate(false);
          }}
          disabled={useAutoDate}
          className="border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-400 text-gray-900 bg-white"
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100"
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".csv"
          multiple
          onChange={handleChange}
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
          <Upload className="w-12 h-12 text-gray-400 mb-2" />
          <span className="text-gray-600 font-medium">
            CSVファイルをドロップ、またはクリックして選択
          </span>
          <span className="text-sm text-gray-400 mt-1">
            {!useAutoDate && selectedMonth 
              ? `${selectedMonth} のデータとして取り込みます`
              : "ファイル名に日付を含めてください (例: 2024-10.csv)"}
          </span>
        </label>
      </div>
    </div>
  );
};
