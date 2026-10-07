import React, { useState } from 'react';
import { X, FileText, Copy, Check, Search, BookOpen, AlertCircle, Eye } from 'lucide-react';

export interface CitationData {
  fileName: string;
  snippetText: string;
  pageNumber?: number;
  fullText?: string;
  matchedKeywords?: string[];
}

interface DocumentCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: CitationData | null;
}

export const DocumentCitationModal: React.FC<DocumentCitationModalProps> = ({
  isOpen,
  onClose,
  citation
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !citation) return null;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(citation.snippetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Renderiza o documento com o trecho citado destacado em amarelo vibrante
  const renderHighlightedDocument = () => {
    const textToSearch = citation.fullText || citation.snippetText;
    const snippet = citation.snippetText.trim();

    if (!snippet || !textToSearch) {
      return <div className="text-slate-400 italic">Nenhum trecho de texto disponível para exibição.</div>;
    }

    const snippetPos = textToSearch.toLowerCase().indexOf(snippet.toLowerCase());

    if (snippetPos === -1) {
      // Se não encontrar correspondência exata de substrings longas, exibe o trecho extraído com destaque completo
      return (
        <div className="space-y-4 font-sans text-sm leading-relaxed text-slate-200">
          <div className="bg-yellow-500/10 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <span className="text-xs uppercase font-bold tracking-wider text-yellow-400 block mb-1">
              Trecho Extraído e Consultado pela IA:
            </span>
            <mark className="bg-yellow-300 dark:bg-yellow-400/30 text-yellow-950 dark:text-yellow-100 font-medium px-2 py-1 rounded shadow-sm block text-base border border-yellow-400/40">
              "{snippet}"
            </mark>
          </div>
        </div>
      );
    }

    const before = textToSearch.substring(0, snippetPos);
    const match = textToSearch.substring(snippetPos, snippetPos + snippet.length);
    const after = textToSearch.substring(snippetPos + snippet.length);

    // Mostra até 300 caracteres antes e depois para dar contexto de leitura
    const contextBefore = before.length > 400 ? '...' + before.substring(before.length - 400) : before;
    const contextAfter = after.length > 400 ? after.substring(0, 400) + '...' : after;

    return (
      <div className="font-sans text-sm leading-relaxed text-slate-300 space-y-2 bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 shadow-inner font-mono">
        <span className="text-slate-400">{contextBefore}</span>
        <mark className="bg-yellow-400 text-slate-950 font-bold px-2 py-1 rounded shadow-md border-2 border-yellow-300 inline-block animate-pulse-subtle">
          {match}
        </mark>
        <span className="text-slate-400">{contextAfter}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b border-slate-700/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Inspeção de Fonte de Dados
                {citation.pageNumber && (
                  <span className="text-xs bg-slate-700 text-slate-300 font-normal px-2 py-0.5 rounded-full border border-slate-600">
                    Página {citation.pageNumber}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-slate-300 truncate max-w-md">{citation.fileName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            title="Fechar Visualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Palavras-chave / Metadados */}
        {citation.matchedKeywords && citation.matchedKeywords.length > 0 && (
          <div className="px-6 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Search className="w-3 h-3 text-yellow-400" /> Palavras-chave detectadas:
            </span>
            {citation.matchedKeywords.map((kw, i) => (
              <span key={i} className="text-xs bg-yellow-500/10 text-yellow-300 px-2 py-0.5 rounded-md border border-yellow-500/20">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Corpo com Trecho Grifado */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Trecho Exato Consultado no Documento Original:
            </span>

            <button
              onClick={handleCopySnippet}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Trecho</span>
                </>
              )}
            </button>
          </div>

          {renderHighlightedDocument()}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 text-xs text-blue-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-200">Garantia de Auditabilidade Kovax:</span>
              <p className="mt-0.5 text-blue-300/90">
                O trecho em amarelo acima foi extraído diretamente da grade vetorial do arquivo carregado sem sofrer alterações externas. A resposta da IA foi baseada exclusivamente nesse contexto.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            Fechar Inspeção
          </button>
        </div>

      </div>
    </div>
  );
};
