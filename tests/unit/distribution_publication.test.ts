import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prepareReleasePublication } from '../../scripts/prepare_release_publication.ts';
import {
  expectedArtifacts,
  hashFile,
  type BuildIdentity,
  type ArtifactRecord,
  type DistributionPackage,
  type DistributionPlatform
} from '../../scripts/distribution_artifacts.ts';

const pkg: DistributionPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-publication-test-'));

function createPlatformFixture(targetDir: string, platform: DistributionPlatform, options?: {
  channel?: 'official' | 'internal';
  commit?: string;
  workflowRunId?: string;
  runId?: string;
  sourceDigest?: string;
  mutateIdentity?: (id: BuildIdentity) => void;
  mutateRecords?: (records: ArtifactRecord[]) => void;
  omitEvidence?: ('smoke' | 'journey' | 'journey-negative' | 'installers' | 'distribution')[];
  mutateSmoke?: (smoke: any) => void;
  mutateJourney?: (journey: any) => void;
  mutateJourneyNegative?: (journeyNeg: any) => void;
  mutateInstallers?: (installers: any) => void;
  mutateDistribution?: (dist: any) => void;
}): { identity: BuildIdentity; records: ArtifactRecord[] } {
  fs.mkdirSync(targetDir, { recursive: true });
  const channel = options?.channel || 'official';
  const commit = options?.commit || 'commit-official-456';
  const workflowRunId = options?.workflowRunId || 'run-actions-789';
  const runId = options?.runId || `run-${platform}-${Date.now()}`;
  const sourceDigest = options?.sourceDigest || 'digest-source-abc';

  const identity: BuildIdentity = {
    runId,
    commit,
    sourceDigest,
    product: pkg.build.productName,
    version: pkg.version,
    platform,
    architecture: 'x64',
    channel,
    workflowRunId
  };
  if (options?.mutateIdentity) options.mutateIdentity(identity);

  const expected = expectedArtifacts(pkg, platform, 'x64');
  const records: ArtifactRecord[] = expected.map(exp => {
    const filePath = path.join(targetDir, exp.file);
    fs.writeFileSync(filePath, Buffer.alloc(1_200_000, platform[0]));
    return {
      ...identity,
      target: exp.target,
      file: exp.file,
      size: fs.statSync(filePath).size,
      sha256: hashFile(filePath)
    };
  });
  if (options?.mutateRecords) options.mutateRecords(records);

  fs.writeFileSync(path.join(targetDir, 'build-run.json'), JSON.stringify(identity, null, 2));
  fs.writeFileSync(path.join(targetDir, 'artifacts.json'), JSON.stringify(records, null, 2));

  const evidenceDir = path.join(targetDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const omits = new Set(options?.omitEvidence || []);

  // 1. Smoke
  if (!omits.has('smoke')) {
    const smokeDir = path.join(evidenceDir, 'smoke');
    fs.mkdirSync(smokeDir, { recursive: true });
    const smoke: any = {
      ...identity,
      status: 'passed',
      mode: 'smoke',
      artifacts: records
    };
    if (options?.mutateSmoke) options.mutateSmoke(smoke);
    fs.writeFileSync(path.join(smokeDir, 'result.json'), JSON.stringify(smoke, null, 2));
  }

  // 2. Journey
  if (!omits.has('journey')) {
    const journeyDir = path.join(evidenceDir, 'journey');
    fs.mkdirSync(journeyDir, { recursive: true });
    const journey: any = {
      ...identity,
      status: 'passed',
      mode: 'journey',
      artifacts: records
    };
    if (options?.mutateJourney) options.mutateJourney(journey);
    fs.writeFileSync(path.join(journeyDir, 'result.json'), JSON.stringify(journey, null, 2));
  }

  // 3. Journey-Negative
  if (!omits.has('journey-negative')) {
    const journeyNegDir = path.join(evidenceDir, 'journey-negative');
    fs.mkdirSync(journeyNegDir, { recursive: true });
    const journeyNeg: any = {
      ...identity,
      status: 'passed',
      mode: 'journey-negative',
      artifacts: records
    };
    if (options?.mutateJourneyNegative) options.mutateJourneyNegative(journeyNeg);
    fs.writeFileSync(path.join(journeyNegDir, 'result.json'), JSON.stringify(journeyNeg, null, 2));
  }

  // 4. Installers
  if (!omits.has('installers')) {
    const installers: any = {
      ...identity,
      classification: channel === 'internal' ? 'NAO_HOMOLOGADO' : 'OFFICIAL_SIGNATURE_VERIFIED',
      records
    };
    if (options?.mutateInstallers) options.mutateInstallers(installers);
    fs.writeFileSync(path.join(evidenceDir, 'installers.json'), JSON.stringify(installers, null, 2));
  }

  // 5. Distribution
  if (!omits.has('distribution')) {
    const dist: any = {
      ...identity,
      classification: channel === 'internal' ? 'NAO_HOMOLOGADO' : 'SIGNED_ARTIFACTS_VERIFIED',
      smoke: 'passed',
      journey: 'passed',
      negativeJourney: 'passed',
      installers: 'identified-and-verified',
      artifacts: records
    };
    if (options?.mutateDistribution) options.mutateDistribution(dist);
    fs.writeFileSync(path.join(evidenceDir, 'distribution.json'), JSON.stringify(dist, null, 2));
  }

  return { identity, records };
}

try {
  const downloadsDir = path.join(tempRoot, 'downloads');
  const outputDir = path.join(tempRoot, 'release-clean');
  fs.mkdirSync(downloadsDir, { recursive: true });

  const winRunDir = path.join(downloadsDir, 'installers-windows-latest');
  const { identity: winIdentity, records: winRecords } = createPlatformFixture(winRunDir, 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789'
  });

  // Simular presença de pasta win-unpacked contendo o executável interno descompactado
  const winUnpackedDir = path.join(winRunDir, 'win-unpacked');
  fs.mkdirSync(winUnpackedDir, { recursive: true });
  fs.writeFileSync(path.join(winUnpackedDir, 'KovaxFiles Desktop.exe'), Buffer.alloc(100_000, 'u'));

  // Simular arquivo extra com extensão permitida (.exe, .zip) mas não declarado em artifacts.json
  fs.writeFileSync(path.join(winRunDir, 'extra-unrelated-file.exe'), Buffer.alloc(50_000, 'x'));
  fs.writeFileSync(path.join(winRunDir, 'random-debug-asset.zip'), Buffer.alloc(50_000, 'z'));

  const winExpected = expectedArtifacts(pkg, 'win', 'x64');

  // ---------------------------------------------------------------------------
  // REGRESSÃO 1 e 2: Executável dentro de win-unpacked e arquivo extra com extensão permitida NÃO entram na publicação
  // REGRESSÃO 8: Conjunto válido gera exatamente os assets e o manifesto esperados
  // ---------------------------------------------------------------------------
  const result = prepareReleasePublication({
    downloadsDir,
    outputDir,
    requiredPlatforms: ['win'],
    pkg,
    channel: 'official',
    expectedCommit: 'commit-official-456',
    expectedWorkflowRunId: 'run-actions-789'
  });

  assert.equal(result.copiedFiles.length, winExpected.length, 'Apenas os instaladores esperados devem ser copiados');
  for (const exp of winExpected) {
    assert.ok(result.copiedFiles.includes(exp.file), `Instalador esperado ausente na cópia: ${exp.file}`);
    assert.ok(fs.existsSync(path.join(outputDir, exp.file)), `Arquivo físico não existe na pasta de release: ${exp.file}`);
  }

  // Verificações negativas mandatórias:
  assert.ok(!fs.existsSync(path.join(outputDir, 'KovaxFiles Desktop.exe')), 'Regressão 1: executável de win-unpacked JAMAIS pode ser publicado');
  assert.ok(!fs.existsSync(path.join(outputDir, 'win-unpacked')), 'Pasta win-unpacked não deve existir em release');
  assert.ok(!fs.existsSync(path.join(outputDir, 'extra-unrelated-file.exe')), 'Regressão 2: arquivo extra com extensão permitida JAMAIS pode ser publicado');
  assert.ok(!fs.existsSync(path.join(outputDir, 'random-debug-asset.zip')), 'Regressão 2: arquivo zip extra não declarado JAMAIS pode ser publicado');

  // Verificar manifesto SHA256SUMS.txt
  assert.ok(fs.existsSync(result.manifestPath), 'Manifesto SHA256SUMS.txt deve ser gerado');
  const manifestContent = fs.readFileSync(result.manifestPath, 'utf8');
  assert.ok(!manifestContent.includes('win-unpacked'), 'Manifesto não pode conter menção a win-unpacked');
  assert.ok(!manifestContent.includes('extra-unrelated-file'), 'Manifesto não pode conter arquivo extra');
  assert.ok(!manifestContent.includes('random-debug-asset'), 'Manifesto não pode conter zip extra');
  for (const exp of winExpected) {
    assert.ok(manifestContent.includes(exp.file), `Manifesto deve conter ${exp.file}`);
  }

  // ---------------------------------------------------------------------------
  // REGRESSÕES OBRIGATÓRIAS DO CONTRATO DE PUBLICAÇÃO OFICIAL
  // ---------------------------------------------------------------------------

  // Regressão A: Rejeitar pacote interno apresentado ao modo oficial
  const internalInOfficialDir = path.join(tempRoot, 'internal-in-official');
  createPlatformFixture(path.join(internalInOfficialDir, 'win'), 'win', {
    channel: 'internal',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789'
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: internalInOfficialDir,
      outputDir: path.join(tempRoot, 'out-int-off'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Pacote com canal "internal" rejeitado no modo de publicação oficial/
  );

  // Regressão B: Rejeitar commit diferente do esperado
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir,
      outputDir: path.join(tempRoot, 'out-wrong-commit'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-divergent-999',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Commit da execução \(commit-official-456\) diverge do commit esperado/
  );

  // Regressão C: Rejeitar identidade de workflow run ID diferente da esperada
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir,
      outputDir: path.join(tempRoot, 'out-wrong-workflow'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-wrong'
    }),
    /Identidade do workflow \(run-actions-789\) diverge da esperada/
  );

  // Regressão D: Rejeitar evidência obrigatória ausente (smoke, journey, journey-negative, installers, distribution)
  for (const missingType of ['smoke', 'journey', 'journey-negative', 'installers', 'distribution'] as const) {
    const missingEvidenceDir = path.join(tempRoot, `missing-evidence-${missingType}`);
    createPlatformFixture(path.join(missingEvidenceDir, 'win'), 'win', {
      channel: 'official',
      commit: 'commit-official-456',
      workflowRunId: 'run-actions-789',
      omitEvidence: [missingType]
    });
    assert.throws(
      () => prepareReleasePublication({
        downloadsDir: missingEvidenceDir,
        outputDir: path.join(tempRoot, `out-miss-${missingType}`),
        pkg,
        channel: 'official',
        expectedCommit: 'commit-official-456',
        expectedWorkflowRunId: 'run-actions-789'
      }),
      new RegExp(`Evidência de ${missingType.replace('-', '.*')}|ausente para win`, 'i')
    );
  }

  // Regressão E: Rejeitar evidência reprovada (status !== passed)
  const failedSmokeDir = path.join(tempRoot, 'failed-smoke');
  createPlatformFixture(path.join(failedSmokeDir, 'win'), 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789',
    mutateSmoke: s => { s.status = 'failed'; }
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: failedSmokeDir,
      outputDir: path.join(tempRoot, 'out-fail-smoke'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Evidência de smoke reprovada/
  );

  const failedJourneyNegDir = path.join(tempRoot, 'failed-journey-neg');
  createPlatformFixture(path.join(failedJourneyNegDir, 'win'), 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789',
    mutateJourneyNegative: j => { j.status = 'failed'; }
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: failedJourneyNegDir,
      outputDir: path.join(tempRoot, 'out-fail-jneg'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Evidência de jornada negativa reprovada/
  );

  // Regressão F: Rejeitar evidência de outra execução (runId divergente na evidência)
  const otherRunDir = path.join(tempRoot, 'other-run-evidence');
  createPlatformFixture(path.join(otherRunDir, 'win'), 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789',
    mutateSmoke: s => { s.runId = 'other-run-id-abc'; }
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: otherRunDir,
      outputDir: path.join(tempRoot, 'out-other-run'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Smoke pertence a outra execução/
  );

  // Regressão G: Rejeitar divergência de código-fonte, arquitetura ou artefatos na evidência
  const divergentSourceDir = path.join(tempRoot, 'divergent-source-evidence');
  createPlatformFixture(path.join(divergentSourceDir, 'win'), 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789',
    mutateJourney: j => { j.sourceDigest = 'divergent-source-digest'; }
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: divergentSourceDir,
      outputDir: path.join(tempRoot, 'out-div-source'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Digest de fontes divergente em jornada/i
  );

  // Regressão H: Rejeitar validação de assinatura nativa ausente ou inválida em Windows/macOS no modo oficial
  const unsignedOfficialDir = path.join(tempRoot, 'unsigned-official');
  createPlatformFixture(path.join(unsignedOfficialDir, 'win'), 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789',
    mutateInstallers: inst => { inst.classification = 'NAO_HOMOLOGADO'; }
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: unsignedOfficialDir,
      outputDir: path.join(tempRoot, 'out-unsign-off'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Validação nativa de assinatura oficial ausente ou reprovada para win/
  );

  // Regressão I: --validate-only não pode enfraquecer os critérios do modo oficial
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: unsignedOfficialDir,
      outputDir: path.join(tempRoot, 'out-valonly-weak'),
      pkg,
      channel: 'official',
      validateOnly: true,
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Validação nativa de assinatura oficial ausente ou reprovada para win/
  );

  // Regressão J: Modo explícito de ensaio interno aceita pacote interno íntegro
  const internalRehearsalDir = path.join(tempRoot, 'internal-rehearsal');
  createPlatformFixture(path.join(internalRehearsalDir, 'win'), 'win', {
    channel: 'internal',
    commit: 'commit-internal-111',
    workflowRunId: 'run-actions-internal'
  });
  const internalResult = prepareReleasePublication({
    downloadsDir: internalRehearsalDir,
    outputDir: path.join(tempRoot, 'out-internal-ok'),
    pkg,
    channel: 'internal',
    expectedCommit: 'commit-internal-111',
    expectedWorkflowRunId: 'run-actions-internal',
    validateOnly: true
  });
  assert.equal(internalResult.records.length, winExpected.length, 'Ensaio interno deve aprovar pacote interno íntegro');

  // ---------------------------------------------------------------------------
  // REGRESSÕES ESTRUTURAIS DE CAMINHO, TAMANHO, DUPLICATAS E MISTURA
  // ---------------------------------------------------------------------------

  // Travessia e caminhos absolutos
  const maliciousDir = path.join(tempRoot, 'malicious');
  fs.mkdirSync(path.join(maliciousDir, 'win'), { recursive: true });
  fs.writeFileSync(path.join(maliciousDir, 'win', 'build-run.json'), JSON.stringify(winIdentity, null, 2));
  const traversalRecords = winRecords.map(r => ({ ...r, file: `../${r.file}` }));
  fs.writeFileSync(path.join(maliciousDir, 'win', 'artifacts.json'), JSON.stringify(traversalRecords, null, 2));
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: maliciousDir,
      outputDir: path.join(tempRoot, 'out-traversal'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Travessia de diretório rejeitada|Caminho inseguro rejeitado/
  );

  // Tamanho físico divergente
  const divergentSizeDir = path.join(tempRoot, 'divergent-size');
  createPlatformFixture(path.join(divergentSizeDir, 'win'), 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789',
    mutateRecords: recs => { recs[0].size += 1000; }
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: divergentSizeDir,
      outputDir: path.join(tempRoot, 'out-div-size'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Tamanho físico divergente/
  );

  // Hash SHA-256 divergente
  const divergentHashDir = path.join(tempRoot, 'divergent-hash');
  createPlatformFixture(path.join(divergentHashDir, 'win'), 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789',
    mutateRecords: recs => { recs[0].sha256 = 'f'.repeat(64); }
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: divergentHashDir,
      outputDir: path.join(tempRoot, 'out-div-hash'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Hash SHA-256 físico divergente/
  );

  // Colisão / target duplicado
  const dupTargetDir = path.join(tempRoot, 'duplicate-target');
  createPlatformFixture(path.join(dupTargetDir, 'win'), 'win', {
    channel: 'official',
    commit: 'commit-official-456',
    workflowRunId: 'run-actions-789',
    mutateRecords: recs => { recs[1] = { ...recs[0] }; }
  });
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: dupTargetDir,
      outputDir: path.join(tempRoot, 'out-dup'),
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Target duplicado na mesma plataforma|Arquivo duplicado na mesma plataforma/
  );

  // Plataforma obrigatória ausente
  assert.throws(
    () => prepareReleasePublication({
      downloadsDir,
      outputDir: path.join(tempRoot, 'out-req-mac'),
      requiredPlatforms: ['win', 'mac'],
      pkg,
      channel: 'official',
      expectedCommit: 'commit-official-456',
      expectedWorkflowRunId: 'run-actions-789'
    }),
    /Plataforma obrigatória ausente.*mac/
  );

  console.log('Publication asset selection regressions passed:');
  console.log(' - Unpacked app (win-unpacked) excluded from publication');
  console.log(' - Extra files with allowed extensions excluded');
  console.log(' - Traversal and absolute paths rejected');
  console.log(' - Divergent hash and size rejected');
  console.log(' - Target and file duplicates rejected');
  console.log(' - Missing required platforms and targets rejected');
  console.log(' - Internal package presented to official mode rejected');
  console.log(' - Divergent commit and workflowRunId rejected');
  console.log(' - Missing or failed evidence (smoke, journey, journey-negative, installers, distribution) rejected');
  console.log(' - Missing native signature validation on win/mac rejected');
  console.log(' - Validate-only strictness preserved for official mode');
  console.log(' - Explicit internal rehearsal mode approved');
  console.log(' - Clean staging and strict SHA256SUMS.txt manifest validated');

} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
