import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Renderiza blocos e tabelas de forma estruturada
  const renderFormattedBlocks = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableHeader: string[] = [];
    let tableRows: string[][] = [];
    let codeBlockActive = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    const flushTable = (keyIndex: number) => {
      if (tableHeader.length > 0) {
        elements.push(
          <div key={`table-${keyIndex}`} className="my-3 overflow-x-auto rounded-xl border border-slate-700/80 shadow-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/90 text-purple-300 border-b border-slate-700">
                  {tableHeader.map((th, i) => (
                    <th key={i} className="px-3 py-2 font-bold tracking-wider border-r border-slate-700/50 last:border-r-0">
                      {parseInlineFormatting(th.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-300 border-r border-slate-800/50 last:border-r-0">
                        {parseInlineFormatting(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableHeader = [];
      tableRows = [];
      inTable = false;
    };

    const flushCodeBlock = (keyIndex: number) => {
      elements.push(
        <div key={`code-${keyIndex}`} className="my-3 rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] overflow-x-auto text-emerald-400 shadow-inner">
          {codeBlockLang && <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1 border-b border-slate-800 pb-1">{codeBlockLang}</div>}
          <pre className="whitespace-pre">{codeBlockContent.join('\n')}</pre>
        </div>
      );
      codeBlockContent = [];
      codeBlockActive = false;
      codeBlockLang = '';
    };

    lines.forEach((line, index) => {
      // 1. Trata blocos de código markdown (```)
      if (line.trim().startsWith('```')) {
        if (codeBlockActive) {
          flushCodeBlock(index);
        } else {
          if (inTable) flushTable(index);
          codeBlockActive = true;
          codeBlockLang = line.trim().replace('```', '').trim();
        }
        return;
      }

      if (codeBlockActive) {
        codeBlockContent.push(line);
        return;
      }

      // 2. Trata tabelas Markdown (| col | col |)
      const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
      const isTableSeparator = isTableRow && /^[|\s-:]+$/.test(line.trim());

      if (isTableRow) {
        const cells = line.split('|').slice(1, -1);
        if (!inTable) {
          inTable = true;
          tableHeader = cells;
        } else if (isTableSeparator) {
          // Ignora a linha divisória |---|---|
        } else {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        flushTable(index);
      }

      // 3. Linha divisória (=== ou --- ou ***)
      if (/^(=+|-+|\*+){3,}$/.test(line.trim())) {
        elements.push(
          <div key={`hr-${index}`} className="my-4 border-t border-slate-800 flex items-center justify-center">
            <span className="px-3 bg-slate-950 text-[10px] font-bold text-slate-600 tracking-widest uppercase">DIVISÃO DE SEÇÃO</span>
          </div>
        );
        return;
      }

      // 4. Cabeçalhos (#, ##, ###)
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${index}`} className="text-base font-extrabold text-white mt-4 mb-2 pb-1 border-b border-purple-500/30 flex items-center gap-2">
            {parseInlineFormatting(line.replace('# ', ''))}
          </h1>
        );
        return;
      }

      if (line.startsWith('## ')) {
        const titleText = line.replace('## ', '');
        const isAttack = titleText.includes('ATAQUE') || titleText.includes('⚔️');
        const isDefense = titleText.includes('DEFESA') || titleText.includes('🛡️');

        elements.push(
          <h2
            key={`h2-${index}`}
            className={`text-sm font-bold mt-4 mb-2 p-2.5 rounded-xl border flex items-center gap-2 ${
              isAttack
                ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                : isDefense
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-purple-950/40 text-purple-200 border-purple-500/30'
            }`}
          >
            {parseInlineFormatting(titleText)}
          </h2>
        );
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-xs font-bold text-purple-300 mt-3 mb-1.5 flex items-center gap-1.5">
            {parseInlineFormatting(line.replace('### ', ''))}
          </h3>
        );
        return;
      }

      // 5. Citações (> texto)
      if (line.trim().startsWith('>')) {
        elements.push(
          <blockquote key={`quote-${index}`} className="my-2 pl-3 py-1 border-l-2 border-purple-500 bg-purple-950/20 text-purple-200 text-xs italic rounded-r-lg">
            {parseInlineFormatting(line.trim().replace(/^>\s*/, ''))}
          </blockquote>
        );
        return;
      }

      // 6. Listas (- item ou * item ou 1. item)
      if (/^(\s*[-*]|\s*\d+\.)\s+/.test(line)) {
        const cleanItem = line.replace(/^(\s*[-*]|\s*\d+\.)\s+/, '');
        elements.push(
          <div key={`list-${index}`} className="flex items-start gap-2 my-1 pl-2 text-xs text-slate-300">
            <span className="text-purple-400 font-bold select-none mt-0.5">•</span>
            <div className="flex-1 leading-relaxed">{parseInlineFormatting(cleanItem)}</div>
          </div>
        );
        return;
      }

      // 7. Parágrafos comuns
      if (line.trim().length > 0) {
        elements.push(
          <p key={`p-${index}`} className="my-1.5 leading-relaxed text-xs text-slate-200">
            {parseInlineFormatting(line)}
          </p>
        );
      } else {
        // Espaçador para linhas em branco
        elements.push(<div key={`space-${index}`} className="h-1" />);
      }
    });

    if (inTable) flushTable(lines.length);
    if (codeBlockActive) flushCodeBlock(lines.length);

    return elements;
  };

  // Processa negrito, itálico e código inline na mesma linha
  const parseInlineFormatting = (text: string): React.ReactNode => {
    if (!text) return text;

    // Divide por tokens de negrito (**texto** ou __texto__)
    const parts = text.split(/(\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*)/g);

    return parts.map((part, i) => {
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        const inner = part.slice(2, -2);
        return <strong key={i} className="font-extrabold text-white">{inner}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const inner = part.slice(1, -1);
        return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px] border border-slate-700">{inner}</code>;
      }
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        const inner = part.slice(1, -1);
        return <em key={i} className="italic text-purple-200">{inner}</em>;
      }
      return part;
    });
  };

  return (
    <div className={`markdown-content font-sans ${className}`}>
      {renderFormattedBlocks(content)}
    </div>
  );
};
