/**
 * KovaxFiles Desktop — Unit Tests: Backup, Cryptographic Checksum, Preview & Session Recovery
 */

import { CoreBackupService } from '../../src/core/backup/backupService';
import { SessionRecoveryService } from '../../src/core/recovery/sessionRecoveryService';
import { storageAdapter, STORAGE_STORES } from '../../src/infrastructure/storage/storageAdapter';
import { ValidationError } from '../../src/shared/errors/kovaxErrors';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    failed++;
    throw new Error(msg);
  } else {
    console.log(`  [PASS] ${msg}`);
    passed++;
  }
}

async function runBackupAndRecoveryTests() {
  console.log('\n================================================================================');
  console.log('  TESTES UNITÁRIOS: BACKUP (SCHEMA/CHECKSUM/PREVIEW) E SESSION RECOVERY');
  console.log('================================================================================\n');

  console.log('[1/4] Testando Geração de Backup com Checksum SHA-256...');
  // Inserir dados de teste no store
  await storageAdapter.setItem(STORAGE_STORES.CUSTOM_LAWS, 'lei_teste_1', { nome: 'Lei Municipal de Teste' });
  await storageAdapter.setItem(STORAGE_STORES.CHAT_SESSIONS, 'sessao_1', { messages: ['Pergunta jurídica'] });

  const backup = await CoreBackupService.createBackup();
  assert(backup.payload.schemaVersion === '1.0', 'Schema do backup deve ser 1.0');
  assert(backup.payload.checksumSha256.length === 64, 'Checksum SHA-256 deve ter 64 caracteres hex');
  assert(backup.payload.metadata.totalItems >= 2, 'Total de itens no backup deve refletir os registros criados');

  console.log('\n[2/4] Testando Pré-visualização de Backup (Sem gravação em disco)...');
  const preview = await CoreBackupService.previewBackup(backup.jsonString);
  assert(preview.isValid === true, 'Backup íntegro deve ser válido na pré-visualização');
  assert(preview.checksumMatches === true, 'Checksum calculado deve coincidir com o esperado');
  assert(preview.storeSummaries.length > 0, 'Pré-visualização deve resumir os stores exportados');

  console.log('\n[3/4] Testando Rejeição de Backups Adulterados ou com Esquema Inválido...');
  // Simular adulteração nos dados preservando o checksum antigo
  const tamperedPayload = JSON.parse(backup.jsonString);
  tamperedPayload.stores[STORAGE_STORES.CUSTOM_LAWS].push({ key: 'lei_invasora', value: { hack: true } });
  const tamperedJson = JSON.stringify(tamperedPayload);

  const tamperedPreview = await CoreBackupService.previewBackup(tamperedJson);
  assert(!tamperedPreview.isValid, 'Backup adulterado deve ser considerado INVÁLIDO');
  assert(!tamperedPreview.checksumMatches, 'Checksum do backup adulterado DEVE divergir');

  let restoreBlocked = false;
  try {
    await CoreBackupService.restoreBackup(tamperedJson);
  } catch (err) {
    restoreBlocked = true;
    assert(err instanceof ValidationError, 'Restauração de backup adulterado deve ser bloqueada com ValidationError');
  }
  assert(restoreBlocked, 'Tentativa de restauração de backup com checksum divergente deve ser rejeitada');

  console.log('\n[4/4] Testando Session Recovery (Preservação de Workspace em Fechamento Inesperado)...');
  await SessionRecoveryService.saveDraft('pdf_compressor', {
    documentName: 'recurso_especial.pdf',
    documentId: 'doc_123',
    options: { profile: 'aggressive' }
  });

  const hasRecoverable = await SessionRecoveryService.hasRecoverableSession();
  assert(hasRecoverable === true, 'hasRecoverableSession deve ser true após gravação de rascunho');

  const recovered = await SessionRecoveryService.getRecoverableSession();
  assert(recovered !== null, 'Sessão recuperada não pode ser nula');
  assert(recovered?.activeTool === 'pdf_compressor', 'Ferramenta ativa da sessão deve ser restaurada');
  assert(recovered?.projectData.documentName === 'recurso_especial.pdf', 'Nome do documento do projeto deve ser recuperado');

  await SessionRecoveryService.clearSession();
  const afterClear = await SessionRecoveryService.hasRecoverableSession();
  assert(!afterClear, 'Após clearSession(), hasRecoverableSession deve ser false');

  console.log('\n================================================================================');
  console.log(`RESULTADO DOS TESTES DE BACKUP E RECUPERAÇÃO:`);
  console.log(`  Testes Passados: ${passed}`);
  console.log(`  Testes Falhados: ${failed}`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

runBackupAndRecoveryTests().catch(err => {
  console.error('Erro fatal nos testes de backup e recuperação:', err);
  process.exit(1);
});
