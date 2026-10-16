import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Trash2, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Scale, 
  Search,
  BookOpen,
  X,
  Sparkles,
  Download,
  Database,
  RefreshCw,
  AlertTriangle,
  FolderDown,
  FolderUp,
  FileCheck,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { 
  CustomLegalKnowledgeService, 
  CustomLawDocument 
} from '../../services/customLegalKnowledgeService';
import { LegalArticle } from '../../services/legalKnowledgeBaseService';
import { LegalCorpusAuditorService } from '../../services/legalCorpusAuditorService';
import { PdfTextExtractor } from '../../services/pdfTextExtractor';

interface LocalKnowledgeManagerProps {
  onClose?: () => void;
  onUpdate?: () => void;
}

export const LocalKnowledgeManager: React.FC<LocalKnowledgeManagerProps> = ({ onClose, onUpdate }) => {
  const [docs, setDocs] = useState<CustomLawDocument[]>([]);
  const [articles, setArticles] = useState<LegalArticle[]>([]);
  const [activeTab, setActiveTab] = useState<'docs' | 'articles' | 'add' | 'backup'>('docs');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para formulário de adição
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<'municipal' | 'estadual' | 'regimento' | 'outros'>('municipal');
  const [statusVigencia, setStatusVigencia] = useState<'em_vigor' | 'alterada' | 'revogada'>('em_vigor');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVigencia, setFilterVigencia] = useState<'ALL' | 'em_vigor' | 'alterada' | 'revogada'>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'warn' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedDocs, loadedArts] = await Promise.all([
        CustomLegalKnowledgeService.getCustomDocsAsync(),
        CustomLegalKnowledgeService.getCustomArticlesAsync(true)
      ]);
      setDocs(loadedDocs);
      setArticles(loadedArts);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erro ao carregar dados do IndexedDB:', err);
      setNotification({ type: 'error', text: 'Falha ao sincronizar acervo do IndexedDB.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let extractedText = '';

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const pages = await PdfTextExtractor.extractTextWithBounds(buffer);
        extractedText = pages.map(p => p.fullText).join('\n\n');
      } else {
        extractedText = await file.text();
      }

      if (!extractedText || extractedText.trim().length < 20) {
        setNotification({ type: 'warn', text: 'Não foi possível extrair texto do arquivo. Verifique se o arquivo possui camada de texto editável.' });
        setIsProcessing(false);
        return;
      }

      const autoName = file.name.replace(/\.[^/.]+$/, "");
      setDocName(autoName);
      setRawText(extractedText);
      setActiveTab('add');
      setNotification({
        type: 'success',
        text: `Arquivo lido (${extractedText.length.toLocaleString('pt-BR')} caracteres)! Revise os campos e clique em Salvar para persistir no IndexedDB.`
      });
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      setNotification({ type: 'error', text: 'Erro ao processar o arquivo. Tente colar o texto manualmente.' });
    } finally {
      setIsProcessing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !rawText.trim()) {
      setNotification({ type: 'warn', text: 'Preencha o nome da norma e o texto das leis/regimentos.' });
      return;
    }

    setIsProcessing(true);
    try {
      const { addedArticlesCount } = await CustomLegalKnowledgeService.addCustomLawDocumentAsync(
        docName.trim(),
        rawText,
        category,
        statusVigencia
      );

      await loadData();
      setDocName('');
      setRawText('');
      setActiveTab('docs');
      setNotification({
        type: 'success',
        text: `Norma "${docName}" indexada com sucesso no IndexedDB! ${addedArticlesCount} dispositivo(s) adicionado(s).`
      });
    } catch (err: any) {
      setNotification({ type: 'error', text: `Erro ao gravar no IndexedDB: ${err?.message || err}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDoc = async (docId: string, docName: string) => {
    if (confirm(`Deseja remover "${docName}" e todos os seus artigos do acervo local?`)) {
      await CustomLegalKnowledgeService.removeCustomDocAsync(docId);
      await loadData();
      setNotification({ type: 'info', text: `Norma "${docName}" removida do acervo local.` });
    }
  };

  const handleExportBackup = async () => {
    try {
      await CustomLegalKnowledgeService.downloadCorpusBackup();
      setNotification({ type: 'success', text: 'Backup completo do acervo exportado em JSON!' });
    } catch (err: any) {
      setNotification({ type: 'error', text: `Falha ao exportar backup: ${err.message}` });
    }
  };

  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const replaceMode = confirm('Deseja mesclar (OK) ou substituir completamente o acervo atual (Cancelar)?\n\n- OK: Mescla com o acervo existente (mantém os atuais)\n- Cancelar: Substitui integralmente pelo backup importado');
      const mode = replaceMode ? 'merge' : 'replace';

      setIsProcessing(true);
      const res = await CustomLegalKnowledgeService.importCorpusBackup(content, mode);

      if (res.success) {
        await loadData();
        setNotification({ type: 'success', text: res.message });
      } else {
        setNotification({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: `Erro ao processar arquivo de backup: ${err.message}` });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleClearAll = async () => {
    if (confirm('ATENÇÃO: Deseja apagar TODO o acervo pessoal (leis e artigos) do IndexedDB e do navegador? Esta ação não pode ser desfeita.')) {
      await CustomLegalKnowledgeService.clearAllCustomLawsAsync();
      await loadData();
      setNotification({ type: 'warn', text: 'Todo o acervo personalizado foi limpo do IndexedDB.' });
    }
  };

  const filteredDocs = docs.filter(d => {
    if (filterVigencia !== 'ALL' && d.statusVigencia !== filterVigencia) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredArticles = articles.filter(a => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.lawName.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full mx-auto text-slate-100 font-sans">
      {/* Cabeçalho */}
      <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Acervo Normativo Local & Municipal</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                IndexedDB Persistente
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px]">
                100% Offline
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Leis Orgânicas, Regimentos e Estatutos salvos em banco local de alta capacidade (sem limite de 5MB)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
            title="Recarregar dados do IndexedDB"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Alerta / Notificação */}
      {notification && (
        <div className={`px-6 py-2.5 border-b text-xs flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-200'
            : notification.type === 'error'
            ? 'bg-rose-950/60 border-rose-800/40 text-rose-200'
            : notification.type === 'warn'
            ? 'bg-amber-950/60 border-amber-800/40 text-amber-200'
            : 'bg-indigo-950/60 border-indigo-800/40 text-indigo-200'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs e Ações */}
      <div className="px-6 py-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'docs'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Leis & Normas ({docs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('articles')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'articles'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Dispositivos ({articles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'add'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Norma</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'backup'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup & Sincronia</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Upload Rápido PDF */}
          <label className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Importar PDF de Lei</span>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
          </label>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6 max-h-[520px] overflow-y-auto space-y-4">
        {activeTab === 'docs' && (
          <div className="space-y-3">
            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtrar por nome de lei ou município..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={filterVigencia}
                onChange={e => setFilterVigencia(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Todas as Vigências</option>
                <option value="em_vigor">Apenas Em Vigor</option>
                <option value="alterada">Apenas Alteradas</option>
                <option value="revogada">Apenas Revogadas</option>
              </select>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl space-y-3">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-300">Nenhuma norma encontrada</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Importe um PDF de Lei Orgânica, Código Tributário Municipal ou Regimento Interno para persistência ilimitada no IndexedDB.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Manualmente
                  </button>
                  <button
                    onClick={() => setActiveTab('backup')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition-all"
                  >
                    <FolderDown className="w-4 h-4 text-purple-400" />
                    Restaurar de Backup
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDocs.map(doc => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-2 relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50 text-[10px] uppercase font-bold">
                            {doc.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            doc.statusVigencia === 'revogada'
                              ? 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                              : doc.statusVigencia === 'alterada'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800/50'
                              : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                          }`}>
                            {doc.statusVigencia === 'revogada' ? '❌ Revogada' : doc.statusVigencia === 'alterada' ? '⚠️ Alterada' : '✅ Em Vigor'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200">{doc.name}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.name)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                        title="Remover lei e artigos do acervo local"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {doc.articleCount} dispositivo(s) no IndexedDB
                      </span>
                      <span>Cadastrado em {doc.uploadDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'articles' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Pesquisar nos artigos salvos no IndexedDB..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {filteredArticles.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum artigo encontrado no acervo local.</p>
            ) : (
              <div className="space-y-2">
                {filteredArticles.slice(0, 50).map(art => {
                  const isSuspended = art.statusVigencia === 'SUSPENSA_NAO_COMPROVADA' || art.authenticityStatus === 'SUSPENSO_NAO_COMPROVADO';
                  return (
                    <div 
                      key={art.id} 
                      className={`p-3 rounded-xl border space-y-2 text-xs transition-colors ${
                        isSuspended
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center space-x-1.5 font-bold">
                          <span className={isSuspended ? 'text-rose-300' : 'text-purple-300'}>
                            {art.lawName} - {art.article}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">({art.title})</span>
                        </div>
                        {isSuspended ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-bold text-[10px] flex items-center space-x-1">
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            <span>Suspenso (Sem Prova Oficial)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Auditado SHA-256</span>
                          </span>
                        )}
                      </div>

                      <p className="text-slate-300 leading-relaxed text-[11px] font-sans select-text cursor-text">
                        "{art.content}"
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                        <span className="font-mono text-slate-400 truncate max-w-[280px]" title={art.officialId || LegalCorpusAuditorService.generateLexmlUrn(art)}>
                          URN: {art.officialId || LegalCorpusAuditorService.generateLexmlUrn(art)}
                        </span>
                        <span>SHA-256: {(art.officialContentSha256 || LegalCorpusAuditorService.computeCanonicalSha256(art.content)).substring(0, 16)}...</span>
                      </div>
                    </div>
                  );
                })}
                {filteredArticles.length > 50 && (
                  <p className="text-[11px] text-center text-slate-500 py-2">
                    Exibindo os primeiros 50 de {filteredArticles.length} dispositivos indexados.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <form onSubmit={handleSaveDocument} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nome da Norma / Lei Municipal</label>
                <input
                  type="text"
                  placeholder="Ex: Lei Orgânica de Belo Horizonte ou Código Tributário Municipal"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Categoria Jurídica</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="municipal">🏛️ Lei Municipal</option>
                  <option value="estadual">🏢 Lei Estadual</option>
                  <option value="regimento">📜 Regimento / Portaria</option>
                  <option value="outros">📂 Outros Regulamentos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Status de Vigência</label>
                <select
                  value={statusVigencia}
                  onChange={e => setStatusVigencia(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="em_vigor">✅ Em Vigor (Ativa)</option>
                  <option value="alterada">⚠️ Alterada / Parcial</option>
                  <option value="revogada">❌ Revogada (Inativa)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Texto Integral dos Artigos / Norma Bruta</span>
                <span className="text-[10px] text-slate-500">Detecta automaticamente "Art. 1º", "Artigo 2º" etc.</span>
              </label>
              <textarea
                rows={10}
                placeholder={`Exemplo de formato:
Artigo 1º - Esta lei dispõe sobre a organização dos serviços municipais...
Artigo 2º - É dever do município zelar pelo interesse local...`}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Indexar Norma no IndexedDB</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6 py-2">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span>Diagnóstico de Armazenamento Local</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    O KovaxFilesApp utiliza IndexedDB nativo do navegador para armazenar acervos jurídicos extensos sem risco de estouro de cota (QuotaExceededError).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  IndexedDB Ativo
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Normas Salvas</div>
                  <div className="text-lg font-bold text-purple-400 mt-1">{docs.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Dispositivos / Artigos</div>
                  <div className="text-lg font-bold text-indigo-400 mt-1">{articles.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Normas Vigentes</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {docs.filter(d => d.statusVigencia !== 'revogada').length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Normas Revogadas</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">
                    {docs.filter(d => d.statusVigencia === 'revogada').length}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Exportar Backup */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <FolderDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Exportar Backup Completo</h4>
                    <p className="text-[11px] text-slate-400">Gera arquivo .json com todas as normas e artigos</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Permite transferir seu acervo de leis municipais e regimentos para outro computador ou salvar cópia de segurança em nuvem ou disco.
                </p>
                <button
                  onClick={handleExportBackup}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Backup (.json)</span>
                </button>
              </div>

              {/* Importar / Restaurar Backup */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FolderUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Restaurar Acervo de Arquivo</h4>
                    <p className="text-[11px] text-slate-400">Restaura ou mescla backup .json previamente exportado</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Selecione um arquivo de backup para reconstituir o acervo no IndexedDB deste navegador.
                </p>
                <label className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-600/20">
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Backup JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackupFile}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>

            {/* Zona de Perigo / Limpeza */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs">Zerar e apagar todo o acervo personalizado deste navegador</span>
              </div>
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 text-rose-200 text-xs font-semibold transition-all"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
