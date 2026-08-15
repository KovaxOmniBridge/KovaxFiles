import React from 'react';
import type { FileCategory } from '../types';
import { Layers, Scale, Image as ImageIcon, FileText, Video, Table, Presentation, Archive } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: FileCategory;
  onSelectCategory: (cat: FileCategory) => void;
  counts: Record<FileCategory, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  counts,
}) => {
  const tabs: { id: FileCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Todos os Arquivos', icon: <Layers className="w-4 h-4" /> },
    { id: 'pdf_court', label: 'PDF Tribunal', icon: <Scale className="w-4 h-4" /> },
    { id: 'image', label: 'Imagens (HEIC/TIFF)', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'document', label: 'Documentos (Word/EPUB)', icon: <FileText className="w-4 h-4" /> },
    { id: 'spreadsheet', label: 'Planilhas (XLSX/CSV)', icon: <Table className="w-4 h-4" /> },
    { id: 'presentation', label: 'Apresentações (PPTX)', icon: <Presentation className="w-4 h-4" /> },
    { id: 'media', label: 'Áudio / Vídeo', icon: <Video className="w-4 h-4" /> },
    { id: 'archive', label: 'Arquivos ZIP', icon: <Archive className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
      {tabs.map((tab) => {
        const isActive = selectedCategory === tab.id;
        const count = counts[tab.id] || 0;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectCategory(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
              isActive
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isActive ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
