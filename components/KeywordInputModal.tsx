import React, { useState } from 'react';
import { X, Plus, Calendar, Link as LinkIcon, Search, Bot } from 'lucide-react';

interface KeywordInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    keyword: string;
    rankingDate: string;
    position: number | null;
    url: string;
    isAIOverview: boolean;
    useSerpApi: boolean;
  }) => Promise<void>;
  initialKeyword?: string;
}

export const KeywordInputModal: React.FC<KeywordInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialKeyword = '',
}) => {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [rankingDate, setRankingDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [position, setPosition] = useState<string>('');
  const [url, setUrl] = useState('');
  const [isAIOverview, setIsAIOverview] = useState(false);
  const [useSerpApi, setUseSerpApi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update keyword state when initialKeyword changes (e.g. reopening modal for specific keyword)
  React.useEffect(() => {
    setKeyword(initialKeyword);
  }, [initialKeyword]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return alert('キーワードを入力してください');
    if (!rankingDate) return alert('年月を入力してください');

    setIsSubmitting(true);
    try {
      await onSubmit({
        keyword: keyword.trim(),
        rankingDate,
        position: position ? parseInt(position, 10) : null,
        url: url.trim(),
        isAIOverview,
        useSerpApi,
      });
      // Close on success
      onClose();
      // Reset form (optional, depending on UX preference)
      setKeyword('');
      setPosition('');
      setUrl('');
      setIsAIOverview(false);
      setUseSerpApi(false);
    } catch (error) {
      alert('登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Plus size={18} className="text-blue-600" />
            順位データ手動登録
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* SerpAPI option */}
          <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50/60 p-3">
            <input
              type="checkbox"
              id="useSerpApi"
              checked={useSerpApi}
              onChange={(e) => {
                const next = e.target.checked;
                setUseSerpApi(next);
                if (next) {
                  const now = new Date();
                  setRankingDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                  setPosition('');
                  setUrl('');
                  setIsAIOverview(false);
                }
              }}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="useSerpApi" className="text-sm text-gray-800 cursor-pointer">
              <span className="font-semibold">APIで順位を計測して登録</span>
              <div className="text-xs text-gray-500 mt-1">
                SerpAPIで当月の順位を取得して保存します（手入力の順位/URLは使用しません）。
              </div>
            </label>
          </div>

          {/* Keyword */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーワード <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="例: SEO対策"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象年月 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="month"
                  value={rankingDate}
                  onChange={(e) => setRankingDate(e.target.value)}
                  disabled={useSerpApi}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                順位
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={useSerpApi}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="圏外は空欄"
              />
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ランクインURL (任意)
            </label>
            <div className="relative">
              <LinkIcon size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={useSerpApi}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="https://example.com/page"
              />
            </div>
          </div>

          {/* AI Overview Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isAIOverview"
              checked={isAIOverview}
              onChange={(e) => setIsAIOverview(e.target.checked)}
              disabled={useSerpApi}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            <label htmlFor="isAIOverview" className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer">
              <Bot size={16} className="text-purple-600" />
              AI Overview (SGE) に引用されている
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
