import React, { useState, useEffect, useRef } from 'react';
import { Bot, Cpu, Download, Trash2, CheckCircle2, ShieldCheck, FileText, Send, RefreshCw, FileCode, Plus, X, Sparkles } from 'lucide-react';
import {
  getInstalledAiModels,
  installAiModel,
  setActiveAiModel,
  uninstallAiModel,
  queryMultipleDocumentsWithAi,
  pdfTableExtractorService,
  type LocalAiModelInfo,
  type CitationItem,
} from '../services';

export const LocalAiAnalyzerTab: React.FC = () => {
  const [models, setModels] = useState<LocalAiModelInfo[]>([]);
  const [activeModel, setActiveModel] = useState<LocalAiModelInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatus, setInstallStatus] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Multi-Doc Q&A State
  const [qaFiles, setQaFiles] = useState<File[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string; citations?: CitationItem[] }[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isExtractingTables, setIsExtractingTables] = useState(false);
  const qaFileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshModels();
  }, []);

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
      console.error('Erro ao instalar modelo:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSwitchModel = (modelId: string) => {
    setActiveAiModel(modelId);
    refreshModels();
  };

  const handleUninstallModel = (modelId: string) => {
    uninstallAiModel(modelId);
    refreshModels();
  };

  const handleAddFiles = (newFiles: FileList | File[]) => {
    const added = Array.from(newFiles);
    setQaFiles((prev) => {
      const existingNames = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const filtered = added.filter((f) => !existingNames.has(`${f.name}_${f.size}`));
      return [...prev, ...filtered];
    });
  };

  const handleRemoveFile = (index: number) => {
    setQaFiles((prev) => prev.filter((_, i) => i !== index));
    if (qaFiles.length <= 1) {
      setChatHistory([]);
    }
  };

  const handleSendQaQuery = async () => {
    if (qaFiles.length === 0 || !userQuery.trim()) return;
    const queryText = userQuery.trim();
    setUserQuery('');

    setChatHistory((prev) => [...prev, { role: 'user', text: queryText }]);
    setIsAnswering(true);

    try {
      const { answer, citations } = await queryMultipleDocumentsWithAi(qaFiles, queryText, (status) =>
        setInstallStatus(status)
      );

      setChatHistory((prev) => [...prev, { role: 'ai', text: answer, citations }]);
    } catch (err) {
      console.error('Erro na resposta da IA:', err);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleExportPdfTablesToExcel = async (targetFile: File) => {
    setIsExtractingTables(true);
    try {
      const tables = await pdfTableExtractorService.extractTablesFromPdf(targetFile);
      if (tables.length === 0) {
        alert(`Nenhuma estrutura de tabela em grade foi identificada no arquivo ${targetFile.name}.`);
      } else {
        pdfTableExtractorService.exportTablesToExcelCsv(tables, targetFile.name);
      }
    } catch (err) {
      console.error('Erro ao exportar tabelas para Excel:', err);
    } finally {
      setIsExtractingTables(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-3">
              <Bot className="w-4 h-4" />
              IA 100% Offline no Navegador • Multi-Documento RAG • Tela Ampliada
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Analisador & Conversa Inteligente Multi-Documento
            </h2>
            <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">
              Adicione um ou mais arquivos (PDF, Word, Excel, TXT, CSV) e converse diretamente com a IA local. Faça perguntas sobre documentos individuais ou peça comparações dinâmicas na mesma conversa.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Cpu className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Model Status & Management Bar */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
        {activeModel && !showModelPicker ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{activeModel.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Instalado & Ativo
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Provedor: {activeModel.provider} • Tamanho: {activeModel.size} • Velocidade: {activeModel.speed}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowModelPicker(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                Alternar / Baixar Outro Modelo
              </button>
              <button
                onClick={() => handleUninstallModel(activeModel.id)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-950/40 border border-slate-800 text-slate-400 hover:text-red-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Desinstalar modelo e limpar cache local"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Desinstalar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-400" />
                  Selecione o Modelo de IA para Instalar no Navegador
                </h3>
                <p className="text-xs text-slate-400">
                  O modelo escolhido será baixado e mantido em cache local no navegador para inferência 100% offline.
                </p>
              </div>
              {activeModel && (
                <button
                  onClick={() => setShowModelPicker(false)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Voltar ao Modelo Ativo
                </button>
              )}
            </div>

            {isInstalling && (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 animate-spin text-indigo-400" />
                    {installStatus}
                  </span>
                  <span>{installProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
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
                      ? 'bg-indigo-950/40 border-indigo-500 text-white'
                      : m.installed
                      ? 'bg-slate-900/60 border-slate-700 text-slate-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-indigo-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                        {m.provider}
                      </span>
                      <span className="text-xs font-mono text-slate-400 font-bold">{m.size}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">{m.name}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <span className="text-[11px] text-slate-400 block font-mono">
                      ⚡ {m.speed}
                    </span>

                    {m.installed ? (
                      m.active ? (
                        <div className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs text-center border border-emerald-500/30">
                          Modelo Ativo Atual
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSwitchModel(m.id)}
                          className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                        >
                          Usar Este Modelo
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleInstallModel(m.id)}
                        disabled={isInstalling}
                        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar e Instalar Modelo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spacious Main Multi-Document Analysis Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Multi-File Context Manager (1 Column) */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-3xl space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Documentos ({qaFiles.length})
              </h3>
              {qaFiles.length > 0 && (
                <button
                  onClick={() => qaFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              )}
            </div>

            <input
              ref={qaFileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.md,.json,.rtf"
              className="hidden"
              onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
            />

            {qaFiles.length === 0 ? (
              <div
                onClick={() => qaFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/80 p-8 rounded-2xl text-center cursor-pointer transition-all hover:bg-slate-900/40"
              >
                <FileCode className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-pulse" />
                <span className="text-sm font-bold text-white block mb-1">Carregar Documentos</span>
                <span className="text-xs text-slate-400 block">PDF, Word, Excel, TXT, CSV, MD, JSON</span>
                <span className="text-[10px] text-indigo-400 mt-2 block font-semibold">
                  (Arraste ou clique para selecionar múltiplos arquivos)
                </span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {qaFiles.map((file, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs text-white group hover:border-indigo-500/50 transition-colors">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold truncate block text-slate-200 text-xs">{file.name}</span>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        Doc #{idx + 1} • {Math.round(file.size / 1024)} KB
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      {file.name.endsWith('.pdf') && (
                        <button
                          onClick={() => handleExportPdfTablesToExcel(file)}
                          disabled={isExtractingTables}
                          title="Exportar tabelas deste PDF para Excel"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Remover arquivo do contexto da conversa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {qaFiles.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80 space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                RAG Vetorial Multi-Arquivo IndexedDB
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Os {qaFiles.length} arquivos foram fatiados e vetorizados localmente. Peça análises individuais ou comparações no chat.
              </p>
            </div>
          )}
        </div>

        {/* Spacious Interactive Multi-Doc Chat Window (3 Columns) */}
        <div className="lg:col-span-3 glass-panel p-6 sm:p-8 rounded-3xl flex flex-col justify-between min-h-[680px] space-y-4">
          
          {/* Scrollable Conversation Stream */}
          <div ref={chatScrollRef} className="space-y-4 h-[580px] overflow-y-auto pr-2">
            {chatHistory.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <strong className="text-slate-200 text-base font-extrabold block">
                    Ambiente Conversacional Ampliado
                  </strong>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Faça perguntas sobre documentos individuais ou peça comparações dinâmicas na mesma sessão de chat.
                  </p>
                </div>
                {qaFiles.length > 1 && (
                  <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 text-xs inline-block">
                    💡 Dica: "Compare os prazos e penalidades entre o {qaFiles[0]?.name} e o {qaFiles[1]?.name}"
                  </div>
                )}
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-3xl text-sm leading-relaxed space-y-3 ${
                    msg.role === 'user'
                      ? 'bg-indigo-950/40 border border-indigo-500/40 text-white ml-12 sm:ml-24 shadow-lg'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 mr-4 sm:mr-12 shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 pb-1 border-b border-slate-800/60">
                    <span className="flex items-center gap-1.5">
                      {msg.role === 'user' ? (
                        <>👤 Você</>
                      ) : (
                        <><Bot className="w-3.5 h-3.5 text-indigo-400" /> IA Local • RAG Multi-Documento</>
                      )}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-slate-200 leading-relaxed font-sans">{msg.text}</p>

                  {/* Citations Badges */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <span className="text-xs font-bold text-indigo-400 block">Citações e Relevância por Arquivo:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {msg.citations.map((c, i) => (
                          <div key={i} className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                            <div className="flex items-center justify-between">
                              <strong className="text-indigo-400 font-mono text-xs truncate max-w-[200px]">
                                📍 {c.fileName ? `[${c.fileName}] ` : ''}Pág. {c.page}
                              </strong>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                                {c.relevance}% Relevância
                              </span>
                            </div>
                            <p className="text-slate-300 italic text-[11px] leading-relaxed">"{c.snippet}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {isAnswering && (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 text-xs flex items-center space-x-3 animate-pulse">
                <Cpu className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
                <div>
                  <strong className="block font-bold text-white text-xs">Sintetizando resposta vetorial...</strong>
                  <span className="text-slate-400">{installStatus || 'Cruzando trechos semânticos dos arquivos no IndexedDB'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Prominent Chat Input Bar */}
          <div className="pt-4 border-t border-slate-800 flex gap-3 items-center">
            <input
              type="text"
              placeholder={
                qaFiles.length > 1
                  ? "Ex: Faça um resumo comparativo destacando as diferenças de prazos, valores e sanções..."
                  : qaFiles.length === 1
                  ? `Ex: Quais são as obrigações e regras definidas no arquivo "${qaFiles[0]?.name}"?`
                  : "Carregue um ou mais documentos à esquerda para iniciar a conversa..."
              }
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendQaQuery()}
              disabled={qaFiles.length === 0 || isAnswering}
              className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 transition-all font-medium placeholder-slate-500"
            />
            <button
              onClick={handleSendQaQuery}
              disabled={qaFiles.length === 0 || !userQuery.trim() || isAnswering}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-950 flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Enviar</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
