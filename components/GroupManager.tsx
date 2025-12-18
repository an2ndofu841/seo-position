import React, { useState } from 'react';
import { KeywordGroup } from '../types';
import { Plus, Trash2, Folder, List, Menu, X } from 'lucide-react';

interface GroupManagerProps {
  groups: KeywordGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onCreateGroup: (name: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  isOpen: boolean;
  onToggle: () => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
  isOpen,
  onToggle,
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsCreating(true);
    await onCreateGroup(newGroupName);
    setNewGroupName('');
    setIsCreating(false);
  };

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
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Folder size={16} />
            <span className="truncate">プレイリスト</span>
          </h2>
          <button onClick={onToggle} className="md:hidden text-gray-500">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 pt-2">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="新規作成"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={isCreating || !newGroupName.trim()}
              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              <Plus size={16} />
            </button>
          </form>
        </div>

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

