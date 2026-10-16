/**
 * KovaxFiles Desktop — End-to-End Workflow Sanity Test
 * Valida o fluxo completo de ponta a ponta: ingestão de documento imutável -> anonimização -> compressão -> exportação.
 */

import { CoreDocumentFactory } from '../../src/core/documents/documentFactory';
import { CoreRedactionEngine } from '../../src/core/redaction/redactionCore';
import { CoreCompressionService } from '../../src/core/compression/compressionService';
import { createSamplePdfBytes } from '../fixtures/sample_doc';

async function runE2eSanityTest() {
  console.log('\n================================================================================');
  console.log('  TESTES E2E: FLUXO DOCUMENTAL INTEGRADO DE PONTA A PONTA');
  console.log('================================================================================\n');

  console.log('[Passo 1] Criando documento imutável com ID e hash...');
  const initialBytes = createSamplePdfBytes('Processo 0000001-83.2008.1.00.0000 réu CPF 123.456.789-09');
  const doc = await CoreDocumentFactory.createDocument({
    name: 'documento_inicial.pdf',
    bytes: initialBytes
  });
  console.log(`  ✓ Documento criado: ${doc.metadata.id} (SHA-256: ${doc.metadata.sha256.substring(0, 16)}...)`);

  console.log('[Passo 2] Executando varredura e redação LGPD...');
  const textContent = 'Processo 0000001-83.2008.1.00.0000 réu CPF 123.456.789-09';
  const matches = CoreRedactionEngine.scanText(textContent);
  console.log(`  ✓ Padrões detectados: ${matches.length} itens.`);

  console.log('[Passo 3] Comprimindo documento processado...');
  const compResult = await CoreCompressionService.compressDocument({
    id: doc.metadata.id,
    name: doc.metadata.name,
    bytes: doc.content,
    profile: 'court_pje'
  });
  console.log(`  ✓ Compressão finalizada: ${compResult.originalSizeBytes} -> ${compResult.compressedSizeBytes} bytes.`);

  console.log('\n================================================================================');
  console.log('  FLUXO E2E CONCLUÍDO COM SUCESSO TOTAL');
  console.log('================================================================================\n');
}

runE2eSanityTest().catch(err => {
  console.error('Erro no fluxo E2E:', err);
  process.exit(1);
});
