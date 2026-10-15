import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { LocalPdfEngine } from '../src/services/pdfEngine';

async function main() {
  console.log('--- TESTANDO COMPORTAMENTO DO PDF ENGINE EM NODE ---');
  
  // 1. Criar PDF sintético com dados sensíveis
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  
  const sensitiveCpf = '123.456.789-00';
  const sensitiveCnpj = '12.345.678/0001-90';
  const sensitiveName = 'Carlos Alberto Ferreira';
  
  page.drawText(`Processo Judicial nº 1000123-45.2026.8.26.0100`, { x: 50, y: 780, size: 14, font });
  page.drawText(`Autor: ${sensitiveName}, portador do CPF ${sensitiveCpf}`, { x: 50, y: 750, size: 12, font });
  page.drawText(`Réu: Empresa Brasileira de Logística, CNPJ ${sensitiveCnpj}`, { x: 50, y: 720, size: 12, font });
  
  const originalBytes = await doc.save();
  assert.ok(originalBytes.length > 0, 'Documento original deve gerar bytes válidos');

  fs.mkdirSync('test_output', { recursive: true });
  fs.writeFileSync('test_output/test_original.pdf', originalBytes);
  assert.ok(fs.existsSync('test_output/test_original.pdf'), 'Arquivo original deve ser gravado no disco');
  console.log('PDF original criado: test_output/test_original.pdf');
  
  // 2. Chamar PdfEngine.redactPdf passando retângulos sobre os dados sensíveis
  const rectangles = [
    { pageIndex: 0, x: 85, y: 748, width: 140, height: 16, text: sensitiveName, category: 'Nome de Pessoa' },
    { pageIndex: 0, x: 310, y: 748, width: 95, height: 16, text: sensitiveCpf, category: 'CPF' },
    { pageIndex: 0, x: 270, y: 718, width: 120, height: 16, text: sensitiveCnpj, category: 'CNPJ' },
  ];
  
  const redactedBytes = await LocalPdfEngine.redactPdf(originalBytes.buffer, rectangles, { sanitizeFlatten: true });
  assert.ok(redactedBytes instanceof Uint8Array && redactedBytes.length > 0, 'Buffer anonimizado deve ser válido');

  fs.writeFileSync('test_output/test_redacted_engine.pdf', redactedBytes);
  assert.ok(fs.existsSync('test_output/test_redacted_engine.pdf'), 'Arquivo anonimizado deve existir no disco');

  const stats = fs.statSync('test_output/test_redacted_engine.pdf');
  assert.ok(stats.size > 5000, 'Tamanho do PDF anonimizado deve ser superior a 5KB');

  console.log('PDF tarjado pelo PdfEngine salvo: test_output/test_redacted_engine.pdf');
  console.log('Tamanho do PDF resultante:', stats.size, 'bytes');
}

main().catch(err => {
  console.error('[FALHA CRÍTICA NO TESTE DO MOTOR]:', err);
  process.exitCode = 1;
});
