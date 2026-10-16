import fs from 'fs';
import assert from 'assert';
import crypto from 'crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { LocalPdfEngine } from '../src/services/pdfEngine.js';

async function testProcessStamperChancelaIntegrity() {
  console.log('================================================================');
  console.log('🧪 TESTE DE VALIDAÇÃO TÉCNICA E JURÍDICA: CHANCELA DE JUNTADA');
  console.log('   (Verificação de Integridade SHA-256 e Isenção de Falso PAdES)');
  console.log('================================================================\n');

  fs.mkdirSync('test_output', { recursive: true });

  // 1. Criar PDF de teste simulando peça jurídica / processo administrativo
  console.log('[1/4] Criando PDF base de 2 páginas para autuação...');
  const baseDoc = await PDFDocument.create();
  const font = await baseDoc.embedFont(StandardFonts.Helvetica);
  
  const page1 = baseDoc.addPage([595, 842]);
  page1.drawText('PETIÇÃO INICIAL DE COBRANÇA', { x: 50, y: 780, size: 14, font });
  page1.drawText('Excelentíssimo Senhor Doutor Juiz de Direito...', { x: 50, y: 740, size: 11, font });
  
  const page2 = baseDoc.addPage([595, 842]);
  page2.drawText('DOS PEDIDOS E REQUERIMENTOS FINAIS', { x: 50, y: 780, size: 14, font });
  page2.drawText('Requer a juntada da presente peça e anexos...', { x: 50, y: 740, size: 11, font });

  const inputPdfBytes = await baseDoc.save();
  const inputSha256 = crypto.createHash('sha256').update(inputPdfBytes).digest('hex');
  console.log(`      Hash SHA-256 original: ${inputSha256}`);

  // 2. Executar chancela de juntada com termo de integridade
  console.log('\n[2/4] Executando LocalPdfEngine.stampProcess com numeração de folhas e termo...');
  const stampedBytes = await LocalPdfEngine.stampProcess(inputPdfBytes, {
    processNumber: '10045/2026',
    departmentText: 'GABINETE DO PREFEITO',
    startPageNumber: 1,
    yearText: '2026',
    stampColor: 'blue',
    position: 'top-right',
    stampShape: 'round',
    opacity: 0.65,
    appendAuditPage: true,
    showTimestamp: true,
    skipFirstPage: false
  });

  const outputPath = 'test_output/processo_chancelado_test.pdf';
  fs.writeFileSync(outputPath, stampedBytes);
  console.log(`      Arquivo gerado com sucesso: ${outputPath} (${stampedBytes.length} bytes)`);

  // 3. Inspecionar o documento gerado
  console.log('\n[3/4] Inspecionando estrutura do PDF resultante...');
  const resultDoc = await PDFDocument.load(stampedBytes);
  const pageCount = resultDoc.getPageCount();
  console.log(`      Total de páginas no documento: ${pageCount} (Esperado: 3 - 2 originais + 1 termo)`);
  assert.strictEqual(pageCount, 3, 'O documento deveria ter exatamente 3 páginas com a página de termo');

  // 4. Analisar conteúdo textual das páginas extraídas pelo PDF.js
  console.log('\n[4/4] Verificando conformidade textual e ausência de declarações falsas de PAdES...');
  const { PdfTextExtractor } = await import('../src/services/pdfTextExtractor.js');
  const pagesData = await PdfTextExtractor.extractTextWithBounds(stampedBytes.buffer as ArrayBuffer, undefined, undefined, { disableOcr: true });
  
  const allText = pagesData.map(p => p.fullText).join(' \n ');
  const auditPageText = pagesData[2]?.fullText || '';
  console.log('      Texto extraído da página de termo:');
  console.log('      --------------------------------------------------');
  console.log('      ' + auditPageText.replace(/\n/g, ' '));
  console.log('      --------------------------------------------------');

  // Não deve conter a falsa alegação "100% Offline PAdES"
  assert.ok(!allText.includes('100% Offline PAdES'), 'ERRO: O PDF ainda contém "100% Offline PAdES"');
  console.log('      ✓ Ausência de "100% Offline PAdES" confirmada');

  // Não deve conter o selo enganoso "PAdES AUTÊNTICO"
  assert.ok(!allText.includes('PAdES AUTÊNTICO'), 'ERRO: O PDF ainda contém o selo "PAdES AUTÊNTICO"');
  console.log('      ✓ Ausência de "PAdES AUTÊNTICO" confirmada');

  // Não deve conter o título "Assinatura Eletrônica Avançada / Audit Log PAdES"
  assert.ok(!allText.includes('Audit Log PAdES'), 'ERRO: O PDF ainda contém "Audit Log PAdES"');
  console.log('      ✓ Ausência de "Audit Log PAdES" confirmada');

  // Deve conter o novo título institucional transparente
  assert.ok(
    allText.includes('TERMO DE JUNTADA & REGISTRO DE INTEGRIDADE DOCUMENTAL'),
    'ERRO: O PDF deve conter o cabeçalho "TERMO DE JUNTADA & REGISTRO DE INTEGRIDADE DOCUMENTAL"'
  );
  console.log('      ✓ Cabeçalho "TERMO DE JUNTADA & REGISTRO DE INTEGRIDADE DOCUMENTAL" verificado');

  // Deve conter o aviso explícito de não substituição de PAdES / ICP-Brasil
  assert.ok(
    allText.includes('Não constitui assinatura digital PAdES/ICP-Brasil') ||
    allText.includes('não substitui assinatura digital qualificada (ICP-Brasil) ou PAdES'),
    'ERRO: O PDF deve conter a ressalva legal explícita desfazendo a falsa equivalência de PAdES'
  );
  console.log('      ✓ Aviso explícito de não equivalência a PAdES/ICP-Brasil verificado');

  // Deve conter o hash SHA-256 no termo
  assert.ok(
    allText.includes('Hash Criptografico SHA-256') || allText.includes('Hash Criptográfico SHA-256') || allText.includes('SHA-256'),
    'ERRO: O termo deve conter o registro de Hash SHA-256'
  );
  console.log('      ✓ Registro criptográfico de Hash SHA-256 confirmado');

  console.log('\n================================================================');
  console.log('✅ SUCESSO: Chancela de juntada e numeração está 100% em conformidade!');
  console.log('   Sem induzir os usuários ao erro de falsa assinatura digital PAdES.');
  console.log('================================================================\n');
}

testProcessStamperChancelaIntegrity().catch(err => {
  console.error('\n❌ FALHA NO TESTE:', err);
  process.exit(1);
});
