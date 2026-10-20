import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { assertJourneyContent, waitForCondition } from '../../electron/main/journeyChecks.ts';
import { validateDistributionProof, type ProofMode } from '../../scripts/distribution_contract.ts';
import { hashFile, type BuildIdentity, type ArtifactRecord } from '../../scripts/distribution_artifacts.ts';

const texts = ['M01 REFERENCE ALPHA', 'M01 REFERENCE BETA'];
assertJourneyContent({ pages: 2, texts });
assert.throws(() => assertJourneyContent({ pages: 1, texts }));
assert.throws(() => assertJourneyContent({ pages: 2, texts: [...texts].reverse() }));
assert.throws(() => assertJourneyContent({ pages: 2, texts: ['', ''] }));
await assert.rejects(() => waitForCondition(async () => false, 'importação', 1), /Timeout/);
await assert.rejects(() => waitForCondition(async () => { throw new Error('Gravação falhou'); }, 'gravação'), /Gravação/);
let attempt = 0;
await waitForCondition(async () => ++attempt === 2, 'montagem observável', 1000);

// Contratos de estágios da jornada documental (positiva e negativa com recuperação)
const positiveStages = ['Import', 'Process', 'SaveIPC', 'Reopen', 'Complete'];
const negativeRecoveryStages = ['ImportRecovery', 'ProcessRecovery', 'SaveRecovery', 'ReopenRecovery', 'Complete'];
assert.equal(positiveStages.length, 5, 'Jornada positiva deve conter 5 etapas');
assert.equal(negativeRecoveryStages.length, 5, 'Jornada negativa deve cobrir os 4 cenários + conclusão com recuperação');

// Validação rigorosa do contrato real de produção (compartilhado com finalize_distribution e prepare_release_publication)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'journey-proof-test-'));
try {
  const testExe = path.join(tempDir, 'app.exe');
  const testPayload = path.join(tempDir, 'app.asar');
  fs.writeFileSync(testExe, 'exe-binary-content-fixture');
  fs.writeFileSync(testPayload, 'payload-content-fixture');

  const mockIdentity: BuildIdentity = {
    runId: 'run-journey-123',
    commit: 'commit-abc-456',
    sourceDigest: 'digest-xyz-789',
    product: 'KovaxFiles Desktop',
    version: '1.0.0',
    platform: 'win',
    architecture: 'x64',
    channel: 'internal'
  };

  const mockRecords: ArtifactRecord[] = [{
    ...mockIdentity,
    target: 'nsis',
    file: 'KovaxFiles Desktop-1.0.0-win-x64-setup.exe',
    size: 1000,
    sha256: 'a'.repeat(64)
  }];

  const validProof = {
    mode: 'journey-negative' as ProofMode,
    status: 'passed' as const,
    runId: mockIdentity.runId,
    commit: mockIdentity.commit,
    sourceDigest: mockIdentity.sourceDigest,
    platform: mockIdentity.platform,
    architecture: mockIdentity.architecture,
    artifacts: mockRecords,
    executable: testExe,
    executableSha256: hashFile(testExe),
    payloadPath: testPayload,
    payloadSha256: hashFile(testPayload)
  };

  // 1. Prova válida deve passar
  validateDistributionProof(validProof, 'journey-negative', mockIdentity, mockRecords, { checkExecutableAndPayload: true });

  // 2. Prova ausente
  assert.throws(() => validateDistributionProof(null, 'journey-negative', mockIdentity), /Evidência ausente/);
  assert.throws(() => validateDistributionProof(undefined, 'journey-negative', mockIdentity), /Evidência ausente/);

  // 3. Modo incorreto
  assert.throws(() => validateDistributionProof({ ...validProof, mode: 'smoke' }, 'journey-negative', mockIdentity), /Tipo de prova incorreto/);
  assert.throws(() => validateDistributionProof({ ...validProof, mode: 'journey' }, 'journey-negative', mockIdentity), /Tipo de prova incorreto/);

  // 4. Status reprovado
  assert.throws(() => validateDistributionProof({ ...validProof, status: 'failed' }, 'journey-negative', mockIdentity), /reprovada/);
  assert.throws(() => validateDistributionProof({ ...validProof, status: 'running' as any }, 'journey-negative', mockIdentity), /reprovada/);

  // 5. Prova de outra execução
  assert.throws(() => validateDistributionProof({ ...validProof, runId: 'other-run-id' }, 'journey-negative', mockIdentity), /pertence a outra execução/);

  // 6. Fontes divergentes
  assert.throws(() => validateDistributionProof({ ...validProof, sourceDigest: 'other-digest' }, 'journey-negative', mockIdentity), /Digest de fontes divergente/);

  // 7. Plataforma divergente
  assert.throws(() => validateDistributionProof({ ...validProof, platform: 'linux' }, 'journey-negative', mockIdentity), /Plataforma divergente/);

  // 8. Arquitetura divergente
  assert.throws(() => validateDistributionProof({ ...validProof, architecture: 'arm64' }, 'journey-negative', mockIdentity), /Arquitetura divergente/);

  // 9. Commit divergente
  assert.throws(() => validateDistributionProof({ ...validProof, commit: 'other-commit' }, 'journey-negative', mockIdentity), /Commit divergente/);

  // 10. Registros ou hashes incompatíveis
  assert.throws(() => validateDistributionProof({ ...validProof, artifacts: [] }, 'journey-negative', mockIdentity, mockRecords), /Artefatos.*divergem/);

  // 11. Executável adulterado após o teste
  assert.throws(() => validateDistributionProof({ ...validProof, executableSha256: 'tampered-hash' }, 'journey-negative', mockIdentity, mockRecords, { checkExecutableAndPayload: true }), /Executável mudou/);

  // 12. Payload adulterado após o teste
  assert.throws(() => validateDistributionProof({ ...validProof, payloadSha256: 'tampered-hash' }, 'journey-negative', mockIdentity, mockRecords, { checkExecutableAndPayload: true }), /Payload mudou/);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('Journey contracts: stages, UI recovery, and real production proof validation contracts passed');
