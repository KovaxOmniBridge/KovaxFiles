import React from 'react';
import { ShieldCheck, HardDrive, FileCheck2, Cpu, FileCheck, Sparkles, EyeOff, Bot } from 'lucide-react';
import { OfflineBadge } from './OfflineBadge';

export type AppTabType = 'converter' | 'signer' | 'sanitizer' | 'redactor' | 'local-ai';

interface NavbarProps {
  activeTab: AppTabType;
  onTabChange: (tab: AppTabType) => void;
  onOpenCompliance: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenCompliance }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white font-sans">
                Manipulador<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">Local</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.0 Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Local na Máquina • Jurídico, Governo & Saúde
            </p>
          </div>
        </div>

        {/* Offline Badge & Compliance Action */}
        <div className="flex items-center space-x-3">
          
          <OfflineBadge />

          <button
            onClick={onOpenCompliance}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold transition-all shadow-md"
            title="Verificar relatório de auditoria e conformidade de TI"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Relatório de Conformidade (TI)</span>
          </button>

        </div>

      </div>

      {/* Corporate Tab Switcher - All 5 tabs visible without scrollbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between sm:justify-start gap-1.5 border-t border-slate-900 py-2">
        <button
          onClick={() => onTabChange('converter')}
          className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'converter'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Conversor & Otimizador
        </button>

        <button
          onClick={() => onTabChange('signer')}
          className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'signer'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 text-indigo-300" />
          Assinador PAdES / ICP-Brasil
        </button>

        <button
          onClick={() => onTabChange('sanitizer')}
          className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'sanitizer'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
          Higienizador EXIF/GPS
        </button>

        <button
          onClick={() => onTabChange('redactor')}
          className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'redactor'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5 text-purple-300" />
          Tarjador LGPD / PII
        </button>

        <button
          onClick={() => onTabChange('local-ai')}
          className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'local-ai'
              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 text-white shadow-lg shadow-indigo-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-300" />
          Analisador & Comparador IA Local
        </button>
      </div>

    </header>
  );
};
