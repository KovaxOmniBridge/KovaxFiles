import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  CourtFilingPreparationService,
  CourtFilingPiece,
  CourtFilingOptions,
  COURT_TARGET_PRESETS
} from '../src/services/courtFilingPreparationService';

/**
 * =============================================================================
 * SUÍTE DE TESTES: PREPARAÇÃO INTEGRADA DE PROCESSOS PARA PROTOCOLO
 * =============================================================================
 * Valida de ponta a ponta:
 * 1. Inspeção de documentos e identificação de tipo de peça + SHA-256.
 * 2. Reorganização, rotação de páginas e exclusão de páginas em branco.
 * 3. Planejamento inteligente e divisão em volumes com base no limite do tribunal.
 * 4. Paginação sequencial ininterrupta e contínua nos autos (Fl. 001, 002...).
 * 5. Produção de Capa/Sumário com intervalo de folhas e índice de peças.
 * 6. Emissão de Manifesto Oficial de Integridade (JSON e TXT) e Pacote ZIP.
 * =============================================================================
 */

async function createSamplePdf(pageCount: number, labelPrefix: string): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${labelPrefix} - Pagina ${i} de ${pageCount}`, {
      x: 50,
      y: 750,
      size: 14
    });
  }
  const bytes = await doc.save();
  return bytes.buffer;
}

async function runCourtFilingTests() {
  console.log('='.repeat(75));
  console.log('🏛️ SUÍTE DE TESTES: PREPARAÇÃO INTEGRADA DE PROCESSOS PARA PROTOCOLO');
  console.log('='.repeat(75) + '\n');

  const testDir = path.resolve('test_output');
  fs.mkdirSync(testDir, { recursive: true });

  // --------------------------------------------------------------------------
  // ETAPA 1: Criar e inspecionar peças processuais simuladas
  // --------------------------------------------------------------------------
  console.log('[1/6] Inspecionando peças e calculando hashes SHA-256...');

  const bufInicial = await createSamplePdf(4, 'PETICAO INICIAL DE COBRANCA');
  const bufProc = await createSamplePdf(2, 'PROCURACAO AD JUDICIA ET EXTRA');
  const bufDocPessoal = await createSamplePdf(1, 'DOCUMENTO PESSOAL CNH');
  const bufProvas1 = await createSamplePdf(6, 'PROVA DOCUMENTAL - CONTRATO');
  const bufProvas2 = await createSamplePdf(5, 'PROVA DOCUMENTAL - COMPROVANTES');

  const piece1 = await CourtFilingPreparationService.inspectPiece('01_Peticao_Inicial.pdf', bufInicial);
  const piece2 = await CourtFilingPreparationService.inspectPiece('02_Procuracao_Assinada.pdf', bufProc);
  const piece3 = await CourtFilingPreparationService.inspectPiece('03_Documento_Pessoal_CNH.pdf', bufDocPessoal);
  const piece4 = await CourtFilingPreparationService.inspectPiece('04_Contrato_Social_Provas.pdf', bufProvas1);
  const piece5 = await CourtFilingPreparationService.inspectPiece('05_Comprovantes_Pagamento.pdf', bufProvas2);

  assert.strictEqual(piece1.pieceType, 'peticao_inicial', 'Deve detectar petição inicial');
  assert.strictEqual(piece2.pieceType, 'procuracao', 'Deve detectar procuração');
  assert.strictEqual(piece3.pieceType, 'documento_identificacao', 'Deve detectar documento de identificação');
  assert.strictEqual(piece4.pieceType, 'prova_documental', 'Deve detectar prova documental');
  assert.strictEqual(piece1.originalPageCount, 4, 'Peça 1 deve ter 4 páginas');
  assert.ok(piece1.sha256Hex.length === 64, 'Deve conter hash SHA-256 de 64 caracteres');

  console.log('  -> 5 Peças processuais inspecionadas com sucesso!');

  // --------------------------------------------------------------------------
  // ETAPA 2: Testar modificações de página (rotação e exclusão de página)
  // --------------------------------------------------------------------------
  console.log('\n[2/6] Testando reorganização, rotação e exclusão de páginas em branco...');

  // Na peça 4 (6 páginas), vamos simular que a página 3 está em branco (deletar) e página 2 foi escaneada deitada (girar 90)
  piece4.modifications = [
    { pageIndex: 2, deleted: true }, // 3ª página (índice 2) excluída
    { pageIndex: 1, rotate: 90 }     // 2ª página (índice 1) rotacionada
  ];

  const effPages = CourtFilingPreparationService.getEffectivePages(piece4);
  assert.strictEqual(effPages.length, 5, 'Peça 4 deve ter 5 páginas efetivas após exclusão');
  assert.ok(!effPages.includes(2), 'Página índice 2 deve ter sido excluída');
  piece4.effectivePageCount = effPages.length;

  console.log('  -> Modificações de páginas validadas (efetivas: 5 de 6 páginas)');

  // --------------------------------------------------------------------------
  // ETAPA 3: Testar algoritmo de planejamento de volumes
  // --------------------------------------------------------------------------
  console.log('\n[3/6] Testando divisão automática de volumes por cota de MB...');

  const allPieces = [piece1, piece2, piece3, piece4, piece5];
  const totalPagesSum = 4 + 2 + 1 + 5 + 5; // 17 páginas

  // Simulando um limite restrito para forçar divisão em pelo menos 2 volumes
  const simulatedLimitBytes = Math.round(piece1.sizeBytes + piece2.sizeBytes + 500);
  const plannedVolumes = CourtFilingPreparationService.planVolumes(allPieces, simulatedLimitBytes, 1);

  assert.ok(plannedVolumes.length >= 2, `Deve dividir em ao menos 2 volumes (gerados: ${plannedVolumes.length})`);
  assert.strictEqual(plannedVolumes[0].volumeIndex, 1, 'Volume 1 deve ter index 1');
  assert.strictEqual(plannedVolumes[1].volumeIndex, 2, 'Volume 2 deve ter index 2');

  // Continuidade de paginação entre volumes
  assert.strictEqual(plannedVolumes[0].startFolha, 1, 'Volume 1 deve iniciar na folha 1');
  assert.strictEqual(plannedVolumes[1].startFolha, plannedVolumes[0].endFolha + 1, 'Volume 2 deve começar exatamente na folha seguinte do Volume 1');

  console.log(`  -> Planejamento dividiu com sucesso em ${plannedVolumes.length} volumes:`);
  for (const v of plannedVolumes) {
    console.log(`     • ${v.volumeTitle}: Folhas ${v.startFolha} a ${v.endFolha} (${v.totalPageCount} páginas, ${v.plannedPieces.length} peças)`);
  }

  // --------------------------------------------------------------------------
  // ETAPA 4: Executar a pipeline completa de protocolo judicial
  // --------------------------------------------------------------------------
  console.log('\n[4/6] Executando pipeline integrada de montagem, carimbo e indexação...');

  const options: CourtFilingOptions = {
    processNumber: '1002345-88.2026.8.26.0100',
    courtName: 'Tribunal de Justiça do Estado de São Paulo',
    varalForum: '3ª Vara Cível do Foro Central da Comarca da Capital',
    actionType: 'Ação de Cobrança c/c Indenizatória',
    authorName: 'Empresa Alpha Tecnologia Ltda.',
    defendantName: 'Beta Empreendimentos e Participações S/A',
    lawyerName: 'Dr. Roberto Diniz',
    lawyerOab: 'OAB/SP 432.100',
    startFolhaNumber: 1,
    folhaPrefix: 'Fl.',
    padDigits: 3,
    stampPosition: 'top-right',
    stampColor: 'blue',
    includeCoverAndIndex: true,
    includePieceIdentificationHeader: true,
    targetPreset: {
      id: 'test_preset',
      name: 'Preset Teste Simulado',
      shortLabel: 'Teste',
      maxVolumeSizeBytes: simulatedLimitBytes,
      description: 'Limite simulado para validação automatizada'
    }
  };

  let lastProgressMsg = '';
  const result = await CourtFilingPreparationService.executeFilingPipeline(
    allPieces,
    options,
    (msg, pct) => {
      lastProgressMsg = `${pct}% - ${msg}`;
    }
  );

  console.log('  -> Pipeline concluída:', lastProgressMsg);
  assert.strictEqual(result.volumes.length, plannedVolumes.length, 'Qtd de volumes gerados deve coincidir com o plano');
  assert.ok(result.zipPackageBytes.length > 5000, 'Arquivo ZIP deve ser produzido');
  assert.ok(result.manifestJson.length > 200, 'Manifesto JSON deve ser produzido');
  assert.ok(result.manifestTxt.length > 200, 'Manifesto TXT deve ser produzido');

  // Salvar arquivos na pasta test_output para auditoria visual
  for (const vol of result.volumes) {
    const volPath = path.join(testDir, vol.fileName);
    fs.writeFileSync(volPath, vol.pdfBytes);
    console.log(`  -> Volume gerado: ${vol.fileName} (${vol.sizeBytes} bytes, ${vol.pageCount} páginas, Hash: ${vol.sha256Hex.substring(0, 16)}...)`);
  }

  const zipPath = path.join(testDir, 'Pacote_Protocolo_Processo.zip');
  fs.writeFileSync(zipPath, result.zipPackageBytes);
  console.log(`  -> Pacote ZIP completo: ${zipPath} (${result.zipPackageBytes.length} bytes)`);

  // --------------------------------------------------------------------------
  // ETAPA 5: Validar a Capa, Índice e Numeração dos Volumes gerados
  // --------------------------------------------------------------------------
  console.log('\n[5/6] Verificando integridade textual e estrutural dos volumes...');

  const vol1Bytes = fs.readFileSync(path.join(testDir, result.volumes[0].fileName));
  const vol1Doc = await PDFDocument.load(vol1Bytes);

  // A primeira página deve ser a Capa de Juntada e Índice
  // Total de páginas = 1 (capa) + páginas das peças do volume 1
  const expectedVol1Pages = 1 + plannedVolumes[0].totalPageCount;
  assert.strictEqual(vol1Doc.getPageCount(), expectedVol1Pages, `Volume 1 deve conter ${expectedVol1Pages} páginas (Capa + peças)`);

  const vol2Bytes = fs.readFileSync(path.join(testDir, result.volumes[1].fileName));
  const vol2Doc = await PDFDocument.load(vol2Bytes);
  const expectedVol2Pages = 1 + plannedVolumes[1].totalPageCount;
  assert.strictEqual(vol2Doc.getPageCount(), expectedVol2Pages, `Volume 2 deve conter ${expectedVol2Pages} páginas`);

  console.log('  -> Capa e número de páginas conferidos com sucesso!');

  // --------------------------------------------------------------------------
  // ETAPA 6: Validar integridade e correspondência no Manifesto SHA-256
  // --------------------------------------------------------------------------
  console.log('\n[6/6] Verificando dados do Manifesto Oficial de Protocolo...');

  const manifest = JSON.parse(result.manifestJson);
  assert.strictEqual(manifest.dadosProcessuais.processo, options.processNumber);
  assert.strictEqual(manifest.resumo.totalVolumes, result.volumes.length);
  assert.strictEqual(manifest.pecasOriginaisJuntadas.length, 5);

  // Cada volume no manifesto deve ter o hash correspondente
  for (let i = 0; i < result.volumes.length; i++) {
    assert.strictEqual(manifest.volumesGerados[i].sha256Hex, result.volumes[i].sha256Hex, 'Hash do volume no manifesto deve bater exatamente');
  }

  console.log('  -> Manifesto JSON e TXT 100% íntegros e auditáveis!');

  console.log('\n' + '='.repeat(75));
  console.log('✅ SUCESSO: FLUXO INTEGRADO DE PREPARAÇÃO DE AUTOS E PROTOCOLO HOMOLOGADO!');
  console.log('='.repeat(75) + '\n');
}

runCourtFilingTests().catch(err => {
  console.error('\n❌ FALHA NO TESTE DO FLUXO DE PROTOCOLO:', err);
  process.exit(1);
});
