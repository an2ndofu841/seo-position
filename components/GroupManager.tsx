import React, { useState, useRef, useEffect } from 'react';
import { KeywordGroup, Site } from '../types';
import { Plus, Trash2, Folder, List, X, Globe, ChevronDown, Check, MoreVertical } from 'lucide-react';

interface GroupManagerProps {
  groups: KeywordGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onCreateGroup: (name: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  
  // Site Props
  sites: Site[];
  currentSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onCreateSite: (name: string) => Promise<void>;
  onDeleteSite: (siteId: string) => Promise<void>;

  isOpen: boolean;
  onToggle: () => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
  sites,
  currentSiteId,
  onSelectSite,
  onCreateSite,
  onDeleteSite,
  isOpen,
  onToggle,
}) => {
  // Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Site State
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [isCreatingSite, setIsCreatingSite] = useState(false);
  const siteMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (siteMenuRef.current && !siteMenuRef.current.contains(event.target as Node)) {
        setIsSiteMenuOpen(false);
        setIsCreatingSite(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsCreatingGroup(true);
    await onCreateGroup(newGroupName);
    setNewGroupName('');
    setIsCreatingGroup(false);
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;
    await onCreateSite(newSiteName);
    setNewSiteName('');
    setIsCreatingSite(false);
  };

  const currentSite = sites.find(s => s.id === currentSiteId);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`
          fixed md:relative 
          z-30 h-full bg-white border-r border-gray-200 
          transition-all duration-300 ease-in-out
          flex flex-col shrink-0
          ${isOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'}
        `}
      >
        {/* Site Selector Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
           <div className="relative" ref={siteMenuRef}>
             <button 
               onClick={() => setIsSiteMenuOpen(!isSiteMenuOpen)}
               className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm hover:border-blue-400 transition-colors"
             >
               <div className="flex items-center gap-2 min-w-0">
                 <Globe size={16} className="text-blue-600 shrink-0" />
                 <span className="font-bold text-gray-800 truncate">
                   {currentSite ? currentSite.name : 'サイトを選択'}
                 </span>
               </div>
               <ChevronDown size={16} className="text-gray-400 shrink-0" />
             </button>

             {/* Dropdown Menu */}
             {isSiteMenuOpen && (
               <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                 <div className="max-h-60 overflow-y-auto">
                   {sites.map(site => (
                     <div 
                       key={site.id}
                       className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer group"
                       onClick={() => {
                         onSelectSite(site.id);
                         setIsSiteMenuOpen(false);
                       }}
                     >
                       <div className="flex items-center gap-2 truncate">
                         {site.id === currentSiteId && <Check size={14} className="text-blue-600" />}
                         <span className={`text-sm ${site.id === currentSiteId ? 'font-bold text-blue-700' : 'text-gray-700'}`}>
                           {site.name}
                         </span>
                       </div>
                       {sites.length > 1 && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             if (confirm(`サイト「${site.name}」とそのデータを全て削除しますか？`)) {
                               onDeleteSite(site.id);
                             }
                           }}
                           className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                         >
                           <Trash2 size={14} />
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
                 
                 {/* Add New Site */}
                 <div className="border-t border-gray-100 p-2">
                   {isCreatingSite ? (
                     <form onSubmit={handleCreateSite} className="flex gap-2">
                       <input
                         type="text"
                         placeholder="サイト名"
                         value={newSiteName}
                         onChange={(e) => setNewSiteName(e.target.value)}
                         className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                         autoFocus
                       />
                       <button 
                         type="submit"
                         className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                       >
                         <Plus size={16} />
                       </button>
                     </form>
                   ) : (
                     <button
                       onClick={() => setIsCreatingSite(true)}
                       className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                     >
                       <Plus size={16} />
                       新しいサイトを追加
                     </button>
                   )}
                 </div>
               </div>
             )}
           </div>
        </div>

        {/* Playlist Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Folder size={16} />
            <span className="truncate">プレイリスト</span>
          </h2>
          <button onClick={onToggle} className="md:hidden text-gray-500">
            <X size={18} />
          </button>
        </div>
        
        {/* Playlist Create Form */}
        <div className="p-4 pt-2">
          <form onSubmit={handleCreateGroup} className="flex gap-2">
            <input
              type="text"
              placeholder="新規作成"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={isCreatingGroup || !newGroupName.trim()}
              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => {
              onSelectGroup(null);
              if (window.innerWidth < 768) onToggle();
            }}
            className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
              selectedGroupId === null
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List size={16} />
            <span className="truncate">すべてのキーワード</span>
          </button>

          {groups.map((group) => (
            <div
              key={group.id}
              className={`group flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                selectedGroupId === group.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <button
                onClick={() => {
                  onSelectGroup(group.id);
                  if (window.innerWidth < 768) onToggle();
                }}
                className="flex-1 text-left truncate flex items-center gap-2 min-w-0"
              >
                <Folder size={14} className={`shrink-0 ${selectedGroupId === group.id ? 'fill-blue-200' : ''}`} />
                <span className="truncate">{group.name}</span>
                <span className="text-xs text-gray-400 font-normal shrink-0">({group.keywords.length})</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`プレイリスト「${group.name}」を削除しますか？`)) {
                    onDeleteGroup(group.id);
                  }
                }}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
