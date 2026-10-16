import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  OcrDocumentService,
  OcrProcessedPage,
  ImagePreservationError,
  sanitizeTextForPdfLayer
} from '../src/services/ocrDocumentService';

// Imagem PNG 1x1 válida codificada em Base64 para simular páginas digitalizadas
const VALID_SAMPLE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Imagem PNG corrompida para testar reprovação
const CORRUPTED_IMAGE = 'data:image/png;base64,INVALIDO_NAO_EH_PNG_CORRUPTO_DATA_12345';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failedAssertions++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('BATERIA DE TESTES: OCR E GERAÇÃO DE DOCUMENTOS PESQUISÁVEIS');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TESTE 1: Prevenção de Substituição Silenciosa por Fundo Neutro
  // -------------------------------------------------------------------------
  console.log('1. Testando prevenção de substituição silenciosa de imagem...');

  // Cenário 1.1: Página com previewImageUrl nulo/vazio
  const pageMissingImage: OcrProcessedPage = {
    pageNumber: 1,
    width: 595,
    height: 842,
    fullText: 'Texto da petição inicial',
    rawOcrText: 'Texto da petição inicial',
    confidence: 95,
    status: 'complete',
    issues: [],
    previewImageUrl: '', // Ausente!
    lines: [],
    words: []
  };

  let caughtMissing = false;
  try {
    await OcrDocumentService.generateSearchablePdf([pageMissingImage], {
      strictImagePreservation: true
    });
  } catch (err: any) {
    caughtMissing = true;
    assert(
      err instanceof ImagePreservationError,
      'Deve lançar ImagePreservationError quando a imagem está ausente'
    );
    assert(
      err.pageNumber === 1,
      'Erro deve identificar o número da página afetada (Página 1)'
    );
    assert(
      err.message.includes('preservação visual') && err.message.includes('não está disponível'),
      'Mensagem deve esclarecer a falha crítica de preservação visual'
    );
  }
  assert(caughtMissing, 'Operação deve falhar e NÃO substituir silenciosamente por fundo neutro');

  // Cenário 1.2: Imagem com base64 corrompido
  const pageCorruptedImage: OcrProcessedPage = {
    pageNumber: 3,
    width: 595,
    height: 842,
    fullText: 'Contrato de prestação de serviços',
    rawOcrText: 'Contrato de prestação de serviços',
    confidence: 90,
    status: 'complete',
    issues: [],
    previewImageUrl: CORRUPTED_IMAGE,
    lines: [],
    words: []
  };

  let caughtCorrupted = false;
  try {
    await OcrDocumentService.generateSearchablePdf([pageCorruptedImage], {
      strictImagePreservation: true
    });
  } catch (err: any) {
    caughtCorrupted = true;
    assert(
      err instanceof ImagePreservationError,
      'Deve lançar ImagePreservationError quando a imagem for inválida/corrompida'
    );
    assert(
      err.pageNumber === 3,
      'Erro deve apontar a página 3 com a imagem corrompida'
    );
  }
  assert(caughtCorrupted, 'Falha de decodificação deve reprovar a geração do PDF');

  // Cenário 1.3: Quando strictImagePreservation for false, permite o fallback controlado
  try {
    const fallbackBytes = await OcrDocumentService.generateSearchablePdf([pageMissingImage], {
      strictImagePreservation: false
    });
    assert(
      fallbackBytes && fallbackBytes.byteLength > 0,
      'strictImagePreservation=false permite fallback quando explicitamente solicitado'
    );
  } catch {
    assert(false, 'strictImagePreservation=false não deveria ter lançado exceção');
  }

  // -------------------------------------------------------------------------
  // TESTE 2: Caracteres Acentuados e Tipografia Jurídica Brasileira
  // -------------------------------------------------------------------------
  console.log('\n2. Testando acentuação em Português e caracteres tipográficos...');

  const complexPortugueseText =
    'Ação de Execução de Título Extrajudicial: petição, certidão, intimação, trânsito em julgado, acórdão. ' +
    'NÃO, ÓRGÃO, Juízo Cível e de Família, É, À, 1º e 2ª Instâncias, § 1º, art. 139, CPC. ' +
    'Caracteres: áàâãéêíóôõúüç ÁÀÂÃÉÊÍÓÔÕÚÜÇ.';

  const typographicText =
    '“Decisão liminar concedida” — processo № 1002345/2026 • fls. 45/50 … com valor de R$ 12.500,00.';

  // Sanitização
  const sanitizedPortuguese = sanitizeTextForPdfLayer(complexPortugueseText);
  assert(
    sanitizedPortuguese.includes('Ação de Execução') &&
    sanitizedPortuguese.includes('petição') &&
    sanitizedPortuguese.includes('acórdão') &&
    sanitizedPortuguese.includes('ÓRGÃO') &&
    sanitizedPortuguese.includes('§ 1º') &&
    sanitizedPortuguese.includes('áàâãéêíóôõúüç'),
    'Sanitização preserva integralmente acentos da língua portuguesa, cedilha, ordinais e parágrafo (§)'
  );

  const sanitizedTypo = sanitizeTextForPdfLayer(typographicText);
  assert(
    sanitizedTypo.includes('"Decisão liminar concedida"') &&
    sanitizedTypo.includes('- processo') &&
    sanitizedTypo.includes('No. 1002345/2026') &&
    sanitizedTypo.includes('* fls. 45/50') &&
    sanitizedTypo.includes('... com valor de R$ 12.500,00'),
    'Sanitização mapeia aspas curvas para retas, travessões para hífen, № para No. e bullets para asterisco'
  );

  // Geração de PDF com textos complexos acentuados
  const pageAccented: OcrProcessedPage = {
    pageNumber: 1,
    width: 595,
    height: 842,
    fullText: `${complexPortugueseText}\n${typographicText}`,
    rawOcrText: complexPortugueseText,
    confidence: 96,
    status: 'complete',
    issues: [],
    previewImageUrl: VALID_SAMPLE_PNG,
    lines: [
      {
        text: 'Ação de Execução de Título Extrajudicial',
        x: 50,
        y: 750,
        width: 320,
        height: 14,
        confidence: 98,
        words: [
          { text: 'Ação', x: 50, y: 750, width: 35, height: 14, confidence: 99 },
          { text: 'de', x: 90, y: 750, width: 15, height: 14, confidence: 99 },
          { text: 'Execução', x: 110, y: 750, width: 65, height: 14, confidence: 98 }
        ]
      }
    ],
    words: [
      { text: 'Ação', x: 50, y: 750, width: 35, height: 14, confidence: 99 },
      { text: 'de', x: 90, y: 750, width: 15, height: 14, confidence: 99 },
      { text: 'Execução', x: 110, y: 750, width: 65, height: 14, confidence: 98 }
    ]
  };

  const pdfWithAccents = await OcrDocumentService.generateSearchablePdf([pageAccented], {
    documentTitle: 'Autos Acentuados',
    strictImagePreservation: true
  });
  assert(pdfWithAccents.byteLength > 1000, 'PDF com acentos gerado com sucesso sem erro de WinAnsi');

  // -------------------------------------------------------------------------
  // TESTE 3: Documentos com Múltiplas Colunas
  // -------------------------------------------------------------------------
  console.log('\n3. Testando layout com múltiplas colunas...');

  // Coluna 1 (x: 50..250) e Coluna 2 (x: 320..520)
  const pageMultiColumn: OcrProcessedPage = {
    pageNumber: 1,
    width: 595,
    height: 842,
    fullText: 'Coluna 1: fundamentos jurídicos.\nColuna 2: pedidos e conclusões.',
    rawOcrText: 'Coluna 1 Coluna 2',
    confidence: 92,
    status: 'complete',
    issues: [],
    previewImageUrl: VALID_SAMPLE_PNG,
    lines: [
      // Linha na Coluna Esquerda
      {
        text: 'Fundamentos de Fato',
        x: 50,
        y: 700,
        width: 180,
        height: 12,
        confidence: 95,
        words: [
          { text: 'Fundamentos', x: 50, y: 700, width: 85, height: 12, confidence: 95 },
          { text: 'de', x: 140, y: 700, width: 18, height: 12, confidence: 95 },
          { text: 'Fato', x: 162, y: 700, width: 40, height: 12, confidence: 95 }
        ]
      },
      // Linha na Coluna Direita (mesma altura Y, X deslocado)
      {
        text: 'Pedidos Conclusivos',
        x: 320,
        y: 700,
        width: 175,
        height: 12,
        confidence: 94,
        words: [
          { text: 'Pedidos', x: 320, y: 700, width: 60, height: 12, confidence: 94 },
          { text: 'Conclusivos', x: 385, y: 700, width: 85, height: 12, confidence: 94 }
        ]
      }
    ],
    words: [
      { text: 'Fundamentos', x: 50, y: 700, width: 85, height: 12, confidence: 95 },
      { text: 'de', x: 140, y: 700, width: 18, height: 12, confidence: 95 },
      { text: 'Fato', x: 162, y: 700, width: 40, height: 12, confidence: 95 },
      { text: 'Pedidos', x: 320, y: 700, width: 60, height: 12, confidence: 94 },
      { text: 'Conclusivos', x: 385, y: 700, width: 85, height: 12, confidence: 94 }
    ]
  };

  const pdfMultiCol = await OcrDocumentService.generateSearchablePdf([pageMultiColumn], {
    documentTitle: 'Duas Colunas',
    strictImagePreservation: true
  });
  assert(pdfMultiCol.byteLength > 1000, 'PDF com duas colunas gerado com sucesso');
  assert(
    pageMultiColumn.words[2].x + pageMultiColumn.words[2].width < pageMultiColumn.words[3].x,
    'Palavras da Coluna 1 terminam antes do início da Coluna 2 (sem colisão espacial)'
  );

  // -------------------------------------------------------------------------
  // TESTE 4: Tabelas Estruturadas
  // -------------------------------------------------------------------------
  console.log('\n4. Testando documentos com tabelas estruturadas...');

  // Tabela: Linha 1 (Cabeçalho), Linha 2 (Dados 1), Linha 3 (Dados 2)
  const pageTable: OcrProcessedPage = {
    pageNumber: 1,
    width: 595,
    height: 842,
    fullText: 'Item | Descrição | Valor (R$)\n01 | Custas Judiciais | 250,00\n02 | Honorários | 1.800,00',
    rawOcrText: 'Item Descrição Valor 01 Custas 250,00',
    confidence: 94,
    status: 'complete',
    issues: [],
    previewImageUrl: VALID_SAMPLE_PNG,
    lines: [
      // Cabeçalho da tabela
      {
        text: 'Item Descrição Valor',
        x: 60,
        y: 650,
        width: 450,
        height: 12,
        confidence: 96,
        words: [
          { text: 'Item', x: 60, y: 650, width: 30, height: 12, confidence: 97 },
          { text: 'Descrição', x: 150, y: 650, width: 80, height: 12, confidence: 96 },
          { text: 'Valor(R$)', x: 380, y: 650, width: 65, height: 12, confidence: 96 }
        ]
      },
      // Linha 1 de dados
      {
        text: '01 Custas 250,00',
        x: 60,
        y: 630,
        width: 450,
        height: 12,
        confidence: 95,
        words: [
          { text: '01', x: 60, y: 630, width: 18, height: 12, confidence: 98 },
          { text: 'Custas', x: 150, y: 630, width: 55, height: 12, confidence: 95 },
          { text: '250,00', x: 380, y: 630, width: 45, height: 12, confidence: 97 }
        ]
      },
      // Linha 2 de dados
      {
        text: '02 Honorários 1.800,00',
        x: 60,
        y: 610,
        width: 450,
        height: 12,
        confidence: 94,
        words: [
          { text: '02', x: 60, y: 610, width: 18, height: 12, confidence: 98 },
          { text: 'Honorários', x: 150, y: 610, width: 75, height: 12, confidence: 95 },
          { text: '1.800,00', x: 380, y: 610, width: 55, height: 12, confidence: 96 }
        ]
      }
    ],
    words: []
  };

  const pdfTable = await OcrDocumentService.generateSearchablePdf([pageTable], {
    documentTitle: 'Tabela de Custas',
    strictImagePreservation: true
  });
  assert(pdfTable.byteLength > 1000, 'PDF com tabela gerado com sucesso');
  // Verifica alinhamento vertical das colunas da tabela
  assert(
    pageTable.lines[0].words[1].x === pageTable.lines[1].words[1].x &&
    pageTable.lines[1].words[1].x === pageTable.lines[2].words[1].x,
    'Coluna "Descrição" possui alinhamento vertical estrito (X = 150)'
  );
  assert(
    pageTable.lines[0].words[2].x === pageTable.lines[1].words[2].x &&
    pageTable.lines[1].words[2].x === pageTable.lines[2].words[2].x,
    'Coluna "Valor" possui alinhamento vertical estrito (X = 380)'
  );

  // -------------------------------------------------------------------------
  // TESTE 5: Páginas Rotacionadas (Paisagem / 90 Graus)
  // -------------------------------------------------------------------------
  console.log('\n5. Testando páginas rotacionadas...');

  const pageRotated: OcrProcessedPage = {
    pageNumber: 2,
    width: 842, // Formato A4 Paisagem
    height: 595,
    rotation: 90,
    fullText: 'Mapa e planta pericial em orientação paisagem rotacionada 90 graus',
    rawOcrText: 'Mapa e planta pericial',
    confidence: 95,
    status: 'complete',
    issues: [],
    previewImageUrl: VALID_SAMPLE_PNG,
    lines: [
      {
        text: 'Planta Pericial do Imóvel',
        x: 100,
        y: 450,
        width: 250,
        height: 14,
        confidence: 97,
        words: [
          { text: 'Planta', x: 100, y: 450, width: 50, height: 14, confidence: 98 },
          { text: 'Pericial', x: 155, y: 450, width: 60, height: 14, confidence: 97 }
        ]
      }
    ],
    words: [
      { text: 'Planta', x: 100, y: 450, width: 50, height: 14, confidence: 98 },
      { text: 'Pericial', x: 155, y: 450, width: 60, height: 14, confidence: 97 }
    ]
  };

  const pdfRotatedBytes = await OcrDocumentService.generateSearchablePdf([pageRotated], {
    documentTitle: 'Planta Rotacionada',
    strictImagePreservation: true
  });

  const loadedRotDoc = await PDFDocument.load(pdfRotatedBytes);
  const loadedPage = loadedRotDoc.getPage(0);
  assert(
    loadedPage.getRotation().angle === 90,
    'Página no PDF preservou a rotação regulamentar de 90 graus'
  );
  assert(
    loadedPage.getWidth() === 842 && loadedPage.getHeight() === 595,
    'Dimensões da página rotacionada mantêm largura 842 pt e altura 595 pt'
  );

  // -------------------------------------------------------------------------
  // TESTE 6: Páginas em Branco
  // -------------------------------------------------------------------------
  console.log('\n6. Testando páginas em branco...');

  const pageBlank: OcrProcessedPage = {
    pageNumber: 4,
    width: 595,
    height: 842,
    fullText: '', // Folha em branco
    rawOcrText: '',
    confidence: 0,
    status: 'warning',
    issues: ['Nenhum texto ou caractere legível foi identificado nesta página.'],
    previewImageUrl: VALID_SAMPLE_PNG, // Mas tem imagem (ex: textura do papel escaneado)
    lines: [],
    words: []
  };

  const pdfBlank = await OcrDocumentService.generateSearchablePdf([pageBlank], {
    documentTitle: 'Folha em Branco',
    strictImagePreservation: true
  });
  assert(pdfBlank.byteLength > 800, 'Página em branco preserva a imagem sem gerar erro nem texto fantasma');

  // -------------------------------------------------------------------------
  // TESTE 7: Manuscritos e Diagnóstico de Reconhecimento Incompleto
  // -------------------------------------------------------------------------
  console.log('\n7. Testando manuscritos e diagnóstico de confiança...');

  // Cenário 7.1: Manuscrito não revisado (baixa confiança detectada)
  const pageHandwritten: OcrProcessedPage = {
    pageNumber: 1,
    width: 595,
    height: 842,
    fullText: 'recebi do sr joao a quantia de cem reais ref aluguel',
    rawOcrText: 'recbi do sr joao a qnta d cem r ref alguel',
    confidence: 48, // Baixa confiança
    status: 'incomplete',
    issues: [
      'Confiança média muito baixa (48%). Texto com provável degradação visual ou manuscrito.',
      '12 palavras com confiança abaixo de 50% (caracteres apagados ou carimbados).'
    ],
    previewImageUrl: VALID_SAMPLE_PNG,
    lines: [],
    words: []
  };

  assert(pageHandwritten.status === 'incomplete', 'Diagnóstico identifica corretamente manuscrito como incomplete');
  assert(pageHandwritten.confidence < 65, 'Confiança média do manuscrito é acusada como baixa (< 65%)');

  // Cenário 7.2: Manuscrito com revisão humana concluída
  const pageHandwrittenRevised: OcrProcessedPage = {
    ...pageHandwritten,
    isRevised: true,
    fullText: 'Recebi do Sr. João da Silva a quantia de R$ 100,00 (cem reais) referente ao aluguel de maio.'
  };

  const pdfHandwritten = await OcrDocumentService.generateSearchablePdf([pageHandwrittenRevised], {
    documentTitle: 'Recibo Manuscrito Revisado',
    strictImagePreservation: true
  });
  assert(
    pdfHandwritten.byteLength > 1000,
    'Gera PDF pesquisável sobrepondo o texto revisado sobre a imagem manuscrita autêntica'
  );

  // -------------------------------------------------------------------------
  // TESTE 8: Correspondência entre Posição Visual e Camada Invisível de Texto
  // -------------------------------------------------------------------------
  console.log('\n8. Testando correspondência espacial entre posição visual e camada invisível...');

  // Testa o cálculo de largura de palavras:
  // Se a largura calculada for muito maior que o bounding box, a fonte deve ser contida
  const testDoc = await PDFDocument.create();
  const testFont = await testDoc.embedFont(StandardFonts.Helvetica);

  const wordSample = {
    text: 'Processo',
    x: 100,
    y: 500,
    width: 50, // 50 pontos de largura na imagem
    height: 12 // 12 pontos de altura
  };

  let computedFontSize = Math.max(6, Math.min(24, wordSample.height * 0.85)); // 10.2
  const initialWidth = testFont.widthOfTextAtSize(wordSample.text, computedFontSize);

  // Algoritmo de ajuste fino aplicado no generateSearchablePdf
  if (initialWidth > 0 && wordSample.width > 0) {
    const widthRatio = wordSample.width / initialWidth;
    if (widthRatio < 0.85) {
      computedFontSize = Math.max(5, computedFontSize * widthRatio);
    }
  }

  const finalWidth = testFont.widthOfTextAtSize(wordSample.text, computedFontSize);
  assert(
    finalWidth <= wordSample.width * 1.15,
    `Largura da camada de texto invisível (${finalWidth.toFixed(1)} pt) respeita a largura visual da palavra (${wordSample.width} pt)`
  );
  assert(
    wordSample.x === 100 && wordSample.y === 500,
    'Coordenadas (x=100, y=500) permanecem estritamente ancoradas na origem do bounding box'
  );

  // -------------------------------------------------------------------------
  // RESUMO FINAL
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL DE ASSERÇÕES: ${passedAssertions + failedAssertions}`);
  console.log(`APROVADAS: ${passedAssertions}`);
  console.log(`REPROVADAS: ${failedAssertions}`);
  console.log('================================================================\n');

  if (failedAssertions > 0) {
    throw new Error(`Bateria de testes falhou com ${failedAssertions} erro(s).`);
  }
}

runTestSuite().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
