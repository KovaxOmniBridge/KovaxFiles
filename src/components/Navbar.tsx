import React, { useState } from 'react';
import { HardDrive, FileCheck2, Cpu, FileCheck, Sparkles, EyeOff, Bot, Menu, X } from 'lucide-react';

export type AppTabType = 'converter' | 'signer' | 'sanitizer' | 'redactor' | 'local-ai';

interface NavbarProps {
  activeTab: AppTabType;
  onTabChange: (tab: AppTabType) => void;
  onOpenCompliance: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenCompliance }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: AppTabType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'converter', label: 'Conversor & Otimizador', icon: <Cpu className="w-4 h-4" />, color: 'from-blue-600 to-indigo-600' },
    { id: 'signer', label: 'Assinador PAdES / ICP-Brasil', icon: <FileCheck className="w-4 h-4" />, color: 'from-indigo-600 to-violet-600' },
    { id: 'sanitizer', label: 'Higienizador EXIF/GPS', icon: <Sparkles className="w-4 h-4" />, color: 'from-emerald-600 to-teal-600' },
    { id: 'redactor', label: 'Tarjador LGPD / PII', icon: <EyeOff className="w-4 h-4" />, color: 'from-violet-600 to-purple-600' },
    { id: 'local-ai', label: 'Analisador & Comparador IA Local', icon: <Bot className="w-4 h-4" />, color: 'from-blue-600 via-indigo-600 to-emerald-600' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-xs">
      <div className="w-[96vw] max-w-[96vw] mx-auto px-2 sm:px-4 lg:px-6 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-md shadow-blue-500/10">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <HardDrive className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 font-sans">
                Kovax<span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">Files</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center space-x-3">
          <button
            onClick={onOpenCompliance}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold transition-all shadow-xs"
            title="Verificar relatório de auditoria e conformidade de TI"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Relatório de Conformidade (TI)</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-all"
            aria-label="Alternar Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:block w-[96vw] max-w-[96vw] mx-auto px-2 sm:px-4 lg:px-6 border-t border-slate-100 py-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-xs ${
                  isActive
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-blue-500/20`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top duration-200">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                    isActive
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                      : 'text-slate-700 hover:bg-slate-100 border border-slate-100'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                onOpenCompliance();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>Relatório de Conformidade (TI)</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
