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
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 border-l-4 border-l-blue-600 mb-8 shadow-sm relative overflow-hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Compactar para Peticionamento Eletrônico
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                Tribunais BR
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Reduz o tamanho do PDF para o limite máximo exigido pelos sistemas de peticionamento (PJe, TJSP, STJ) mantendo a legibilidade.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {COURT_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-200 relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              {preset.isPopular && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Mais Usado
                </span>
              )}

              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                  <h3 className="text-sm font-bold text-slate-900">{preset.name}</h3>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{preset.description}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Limite Máximo:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  &lt; {preset.id === 'custom' ? `${customMaxMB} MB` : `${preset.maxSizeMB} MB`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom MB input if selected */}
      {selectedPreset === 'custom' && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-700">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
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
              className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-bold text-blue-700">MB</span>
          </div>
        </div>
      )}
    </div>
  );
};
