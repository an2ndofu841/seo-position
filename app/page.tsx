'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/FileUpload';
import { RankTable } from '@/components/RankTable';
import { RankChart } from '@/components/RankChart';
import { RankCard } from '@/components/RankCard';
import { RankingDistributionChart } from '@/components/RankingDistributionChart';
import { MonthComparison } from '@/components/MonthComparison';
import { StagnantKeywords } from '@/components/StagnantKeywords';
import { GroupManager } from '@/components/GroupManager';
import { KeywordInputModal } from '@/components/KeywordInputModal';
import { PdfExportButton } from '@/components/PdfExportButton';
import { GensparkExport } from '@/components/GensparkExport';
import { KeywordHistory, SortField, SortOrder, KeywordGroup, Site, UserProfile } from '@/types';
import { parseCsvFile } from '@/utils/csvParser';
import { 
  saveRankingData, getRankingData, deleteRankingDataByMonth, deleteAllData,
  createGroup, deleteGroup, addKeywordsToGroup, removeKeywordsFromGroup, getGroups,
  getSites, createSite, deleteSite, updateSite
} from '@/app/actions';
import { manualAddRanking } from '@/app/actions_manual';
import { fetchLatestRankings } from '@/app/actions_serp';
import { deleteKeyword } from '@/app/actions';
import { getCurrentUser, signOut } from '@/app/auth/actions';
import { LayoutGrid, List, BarChart2, Settings, Trash2, ArrowUpDown, Menu, PieChart, Plus, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';

type ViewMode = 'list' | 'grid' | 'summary';

export default function Home() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  // Site State
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);

  // Data State
  const [data, setData] = useState<KeywordHistory[]>([]);
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // View Control
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterText, setFilterText] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Group Control
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null); // null means "All"
  
  // Sorting Control
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Pagination
  const [displayLimit, setDisplayLimit] = useState(20);

  // Manual Input State
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [manualInputInitialKeyword, setManualInputInitialKeyword] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      setIsAuthLoading(true);
      const res = await getCurrentUser();
      if (!res.user) {
        router.replace('/login');
        return;
      }
      setAuthUser(res.user);
    };
    initAuth().finally(() => setIsAuthLoading(false));
  }, [router]);

  // 1. Load Sites after auth
  useEffect(() => {
    if (!authUser) return;
    loadSites();
  }, [authUser]);

  const loadSites = async () => {
    if (!authUser) return;
    setIsLoading(true);
    try {
      const sitesData = await getSites();
      setSites(sitesData);
      
      if (sitesData.length > 0) {
        if (!currentSiteId || !sitesData.find(s => s.id === currentSiteId)) {
          setCurrentSiteId(sitesData[0].id);
        }
      } else {
         setCurrentSiteId(null);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setAuthUser(null);
    router.replace('/login');
  };

  // 2. Fetch Data when Site Changes
  useEffect(() => {
    if (isAuthLoading || !authUser) return;
    if (currentSiteId) {
      fetchData(currentSiteId);
    } else {
      setData([]);
      setGroups([]);
      setIsLoading(false);
    }
  }, [currentSiteId, isAuthLoading, authUser]);

  const fetchData = async (siteId: string) => {
    setIsLoading(true);
    try {
      const [serverData, groupsData] = await Promise.all([
        getRankingData(siteId),
        getGroups(siteId)
      ]);
      setData(serverData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // --- Site Actions ---

  const handleCreateSite = async (name: string, url?: string) => {
    if (authUser?.role !== 'admin') {
      alert('サイトの作成は管理者のみ可能です。');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await createSite(name, url);
      if (!result.success) throw new Error(result.error);
      
      const newSites = await getSites();
      setSites(newSites);
      // Switch to new site
      if (result.data?.id) setCurrentSiteId(result.data.id);
    } catch (error: any) {
      alert(`サイト作成失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateSite = async (siteId: string, updates: { name?: string; url?: string }) => {
    if (authUser?.role !== 'admin') {
      alert('サイトの編集は管理者のみ可能です。');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await updateSite(siteId, updates);
      if (!result.success) throw new Error(result.error);
      
      const newSites = await getSites();
      setSites(newSites);
    } catch (error: any) {
      alert(`サイト更新失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (authUser?.role !== 'admin') {
      alert('サイトの削除は管理者のみ可能です。');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await deleteSite(siteId);
      if (!result.success) throw new Error(result.error);
      
      const newSites = await getSites();
      setSites(newSites);
      
      if (currentSiteId === siteId) {
        setCurrentSiteId(newSites.length > 0 ? newSites[0].id : null);
      }
    } catch (error: any) {
      alert(`サイト削除失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Data Actions ---

  const handleFileUpload = async (files: FileList, dateOverride?: string) => {
    if (!currentSiteId) return alert('サイトを選択してください。');
    
    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { parsedData } = await parseCsvFile(file, dateOverride);
        const result = await saveRankingData(parsedData, currentSiteId);
        if (!result.success) throw new Error(`Failed to save: ${result.error}`);
      }
      await fetchData(currentSiteId);
      alert('データのアップロードと保存が完了しました。');
    } catch (error: any) {
      console.error('Error:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDeleteMonth = async (month: string) => {
    if (!currentSiteId) return;
    if (authUser?.role !== 'admin') {
      alert('データ削除は管理者のみ可能です。');
      return;
    }
    if (!confirm(`${month} のデータを完全に削除しますか？\nこの操作は取り消せません。`)) { return; }
    
    setIsProcessing(true);
    try {
      const result = await deleteRankingDataByMonth(month, currentSiteId);
      if (!result.success) throw new Error(result.error as string);
      await fetchData(currentSiteId);
      alert(`${month} のデータを削除しました。`);
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(`削除失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!currentSiteId) return;
    if (authUser?.role !== 'admin') {
      alert('データ削除は管理者のみ可能です。');
      return;
    }
    if (!confirm('【警告】現在のサイトのすべてのデータを削除しますか？\n登録されているキーワードと順位履歴がすべて消去されます。')) { return; }
    if (!confirm('本当に削除してよろしいですか？\nこの操作は絶対に取り消せません。')) { return; }
    
    setIsProcessing(true);
    try {
      const result = await deleteAllData(currentSiteId);
      if (!result.success) throw new Error(result.error as string);
      await fetchData(currentSiteId);
      alert('すべてのデータを削除しました。');
      setShowAdmin(false);
    } catch (error: any) {
      console.error('Delete All error:', error);
      alert(`削除失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Group Actions
  const handleCreateGroup = async (name: string) => {
    if (!currentSiteId) return;
    
    setIsProcessing(true);
    try {
      const result = await createGroup(name, currentSiteId);
      if (!result.success) throw new Error(result.error);
      // Refresh groups
      const newGroups = await getGroups(currentSiteId);
      setGroups(newGroups);
    } catch (error: any) {
      alert(`作成失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!currentSiteId) return;
    if (!confirm('このグループを削除しますか？（キーワード自体は削除されません）')) return;
    setIsProcessing(true);
    try {
      const result = await deleteGroup(groupId);
      if (!result.success) throw new Error(result.error);
      if (selectedGroupId === groupId) setSelectedGroupId(null);
      const newGroups = await getGroups(currentSiteId);
      setGroups(newGroups);
    } catch (error: any) {
      alert(`削除失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToGroup = async (groupId: string) => {
    if (!currentSiteId) return;
    if (selectedKeywords.length === 0) return;
    
    const targetIds = data
      .filter(d => selectedKeywords.includes(d.keyword))
      .map(d => d.id)
      .filter((id): id is string => !!id);

    if (targetIds.length === 0) return;

    setIsProcessing(true);
    try {
      const result = await addKeywordsToGroup(groupId, targetIds);
      if (!result.success) throw new Error(result.error);
      alert(`${targetIds.length}個のキーワードをグループに追加しました。`);
      const newGroups = await getGroups(currentSiteId);
      setGroups(newGroups);
      setSelectedKeywords([]); 
    } catch (error: any) {
      alert(`追加失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSingleAddToGroup = async (groupId: string, keywordId: string) => {
    if (!currentSiteId) return;
    setIsProcessing(true);
    try {
      const result = await addKeywordsToGroup(groupId, [keywordId]);
      if (!result.success) throw new Error(result.error);
      
      const newGroups = await getGroups(currentSiteId);
      setGroups(newGroups);
    } catch (error: any) {
      alert(`追加失敗: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualAdd = async (inputData: {
    keyword: string;
    rankingDate: string;
    position: number | null;
    url: string;
    isAIOverview: boolean;
  }) => {
    if (!currentSiteId) return;
    
    const result = await manualAddRanking(
      currentSiteId,
      inputData.keyword,
      inputData.rankingDate,
      inputData.position,
      inputData.url,
      inputData.isAIOverview
    );

    if (result.success) {
      await fetchData(currentSiteId);
    } else {
      alert(`登録失敗: ${result.error}`);
    }
  };

  const handleRefreshRanking = async (keyword: string) => {
    if (!currentSiteId) return;
    const confirmMsg = `「${keyword}」の最新順位を取得しますか？\n（SerpApiを使用します）`;
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const targetUrl = sites.find((s) => s.id === currentSiteId)?.url;
      const result = await fetchLatestRankings(currentSiteId, keyword, targetUrl);
      if (result.success) {
        alert(`取得完了: ${result.position ? result.position + '位' : '圏外'}`);
        await fetchData(currentSiteId);
      } else {
        alert(`取得失敗: ${result.error}`);
      }
    } catch (e: any) {
      alert(`エラー: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string, keyword: string) => {
    if (!currentSiteId) return;
    const confirmMsg = `「${keyword}」を削除しますか？\nこの操作は元に戻せません。`;
    if (!confirm(confirmMsg)) return;

    try {
      const result = await deleteKeyword(keywordId);
      if (result.success) {
        // Optimistically remove from state or refetch
        setData(prev => prev.filter(k => k.id !== keywordId));
        // Also remove from selection if selected
        setSelectedKeywords(prev => prev.filter(k => k !== keyword));
      } else {
        alert(`削除失敗: ${result.error}`);
      }
    } catch (e: any) {
      alert(`エラー: ${e.message}`);
    }
  };

  // Helper to open modal with pre-filled keyword
  const openManualEntryModal = (keyword?: string) => {
    setManualInputInitialKeyword(keyword || '');
    setIsInputModalOpen(true);
  };

  // UI Handlers
  const handleToggleSelect = (keyword: string) => {
    setSelectedKeywords((prev) => {
      if (prev.includes(keyword)) return prev.filter((k) => k !== keyword);
      return [...prev, keyword];
    });
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      if (field === 'volume' || field === 'diff') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  // Filtering Logic
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // 1. Group Filter
    if (selectedGroupId) {
      const group = groups.find(g => g.id === selectedGroupId);
      if (group) {
        result = result.filter(item => group.keywords.includes(item.keyword));
      }
    }

    // 2. Text Filter
    if (filterText) {
      result = result.filter((item) =>
        item.keyword.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    
    // 3. Sort
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
  }, [data, filterText, sortField, sortOrder, selectedGroupId, groups]);

  const listChartData = useMemo(() => {
    if (selectedKeywords.length > 0) {
      return data.filter((item) => selectedKeywords.includes(item.keyword));
    }
    return [];
  }, [data, selectedKeywords]);

  if (isAuthLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-600 text-sm">認証情報を確認しています...</div>
      </main>
    );
  }

  if (!authUser) {
    return null;
  }

  return (
    <main className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <GroupManager 
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onCreateGroup={handleCreateGroup}
        onDeleteGroup={handleDeleteGroup}
        
        sites={sites}
        currentSiteId={currentSiteId}
        onSelectSite={setCurrentSiteId}
        onCreateSite={handleCreateSite}
        onUpdateSite={handleUpdateSite}
        onDeleteSite={handleDeleteSite}
        canManageSites={authUser?.role === 'admin'}

        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-lg shadow-sm border border-gray-200 gap-4">
              <div className="flex items-start gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-500 md:hidden"
                >
                  <Menu size={24} />
                </button>
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hidden md:block"
                  title={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
                >
                   <Menu size={20} />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800">SEO Rank Visualizer</h1>
                  <p className="text-gray-500 text-xs md:text-sm mt-1 flex items-center gap-2">
                    キーワード順位の推移を可視化・分析
                    {currentSiteId && sites.find(s => s.id === currentSiteId) && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {(() => {
                          const s = sites.find(s => s.id === currentSiteId);
                          return (
                            <>
                              {s?.favicon && <img src={s.favicon} alt="" className="w-3 h-3 rounded-sm" />}
                              {s?.name}
                            </>
                          );
                        })()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600">
                <div className="font-semibold text-gray-800">{authUser.email}</div>
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <ShieldCheck size={12} />
                  {authUser.role === 'admin' ? '管理者' : 'クライアント'}
                </div>
              </div>
              {authUser.role === 'admin' && (
                <Link
                  href="/admin"
                  className="px-2 py-1 text-[11px] bg-purple-100 text-purple-700 rounded-md font-semibold hover:bg-purple-200 whitespace-nowrap"
                >
                  管理ページ
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                title="ログアウト"
              >
                <LogOut size={16} />
              </button>
            </div>

             <button
               onClick={() => openManualEntryModal('')}
               className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors"
               title="順位登録"
             >
               <Plus size={18} />
             </button>

             <PdfExportButton 
               data={filteredData} 
               allMonths={sortedMonthsForChart}
               iconOnly
               buttonClassName="inline-flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"
             />
             
             <GensparkExport
                data={filteredData}
                allMonths={sortedMonthsForChart}
                siteName={currentSiteId ? sites.find(s => s.id === currentSiteId)?.name || 'My Site' : 'My Site'}
                iconOnly
             />

            {authUser.role === 'admin' && (
              <>
                <button
                  onClick={() => setShowAdmin(!showAdmin)}
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-md border transition-colors ${
                    showAdmin
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                  }`}
                  title="データ削除（月別CSV削除など）"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          
             <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={18} />
                リスト
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={18} />
                パネル
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PieChart size={18} />
                サマリー
              </button>
             </div>
          </div>
        </div>
        
        {/* Admin Panel ... */}
        {authUser.role === 'admin' && showAdmin && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg animate-in fade-in slide-in-from-top-2 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <Trash2 size={16} />
                月別データの削除 ({currentSiteId ? sites.find(s => s.id === currentSiteId)?.name : '未選択'})
              </h3>
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
               <button
                onClick={handleDeleteAll}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md text-sm font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                サイト内の全データを削除
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Input Modal */}
        <KeywordInputModal 
          isOpen={isInputModalOpen}
          onClose={() => setIsInputModalOpen(false)}
          onSubmit={handleManualAdd}
          initialKeyword={manualInputInitialKeyword}
        />

        {/* Upload Area */}
        <FileUpload onFileUpload={handleFileUpload} />
        
        {isProcessing && (
          <div className="text-center text-blue-600 py-4 font-medium animate-pulse">
            処理中...
          </div>
        )}

        {/* Group & Controls */}
        {data.length > 0 && (
          <div className="space-y-4">
            {/* Filter & Sort Controls */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col lg:flex-row gap-4 justify-between items-center">
              {/* Search */}
              <div className="relative w-full lg:w-auto flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="キーワードを検索..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                <div className="absolute right-3 top-2.5 text-gray-400 text-xs">
                  {filteredData.length} 件
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
                {/* Group Action for Selection */}
                {selectedKeywords.length > 0 && groups.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <span className="text-sm text-gray-600">{selectedKeywords.length}件選択中:</span>
                    <select 
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-gray-900"
                      onChange={(e) => {
                        if (e.target.value) handleAddToGroup(e.target.value);
                      }}
                      value=""
                    >
                      <option value="" disabled>グループに追加...</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort Control */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">並び順:</span>
                  <select
                    value={sortField}
                    onChange={(e) => handleSortChange(e.target.value as SortField)}
                    className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 text-gray-900 bg-white"
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
                  groups={groups}
                  selectedKeywords={selectedKeywords}
                  onToggleSelect={handleToggleSelect}
                  onAddToGroup={handleSingleAddToGroup}
                  onManualEntry={openManualEntryModal} 
                  onRefreshRanking={handleRefreshRanking}
                  onDeleteKeyword={handleDeleteKeyword} // New handler
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                />
              </div>
            ) : viewMode === 'grid' ? (
              // --- GRID VIEW ---
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredData.slice(0, displayLimit).map((item) => (
                    <RankCard 
                      key={item.keyword} 
                      data={item} 
                      allMonths={sortedMonthsForChart}
                      onManualEntry={openManualEntryModal}
                      onRefreshRanking={handleRefreshRanking}
                      onDeleteKeyword={handleDeleteKeyword} // New handler
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
            ) : (
              // --- SUMMARY VIEW ---
              <div className="space-y-6">
                <RankingDistributionChart 
                  data={filteredData} 
                  allMonths={sortedMonthsForChart} 
                />
                <MonthComparison 
                  data={filteredData}
                  allMonths={sortedMonthsForChart}
                />
                <StagnantKeywords 
                  data={filteredData} 
                  allMonths={sortedMonthsForChart} 
                />
              </div>
            )}
          </>
        ) : (
          !isProcessing && (
            <div className="text-center py-20 text-gray-400">
              {sites.length === 0 
                ? (authUser.role === 'admin'
                    ? 'サイトがありません。サイドバーからサイトを作成してください。'
                    : `閲覧可能なサイトが割り当てられていません。管理者にサイト権限の付与を依頼してください。（userId: ${authUser.id} / assigned: ${authUser.siteIds.length}）`)
                : 'データがありません。CSVファイルをアップロードしてください。'}
            </div>
          )
        )}
      </div>
    </div>
  </div>
</main>
  );
}
