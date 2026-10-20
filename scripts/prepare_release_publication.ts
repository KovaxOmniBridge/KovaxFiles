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

export interface PreparePublicationOptions {
  downloadsDir: string;
  outputDir: string;
  requiredPlatforms?: DistributionPlatform[];
  pkg?: DistributionPackage;
  validateOnly?: boolean;
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

  if (!fs.existsSync(downloadsDir)) {
    throw new Error(`[ERRO DE PUBLICAÇÃO] Diretório de downloads de release ausente: ${downloadsDir}`);
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

    if (platformIdentities.has(identity.platform)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Registro duplicado para a plataforma ${identity.platform}`);
    }
    platformIdentities.set(identity.platform, identity);

    // Conferir evidências caso presentes no diretório de execução
    const evidenceDir = path.join(runDir, 'evidence');
    if (fs.existsSync(evidenceDir)) {
      const smokeResultPath = path.join(evidenceDir, 'smoke', 'result.json');
      if (fs.existsSync(smokeResultPath)) {
        const smoke = JSON.parse(fs.readFileSync(smokeResultPath, 'utf8'));
        if (smoke.status !== 'passed') {
          throw new Error(`[ERRO DE PUBLICAÇÃO] Evidência de smoke reprovada em ${smokeResultPath}`);
        }
      }
      const journeyResultPath = path.join(evidenceDir, 'journey', 'result.json');
      if (fs.existsSync(journeyResultPath)) {
        const journey = JSON.parse(fs.readFileSync(journeyResultPath, 'utf8'));
        if (journey.status !== 'passed') {
          throw new Error(`[ERRO DE PUBLICAÇÃO] Evidência de jornada reprovada em ${journeyResultPath}`);
        }
      }
    }

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
  }

  // 5. Coerência entre plataformas e prevenção de colisões/misturas
  const firstIdentity = platformIdentities.values().next().value as BuildIdentity;
  for (const [platform, id] of platformIdentities.entries()) {
    assert.equal(id.version, firstIdentity.version, `Mistura indevida de versões entre plataformas (${platform}: ${id.version} vs ${firstIdentity.version})`);
    assert.equal(id.commit, firstIdentity.commit, `Mistura indevida de commits de execução entre plataformas (${platform}: ${id.commit} vs ${firstIdentity.commit})`);
  }

  const globalFiles = new Set<string>();
  for (const { record } of allRecords) {
    if (globalFiles.has(record.file)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Colisão de nome de arquivo detectada entre plataformas: ${record.file}`);
    }
    globalFiles.add(record.file);
  }

  // 6. Verificação de plataformas obrigatórias
  for (const reqPlatform of requiredPlatforms) {
    if (!platformIdentities.has(reqPlatform)) {
      throw new Error(`[ERRO DE PUBLICAÇÃO] Plataforma obrigatória ausente nos downloads de release: "${reqPlatform}". Plataformas encontradas: ${[...platformIdentities.keys()].join(', ')}`);
    }
  }

  // 7. Cópia segura para diretório limpo de publicação e geração exclusiva de manifesto
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

  console.log(`[Publicação Preparada] ${allRecords.length} instaladores homologados selecionados.`);
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

  try {
    const result = prepareReleasePublication({
      downloadsDir: downloadsArg,
      outputDir: outputArg,
      requiredPlatforms,
      validateOnly
    });
    console.log(`Sucesso: Consolidação de publicação finalizada em ${result.outputDir}`);
  } catch (err: any) {
    console.error(`Erro fatal de consolidação de release: ${err?.message || err}`);
    process.exit(1);
  }
}
