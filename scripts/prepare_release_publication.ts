import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {
  expectedArtifacts,
  hashFile,
  type ArtifactRecord,
  type BuildIdentity,
  type DistributionPackage,
  type DistributionPlatform
} from './distribution_artifacts';
import {
  readAndValidateDistributionProof,
  readAndValidateInstallersProof
} from './distribution_contract';

export interface PreparePublicationOptions {
  downloadsDir: string;
  outputDir: string;
  requiredPlatforms?: DistributionPlatform[];
  pkg?: DistributionPackage;
  validateOnly?: boolean;
  channel?: 'official' | 'internal';
  expectedCommit?: string;
  expectedWorkflowRunId?: string;
}

export interface PreparedPublicationResult {
  outputDir: string;
  copiedFiles: string[];
  manifestPath: string;
  records: ArtifactRecord[];
}

function findArtifactsJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findArtifactsJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'artifacts.json') {
      results.push(fullPath);
    }
  }
  return results;
}

export function prepareReleasePublication(options: PreparePublicationOptions): PreparedPublicationResult {
  const downloadsDir = path.resolve(options.downloadsDir);
  const outputDir = path.resolve(options.outputDir);
  const pkg: DistributionPackage = options.pkg || JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredPlatforms = options.requiredPlatforms || [];
  const channel = options.channel || 'official';

  if (!fs.existsSync(downloadsDir)) {
    throw new Error(`[ERRO DE PUBLICAÇÃO] Diretório de downloads de release ausente: ${downloadsDir}`);
  }

  // No modo oficial, commit esperado e identidade do workflow são mandatórios
  if (channel === 'official') {
    if (!options.expectedCommit || typeof options.expectedCommit !== 'string' || options.expectedCommit.trim().length === 0) {
      throw new Error('[ERRO DE PUBLICAÇÃO] Commit esperado é obrigatório no modo oficial (--expected-commit)');
    }
    if (!options.expectedWorkflowRunId || typeof options.expectedWorkflowRunId !== 'string' || options.expectedWorkflowRunId.trim().length === 0) {
      throw new Error('[ERRO DE PUBLICAÇÃO] Identidade da execução do workflow é obrigatória no modo oficial (--expected-run-id)');
    }
  }

  const artifactsJsonPaths = findArtifactsJsonFiles(downloadsDir);
  if (artifactsJsonPaths.length === 0) {
    throw new Error(`[ERRO DE PUBLICAÇÃO] Nenhum registro artifacts.json encontrado no diretório: ${downloadsDir}`);
  }

  const allRecords: { record: ArtifactRecord; physicalPath: string }[] = [];
  const platformIdentities = new Map<DistributionPlatform, BuildIdentity>();

  for (const artifactsPath of artifactsJsonPaths) {
    const runDir = path.dirname(artifactsPath);
    const buildRunPath = path.join(runDir, 'build-run.json');
    if (!fs.existsSync(buildRunPath)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] build-run.json ausente em ${runDir}`);
    }

    const identity: BuildIdentity = JSON.parse(fs.readFileSync(buildRunPath, 'utf8'));
    assert.equal(identity.product, pkg.build.productName, `Produto divergente em build-run.json: ${identity.product}`);
    assert.equal(identity.version, pkg.version, `Versão divergente em build-run.json: ${identity.version}`);
    assert.ok(['win', 'mac', 'linux'].includes(identity.platform), `Plataforma inválida: ${identity.platform}`);
    assert.ok(['x64', 'arm64'].includes(identity.architecture), `Arquitetura inválida: ${identity.architecture}`);

    // Validação de canal
    if (channel === 'official' && identity.channel !== 'official') {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Pacote com canal "${identity.channel}" rejeitado no modo de publicação oficial`);
    }

    // Validação de commit esperado
    if (options.expectedCommit && identity.commit !== options.expectedCommit) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Commit da execução (${identity.commit}) diverge do commit esperado (${options.expectedCommit})`);
    }

    // Validação de workflow run ID
    if (options.expectedWorkflowRunId && identity.workflowRunId && identity.workflowRunId !== options.expectedWorkflowRunId) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Identidade do workflow (${identity.workflowRunId}) diverge da esperada (${options.expectedWorkflowRunId})`);
    }
    if (channel === 'official' && options.expectedWorkflowRunId && !identity.workflowRunId) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Identidade do workflow ausente no registro de ${identity.platform}`);
    }

    if (platformIdentities.has(identity.platform)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Registro duplicado para a plataforma ${identity.platform}`);
    }
    platformIdentities.set(identity.platform, identity);

    const records: ArtifactRecord[] = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
    assert.ok(Array.isArray(records), 'artifacts.json deve conter um array de registros');

    // Validação estrita de cada registro
    const expected = expectedArtifacts(pkg, identity.platform, identity.architecture);
    assert.equal(records.length, expected.length, `Quantidade de targets divergente para ${identity.platform}`);

    const platformTargets = new Set<string>();
    const platformFiles = new Set<string>();

    for (const record of records) {
      // 1. Caminhos locais seguros: proibir travessia, caminhos absolutos e separadores de diretório
      assert.ok(record.file, 'Registro de artefato sem nome de arquivo');
      assert.equal(path.basename(record.file), record.file, `Caminho inseguro rejeitado (deve ser nome local): ${record.file}`);
      assert.ok(!path.isAbsolute(record.file), `Caminho absoluto rejeitado: ${record.file}`);
      assert.ok(!record.file.includes('..'), `Travessia de diretório rejeitada: ${record.file}`);
      assert.ok(!record.file.includes('/') && !record.file.includes('\\'), `Separador de diretório rejeitado no nome: ${record.file}`);

      // 2. Metadados e proveniência
      assert.equal(record.product, pkg.build.productName, `Produto divergente no registro: ${record.file}`);
      assert.equal(record.version, pkg.version, `Versão divergente no registro: ${record.file}`);
      assert.equal(record.platform, identity.platform, `Plataforma divergente no registro: ${record.file}`);
      assert.equal(record.architecture, identity.architecture, `Arquitetura divergente no registro: ${record.file}`);
      assert.equal(record.runId, identity.runId, `Identidade de run divergente no registro: ${record.file}`);
      assert.equal(record.commit, identity.commit, `Commit divergente no registro: ${record.file}`);
      assert.equal(record.sourceDigest, identity.sourceDigest, `Digest de fontes divergente no registro: ${record.file}`);
      if (channel === 'official') {
        assert.equal(record.channel, 'official', `Canal divergente no registro: ${record.file}`);
      }

      // 3. Targets válidos e sem duplicação
      assert.ok(expected.some(e => e.target === record.target && e.file === record.file), `Target inesperado ou incompatível: ${record.target}/${record.file}`);
      assert.ok(!platformTargets.has(record.target), `Target duplicado na mesma plataforma: ${record.target}`);
      assert.ok(!platformFiles.has(record.file), `Arquivo duplicado na mesma plataforma: ${record.file}`);
      platformTargets.add(record.target);
      platformFiles.add(record.file);
    }

    // 4. Confrontação física estrita com os arquivos baixados
    for (const record of records) {
      const physicalPath = path.join(runDir, record.file);
      if (!fs.existsSync(physicalPath)) {
        throw new Error(`[ERRO DE PUBLICAÇÃO] Arquivo físico declarado em artifacts.json não existe: ${physicalPath}`);
      }
      const stat = fs.statSync(physicalPath);
      if (stat.size !== record.size) {
        throw new Error(`[ERRO DE PUBLICAÇÃO] Tamanho físico divergente para ${record.file}: esperado ${record.size}, obtido ${stat.size}`);
      }
      const hash = hashFile(physicalPath);
      if (hash !== record.sha256) {
        throw new Error(`[ERRO DE PUBLICAÇÃO] Hash SHA-256 físico divergente para ${record.file}: esperado ${record.sha256}, obtido ${hash}`);
      }

      allRecords.push({ record, physicalPath });
    }

    // 5. Exigir evidências completas e aprovadas da plataforma
    const evidenceDir = path.join(runDir, 'evidence');
    if (!fs.existsSync(evidenceDir)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Diretório de evidências ausente para ${identity.platform}: ${evidenceDir}`);
    }

    // 5a. Smoke aprovado
    const smokeResultPath = path.join(evidenceDir, 'smoke', 'result.json');
    readAndValidateDistributionProof(smokeResultPath, 'smoke', identity, records);

    // 5b. Jornada positiva aprovada
    const journeyResultPath = path.join(evidenceDir, 'journey', 'result.json');
    readAndValidateDistributionProof(journeyResultPath, 'journey', identity, records);

    // 5c. Jornada negativa com recuperação aprovada
    const journeyNegResultPath = path.join(evidenceDir, 'journey-negative', 'result.json');
    readAndValidateDistributionProof(journeyNegResultPath, 'journey-negative', identity, records);

    // 5d. Validação de instaladores e assinaturas oficiais
    const installersPath = path.join(evidenceDir, 'installers.json');
    const installers = readAndValidateInstallersProof(installersPath, identity, records);
    if (channel === 'official' && ['win', 'mac'].includes(identity.platform)) {
      if (installers.classification !== 'OFFICIAL_SIGNATURE_VERIFIED') {
        throw new Error(`[ERRO DE PUBLICAÇÃO] Validação nativa de assinatura oficial ausente ou reprovada para ${identity.platform}: ${installers.classification}`);
      }
    }

    // 5e. Finalização e manifesto da distribuição
    const distPath = path.join(evidenceDir, 'distribution.json');
    if (!fs.existsSync(distPath)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Evidência de finalização da distribuição ausente para ${identity.platform}: ${distPath}`);
    }
    const dist = JSON.parse(fs.readFileSync(distPath, 'utf8'));
    assert.equal(dist.runId, identity.runId, `Finalização da distribuição pertence a outra execução para ${identity.platform}`);
    assert.equal(dist.commit, identity.commit, `Commit divergente na finalização para ${identity.platform}`);
    assert.equal(dist.sourceDigest, identity.sourceDigest, `Digest de fontes divergente na finalização para ${identity.platform}`);
    assert.equal(dist.smoke, 'passed', `Finalização sem smoke aprovado para ${identity.platform}`);
    assert.equal(dist.journey, 'passed', `Finalização sem jornada aprovada para ${identity.platform}`);
    assert.equal(dist.negativeJourney, 'passed', `Finalização sem jornada negativa aprovada para ${identity.platform}`);
    assert.equal(dist.installers, 'identified-and-verified', `Finalização sem instaladores verificados para ${identity.platform}`);
    assert.deepEqual(dist.artifacts, records, `Artefatos em distribution.json divergem para ${identity.platform}`);
    if (channel === 'official') {
      assert.equal(dist.channel, 'official', `Canal divergente em distribution.json para ${identity.platform}`);
      if (['win', 'mac'].includes(identity.platform)) {
        assert.equal(dist.classification, 'SIGNED_ARTIFACTS_VERIFIED', `Classificação não homologada em distribution.json para ${identity.platform}`);
      }
    }
  }

  // 6. Coerência entre plataformas e prevenção de colisões/misturas
  const firstIdentity = platformIdentities.values().next().value as BuildIdentity;
  for (const [platform, id] of platformIdentities.entries()) {
    assert.equal(id.version, firstIdentity.version, `Mistura indevida de versões entre plataformas (${platform}: ${id.version} vs ${firstIdentity.version})`);
    assert.equal(id.commit, firstIdentity.commit, `Mistura indevida de commits de execução entre plataformas (${platform}: ${id.commit} vs ${firstIdentity.commit})`);
    assert.equal(id.sourceDigest, firstIdentity.sourceDigest, `Mistura indevida de código-fonte entre plataformas (${platform}: ${id.sourceDigest} vs ${firstIdentity.sourceDigest})`);
    if (firstIdentity.workflowRunId) {
      assert.equal(id.workflowRunId, firstIdentity.workflowRunId, `Mistura de workflow run ID entre plataformas (${platform}: ${id.workflowRunId} vs ${firstIdentity.workflowRunId})`);
    }
  }

  const globalFiles = new Set<string>();
  for (const { record } of allRecords) {
    if (globalFiles.has(record.file)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Colisão de nome de arquivo detectada entre plataformas: ${record.file}`);
    }
    globalFiles.add(record.file);
  }

  // 7. Verificação de plataformas obrigatórias
  for (const reqPlatform of requiredPlatforms) {
    if (!platformIdentities.has(reqPlatform)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Plataforma obrigatória ausente nos downloads de release: "${reqPlatform}". Plataformas encontradas: ${[...platformIdentities.keys()].join(', ')}`);
    }
  }

  // 8. Cópia segura para diretório limpo de publicação e geração exclusiva de manifesto
  const copiedFiles: string[] = [];
  let manifestPath = '';

  if (!options.validateOnly) {
    fs.mkdirSync(outputDir, { recursive: true });

    // Limpar artefatos prévios do diretório de publicação para evitar resíduos
    const existing = fs.readdirSync(outputDir);
    for (const item of existing) {
      if (/\.(exe|dmg|zip|AppImage|deb|rpm|txt)$/i.test(item)) {
        fs.rmSync(path.join(outputDir, item), { force: true });
      }
    }

    // Copiar APENAS os instaladores declarados e aprovados
    for (const { record, physicalPath } of allRecords) {
      const destPath = path.join(outputDir, record.file);
      fs.copyFileSync(physicalPath, destPath);

      // Re-verificar o arquivo após a cópia
      assert.equal(fs.statSync(destPath).size, record.size, `Tamanho divergente após cópia para publicação: ${record.file}`);
      assert.equal(hashFile(destPath), record.sha256, `SHA-256 divergente após cópia para publicação: ${record.file}`);
      copiedFiles.push(record.file);
    }

    // Gerar manifesto consolidado SHA256SUMS.txt EXCLUSIVAMENTE sobre os arquivos selecionados
    manifestPath = path.join(outputDir, 'SHA256SUMS.txt');
    const sortedRecords = [...allRecords.map(a => a.record)].sort((a, b) => a.file.localeCompare(b.file));
    const manifestLines = sortedRecords.map(r => `${r.sha256}  ${r.file}`);
    fs.writeFileSync(manifestPath, manifestLines.join('\n') + '\n', 'utf8');

    // Validação de integridade da leitura do manifesto gerado
    const readBack = fs.readFileSync(manifestPath, 'utf8').trim().split(/\r?\n/);
    assert.equal(readBack.length, sortedRecords.length, 'Linhas do manifesto divergentes do total de artefatos');
    for (let i = 0; i < sortedRecords.length; i++) {
      const match = readBack[i].match(/^([a-f0-9]{64})\s+[* ]?(.+)$/i);
      assert.ok(match, `Linha inválida no manifesto: ${readBack[i]}`);
      const [, hash, file] = match;
      assert.equal(file, sortedRecords[i].file, 'Arquivo no manifesto divergente');
      assert.equal(hash, sortedRecords[i].sha256, 'Hash no manifesto divergente');
    }
  }

  console.log(`[Publicação Preparada] ${allRecords.length} instaladores homologados selecionados (canal: ${channel}).`);
  for (const { record } of allRecords) {
    console.log(` - [${record.platform.toUpperCase()} / ${record.target}] ${record.file} (${(record.size / (1024 * 1024)).toFixed(2)} MB) SHA-256: ${record.sha256}`);
  }

  return {
    outputDir,
    copiedFiles,
    manifestPath,
    records: allRecords.map(a => a.record)
  };
}

// Suporte a execução CLI direta
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/prepare_release_publication.ts')) {
  const args = process.argv.slice(2);
  const downloadsArg = args.find(a => a.startsWith('--downloads='))?.split('=')[1] || 'release-downloads';
  const outputArg = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'release';
  const requireArg = args.find(a => a.startsWith('--require='))?.split('=')[1];
  const requiredPlatforms = (requireArg ? requireArg.split(',') : []) as DistributionPlatform[];
  const validateOnly = args.includes('--validate-only');
  const channelArg = (args.find(a => a.startsWith('--channel='))?.split('=')[1] || 'official') as 'official' | 'internal';
  const expectedCommit = args.find(a => a.startsWith('--expected-commit='))?.split('=')[1] || process.env.GITHUB_SHA;
  const expectedWorkflowRunId = args.find(a => a.startsWith('--expected-run-id='))?.split('=')[1] || args.find(a => a.startsWith('--expected-workflow-run-id='))?.split('=')[1] || process.env.GITHUB_RUN_ID;

  try {
    const result = prepareReleasePublication({
      downloadsDir: downloadsArg,
      outputDir: outputArg,
      requiredPlatforms,
      validateOnly,
      channel: channelArg,
      expectedCommit,
      expectedWorkflowRunId
    });
    console.log(`Sucesso: Consolidação de publicação finalizada em ${result.outputDir}`);
  } catch (err: any) {
    console.error(`Erro fatal de consolidação de release: ${err?.message || err}`);
    process.exit(1);
  }
}
