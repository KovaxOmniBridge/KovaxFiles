import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawnSync } from 'child_process';
import { PDFDocument } from 'pdf-lib';
import { PdfTextExtractor } from '../src/services/pdfTextExtractor.js';
import { AiRedactionService, RedactionCategoryOptions } from '../src/services/aiRedactionService.js';
import { LocalPdfEngine } from '../src/services/pdfEngine.js';

async function runScannedPdfOcrPipelineTest() {
  console.log('================================================================');
  console.log('🧪 TESTE DE VALIDAÇÃO DO PIPELINE DE OCR PARA PDFs ESCANEADOS');
  console.log('================================================================\n');

  // 1. Gerar uma imagem simulando documento escaneado com dados sensíveis
  console.log('[1/5] Gerando imagem de alta resolução simulando documento escaneado...');
  const venvPython = fs.existsSync('.venv/Scripts/python.exe') ? '.venv/Scripts/python.exe' : 'python';
  const imgPath = path.resolve('test_output/scanned_sample.png');
  fs.mkdirSync('test_output', { recursive: true });

  const pyScript = `
from PIL import Image, ImageDraw, ImageFont
# Criar imagem A4 equivalente a 150 DPI (1240 x 1754 px)
img = Image.new('RGB', (1200, 800), color=(255, 255, 255))
d = ImageDraw.Draw(img)

# Desenhar cabeçalho e texto de processo
d.text((80, 80), "TRIBUNAL DE JUSTICA DO ESTADO DE SAO PAULO", fill=(0, 0, 0))
d.text((80, 140), "PROCESSO DIGITAL No 1023456-78.2026.8.26.0100", fill=(0, 0, 0))
d.text((80, 220), "Autor: Mariana Albuquerque Souza", fill=(0, 0, 0))
d.text((80, 280), "CPF: 456.789.012-34", fill=(0, 0, 0))
d.text((80, 340), "RG: 23.456.789-0", fill=(0, 0, 0))
d.text((80, 420), "Advogado Responsavel: Dr. Roberto Silva", fill=(0, 0, 0))

img.save(r'${imgPath}')
`;

  const pyRes = spawnSync(venvPython, ['-c', pyScript]);
  if (pyRes.status !== 0 || !fs.existsSync(imgPath)) {
    throw new Error('Falha ao gerar imagem de teste com Pillow: ' + pyRes.stderr?.toString());
  }
  console.log('  -> Imagem de teste gerada em:', imgPath);

  // 2. Criar um PDF 100% escaneado (apenas imagem embutida, SEM texto vetorial)
  console.log('\n[2/5] Embutindo imagem em PDF puro sem streams de texto vetorial...');
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 em pontos PDF
  const imgBytes = fs.readFileSync(imgPath);
  const embeddedImage = await doc.embedPng(imgBytes);

  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: 595,
    height: 842
  });

  const scannedPdfBytes = await doc.save();
  const scannedPdfPath = path.resolve('test_output/scanned_document_test.pdf');
  fs.writeFileSync(scannedPdfPath, scannedPdfBytes);
  console.log('  -> PDF escaneado gerado:', scannedPdfPath, `(${scannedPdfBytes.length} bytes)`);

  // 3. Executar PdfTextExtractor.extractTextWithBounds
  console.log('\n[3/5] Executando PdfTextExtractor.extractTextWithBounds no PDF escaneado...');
  const progressLogs: string[] = [];
  const pagesData = await PdfTextExtractor.extractTextWithBounds(
    scannedPdfBytes.buffer,
    p => progressLogs.push(`[${p.percent}%] ${p.message}`)
  );

  assert.strictEqual(pagesData.length, 1, 'Deve retornar exatamente 1 página');
  const p0 = pagesData[0];
  console.log('  -> isScanned:', p0.isScanned);
  console.log('  -> Total de itens detectados:', p0.items.length);
  console.log('  -> Texto extraído (primeiros 200 caracteres):\n', p0.fullText.substring(0, 200));

  assert.strictEqual(p0.isScanned, true, 'A página deve ser marcada como isScanned = true');
  assert.ok(p0.items.length >= 5, `O OCR deve extrair múltiplos itens de texto (encontrados: ${p0.items.length})`);
  assert.ok(p0.fullText.length > 20, 'O texto extraído pelo OCR não pode ser vazio');
  assert.ok(p0.fullText.includes('456.789.012-34') || p0.fullText.includes('456') || p0.fullText.includes('Mariana'), 'O texto reconhecido deve conter dados do documento');

  // 4. Executar AiRedactionService.analyzePdf para detectar dados sigilosos
  console.log('\n[4/5] Executando AiRedactionService.analyzePdf para detecção de dados sensíveis...');
  const categories: RedactionCategoryOptions = {
    cpf: true,
    cnpj: true,
    rg: true,
    emails: true,
    phones: true,
    names: true,
    addresses: true,
    financial: true,
    health: true,
    customKeywords: ['Mariana Albuquerque Souza']
  };

  const detectedItems = await AiRedactionService.analyzePdf(
    pagesData,
    categories,
    { mode: 'pattern', rigorLevel: 'broad' }
  );

  console.log('  -> Itens sensíveis detectados:', detectedItems.length);
  for (const item of detectedItems) {
    console.log(`    * [${item.category}] "${item.text}" (confiança: ${item.confidence}) -> rect:`, item.rect);
    assert.ok(item.rect.x >= 0 && item.rect.x <= 595, 'Coordenada X deve estar dentro da página');
    assert.ok(item.rect.y >= 0 && item.rect.y <= 842, 'Coordenada Y deve estar dentro da página');
    assert.ok(item.rect.width > 0 && item.rect.height > 0, 'Dimensões do retângulo devem ser positivas');
  }

  assert.ok(detectedItems.length >= 1, 'Deve detectar ao menos 1 item sensível no documento escaneado');
  const hasCpf = detectedItems.some(i => i.category === 'CPF' || i.text.includes('456.789.012-34'));
  const hasKeyword = detectedItems.some(i => i.text.includes('Mariana'));
  assert.ok(hasCpf || hasKeyword, 'Deve identificar o CPF ou o Nome nos dados OCR');

  // 5. Aplicar anonimização com destruição física permanente
  console.log('\n[5/5] Executando LocalPdfEngine.anonymizePdf com os retângulos do OCR...');
  const rectsToApply = detectedItems.map(i => i.rect);
  const anonymizedBytes = await LocalPdfEngine.anonymizePdf(scannedPdfBytes.buffer, rectsToApply);
  assert.ok(anonymizedBytes.length > 0, 'PDF anonimizado deve ser gerado');

  const outAnonymizedPath = path.resolve('test_output/scanned_document_anonimizado.pdf');
  fs.writeFileSync(outAnonymizedPath, anonymizedBytes);
  console.log('  -> PDF anonimizado salvo com sucesso em:', outAnonymizedPath, `(${anonymizedBytes.length} bytes)`);

  // Limpeza de arquivos de teste temporários
  if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

  console.log('\n================================================================');
  console.log('✅ SUCESSO: O PIPELINE DE OCR PARA PDFs ESCANEADOS FOI VALIDADO!');
  console.log('================================================================');
}

runScannedPdfOcrPipelineTest().catch(err => {
  console.error('\n❌ [FALHA NO TESTE]:', err);
  process.exit(1);
});
