/**
 * TESTE AUTOMATIZADO: PROTOCOLO E MONTAGEM DE PROCESSOS
 * Valida:
 * 1. Correção do bug em planVolumes: Peça gigante como 1ª do lote DEVE ser fatiada por páginas
 * 2. Medição de tamanhos efetivos dos volumes gerados vs estimativas
 * 3. Autocorreção e Reprovação por excesso de tamanho
 * 4. Detecção de assinaturas digitais pré-existentes
 * 5. Unificação dos presets com escopo, versão e referência normativa
 * 6. Distinção explícita entre pacote preparado e protocolo realizado
 */

import { 
  CourtFilingPreparationService, 
  CourtFilingPiece, 
  CourtFilingOptions,
  COURT_TARGET_PRESETS 
} from '../src/services/courtFilingPreparationService';
import { 
  UNIFIED_COURT_PRESETS, 
  getUnifiedCourtPreset, 
  getDefaultCourtPreset 
} from '../src/data/courtPresetsData';
import { TARGET_PRESETS } from '../src/services/compressionEngine';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function createTestPdf(pageCount: number, title: string, fillWithBytes: number = 0): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${title} - Página ${i + 1} de ${pageCount}`, {
      x: 50,
      y: 750,
      size: 12,
      font,
      color: rgb(0.1, 0.1, 0.1)
    });

    if (fillWithBytes > 0) {
      // Adicionar payload para simular tamanho arbitrário
      const fillerText = 'X'.repeat(Math.min(1000, fillWithBytes));
      page.drawText(fillerText, { x: 50, y: 500, size: 6, font });
    }
  }

  const bytes = await doc.save();
  return bytes.buffer as ArrayBuffer;
}

async function runTests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES: PROTOCOLO E MONTAGEM DE PROCESSOS');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      throw new Error(`Falha no teste: ${msg}`);
    }
  }

  // -------------------------------------------------------------
  // TESTE 1: Falha na lógica de divisão de volumes (Peça gigante como 1ª do lote)
  // -------------------------------------------------------------
  console.log('1. Testando condição de planVolumes() com peça gigante como 1ª da lista...');
  {
    const limitBytes = 3 * 1024 * 1024; // 3 MB (ex: PJe rígido)
    // Simular peça com 20 páginas e 10 MB (tamanho bem superior ao limite de 3 MB)
    const giantPiece: CourtFilingPiece = {
      id: 'giant-1',
      fileName: 'laudo_pericial_gigante.pdf',
      title: 'Laudo Pericial de Engenharia',
      pieceType: 'laudo_pericial',
      rawBuffer: new ArrayBuffer(10 * 1024 * 1024),
      sizeBytes: 10 * 1024 * 1024, // 10 MB
      originalPageCount: 20,
      effectivePageCount: 20,
      sha256Hex: 'abcd1234abcd1234abcd1234abcd1234',
      modifications: []
    };

    const normalPiece: CourtFilingPiece = {
      id: 'normal-2',
      fileName: 'procuracao.pdf',
      title: 'Procuração',
      pieceType: 'procuracao',
      rawBuffer: new ArrayBuffer(500 * 1024),
      sizeBytes: 500 * 1024, // 500 KB
      originalPageCount: 1,
      effectivePageCount: 1,
      sha256Hex: '11223344112233441122334411223344',
      modifications: []
    };

    // Caso crítico do usuário: A peça gigante é a PRIMEIRA do lote ([giantPiece, normalPiece])
    const plans = CourtFilingPreparationService.planVolumes([giantPiece, normalPiece], limitBytes, 1);

    assert(plans.length > 1, `Peça gigante de 10 MB deve ser dividida em múltiplos volumes (gerou ${plans.length})`);
    
    // O volume 1 NÃO pode conter a peça inteira de 10 MB! Deve conter uma fatia (Parte 1 de X)
    const vol1Pieces = plans[0].plannedPieces;
    assert(vol1Pieces.length === 1, 'Volume 1 deve conter apenas a 1ª fatia da peça gigante');
    assert(vol1Pieces[0].isSplitSlice === true, 'A peça gigante no Volume 1 deve ser marcada como isSplitSlice = true');
    assert(vol1Pieces[0].slicePartNumber === 1, 'Deve ser identificada como Parte 1');
    assert(vol1Pieces[0].pageCount < 20, `Fatia deve ter menos páginas que o total de 20 (teve ${vol1Pieces[0].pageCount})`);
    assert(plans[0].estimatedSizeBytes <= limitBytes, `Volume 1 estimado (${plans[0].estimatedSizeBytes}) deve respeitar o limite (${limitBytes})`);

    // Todos os volumes da peça gigante devem estar fatiados
    const giantSlices = plans.filter(v => v.plannedPieces.some(p => p.pieceId === 'giant-1'));
    assert(giantSlices.length >= 4, `Peça de 10 MB em limite de ~2.85 MB efetivo deve gerar ao menos 4 fatias (gerou ${giantSlices.length})`);

    // A paginação (folhas) deve ser contínua e ininterrupta
    for (let i = 0; i < plans.length - 1; i++) {
      assert(plans[i + 1].startFolha === plans[i].endFolha + 1, `Paginação sequencial mantida entre Vol ${plans[i].volumeIndex} e Vol ${plans[i + 1].volumeIndex}`);
    }
  }

  // -------------------------------------------------------------
  // TESTE 2: Unificação dos limites e metadados regulatórios
  // -------------------------------------------------------------
  console.log('\n2. Testando unificação dos catálogos de presets e metadados...');
  {
    assert(UNIFIED_COURT_PRESETS.length >= 10, `Catálogo unificado contém ${UNIFIED_COURT_PRESETS.length} presets`);
    assert(COURT_TARGET_PRESETS === UNIFIED_COURT_PRESETS, 'COURT_TARGET_PRESETS no assistente referencia UNIFIED_COURT_PRESETS');
    assert(TARGET_PRESETS === UNIFIED_COURT_PRESETS, 'TARGET_PRESETS no compressor referencia UNIFIED_COURT_PRESETS');

    const pje3 = getUnifiedCourtPreset('pje_strict_3mb');
    assert(!!pje3, 'Preset pje_strict_3mb existe');
    assert(pje3?.maxSizeMB === 3, 'PJe 3MB tem 3 MB de limite');
    assert(pje3?.courtScope.includes('PJe') === true, 'PJe 3MB possui escopo definido');
    assert(pje3?.normativeReference.includes('185/2013') === true, 'PJe 3MB cita Resolução CNJ 185/2013');
    assert(pje3?.isUniversalRule === false, 'isUniversalRule é explicitamente false (não é regra universal)');

    const tjsp = getUnifiedCourtPreset('tjsp_esaj_10mb');
    assert(!!tjsp, 'Preset TJSP 10MB existe');
    assert(tjsp?.normativeReference.includes('2.651/2022') === true, 'TJSP cita Provimento CSM 2.651/2022');

    // Compatibilidade com IDs legados
    const legacyPje = getUnifiedCourtPreset('pje');
    assert(legacyPje?.id === 'pje_strict_3mb', 'Busca por ID legado "pje" mapeia para "pje_strict_3mb"');

    const defaultPreset = getDefaultCourtPreset();
    assert(defaultPreset.id === 'pje_10mb', 'Default preset é PJe 10MB');
  }

  // -------------------------------------------------------------
  // TESTE 3: Detecção de Assinaturas Digitais em Peças
  // -------------------------------------------------------------
  console.log('\n3. Testando inspeção e detecção de assinaturas digitais...');
  {
    const rawPdf = await createTestPdf(3, 'Peticao Inicial');
    const piece = await CourtFilingPreparationService.inspectPiece('peticao_inicial.pdf', rawPdf);

    assert(piece.pieceType === 'peticao_inicial', 'Tipo de peça detectado por heurística');
    assert(piece.originalPageCount === 3, 'Contagem de 3 páginas');
    assert(piece.signatureInfo !== undefined, 'signatureInfo está presente no CourtFilingPiece');
    assert(piece.signatureInfo?.hasSignatures === false, 'PDF recém-criado sem assinatura detecta hasSignatures = false');

    // Simular detecção de assinatura estrutural em PDF válido
    const validPdf = await createTestPdf(1, 'Documento com Assinatura');
    const validBytes = new Uint8Array(validPdf);
    const sigSnippet = new TextEncoder().encode('\n% /ByteRange [0 100 200 100] /Type /Sig /SubFilter /adbe.pkcs7.detached /Name (Dr. Assinante Teste)\n');
    const mergedSigned = new Uint8Array(validBytes.length + sigSnippet.length);
    mergedSigned.set(validBytes, 0);
    mergedSigned.set(sigSnippet, validBytes.length);

    const pieceWithSig = await CourtFilingPreparationService.inspectPiece('procuracao_assinada.pdf', mergedSigned.buffer as ArrayBuffer);
    assert(pieceWithSig.signatureInfo?.hasSignatures === true, 'Identifica contêiner de assinatura digital pré-existente');
    assert(pieceWithSig.signatureInfo?.signatureCount === 1, 'Contagem de 1 assinatura detectada');
  }

  // -------------------------------------------------------------
  // TESTE 4: Execução da esteira, medição efetiva e distinção de status
  // -------------------------------------------------------------
  console.log('\n4. Testando esteira executeFilingPipeline(), medição efetiva e manifesto...');
  {
    const buf1 = await createTestPdf(2, 'Peticao Inicial');
    const buf2 = await createTestPdf(1, 'Procuracao');

    const piece1 = await CourtFilingPreparationService.inspectPiece('01_peticao.pdf', buf1, 'peticao_inicial');
    const piece2 = await CourtFilingPreparationService.inspectPiece('02_procuracao.pdf', buf2, 'procuracao');

    const pjePreset = getUnifiedCourtPreset('pje_10mb')!;
    const options: CourtFilingOptions = {
      processNumber: '1002345-67.2026.8.26.0100',
      courtName: 'Tribunal de Justiça do Estado de São Paulo',
      varalForum: '2ª Vara Cível Central',
      actionType: 'Procedimento Comum Cível',
      authorName: 'Empresa Alpha Ltda',
      defendantName: 'Empresa Beta S.A.',
      lawyerName: 'Dr. Roberto Mendes',
      lawyerOab: 'OAB/SP 123.456',
      startFolhaNumber: 1,
      folhaPrefix: 'Fl.',
      padDigits: 3,
      stampPosition: 'top-right',
      stampColor: 'blue',
      includeCoverAndIndex: true,
      includePieceIdentificationHeader: true,
      targetPreset: pjePreset
    };

    const result = await CourtFilingPreparationService.executeFilingPipeline([piece1, piece2], options);

    assert(result.volumes.length === 1, 'Compilou 1 volume');
    assert(result.volumes[0].sizeBytes > 0, `Mede tamanho efetivo real do volume (${result.volumes[0].sizeBytes} bytes)`);
    assert(result.volumes[0].sizeBytes <= pjePreset.maxVolumeSizeBytes, 'Volume gerado respeita o limite do preset');
    assert(result.volumes[0].exceedsEffectiveLimit === false, 'exceedsEffectiveLimit é false');

    // Distinção de status: NUNCA usar "Protocolado", usar "PREPARADO_PARA_PROTOCOLO"
    assert(result.summary.status === 'PREPARADO_PARA_PROTOCOLO', `Status oficial é PREPARADO_PARA_PROTOCOLO (recebeu: ${result.summary.status})`);
    assert(result.summary.reproved === false, 'reproved é false quando dentro do limite');
    assert(result.summary.allWithinLimit === true, 'allWithinLimit é true');

    // Cláusula de delimitação técnica no manifesto
    assert(result.manifestTxt.includes('PREPARADO_PARA_PROTOCOLO'), 'Manifesto TXT contém status PREPARADO_PARA_PROTOCOLO');
    assert(result.manifestTxt.includes('NÃO CONSTITUI PROTOCOLO JUDICIAL'), 'Manifesto TXT contém cláusula de delimitação técnica');
    assert(result.manifestTxt.includes('Resolução CSJT'), 'Manifesto TXT referencia a norma reguladora do preset');
    assert(result.manifestTxt.includes('Regra Universal:    NÃO'), 'Manifesto declara que regras são contextuais');

    const parsedJson = JSON.parse(result.manifestJson);
    assert(parsedJson.status === 'PREPARADO_PARA_PROTOCOLO', 'Manifesto JSON contém status PREPARADO_PARA_PROTOCOLO');
    assert(parsedJson.delimitacaoTecnica !== undefined, 'Manifesto JSON inclui campo delimitacaoTecnica');
    assert(parsedJson.dadosProcessuais.presetTribunal.escopo !== undefined, 'Manifesto JSON inclui escopo do preset');
  }

  // -------------------------------------------------------------
  // TESTE 5: Reprovação automática quando volume excede limite
  // -------------------------------------------------------------
  console.log('\n5. Testando reprovação técnica por excesso de tamanho...');
  {
    const buf = await createTestPdf(5, 'Documento Pesado');
    const piece = await CourtFilingPreparationService.inspectPiece('documento.pdf', buf);

    // Definir um preset artificialmente minúsculo (ex: 2 KB) para forçar excesso de tamanho efetivo
    const tinyPreset = {
      ...getUnifiedCourtPreset('pje_strict_3mb')!,
      id: 'tiny_test',
      name: 'Preset Teste Minúsculo (2 KB)',
      maxSizeMB: 0.002,
      maxVolumeSizeBytes: 2048 // 2 KB
    };

    const options: CourtFilingOptions = {
      processNumber: '9999999-00.2026.8.26.0100',
      courtName: 'Foro Teste',
      varalForum: 'Vara Teste',
      actionType: 'Ação Teste',
      authorName: 'Autor',
      defendantName: 'Réu',
      lawyerName: 'Advogado',
      lawyerOab: 'OAB 000',
      startFolhaNumber: 1,
      folhaPrefix: 'Fl.',
      padDigits: 3,
      stampPosition: 'top-right',
      stampColor: 'black',
      includeCoverAndIndex: false,
      includePieceIdentificationHeader: false,
      targetPreset: tinyPreset
    };

    const result = await CourtFilingPreparationService.executeFilingPipeline([piece], options);

    assert(result.summary.reproved === true, 'Pacote com volume excedente é marcado com reproved = true');
    assert(result.summary.status === 'REPROVADO_POR_EXCESSO_DE_TAMANHO', 'Status deve ser REPROVADO_POR_EXCESSO_DE_TAMANHO');
    assert(result.summary.allWithinLimit === false, 'allWithinLimit é false');
    assert(result.summary.reprovedReason !== undefined, 'reprovedReason detalha o motivo da reprovação');
    assert(result.volumes[0].exceedsEffectiveLimit === true, 'Volume individual tem exceedsEffectiveLimit = true');
    assert(result.manifestTxt.includes('PACOTE REPROVADO POR EXCESSO DE TAMANHO'), 'Manifesto TXT expressa alerta de reprovação');
  }

  console.log('\n================================================================');
  console.log(`TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO! (${passed}/${total})`);
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('\n❌ Erro durante os testes:', err);
  process.exit(1);
});
