/**
 * Bateria de Testes Avançados para Casos Complexos de PDF:
 * 1. Formulários Interativos (/AcroForm e /Fields)
 * 2. Assinaturas Digitais e Certificados (/SigFlags, /Perms, /Sig)
 * 3. Anexos e Arquivos Ocultos (/Names e /EmbeddedFiles)
 * 4. Camadas / Grupos de Conteúdo Opcional (/OCProperties e /OCGs)
 * 5. Páginas com Rotações Variadas (0°, 90°, 180°, 270°)
 * 6. Páginas Grandes (Plantas de Engenharia / Formato A0 / 2384x3370 pt)
 * 7. Separação Estrita de Contratos de API (applyVisualOverlay vs anonymizePdf)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { PDFDocument, PDFName, PDFDict, PDFString, PDFArray, degrees, StandardFonts } from 'pdf-lib';
import { LocalPdfEngine, RedactionRectangle } from '../src/services/pdfEngine';

async function runAdvancedEdgeCaseTests() {
  console.log('='.repeat(75));
  console.log('Iniciando Bateria de Testes para PDFs Complexos e Casos de Borda');
  console.log('='.repeat(75));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-edge-test-'));
  const venvPython = path.resolve('.venv/Scripts/python.exe');
  const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python';

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      testsFailed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. PDF COM FORMULÁRIOS INTERATIVOS (/AcroForm)
    // -------------------------------------------------------------------------
    console.log('\n[1/7] Testando PDF com Formulários Interativos (/AcroForm)...');
    const formDoc = await PDFDocument.create();
    const formPage = formDoc.addPage([595, 842]);
    const font = await formDoc.embedFont(StandardFonts.Helvetica);
    formPage.drawText('Formulário Cadastral do Contribuinte', { x: 50, y: 780, size: 14, font });

    // Criar campos de formulário AcroForm no PDF
    const form = formDoc.getForm();
    const cpfField = form.createTextField('contribuinte.cpf');
    cpfField.setText('123.456.789-00');
    cpfField.addToPage(formPage, { x: 50, y: 720, width: 200, height: 25 });

    const emailField = form.createTextField('contribuinte.email');
    emailField.setText('procurador.sigiloso@prefeitura.sp.gov.br');
    emailField.addToPage(formPage, { x: 50, y: 680, width: 250, height: 25 });

    const formPdfBytes = await formDoc.save();
    const formPdfPath = path.join(tmpDir, 'test_form_input.pdf');
    fs.writeFileSync(formPdfPath, formPdfBytes);

    // Anonimizar com LocalPdfEngine
    const formRects: RedactionRectangle[] = [
      { pageIndex: 0, x: 50, y: 720, width: 200, height: 25, text: '123.456.789-00', category: 'CPF' },
      { pageIndex: 0, x: 50, y: 680, width: 250, height: 25, text: 'procurador.sigiloso@prefeitura.sp.gov.br', category: 'E-mail' }
    ];

    const sanitizedFormBytes = await LocalPdfEngine.anonymizePdf(formPdfBytes.buffer, formRects);
    const sanitizedFormDoc = await PDFDocument.load(sanitizedFormBytes);

    // Validações
    assert(
      !sanitizedFormDoc.catalog.has(PDFName.of('AcroForm')),
      'Dicionário /AcroForm deve ser completamente eliminado do catálogo'
    );

    // Validação profunda com PyMuPDF
    const formAuditScript = `
import pymupdf, sys
doc = pymupdf.open(sys.argv[1])
fields = doc.get_sigflags()
widgets = list(doc[0].widgets())
text = doc[0].get_text()
has_sensitive = '123.456.789-00' in text or 'procurador.sigiloso' in text
print(f"{len(widgets)}|{has_sensitive}")
`;
    const formAuditPath = path.join(tmpDir, 'audit_form.py');
    fs.writeFileSync(formAuditPath, formAuditScript);

    const formSanitizedPath = path.join(tmpDir, 'test_form_sanitized.pdf');
    fs.writeFileSync(formSanitizedPath, sanitizedFormBytes);

    const formAuditRes = spawnSync(pythonExe, [formAuditPath, formSanitizedPath], { encoding: 'utf8' });
    const [widgetCountStr, formSensitiveStr] = (formAuditRes.stdout || '0|True').trim().split('|');

    assert(
      parseInt(widgetCountStr, 10) === 0,
      'Nenhum campo interativo de formulário (widget) deve permanecer no PDF sanitizado'
    );
    assert(
      formSensitiveStr === 'False',
      'Valores dos campos de formulário devem ser destruídos sem vazamento de texto'
    );

    // -------------------------------------------------------------------------
    // 2. PDF COM ASSINATURAS DIGITAIS E CERTIFICADOS (/SigFlags, /Perms)
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Testando PDF com Assinaturas Digitais e Permissões (/SigFlags)...');
    const sigDoc = await PDFDocument.create();
    const sigPage = sigDoc.addPage([595, 842]);
    sigPage.drawText('Petição com Assinatura Digital do Advogado', { x: 50, y: 780, size: 14, font });
    sigPage.drawText('Certificado ICP-Brasil: Fulano de Tal - CPF 000.111.222-33', { x: 50, y: 700, size: 10, font });

    // Injetar dicionários simulados de assinatura no catálogo
    sigDoc.catalog.set(PDFName.of('SigFlags'), sigDoc.context.obj(3));
    sigDoc.catalog.set(PDFName.of('Perms'), sigDoc.context.obj({}));

    const sigPdfBytes = await sigDoc.save();
    const sigRects: RedactionRectangle[] = [
      { pageIndex: 0, x: 50, y: 695, width: 350, height: 20, text: 'CPF 000.111.222-33', category: 'CPF' }
    ];

    const sanitizedSigBytes = await LocalPdfEngine.anonymizePdf(sigPdfBytes.buffer, sigRects);
    const sanitizedSigDoc = await PDFDocument.load(sanitizedSigBytes);

    assert(
      !sanitizedSigDoc.catalog.has(PDFName.of('SigFlags')) && !sanitizedSigDoc.catalog.has(PDFName.of('Perms')),
      'Flags de assinatura (/SigFlags) e permissões (/Perms) devem ser removidas do catálogo'
    );

    // -------------------------------------------------------------------------
    // 3. PDF COM ANEXOS EMBUTIDOS (/Names e /EmbeddedFiles)
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Testando PDF com Anexos Ocultos (/Names e /EmbeddedFiles)...');
    const attachDoc = await PDFDocument.create();
    const attachPage = attachDoc.addPage([595, 842]);
    attachPage.drawText('Processo Administrativo com Arquivo Anexo Oculto', { x: 50, y: 780, size: 14, font });

    // Criar árvore de nomes com arquivo embutido
    const efDict = attachDoc.context.obj({
      F: attachDoc.context.flateStream('DADOS CONFIDENCIAIS DA EMPRESA')
    });
    const fileSpec = attachDoc.context.obj({
      Type: PDFName.of('Filespec'),
      F: PDFString.of('dados_secretos.txt'),
      EF: efDict
    });
    const namesDict = attachDoc.context.obj({
      EmbeddedFiles: attachDoc.context.obj({
        Names: PDFArray.withContext(attachDoc.context)
      })
    });
    attachDoc.catalog.set(PDFName.of('Names'), namesDict);

    const attachPdfBytes = await attachDoc.save();
    const sanitizedAttachBytes = await LocalPdfEngine.anonymizePdf(attachPdfBytes.buffer, []);
    const sanitizedAttachDoc = await PDFDocument.load(sanitizedAttachBytes);

    assert(
      !sanitizedAttachDoc.catalog.has(PDFName.of('Names')) && !sanitizedAttachDoc.catalog.has(PDFName.of('EmbeddedFiles')),
      'Dicionários de anexos (/Names e /EmbeddedFiles) devem ser completamente expurgados'
    );

    // -------------------------------------------------------------------------
    // 4. PDF COM CAMADAS OCULTAS (Optional Content Groups / OCProperties)
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Testando PDF com Camadas Ocultas (OCG / OCProperties)...');
    const layerDoc = await PDFDocument.create();
    const layerPage = layerDoc.addPage([595, 842]);
    layerPage.drawText('Planta com Camadas Ocultas de Engenharia', { x: 50, y: 780, size: 14, font });

    const ocg = layerDoc.context.obj({
      Type: PDFName.of('OCG'),
      Name: PDFString.of('Camada Oculta Sigilosa')
    });
    const ocProperties = layerDoc.context.obj({
      OCGs: attachDoc.context.obj([ocg])
    });
    layerDoc.catalog.set(PDFName.of('OCProperties'), ocProperties);

    const layerPdfBytes = await layerDoc.save();
    const sanitizedLayerBytes = await LocalPdfEngine.anonymizePdf(layerPdfBytes.buffer, []);
    const sanitizedLayerDoc = await PDFDocument.load(sanitizedLayerBytes);

    assert(
      !sanitizedLayerDoc.catalog.has(PDFName.of('OCProperties')),
      'Dicionário de camadas ocultas (/OCProperties) deve ser completamente expurgado'
    );

    // -------------------------------------------------------------------------
    // 5. PDF COM ROTAÇÕES MÚLTIPLAS (0°, 90°, 180°, 270°)
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Testando PDF com Rotações Variadas (0°, 90°, 180°, 270°)...');
    const rotDoc = await PDFDocument.create();
    
    // Página 1: Retrato normal (0°)
    const p0 = rotDoc.addPage([595, 842]);
    p0.drawText('Página 0 Graus (Retrato)', { x: 50, y: 780, size: 14, font });
    p0.setRotation(degrees(0));

    // Página 2: Paisagem rotacionada (90°)
    const p90 = rotDoc.addPage([595, 842]);
    p90.drawText('Página 90 Graus (Paisagem)', { x: 50, y: 780, size: 14, font });
    p90.setRotation(degrees(90));

    // Página 3: Invertida (180°)
    const p180 = rotDoc.addPage([595, 842]);
    p180.drawText('Página 180 Graus', { x: 50, y: 780, size: 14, font });
    p180.setRotation(degrees(180));

    // Página 4: Paisagem invertida (270°)
    const p270 = rotDoc.addPage([595, 842]);
    p270.drawText('Página 270 Graus', { x: 50, y: 780, size: 14, font });
    p270.setRotation(degrees(270));

    const rotPdfBytes = await rotDoc.save();
    const sanitizedRotBytes = await LocalPdfEngine.anonymizePdf(rotPdfBytes.buffer, [
      { pageIndex: 0, x: 50, y: 770, width: 200, height: 25, text: 'Página 0 Graus' },
      { pageIndex: 1, x: 50, y: 770, width: 200, height: 25, text: 'Página 90 Graus' }
    ]);
    const sanitizedRotDoc = await PDFDocument.load(sanitizedRotBytes);

    assert(
      sanitizedRotDoc.getPageCount() === 4,
      'Todas as 4 páginas com rotações distintas devem ser processadas e preservadas'
    );

    // Verificar dimensões orientadas da página 90 graus
    const origP90Size = p90.getSize();
    const sanitP90 = sanitizedRotDoc.getPage(1);
    const sanitP90Size = sanitP90.getSize();

    // Na visualização a 90 graus, largura e altura orientadas equivalem a 842 x 595
    assert(
      sanitP90Size.width > 0 && sanitP90Size.height > 0,
      'Página a 90 graus deve ter dimensões positivas e consistentes após achatamento'
    );

    // -------------------------------------------------------------------------
    // 6. PDF COM PÁGINAS GRANDES (Formato A0 / Plantas de Engenharia)
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Testando PDF com Página Grande (Formato A0: 2384x3370 pt)...');
    const bigDoc = await PDFDocument.create();
    const a0Page = bigDoc.addPage([2384, 3370]); // Dimensões A0 em pontos
    a0Page.drawText('PLANTA DE ENGENHARIA DA PREFEITURA - FORMATO A0', { x: 100, y: 3200, size: 36, font });
    a0Page.drawText('CPF do Engenheiro Responsável: 987.654.321-00', { x: 100, y: 3100, size: 28, font });

    const bigPdfBytes = await bigDoc.save();
    const bigRects: RedactionRectangle[] = [
      { pageIndex: 0, x: 95, y: 3080, width: 600, height: 45, text: 'CPF do Engenheiro' }
    ];

    const startTime = Date.now();
    const sanitizedBigBytes = await LocalPdfEngine.anonymizePdf(bigPdfBytes.buffer, bigRects);
    const durationMs = Date.now() - startTime;

    const sanitizedBigDoc = await PDFDocument.load(sanitizedBigBytes);
    const sanitizedA0Page = sanitizedBigDoc.getPage(0);
    const a0Size = sanitizedA0Page.getSize();

    assert(
      Math.abs(a0Size.width - 2384) < 2 && Math.abs(a0Size.height - 3370) < 2,
      'Página A0 deve manter exatamente as dimensões físicas em pontos (2384x3370 pt)'
    );

    // O arquivo sanitizado deve ser leve e comprimido (< 2.5 MB para A0)
    const bigFileSizeBytes = sanitizedBigBytes.length;
    assert(
      bigFileSizeBytes < 2.5 * 1024 * 1024,
      `Tamanho do PDF A0 achatado deve ser otimizado (${(bigFileSizeBytes / 1024).toFixed(1)} KB < 2.5 MB)`
    );

    console.log(`  -> Página A0 sanitizada com sucesso em ${durationMs}ms sem estouro de memória.`);

    // -------------------------------------------------------------------------
    // 7. SEPARAÇÃO ESTRITA DE CONTRATOS DE API
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Testando Separação Estrita de Contratos de API...');

    // a) applyVisualOverlay mantém texto e objetos vetoriais para fins de revisão
    const visualBytes = await LocalPdfEngine.applyVisualOverlay(formPdfBytes.buffer, formRects);
    const visualDoc = await PDFDocument.load(visualBytes);
    assert(
      visualDoc.catalog.has(PDFName.of('AcroForm')),
      'applyVisualOverlay deve manter a estrutura vetorial original e formulários para revisão'
    );

    // b) anonymizePdf proíbe expressamente desativar a destruição de dados
    let rejectedInsecure = false;
    try {
      await LocalPdfEngine.anonymizePdf(formPdfBytes.buffer, formRects, { sanitizeFlatten: false } as any);
    } catch (err: any) {
      rejectedInsecure = true;
      assert(
        err.message.includes('Violação de Segurança') && err.message.includes('sanitizeFlatten: false é estritamente proibido'),
        'anonymizePdf deve bloquear tentativa de desativar a destruição do conteúdo'
      );
    }
    assert(rejectedInsecure, 'anonymizePdf não pode permitir a opção insegura sanitizeFlatten: false');

    // c) redactPdf como alias proíbe a mesma opção insegura
    let aliasRejectedInsecure = false;
    try {
      await LocalPdfEngine.redactPdf(formPdfBytes.buffer, formRects, { sanitizeFlatten: false } as any);
    } catch (err: any) {
      aliasRejectedInsecure = true;
    }
    assert(aliasRejectedInsecure, 'redactPdf deve rejeitar sanitizeFlatten: false assim como anonymizePdf');

  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n' + '='.repeat(75));
  console.log(`Resultado da Bateria de Casos Complexos de PDF:`);
  console.log(`  Sucessos: ${testsPassed}`);
  console.log(`  Falhas:   ${testsFailed}`);
  console.log('='.repeat(75));

  if (testsFailed > 0) {
    throw new Error(`A bateria de casos complexos falhou com ${testsFailed} erro(s).`);
  }
}

runAdvancedEdgeCaseTests().catch(err => {
  console.error('\n[FATAL] Erro na bateria de casos complexos:', err);
  process.exitCode = 1;
});
