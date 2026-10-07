import React from 'react';
import { ShieldCheck, HardDrive, FileCheck2, Cpu, Scale, Building2 } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & App Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <Scale className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">KovaxFiles</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Desktop Edition
            </span>
          </div>
          <p className="text-xs text-slate-400">Plataforma de Engenharia Documental para Advocacia & Prefeituras</p>
        </div>
      </div>

      {/* 100% Local Security Status Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium offline-badge">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>100% Processamento Local (Zero Upload)</span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          <span>Offline Node.js + WASM</span>
        </div>
      </div>
    </header>
  );
};
