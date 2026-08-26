import React, { useState, useRef } from 'react';
import { EyeOff, ShieldCheck, CheckSquare, Square, Download, Cpu, CheckCircle2, Lock, Plus, PanelTop, PanelBottom, Trash2, AlertCircle, MousePointer, Bot } from 'lucide-react';
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
      if (!aiDetected || aiDetected.length === 0) {
        setPatternNotification('A IA Local analisou o documento e não encontrou nomes ou dados sensíveis adicionais.');
      } else {
        setPiiItems((prev) => {
          const safePrev = prev || [];
          const existingVals = new Set(safePrev.map((i) => `${(i?.textValue || '').toLowerCase()}_${i?.location || ''}`));
          const newOnly = aiDetected.filter((i) => i && !existingVals.has(`${(i?.textValue || '').toLowerCase()}_${i?.location || ''}`));
          return [...safePrev, ...newOnly];
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

    const updated = [...customTerms, term];
    setCustomTerms(updated);
    setNewCustomTerm('');

    if (file) {
      const detected = await detectPiiInData(file, updated);
      setPiiItems(detected);
    }
  };

  const handleAddHeaderFooterRedaction = (position: 'header' | 'footer') => {
    const newItem: PiiDetectionItem = {
      id: `area_${position}_${Date.now()}`,
      textValue: position === 'header' ? '[Cabeçalho Completo]' : '[Rodapé Completo]',
      type: position === 'header' ? 'Região Cabeçalho' : 'Região Rodapé',
      location: position === 'header' ? 'Cabeçalho da Página' : 'Rodapé da Página',
      selected: true,
      bounds: {
        pageIndex: 0,
        x: 0,
        y: position === 'header' ? 0 : 750,
        width: 600,
        height: 80,
      },
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
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start justify-between relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-violet-600" />
              Tarjador Profissional Enterprise • Modo Duplo (Automático + Interativo)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Tarjador & Anonymizer Universal
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Varra dados PII automaticamente ou abra o documento visualmente para clicar e arrastar o mouse sobre qualquer palavra, nome, foto ou trecho do PDF que deseja tarjar.
            </p>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 shrink-0">
            <EyeOff className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        </div>
      </div>

      {/* Upload Box */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-violet-500 bg-white hover:bg-slate-50 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 group shadow-xs"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">Selecione o documento PDF para tarjar e anonimizar</h3>
          <p className="text-xs text-slate-500">Detecção de CPFs/CNPJs reais e tarjamento visual interativo por mouse</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Mode Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-2 rounded-2xl bg-white border border-slate-200 gap-2 shadow-xs">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveMode('auto')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'auto'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bot className="w-4 h-4" />
                Modo 1: Detecção Automática
              </button>

              <button
                onClick={() => setActiveMode('visual')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'visual'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MousePointer className="w-4 h-4" />
                Modo 2: Tarjamento Visual por Mouse
              </button>
            </div>

            <button
              onClick={() => { setFile(null); setRedactedBlobUrl(null); }}
              className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              Trocar PDF
            </button>
          </div>

          {activeMode === 'visual' ? (
            <PdfVisualRedactor
              file={file}
              redactionItems={piiItems}
              onAddVisualRedaction={handleAddVisualItem}
              onRemoveVisualRedaction={removeItem}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: AI & Custom Terms */}
              <div className="md:col-span-1 space-y-4">
                
                {/* AI Scanner Button Box */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-violet-600" />
                    Varredura Inteligente por IA Local (NER)
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Usa Inteligência Artificial local para identificar Nomes de Pessoas Físicas, Razões Sociais e Endereços no texto do PDF.
                  </p>
                  <button
                    onClick={handleRunAiScanner}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Bot className="w-4 h-4" />
                    Varrer Nomes & PII com IA Local
                  </button>
                </div>

                {/* Custom Term Adder */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-violet-600" />
                    Adicionar Palavra-Chave Personalizada
                  </h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Ex: Nome da Empresa, Valor..."
                      value={newCustomTerm}
                      onChange={(e) => setNewCustomTerm(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-violet-500 outline-none"
                    />
                    <button
                      onClick={handleAddCustomTerm}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold"
                    >
                      OK
                    </button>
                  </div>
                </div>

                {/* Header/Footer Redaction Quick Actions */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900">Tarjamento de Áreas Fixas:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddHeaderFooterRedaction('header')}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5"
                    >
                      <PanelTop className="w-3.5 h-3.5 text-violet-600" />
                      Tarjar Cabeçalho
                    </button>
                    <button
                      onClick={() => handleAddHeaderFooterRedaction('footer')}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5"
                    >
                      <PanelBottom className="w-3.5 h-3.5 text-violet-600" />
                      Tarjar Rodapé
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Detected Items List & Execution */}
              <div className="md:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs">
                
                {patternNotification && (
                  <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold">
                    {patternNotification}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-violet-600" />
                    Elementos Selecionados para Tarjamento ({piiItems.filter(i => i.selected).length})
                  </h3>
                </div>

                {piiItems.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                    <p className="text-xs text-slate-900 font-bold">Nenhum dado PII ou palavra-chave foi localizado automaticamente.</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Utilize a Varredura por IA Local acima ou clique na aba "Modo 2: Tarjamento Visual" para selecionar trechos com o mouse.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {piiItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                          item.selected
                            ? 'bg-violet-50 border-violet-300 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          {item.selected ? (
                            <CheckSquare className="w-4 h-4 text-violet-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold block truncate font-mono">{item.textValue}</span>
                            <span className="text-[10px] text-slate-500">{item.location} • Tipo: {item.type}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isProcessing && (
                  <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-200 flex items-center space-x-3 text-violet-800 text-xs animate-pulse">
                    <Cpu className="w-4 h-4 animate-spin text-violet-600" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {!redactedBlobUrl ? (
                  <button
                    onClick={handleApplyRedaction}
                    disabled={isProcessing || piiItems.filter((i) => i.selected).length === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <EyeOff className="w-4 h-4" />
                    Aplicar Tarjamento Preto Irreversível no PDF
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Documento Tarjado com Sucesso e Salvo na Memória RAM!
                    </div>
                    <a
                      href={redactedBlobUrl}
                      download={`${file.name.replace(/\.pdf$/i, '')}_tarjado.pdf`}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all block text-center"
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF Tarjado Irreversível (.pdf)
                    </a>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
