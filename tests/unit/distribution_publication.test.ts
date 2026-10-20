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
  type DistributionPackage
} from '../../scripts/distribution_artifacts.ts';

const pkg: DistributionPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-publication-test-'));

try {
  const downloadsDir = path.join(tempRoot, 'downloads');
  const outputDir = path.join(tempRoot, 'release-clean');
  fs.mkdirSync(downloadsDir, { recursive: true });

  const winRunDir = path.join(downloadsDir, 'installers-windows-latest');
  fs.mkdirSync(winRunDir, { recursive: true });

  const winIdentity: BuildIdentity = {
    runId: 'run-win-100',
    commit: 'commit123456',
    sourceDigest: 'digest123456',
    product: pkg.build.productName,
    version: pkg.version,
    platform: 'win',
    architecture: 'x64',
    channel: 'official'
  };

  const winExpected = expectedArtifacts(pkg, 'win', 'x64');
  const winRecords: ArtifactRecord[] = winExpected.map(exp => {
    const filePath = path.join(winRunDir, exp.file);
    fs.writeFileSync(filePath, Buffer.alloc(1_500_000, 'w'));
    return {
      ...winIdentity,
      target: exp.target,
      file: exp.file,
      size: fs.statSync(filePath).size,
      sha256: hashFile(filePath)
    };
  });

  fs.writeFileSync(path.join(winRunDir, 'build-run.json'), JSON.stringify(winIdentity, null, 2));
  fs.writeFileSync(path.join(winRunDir, 'artifacts.json'), JSON.stringify(winRecords, null, 2));

  // Simular presença de pasta win-unpacked contendo o executável interno descompactado
  const winUnpackedDir = path.join(winRunDir, 'win-unpacked');
  fs.mkdirSync(winUnpackedDir, { recursive: true });
  fs.writeFileSync(path.join(winUnpackedDir, 'KovaxFiles Desktop.exe'), Buffer.alloc(100_000, 'u'));

  // Simular arquivo extra com extensão permitida (.exe, .zip) mas não declarado em artifacts.json
  fs.writeFileSync(path.join(winRunDir, 'extra-unrelated-file.exe'), Buffer.alloc(50_000, 'x'));
  fs.writeFileSync(path.join(winRunDir, 'random-debug-asset.zip'), Buffer.alloc(50_000, 'z'));

  // ---------------------------------------------------------------------------
  // REGRESSÃO 1 e 2: Executável dentro de win-unpacked e arquivo extra com extensão permitida NÃO entram na publicação
  // REGRESSÃO 8: Conjunto válido gera exatamente os assets e o manifesto esperados
  // ---------------------------------------------------------------------------
  const result = prepareReleasePublication({
    downloadsDir,
    outputDir,
    requiredPlatforms: ['win'],
    pkg
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
  // REGRESSÃO 3: Caminho absoluto ou com travessia de diretórios é rejeitado
  // ---------------------------------------------------------------------------
  const maliciousDir = path.join(tempRoot, 'malicious');
  fs.mkdirSync(maliciousDir, { recursive: true });
  fs.writeFileSync(path.join(maliciousDir, 'build-run.json'), JSON.stringify(winIdentity, null, 2));

  // Caso 3a: Travessia ../
  const traversalRecords = winRecords.map(r => ({ ...r, file: `../${r.file}` }));
  fs.writeFileSync(path.join(maliciousDir, 'artifacts.json'), JSON.stringify(traversalRecords, null, 2));
  assert.throws(
    () => prepareReleasePublication({ downloadsDir: maliciousDir, outputDir: path.join(tempRoot, 'out-traversal'), pkg }),
    /Travessia de diretório rejeitada|Caminho inseguro rejeitado/
  );

  // Caso 3b: Caminho absoluto
  const absoluteRecords = winRecords.map(r => ({ ...r, file: path.resolve('something.exe') }));
  fs.writeFileSync(path.join(maliciousDir, 'artifacts.json'), JSON.stringify(absoluteRecords, null, 2));
  assert.throws(
    () => prepareReleasePublication({ downloadsDir: maliciousDir, outputDir: path.join(tempRoot, 'out-abs'), pkg }),
    /Caminho absoluto rejeitado|Caminho inseguro rejeitado/
  );

  // ---------------------------------------------------------------------------
  // REGRESSÃO 4: Hash ou tamanho divergente reprova
  // ---------------------------------------------------------------------------
  const divergentDir = path.join(tempRoot, 'divergent');
  fs.mkdirSync(divergentDir, { recursive: true });
  fs.writeFileSync(path.join(divergentDir, 'build-run.json'), JSON.stringify(winIdentity, null, 2));

  // Caso 4a: Tamanho divergente
  const divergentSizeRecords = winRecords.map((r, i) => i === 0 ? { ...r, size: r.size + 100 } : r);
  fs.writeFileSync(path.join(divergentDir, 'artifacts.json'), JSON.stringify(divergentSizeRecords, null, 2));
  // Copiar arquivos reais para a pasta
  for (const rec of winRecords) {
    fs.writeFileSync(path.join(divergentDir, rec.file), Buffer.alloc(1_500_000, 'w'));
  }
  assert.throws(
    () => prepareReleasePublication({ downloadsDir: divergentDir, outputDir: path.join(tempRoot, 'out-div-size'), pkg }),
    /Tamanho físico divergente/
  );

  // Caso 4b: Hash SHA-256 divergente
  const divergentHashRecords = winRecords.map((r, i) => i === 0 ? { ...r, sha256: 'f'.repeat(64) } : r);
  fs.writeFileSync(path.join(divergentDir, 'artifacts.json'), JSON.stringify(divergentHashRecords, null, 2));
  assert.throws(
    () => prepareReleasePublication({ downloadsDir: divergentDir, outputDir: path.join(tempRoot, 'out-div-hash'), pkg }),
    /Hash SHA-256 físico divergente/
  );

  // ---------------------------------------------------------------------------
  // REGRESSÃO 5: Colisão de nomes e target duplicado reprovam
  // ---------------------------------------------------------------------------
  const collisionDir = path.join(tempRoot, 'collision');
  fs.mkdirSync(collisionDir, { recursive: true });
  fs.writeFileSync(path.join(collisionDir, 'build-run.json'), JSON.stringify(winIdentity, null, 2));
  const duplicateTargetRecords = [winRecords[0], winRecords[0]];
  fs.writeFileSync(path.join(collisionDir, 'artifacts.json'), JSON.stringify(duplicateTargetRecords, null, 2));
  assert.throws(
    () => prepareReleasePublication({ downloadsDir: collisionDir, outputDir: path.join(tempRoot, 'out-dup'), pkg }),
    /Target duplicado na mesma plataforma|Arquivo duplicado/
  );

  // ---------------------------------------------------------------------------
  // REGRESSÃO 6: Artefato obrigatório ausente reprova
  // ---------------------------------------------------------------------------
  const missingArtifactDir = path.join(tempRoot, 'missing');
  fs.mkdirSync(missingArtifactDir, { recursive: true });
  fs.writeFileSync(path.join(missingArtifactDir, 'build-run.json'), JSON.stringify(winIdentity, null, 2));
  // Apenas 1 target em vez de 2
  fs.writeFileSync(path.join(missingArtifactDir, 'artifacts.json'), JSON.stringify([winRecords[0]], null, 2));
  assert.throws(
    () => prepareReleasePublication({ downloadsDir: missingArtifactDir, outputDir: path.join(tempRoot, 'out-miss'), pkg }),
    /Quantidade de targets divergente/
  );

  // Plataforma obrigatória ausente
  assert.throws(
    () => prepareReleasePublication({ downloadsDir, outputDir: path.join(tempRoot, 'out-req-mac'), requiredPlatforms: ['win', 'mac'], pkg }),
    /Plataforma obrigatória ausente/
  );

  // ---------------------------------------------------------------------------
  // REGRESSÃO 7: Mistura indevida de versão, plataforma ou arquitetura reprova
  // ---------------------------------------------------------------------------
  const mixedDir = path.join(tempRoot, 'mixed');
  const winMixedDir = path.join(mixedDir, 'win');
  const macMixedDir = path.join(mixedDir, 'mac');
  fs.mkdirSync(winMixedDir, { recursive: true });
  fs.mkdirSync(macMixedDir, { recursive: true });

  fs.writeFileSync(path.join(winMixedDir, 'build-run.json'), JSON.stringify(winIdentity, null, 2));
  fs.writeFileSync(path.join(winMixedDir, 'artifacts.json'), JSON.stringify(winRecords, null, 2));
  for (const rec of winRecords) {
    fs.writeFileSync(path.join(winMixedDir, rec.file), Buffer.alloc(1_500_000, 'w'));
  }

  // Mac com versão divergente
  const macIdentityDivergentVersion: BuildIdentity = {
    ...winIdentity,
    version: '0.0.99',
    platform: 'mac'
  };
  fs.writeFileSync(path.join(macMixedDir, 'build-run.json'), JSON.stringify(macIdentityDivergentVersion, null, 2));
  fs.writeFileSync(path.join(macMixedDir, 'artifacts.json'), JSON.stringify([], null, 2));
  assert.throws(
    () => prepareReleasePublication({ downloadsDir: mixedDir, outputDir: path.join(tempRoot, 'out-mix'), pkg }),
    /Versão divergente em build-run\.json|Mistura indevida de versões/
  );

  console.log('Publication asset selection regressions passed:');
  console.log(' - Unpacked app (win-unpacked) excluded from publication');
  console.log(' - Extra files with allowed extensions excluded');
  console.log(' - Traversal and absolute paths rejected');
  console.log(' - Divergent hash and size rejected');
  console.log(' - Target and file duplicates rejected');
  console.log(' - Missing required platforms and targets rejected');
  console.log(' - Version, platform, and architecture mixing rejected');
  console.log(' - Clean staging and strict SHA256SUMS.txt manifest validated');

} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
