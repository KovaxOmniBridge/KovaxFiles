import React from 'react';
import { Scale, CheckCircle2, AlertCircle } from 'lucide-react';
import type { CourtPresetId } from '../types';
import { COURT_PRESETS } from '../utils/formatters';

interface CourtPdfPresetsProps {
  selectedPreset: CourtPresetId;
  onSelectPreset: (preset: CourtPresetId) => void;
  customMaxMB: number;
  onCustomMaxMBChange: (mb: number) => void;
}

export const CourtPdfPresets: React.FC<CourtPdfPresetsProps> = ({
  selectedPreset,
  onSelectPreset,
  customMaxMB,
  onCustomMaxMBChange,
}) => {
  return (
    <div className="glass-panel p-6 border-l-4 border-l-purple-500 mb-8 relative overflow-hidden">
      
      {/* Background glow badge */}
      <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">
                Recurso de Ouro: Compactar para Peticionamento Eletrônico
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wide">
                Tribunais BR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Reduz o tamanho do PDF exatamente para o limite máximo exigido pelos sistemas de peticionamento (PJe, TJSP, STJ) sem comprometer a leitura.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
        {COURT_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-200 relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-950/50'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              {preset.isPopular && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Mais Usado
                </span>
              )}

              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-slate-600'}`}
                  />
                  <h3 className="text-sm font-semibold text-white">{preset.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{preset.description}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Limite Máximo:</span>
                <span className="font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                  &lt; {preset.id === 'custom' ? `${customMaxMB} MB` : `${preset.maxSizeMB} MB`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom MB input if selected */}
      {selectedPreset === 'custom' && (
        <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-purple-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <AlertCircle className="w-4 h-4 text-purple-400" />
            <span>Defina o tamanho exato limite desejado para a compactação:</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0.5"
              max="50"
              step="0.5"
              value={customMaxMB}
              onChange={(e) => onCustomMaxMBChange(parseFloat(e.target.value) || 1.0)}
              className="w-24 px-3 py-1.5 bg-slate-950 border border-purple-500/50 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-sm font-bold text-purple-300">MB</span>
          </div>
        </div>
      )}
    </div>
  );
};
