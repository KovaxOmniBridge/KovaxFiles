import { extractTextFromAnyDocument } from '../utils/documentTextExtractor';

export interface ClauseDiffResult {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  originalText?: string;
  modifiedText?: string;
  similarityScore?: number;
}

export interface DocumentDiffSummary {
  originalFileName: string;
  modifiedFileName: string;
  similarityPercent: number;
  totalClausesOriginal: number;
  totalClausesModified: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  diffs: ClauseDiffResult[];
}

class PdfDiffService {
  /**
   * Compara 2 documentos (PDF, DOCX, TXT) cláusula por cláusula e gera um relatório diff completo.
   */
  public async compareDocuments(
    originalFile: File,
    modifiedFile: File,
    onProgress?: (percent: number, status: string) => void
  ): Promise<DocumentDiffSummary> {
    onProgress?.(10, `Extraindo conteúdo de "${originalFile.name}"...`);
    const origPages = await extractTextFromAnyDocument(originalFile);
    const origFullText = origPages.map((p) => p.text).join('\n\n');

    onProgress?.(40, `Extraindo conteúdo de "${modifiedFile.name}"...`);
    const modPages = await extractTextFromAnyDocument(modifiedFile);
    const modFullText = modPages.map((p) => p.text).join('\n\n');

    onProgress?.(70, 'Calculando diferenças semânticas entre os documentos...');

    const origParagraphs = this.splitIntoParagraphs(origFullText);
    const modParagraphs = this.splitIntoParagraphs(modFullText);

    const diffs: ClauseDiffResult[] = [];
    const matchedModIndices = new Set<number>();

    let unchangedCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;

    for (let i = 0; i < origParagraphs.length; i++) {
      const origP = origParagraphs[i];
      let bestMatchIdx = -1;
      let bestSimilarity = 0;

      for (let j = 0; j < modParagraphs.length; j++) {
        if (matchedModIndices.has(j)) continue;
        const sim = this.calculateStringSimilarity(origP, modParagraphs[j]);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestMatchIdx = j;
        }
      }

      if (bestMatchIdx !== -1 && bestSimilarity >= 0.85) {
        matchedModIndices.add(bestMatchIdx);
        if (bestSimilarity >= 0.98) {
          unchangedCount++;
          diffs.push({ type: 'unchanged', originalText: origP, modifiedText: modParagraphs[bestMatchIdx], similarityScore: 100 });
        } else {
          modifiedCount++;
          diffs.push({
            type: 'modified',
            originalText: origP,
            modifiedText: modParagraphs[bestMatchIdx],
            similarityScore: Math.round(bestSimilarity * 100),
          });
        }
      } else {
        removedCount++;
        diffs.push({ type: 'removed', originalText: origP, similarityScore: 0 });
      }
    }

    let addedCount = 0;
    for (let j = 0; j < modParagraphs.length; j++) {
      if (!matchedModIndices.has(j)) {
        addedCount++;
        diffs.push({ type: 'added', modifiedText: modParagraphs[j], similarityScore: 0 });
      }
    }

    const totalCompared = Math.max(origParagraphs.length, modParagraphs.length, 1);
    const similarityPercent = Math.round((unchangedCount / totalCompared) * 100);

    onProgress?.(100, 'Comparação concluída com sucesso!');

    return {
      originalFileName: originalFile.name,
      modifiedFileName: modifiedFile.name,
      similarityPercent,
      totalClausesOriginal: origParagraphs.length,
      totalClausesModified: modParagraphs.length,
      addedCount,
      removedCount,
      modifiedCount,
      unchangedCount,
      diffs,
    };
  }

  private splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\r?\n\r?\n|\r\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 15 && !p.startsWith('PK'));
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/\s+/g, ' ');
    const s2 = str2.toLowerCase().replace(/\s+/g, ' ');

    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0;

    const words1 = new Set(s1.split(' ').filter((w) => w.length > 3));
    const words2 = new Set(s2.split(' ').filter((w) => w.length > 3));

    if (words1.size === 0 || words2.size === 0) {
      return s1.includes(s2) || s2.includes(s1) ? 0.7 : 0;
    }

    let intersection = 0;
    words1.forEach((w) => {
      if (words2.has(w)) intersection++;
    });

    const union = new Set([...words1, ...words2]).size;
    return intersection / union;
  }
}

export const pdfDiffService = new PdfDiffService();
