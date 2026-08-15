import React, { useState, useRef } from 'react';
import { EyeOff, ShieldCheck, CheckSquare, Square, Download, Cpu, CheckCircle2, FileText, Lock, Plus, PanelTop, PanelBottom, Trash2, AlertCircle, MousePointer, Bot } from 'lucide-react';
import { detectPiiInData, detectPiiWithAi, applyRedactionToPdf, type PiiDetectionItem } from '../services';
import { PdfVisualRedactor } from './PdfVisualRedactor';

export const RedactionAnonymizerTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [piiItems, setPiiItems] = useState<PiiDetectionItem[]>([]);
  const [activeMode, setActiveMode] = useState<'auto' | 'visual'>('auto');
  const [newCustomTerm, setNewCustomTerm] = useState('');
  const [customTerms, setCustomTerms] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [redactedBlobUrl, setRedactedBlobUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [patternNotification, setPatternNotification] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setRedactedBlobUrl(null);
      setPatternNotification(null);
      
      const detected = await detectPiiInData(selectedFile, customTerms);
      setPiiItems(detected);
    }
  };

  const handleRunAiScanner = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMessage('IA Local realizando varredura semântica NER por nomes, endereços e dados sensíveis LGPD...');

    try {
      const aiDetected = await detectPiiWithAi(file, (status) => setStatusMessage(status));
      if (aiDetected.length === 0) {
        setPatternNotification('A IA Local analisou o documento e não encontrou nomes ou dados sensíveis adicionais.');
      } else {
        setPiiItems((prev) => {
          const existingVals = new Set(prev.map((i) => `${i.textValue.toLowerCase()}_${i.location}`));
          const newOnly = aiDetected.filter((i) => !existingVals.has(`${i.textValue.toLowerCase()}_${i.location}`));
          return [...prev, ...newOnly];
        });
        setPatternNotification(`✨ IA Local: ${aiDetected.length} elemento(s) semântico(s) (Nomes de Pessoas, Endereços e Dados Sensíveis LGPD) localizados!`);
      }
    } catch (err) {
      console.error('Erro na varredura de IA:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCustomTerm = async () => {
    if (!newCustomTerm.trim()) return;
    const term = newCustomTerm.trim();
    if (customTerms.includes(term)) return;

    const updatedTerms = [...customTerms, term];
    setCustomTerms(updatedTerms);
    setNewCustomTerm('');

    if (file) {
      const detected = await detectPiiInData(file, updatedTerms);
      const visualItems = piiItems.filter(i => i.type === 'Seleção Visual' || i.type.startsWith('Região'));
      setPiiItems([...visualItems, ...detected]);

      const termMatches = detected.filter(i => i.textValue.toLowerCase() === term.toLowerCase());
      if (termMatches.length > 0) {
        const pagesList = Array.from(new Set(termMatches.map(i => i.location))).join(', ');
        setPatternNotification(
          `✨ Inteligência de Padrão: Encontradas ${termMatches.length} ocorrência(s) de "${term}" (${pagesList}) e adicionadas automaticamente à lista!`
        );
      } else {
        setPatternNotification(`Termo "${term}" adicionado ao rastreador de tarjas.`);
      }
    } else {
      const newItem: PiiDetectionItem = {
        id: `manual_custom_${Date.now()}`,
        type: 'Termo Personalizado',
        textValue: term,
        location: 'Termo Especificado pelo Usuário',
        selected: true,
      };
      setPiiItems(prev => [...prev, newItem]);
      setPatternNotification(`Termo "${term}" adicionado à fila.`);
    }
  };

  const handleAddRegion = (type: 'Região Cabeçalho' | 'Região Rodapé') => {
    const newItem: PiiDetectionItem = {
      id: `region_${Date.now()}`,
      type: type,
      textValue: type === 'Região Cabeçalho' ? 'Cabeçalho Superior (Top 12%)' : 'Rodapé Inferior (Bottom 12%)',
      location: 'Todas as Páginas do Documento',
      selected: true,
    };
    setPiiItems(prev => [...prev, newItem]);
  };

  const handleAddVisualItem = (item: PiiDetectionItem) => {
    setPiiItems(prev => [...prev, item]);
  };

  const toggleItemSelection = (id: string) => {
    setPiiItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const removeItem = (id: string) => {
    setPiiItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyRedaction = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMessage('Aplicando tarjamento preto irreversível nos dados selecionados...');

    try {
      const selectedItems = piiItems.filter((i) => i.selected);
      const { blob } = await applyRedactionToPdf(file, selectedItems, false, (_, status) =>
        setStatusMessage(status)
      );

      const url = URL.createObjectURL(blob);
      setRedactedBlobUrl(url);
    } catch (err) {
      console.error('Erro ao tarjar documento:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900 relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4" />
              Tarjador Profissional Enterprise • Modo Duplo (Automático + Interativo por Mouse)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Tarjador & Anonymizer Universal
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Varra dados PII automaticamente ou abra o documento visualmente para clicar e arrastar o mouse sobre qualquer palavra, nome, foto ou trecho do PDF que deseja tarjar.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <EyeOff className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Upload Box */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-900/40 hover:bg-slate-900/60 rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Selecione o documento PDF para tarjar e anonimizar</h3>
          <p className="text-xs text-slate-400">Detecção de CPFs/CNPJs reais e tarjamento visual interativo por mouse</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Mode Switcher Bar */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveMode('auto')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeMode === 'auto'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Bot className="w-4 h-4" />
                Modo 1: Detecção Automática & Busca de Termos
              </button>

              <button
                onClick={() => setActiveMode('visual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeMode === 'visual'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <MousePointer className="w-4 h-4 text-purple-300" />
                Modo 2: Tarjador Visual Interativo (Desenhar com Mouse)
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => { setFile(null); setRedactedBlobUrl(null); setPiiItems([]); }}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-colors"
              >
                Trocar Arquivo PDF
              </button>
            </div>
          </div>

          {/* Mode 2: Interactive Visual Canvas Redactor */}
          {activeMode === 'visual' && (
            <div className="glass-panel p-6 rounded-3xl space-y-4 border border-purple-500/20">
              <PdfVisualRedactor
                file={file}
                redactionItems={piiItems}
                onAddVisualRedaction={handleAddVisualItem}
                onRemoveVisualRedaction={removeItem}
              />
            </div>
          )}

          {/* Pattern Intelligence Notification Banner */}
          {patternNotification && (
            <div className="p-3.5 rounded-2xl bg-purple-950/60 border border-purple-500/50 flex items-center justify-between text-xs text-purple-200 shadow-lg animate-pulse">
              <span className="font-semibold">{patternNotification}</span>
              <button
                onClick={() => setPatternNotification(null)}
                className="text-purple-400 hover:text-white text-xs font-bold px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mode 1: Automatic Detection & Term Search */}
          {activeMode === 'auto' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* File Info & Quick Actions Column */}
              <div className="md:col-span-1 glass-panel p-5 rounded-2xl space-y-4">
                <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                  <FileText className="w-8 h-8 text-purple-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">{file.name}</h4>
                    <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>

                {/* AI Smart NER Scanner Button */}
                <button
                  onClick={handleRunAiScanner}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-950/60 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Bot className="w-4 h-4 text-purple-200 animate-pulse" />
                  <span>Varredura Inteligente IA (NER / LGPD)</span>
                </button>

                {/* Custom Search Term Input */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-bold block">Adicionar Termo / Palavra para Tarjar:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Davi Diniz, Droga Raia..."
                      value={newCustomTerm}
                      onChange={(e) => setNewCustomTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTerm()}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-purple-500 outline-none"
                    />
                    <button
                      onClick={handleAddCustomTerm}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Page Region Tarjas */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-xs text-slate-300 font-bold block">Tarjar Regiões da Página:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddRegion('Região Cabeçalho')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <PanelTop className="w-3.5 h-3.5 text-purple-400" />
                      Cabeçalho
                    </button>
                    <button
                      onClick={() => handleAddRegion('Região Rodapé')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <PanelBottom className="w-3.5 h-3.5 text-purple-400" />
                      Rodapé
                    </button>
                  </div>
                </div>
              </div>

              {/* PII & Custom Detection List */}
              <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
                <h3 className="text-base font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <EyeOff className="w-5 h-5 text-purple-400" />
                    Itens Selecionados para Tarjamento Preto Definitivo
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                    {piiItems.length} Itens
                  </span>
                </h3>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {piiItems.length > 0 ? (
                    piiItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          item.selected
                            ? 'bg-purple-950/40 border-purple-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div
                          onClick={() => toggleItemSelection(item.id)}
                          className="flex items-center space-x-3 cursor-pointer flex-1"
                        >
                          {item.selected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-purple-400 block">{item.type}</span>
                            <strong className="text-sm font-mono text-white">{item.textValue}</strong>
                            <span className="text-xs text-slate-400 block">{item.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-purple-300 font-medium">
                            {item.selected ? 'Tarja Ativa' : 'Manter Visível'}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors"
                            title="Remover este item da lista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <AlertCircle className="w-6 h-6 text-purple-400 mx-auto" />
                      <strong className="block text-white text-xs font-bold">Nenhum CPF/CNPJ automático localizado no texto.</strong>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        Você pode adicionar termos personalizados (ex: nomes, e-mails, empresas) no painel à esquerda ou alternar para o <strong>Modo 2 (Tarjador Visual Interativo)</strong> para desenhar tarjas com o mouse sobre o documento!
                      </p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* Global Execution Button */}
          <div className="glass-panel p-6 rounded-3xl border border-purple-500/20 space-y-4">
            {isProcessing && (
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center space-x-3 text-purple-300 text-xs animate-pulse">
                <Cpu className="w-4 h-4 animate-spin text-purple-400" />
                <span>{statusMessage}</span>
              </div>
            )}

            {!redactedBlobUrl ? (
              <button
                onClick={handleApplyRedaction}
                disabled={isProcessing || !piiItems.some((i) => i.selected)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-950 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <EyeOff className="w-4 h-4" />
                Aplicar Tarja Preta Definitiva ({piiItems.filter(i => i.selected).length} Itens / Seleções Visuais) & Baixar PDF
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  PDF Anonimizado com Sucesso! Tarjas Pretas Irreversíveis Gravadas no Documento.
                </div>
                <a
                  href={redactedBlobUrl}
                  download={`${file.name.replace(/\.pdf$/i, '')}_anonimizado.pdf`}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-purple-950 flex items-center justify-center gap-2 transition-all block text-center"
                >
                  <Download className="w-4 h-4" />
                  Baixar Documento PDF Anonimizado (.pdf)
                </a>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
