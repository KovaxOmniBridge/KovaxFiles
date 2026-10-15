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
  Sparkles
} from 'lucide-react';
import { 
  CustomLegalKnowledgeService, 
  CustomLawDocument 
} from '../../services/customLegalKnowledgeService';
import { LegalArticle } from '../../services/legalKnowledgeBaseService';
import { PdfTextExtractor } from '../../services/pdfTextExtractor';

interface LocalKnowledgeManagerProps {
  onClose?: () => void;
}

export const LocalKnowledgeManager: React.FC<LocalKnowledgeManagerProps> = ({ onClose }) => {
  const [docs, setDocs] = useState<CustomLawDocument[]>([]);
  const [articles, setArticles] = useState<LegalArticle[]>([]);
  const [activeTab, setActiveTab] = useState<'docs' | 'articles' | 'add'>('docs');
  
  // Estado para formulário de adição
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<'municipal' | 'estadual' | 'regimento' | 'outros'>('municipal');
  const [statusVigencia, setStatusVigencia] = useState<'em_vigor' | 'alterada' | 'revogada'>('em_vigor');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setDocs(CustomLegalKnowledgeService.getCustomDocs());
    setArticles(CustomLegalKnowledgeService.getCustomArticles());
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
        setNotification('⚠️ Não foi possível extrair texto do arquivo. Verifique se o arquivo possui texto editável.');
        setIsProcessing(false);
        return;
      }

      const autoName = file.name.replace(/\.[^/.]+$/, "");
      setDocName(autoName);
      setRawText(extractedText);
      setActiveTab('add');
      setNotification(`📄 Texto extraído com sucesso (${extractedText.length} caracteres)! Confirme os dados abaixo para indexar.`);
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      setNotification('❌ Erro ao processar o arquivo. Tente colar o texto manualmente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !rawText.trim()) {
      setNotification('⚠️ Preencha o nome da norma e o texto das leis/regimentos.');
      return;
    }

    const { addedArticlesCount } = CustomLegalKnowledgeService.addCustomLawDocument(
      docName.trim(),
      rawText,
      category,
      statusVigencia
    );

    loadData();
    setDocName('');
    setRawText('');
    setActiveTab('docs');
    setNotification(`✅ Norma "${docName}" indexada com sucesso! ${addedArticlesCount} dispositivo(s) adicionado(s) ao acervo local.`);
  };

  const handleDeleteDoc = (docId: string, docName: string) => {
    if (confirm(`Deseja remover "${docName}" e todos os seus artigos do acervo local?`)) {
      CustomLegalKnowledgeService.removeCustomDoc(docId);
      loadData();
      setNotification(`🗑️ Norma "${docName}" removida do acervo local.`);
    }
  };

  const filteredArticles = articles.filter(a => 
    a.lawName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full mx-auto text-slate-100 font-sans">
      {/* Cabeçalho */}
      <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Acervo Normativo Local & Municipal</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                100% Offline
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Gerencie Leis Orgânicas Municipais, Regimentos e Estatutos do seu Órgão ou Cliente
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Alerta / Notificação */}
      {notification && (
        <div className="px-6 py-2.5 bg-purple-950/50 border-b border-purple-800/40 text-purple-200 text-xs flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-purple-400 hover:text-purple-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs e Ações */}
      <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
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
            <span>Leis & Normas Cadastradas ({docs.length})</span>
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
            <span>Índice de Dispositivos ({articles.length})</span>
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
            <span>Nova Norma Municipal</span>
          </button>
        </div>

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

      {/* Conteúdo Principal */}
      <div className="p-6 max-h-[500px] overflow-y-auto space-y-4">
        {activeTab === 'docs' && (
          <div className="space-y-3">
            {docs.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl space-y-3">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-300">Nenhuma lei municipal ou regimento local cadastrado</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Arraste um PDF da Lei Orgânica, Código Tributário Municipal ou Regimento Interno do seu município para integrar ao acervo local de busca.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                   Cadastrar Primeira Norma Municipal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {docs.map(doc => (
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
                        title="Remover lei do acervo local"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {doc.articleCount} dispositivo(s) indexado(s)
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
                placeholder="Pesquisar nos artigos do acervo local..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {filteredArticles.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum artigo encontrado no acervo local.</p>
            ) : (
              <div className="space-y-2">
                {filteredArticles.map(art => (
                  <div key={art.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-purple-300 font-bold text-[11px]">
                      <span>{art.lawName} - {art.article}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{art.title}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px] font-sans">"{art.content}"</p>
                  </div>
                ))}
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
                  placeholder="Ex: Lei Orgânica de São Paulo (Lei 13.885) ou Código Tributário"
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
                <span className="text-[10px] text-slate-500">Cole o texto com "Art. 1º", "Artigo 2º" etc.</span>
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
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Indexar Norma no Acervo Local
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
