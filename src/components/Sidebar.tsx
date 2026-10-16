import React from 'react';
import { 
  FileArchive, 
  EyeOff, 
  Stamp, 
  FileStack, 
  ScanText, 
  Building2, 
  Scale, 
  FolderCheck,
  ShieldAlert,
  Eraser,
  RefreshCw,
  FileText,
  Lock,
  ShieldCheck,
  Award,
  Briefcase
} from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  category: 'Advocacia' | 'Prefeitura' | 'Geral';
  icon: React.ElementType;
  description: string;
  badge?: string;
}

export const TABS: TabItem[] = [
  {
    id: 'court_filing',
    label: 'Preparação de Protocolo',
    category: 'Advocacia',
    icon: Briefcase,
    description: 'Fluxo integrado: seleção, ordenação, divisão de volumes, numeração de peças e manifesto',
    badge: 'Fluxo Integrado'
  },
  {
    id: 'editor',
    label: 'Editor de Documentos',
    category: 'Advocacia',
    icon: FileText,
    description: 'Crie e edite petições, procurações e pareceres com formatação ABNT/PJe',
    badge: 'Estilo Docs'
  },
  {
    id: 'pades_signer',
    label: 'Assinador & Validador PAdES',
    category: 'Advocacia',
    icon: Award,
    description: 'Assine digitalmente com certificado A1 (.pfx) e valide PAdES / ICP-Brasil',
    badge: 'ISO 32000'
  },
  {
    id: 'compressor',
    label: 'Compressor Tribunais / PJe',
    category: 'Advocacia',
    icon: FileArchive,
    description: 'Otimize PDFs para PJe, TJSP e TRF sem perder qualidade',
    badge: 'Popular'
  },
  {
    id: 'converter',
    label: 'Conversor de Arquivos',
    category: 'Geral',
    icon: RefreshCw,
    description: 'Converta JPG/PNG para PDF, PDF para imagens e TXT',
    badge: 'Multimídia'
  },
  {
    id: 'privacy_suite',
    label: 'Privacidade, Tarjador & Criptografia',
    category: 'Geral',
    icon: ShieldCheck,
    description: 'Tarjamento definitivo LGPD, expurgo de metadados, criptografia e senhas',
    badge: 'Segurança Total'
  },
  {
    id: 'lexml',
    label: 'Kovax Legal Engine',
    category: 'Advocacia',
    icon: Scale,
    description: 'Pesquisa semântica, matriz de temporalidade (diff), súmulas e análise por caso',
    badge: 'LexSmart v2.5'
  },
  {
    id: 'stamper',
    label: 'Juntada & Carimbo de Folhas',
    category: 'Prefeitura',
    icon: Stamp,
    description: 'Numeração sequencial (Fl. 001) e chancela de processos'
  },
  {
    id: 'manipulator',
    label: 'Fusão & Divisão de PDF',
    category: 'Geral',
    icon: FileStack,
    description: 'Unifique petições + anexos ou separe páginas'
  },
  {
    id: 'ocr',
    label: 'OCR Local (Scanner)',
    category: 'Advocacia',
    icon: ScanText,
    description: 'Converta digitalizações antigas em texto pesquisável'
  }
];

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <aside className="w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        {/* Advocacy & City Hall Preset Shortcuts Header */}
        <div className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300">Uso Profissional</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Ferramentas adaptadas para exigências da Justiça Eletrônica e Gestão Municipal.
          </p>
        </div>

        {/* Navigation Categories */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Módulos Principais
          </p>

          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-900 group-hover:bg-slate-800 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium truncate">{tab.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{tab.category}</div>
                  </div>
                </div>

                {tab.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab.badge === 'Segurança' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Security Notice */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-tight">
            <span className="font-semibold text-slate-200 block mb-0.5">Conformidade LGPD</span>
            Arquivos sigilosos não saem do seu computador.
          </div>
        </div>
      </div>
    </aside>
  );
};
