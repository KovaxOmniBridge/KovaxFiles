import React, { useState, useEffect, useRef } from 'react';
import { Bot, Cpu, Download, Trash2, CheckCircle2, FileText, Send, RefreshCw, Plus, X } from 'lucide-react';
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

  const handleSendQuery = async () => {
    if (!userQuery.trim() || qaFiles.length === 0) return;
    const query = userQuery.trim();
    setUserQuery('');

    setChatHistory((prev) => [...prev, { role: 'user', text: query }]);
    setIsAnswering(true);

    try {
      const response = await queryMultipleDocumentsWithAi(qaFiles, query);
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: response.answer, citations: response.citations },
      ]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: `Erro no processamento da IA: ${err.message || 'Falha de leitura'}` },
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
      const { blob } = await pdfTableExtractorService.extractTablesToExcel(pdfFile);
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

      {/* Main Q&A Multi-Document Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Documents List Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Documentos no Chat ({qaFiles.length})</h3>
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
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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

          {qaFiles.some((f) => f.name.toLowerCase().endsWith('.pdf')) && (
            <button
              onClick={handleExtractTablesToExcel}
              disabled={isExtractingTables}
              className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Extrair Tabelas PDF ➔ Excel (.xlsx)
            </button>
          )}
        </div>

        {/* Right Column: Interactive Chat Interface */}
        <div className="lg:col-span-3 bg-white border border-slate-200 p-5 rounded-3xl flex flex-col justify-between space-y-4 min-h-[500px] shadow-xs">
          
          {/* Chat Messages Log */}
          <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[420px]">
            {chatHistory.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Bot className="w-12 h-12 text-blue-600 mx-auto opacity-80" />
                <h4 className="text-base font-bold text-slate-900">Pergunte qualquer coisa sobre seus documentos</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  A IA lerá os textos e tabelas dos arquivos adicionados e gerará respostas fundamentadas com citações do nome do arquivo e número de página.
                </p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <span className="text-[10px] font-bold text-blue-700 block">Citações e Fontes Encontradas:</span>
                        {msg.citations.map((c, cIdx) => (
                          <div key={cIdx} className="text-[10px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                            <strong>{c.fileName}</strong> (Pág {c.pageNumber}): "{c.snippet}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isAnswering && (
              <div className="flex justify-start">
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 animate-pulse">
                  <Cpu className="w-4 h-4 animate-spin text-blue-600" />
                  <span>IA Local processando busca RAG nos documentos...</span>
                </div>
              </div>
            )}
          </div>

          {/* User Input & Send Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
            <input
              type="text"
              placeholder={qaFiles.length > 0 ? "Digite sua pergunta sobre os documentos..." : "Adicione documentos primeiro..."}
              disabled={qaFiles.length === 0 || isAnswering}
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSendQuery}
              disabled={qaFiles.length === 0 || !userQuery.trim() || isAnswering}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 disabled:opacity-50 transition-all"
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
