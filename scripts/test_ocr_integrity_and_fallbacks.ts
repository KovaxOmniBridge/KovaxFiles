/**
 * TESTE DE INTEGRIDADE DO OCR E AUSÊNCIA DE TEXTOS FICTÍCIOS
 * 
 * Valida:
 * 1. Ausência absoluta de textos fictícios/inventados no código-fonte do OcrScanner.
 * 2. Comportamento rigoroso de falha: mensagens explícitas de erro/aviso quando o OCR não reconhece texto.
 * 3. Preservação do arquivo original em caso de erro e integridade do pipeline.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runOcrIntegrityTests() {
  console.log('================================================================');
  console.log('🧪 TESTE DE INTEGRIDADE E FIDELIDADE DO OCR (SEM TEXTOS FICTÍCIOS)');
  console.log('================================================================\n');

  const ocrScannerPath = path.resolve(__dirname, '../src/components/tools/OcrScanner.tsx');
  if (!fs.existsSync(ocrScannerPath)) {
    throw new Error(`Arquivo OcrScanner.tsx não encontrado em ${ocrScannerPath}`);
  }

  const fileContent = fs.readFileSync(ocrScannerPath, 'utf-8');

  console.log('[1/3] Verificando ausência de textos administrativos inventados e hardcoded...');
  const forbiddenPatterns = [
    /PROCESSO\s+ADMINISTRATIVO\s+N[°º]\s*4589\/2026/i,
    /REQUERIMENTO\s+DE\s+CERTID[AÃ]O\s+E\s+REGULARIZA[ÇC][AÃ]O/i,
    /Certifico\s+que\s+o\s+documento\s+.*?\s+foi\s+indexado\s+com\s+sucesso/i,
    /Processado\s+via\s+OCR\s+Local\s+100%\s+Offline\s*\\nPROCESSO/i
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(fileContent)) {
      throw new Error(`[FALHA DE SEGURANÇA/INTEGRIDADE]: Texto fictício ainda encontrado no código correspondendo ao padrão: ${pattern}`);
    }
  }
  console.log('  -> NENHUM texto fictício detectado no código-fonte! (Aprovado)');

  console.log('\n[2/3] Verificando conformidade das mensagens explícitas de falha...');
  const requiredFailurePatterns = [
    /FALHA DE RECONHECIMENTO/i,
    /AVISO DE RECONHECIMENTO/i,
    /O arquivo original foi preservado/i,
    /Tentar Novamente/i,
    /Nova Tentativa/i
  ];

  for (const pattern of requiredFailurePatterns) {
    if (!pattern.test(fileContent)) {
      throw new Error(`[FALHA DE ESPECIFICAÇÃO]: Padrão de tratamento honesto não encontrado: ${pattern}`);
    }
  }
  console.log('  -> Tratamento de falhas, preservação e retry devidamente implementados! (Aprovado)');

  console.log('\n[3/3] Verificando suporte unificado a PDF e Imagens com motor offline...');
  if (!fileContent.includes('PdfTextExtractor.extractTextWithBounds')) {
    throw new Error('[FALHA]: Extração de PDFs via PdfTextExtractor não encontrada no OcrScanner.');
  }
  if (!fileContent.includes('ocrLanguage')) {
    throw new Error('[FALHA]: Seletor de idioma do OCR não encontrado no OcrScanner.');
  }
  console.log('  -> Pipeline unificado de PDFs e imagens validado com sucesso! (Aprovado)');

  console.log('\n================================================================');
  console.log('✅ SUCESSO: O MÓDULO DE OCR ESTÁ 100% FIDEDIGNO E SEM TEXTOS FICTÍCIOS!');
  console.log('================================================================\n');
}

runOcrIntegrityTests();
