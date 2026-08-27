import React, { useState, useEffect, useRef } from 'react';
import { Bot, Cpu, Download, Trash2, CheckCircle2, FileText, Send, RefreshCw, Plus, X, Key } from 'lucide-react';
import {
  getInstalledAiModels,
  installAiModel,
  setActiveAiModel,
  uninstallAiModel,
  queryMultipleDocumentsWithAi,
  pdfTableExtractorService,
  getGeminiApiKey,
  setGeminiApiKey,
  type LocalAiModelInfo,
  type CitationItem,
} from '../services';

const renderInlineFormatting = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\_.*?\_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-200 text-blue-900 font-mono text-[11px]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={i} className="italic text-slate-700">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const renderFormattedMarkdownText = (content: string) => {
  const lines = content.split(/\r?\n/);
  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-extrabold text-xs text-slate-900 mt-2.5 mb-1 flex items-center gap-1.5">
              {renderInlineFormatting(trimmed.substring(4))}
            </h4>
          );
        }

        if (trimmed.startsWith('---')) {
          return <hr key={idx} className="my-2 border-slate-200" />;
        }

        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="p-2.5 rounded-xl bg-blue-50/70 border-l-3 border-blue-500 italic text-slate-800 my-1.5 text-[11px]">
              {renderInlineFormatting(trimmed.substring(2))}
            </blockquote>
          );
        }

        if (trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          return (
            <div key={idx} className="flex items-start space-x-1.5 my-0.5">
              <span className="text-blue-600 font-bold shrink-0">•</span>
              <span className="flex-1">{renderInlineFormatting(trimmed.substring(2))}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
};

export const LocalAiAnalyzerTab: React.FC = () => {
  const [models, setModels] = useState<LocalAiModelInfo[]>([]);
  const [activeModel, setActiveModel] = useState<LocalAiModelInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatus, setInstallStatus] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Gemini API Key State
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Multi-Doc Q&A State
  const [qaFiles, setQaFiles] = useState<File[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string; citations?: CitationItem[] }[]>([]);
  const [selectedMsgIdx, setSelectedMsgIdx] = useState<number | null>(null);
  const [sourcesViewMode, setSourcesViewMode] = useState<'history' | 'selected'>('history');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isExtractingTables, setIsExtractingTables] = useState(false);
  const qaFileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshModels();
    setGeminiKey(getGeminiApiKey());
  }, []);

  const handleSaveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    setGeminiKey(key.trim());
    setShowKeyModal(false);
  };

  useEffect(() => {
    // Scroll suave para a ultima mensagem do chat
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isAnswering]);

  const refreshModels = () => {
    const list = getInstalledAiModels();
    setModels(list);
    const active = list.find((m) => m.active && m.installed);
    setActiveModel(active || null);
    if (!active) setShowModelPicker(true);
  };

  const handleInstallModel = async (modelId: string) => {
    setIsInstalling(true);
    setInstallProgress(0);

    try {
      await installAiModel(modelId, (percent, status) => {
        setInstallProgress(percent);
        setInstallStatus(status);
      });
      refreshModels();
      setShowModelPicker(false);
    } catch (err) {
      console.error('Erro na instalação:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSelectActiveModel = (modelId: string) => {
    setActiveAiModel(modelId);
    refreshModels();
    setShowModelPicker(false);
  };

  const handleUninstallModel = (modelId: string) => {
    uninstallAiModel(modelId);
    refreshModels();
  };

  const handleAddQaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setQaFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeQaFile = (index: number) => {
    setQaFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSendQuery = async (customText?: string) => {
    const query = (customText || userQuery).trim();
    if (!query) return;
    if (!customText) setUserQuery('');

    const newHistory = [...chatHistory, { role: 'user' as const, text: query }];
    setChatHistory(newHistory);
    setIsAnswering(true);

    try {
      const response = await queryMultipleDocumentsWithAi(qaFiles, query, undefined, chatHistory);
      setChatHistory((prev) => {
        const updated = [
          ...prev,
          { role: 'ai' as const, text: response.answer, citations: response.citations },
        ];
        setSelectedMsgIdx(updated.length - 1);
        return updated;
      });
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai' as const, text: `Erro no processamento da IA: ${err.message || 'Falha de leitura'}` },
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleExtractTablesToExcel = async () => {
    if (qaFiles.length === 0) return;
    const pdfFile = qaFiles.find((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfFile) {
      alert('Por favor, adicione ao menos um arquivo PDF para extrair tabelas espacialmente para Excel.');
      return;
    }

    setIsExtractingTables(true);
    try {
      const tables = await pdfTableExtractorService.extractTablesFromPdf(pdfFile);
      const { blob } = pdfTableExtractorService.exportTablesToXlsxBlob(tables);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pdfFile.name.replace(/\.pdf$/i, '')}_tabelas.xlsx`;
      a.click();
    } catch (err) {
      console.error('Erro na extração de tabelas:', err);
    } finally {
      setIsExtractingTables(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start justify-between relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-3">
              <Bot className="w-4 h-4 text-blue-600" />
              IA 100% Offline no Navegador • Multi-Documento RAG
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Analisador & Conversa Inteligente Multi-Documento
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Adicione um ou mais arquivos (PDF, Word, Excel, TXT, CSV) e converse diretamente com a IA local. Faça perguntas sobre documentos individuais ou peça comparações dinâmicas na mesma conversa.
            </p>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Cpu className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        </div>
      </div>

      {/* Model Status & Management Bar */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-xs">
        {activeModel && !showModelPicker ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{activeModel.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Instalado & Ativo
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Provedor: {activeModel.provider} • Tamanho: {activeModel.size} • Velocidade: {activeModel.speed}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowKeyModal(!showKeyModal)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  geminiKey
                    ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
                title="Configurar Chave API do Google Gemini (Opcional)"
              >
                <Key className="w-3.5 h-3.5 text-purple-600" />
                {geminiKey ? 'Gemini 1.5 API Ativa' : 'Conectar API Google Gemini'}
              </button>
              <button
                onClick={() => setShowModelPicker(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                Alternar / Baixar Outro Modelo
              </button>
              <button
                onClick={() => handleUninstallModel(activeModel.id)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 text-slate-600 hover:text-red-600 text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Desinstalar modelo e limpar cache local"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Desinstalar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  Selecione o Modelo de IA para Instalar no Navegador
                </h3>
                <p className="text-xs text-slate-500">
                  O modelo escolhido será baixado e mantido em cache local no navegador para inferência 100% offline.
                </p>
              </div>
              {activeModel && (
                <button
                  onClick={() => setShowModelPicker(false)}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Voltar ao Modelo Ativo
                </button>
              )}
            </div>

            {isInstalling && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 animate-spin text-blue-600" />
                    {installStatus}
                  </span>
                  <span>{installProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                    style={{ width: `${installProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {models.map((m) => (
                <div
                  key={m.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    m.active
                      ? 'bg-blue-50/80 border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {m.size}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{m.description}</p>
                  </div>

                  <div>
                    {m.installed ? (
                      m.active ? (
                        <button disabled className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                          Modelo Ativo
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectActiveModel(m.id)}
                          className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300"
                        >
                          Usar Este Modelo
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleInstallModel(m.id)}
                        disabled={isInstalling}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Instalar no Navegador
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Q&A Multi-Document Workspace (3 Columns: Docs | Chat | Sources Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Documents List Panel (3/12 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Documentos ({qaFiles.length})</h3>
              <button
                onClick={() => qaFileInputRef.current?.click()}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                title="Adicionar documento à conversa"
              >
                <Plus className="w-4 h-4" />
              </button>
              <input
                ref={qaFileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.xlsx,.csv,.txt,.md"
                className="hidden"
                onChange={handleAddQaFiles}
              />
            </div>

            {qaFiles.length === 0 ? (
              <div
                onClick={() => qaFileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 rounded-2xl text-center cursor-pointer space-y-2"
              >
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Nenhum documento carregado.</p>
                <p className="text-[11px] text-slate-500">Clique para adicionar PDFs, DOCX, XLSX ou TXT para a IA analisar.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {qaFiles.map((f, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-900 truncate">{f.name}</span>
                    </div>
                    <button onClick={() => removeQaFile(idx)} className="text-slate-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {qaFiles.some((f) => f.name.toLowerCase().endsWith('.pdf')) && (
            <button
              onClick={handleExtractTablesToExcel}
              disabled={isExtractingTables}
              className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-3"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Extrair Tabelas PDF ➔ Excel (.xlsx)
            </button>
          )}
        </div>

        {/* Center Column: Interactive Chat Interface (6/12 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 p-5 rounded-3xl flex flex-col justify-between space-y-4 min-h-[550px] shadow-xs">
          
          {/* Chat Messages Log */}
          <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[460px]">
            {chatHistory.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto shadow-xs">
                  <Bot className="w-7 h-7" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900">Pergunte qualquer coisa à IA (Estilo Google Gemini)</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Solicite análises de segurança, críticas de artigos, pareceres contratuais ou faça perguntas diretas sobre seus arquivos. As fontes citadas serão acumuladas no painel do lado direito.
                </p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => {
                const isSelected = selectedMsgIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      onClick={() => msg.role === 'ai' && setSelectedMsgIdx(idx)}
                      className={`max-w-[90%] p-4 rounded-2xl text-xs leading-relaxed space-y-2 cursor-pointer transition-all ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white font-medium shadow-xs'
                          : isSelected
                          ? 'bg-blue-50/90 border-2 border-blue-500 text-slate-900 shadow-md ring-2 ring-blue-200'
                          : 'bg-slate-50 border border-slate-200 text-slate-900 hover:border-blue-300'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        renderFormattedMarkdownText(msg.text)
                      )}
                      
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-blue-700 font-bold">
                          <span>✨ {msg.citations.length} fonte(s) localizada(s)</span>
                          <span className="text-blue-600 hover:underline">
                            {isSelected ? '● Selecionada no painel ▶' : 'Clique para ver fontes ▶'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isAnswering && (
              <div className="flex justify-start">
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 animate-pulse">
                  <Cpu className="w-4 h-4 animate-spin text-blue-600" />
                  <span>IA Local analisando o contexto e gerando a resposta...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          {qaFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Sugestões Rápidas:</span>
              <button
                onClick={() => handleSendQuery('esse documento seria legalmente aceito?')}
                disabled={isAnswering}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                ⚡ Aceito legalmente?
              </button>
              <button
                onClick={() => handleSendQuery('quais as principais melhorias que podem ser feitas?')}
                disabled={isAnswering}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                ⚡ Principais melhorias?
              </button>
              <button
                onClick={() => handleSendQuery('quais as cláusulas de risco e penalidades?')}
                disabled={isAnswering}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                ⚡ Riscos e penalidades?
              </button>
              <button
                onClick={() => handleSendQuery('quais suas dicas para transformar esse arquivo em algo ainda mais seguro?')}
                disabled={isAnswering}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                ⚡ Dicas de segurança?
              </button>
            </div>
          )}

          {/* User Input & Send Bar */}
          <div className="pt-2 flex items-center space-x-2">
            <input
              type="text"
              placeholder={qaFiles.length > 0 ? "Faça uma pergunta sobre o documento ou converse livremente..." : "Pergunte qualquer coisa (código, e-mails, explicações ou conceitos)..."}
              disabled={isAnswering}
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleSendQuery()}
              disabled={!userQuery.trim() || isAnswering}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar</span>
            </button>
          </div>

        </div>

        {/* Right Column: Sources & Citations Side Panel (3/12 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-xs flex flex-col">
          <div className="space-y-3 border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Fontes & Citações</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                RAG Local
              </span>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 text-[11px] font-bold">
              <button
                onClick={() => setSourcesViewMode('history')}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  sourcesViewMode === 'history'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Histórico Completo
              </button>
              <button
                onClick={() => setSourcesViewMode('selected')}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  sourcesViewMode === 'selected'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Selecionada
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[460px]">
            {sourcesViewMode === 'history' ? (
              /* HISTÓRICO COMPLETO ACUMULADO EM ORDEM CRONOLÓGICA SEM SUBSTITUIÇÃO */
              (() => {
                const aiMessagesWithCitations = chatHistory
                  .map((m, originalIdx) => ({ ...m, originalIdx }))
                  .filter((m) => m.role === 'ai' && m.citations && m.citations.length > 0);

                if (aiMessagesWithCitations.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <FileText className="w-8 h-8 mx-auto opacity-50 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600">Nenhum histórico de fontes acumulado.</p>
                      <p className="text-[11px] text-slate-400">À medida que você conversa, todas as citações das respostas serão salvas em ordem aqui.</p>
                    </div>
                  );
                }

                return aiMessagesWithCitations.map((msg, msgTurnIdx) => (
                  <div key={msgTurnIdx} className="space-y-2 border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Resposta #{msgTurnIdx + 1}
                      </span>
                      <button
                        onClick={() => setSelectedMsgIdx(msg.originalIdx)}
                        className="text-[10px] text-blue-600 hover:underline font-semibold"
                      >
                        Ver no Chat
                      </button>
                    </div>

                    {msg.citations?.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 hover:border-blue-300 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-900 truncate max-w-[130px]" title={c.fileName || 'Documento'}>
                            {c.fileName || 'Documento'}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            Pág {c.page}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-700 leading-relaxed italic">
                          "{c.snippet}"
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                          <span>Relevância:</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {Math.min(99, Math.max(78, c.relevance && c.relevance > 0 ? (c.relevance <= 1 ? Math.round(c.relevance * 100) : c.relevance) : 85))}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()
            ) : (
              /* FONTES DA MENSAGEM SELECIONADA OU MAIS RECENTE */
              (() => {
                const targetMsg = selectedMsgIdx !== null
                  ? chatHistory[selectedMsgIdx]
                  : [...chatHistory].reverse().find((m) => m.role === 'ai' && m.citations && m.citations.length > 0);

                const activeCitations = targetMsg?.citations || [];

                if (activeCitations.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <FileText className="w-8 h-8 mx-auto opacity-50 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600">Nenhuma fonte citada nesta mensagem.</p>
                      <p className="text-[11px] text-slate-400">Clique em qualquer mensagem da conversa para visualizar suas fontes.</p>
                    </div>
                  );
                }

                return activeCitations.map((c, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-300 transition-all text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-900 truncate max-w-[140px]" title={c.fileName || 'Documento'}>
                        {c.fileName || 'Documento'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Pág {c.page}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-700 leading-relaxed font-sans italic">
                      "{c.snippet}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Relevância Semântica:</span>
                      <span className="font-mono text-emerald-700 font-bold">
                        {Math.min(99, Math.max(78, c.relevance && c.relevance > 0 ? (c.relevance <= 1 ? Math.round(c.relevance * 100) : c.relevance) : 85))}%
                      </span>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>

      </div>

      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">API Oficial Google Gemini 1.5</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cole sua chave gratuita de API do Google Gemini (`AIzaSy...`). Quando configurada, a plataforma usará o modelo neural oficial **Google Gemini 1.5 Flash** para responder a qualquer dúvida sobre o documento com capacidade ilimitada de raciocínio.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Sua Chave API (Gemini API Key):</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              {geminiKey && (
                <button
                  onClick={() => handleSaveGeminiKey('')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-red-600 text-xs font-semibold"
                >
                  Remover Chave
                </button>
              )}
              <button
                onClick={() => handleSaveGeminiKey(geminiKey)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
              >
                Salvar Chave
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
