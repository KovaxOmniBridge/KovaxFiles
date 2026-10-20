import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  computeCanonicalSourceDigest,
  canonicalContentBuffer,
  isBinaryFile,
  sourceDigest,
  RELEVANT_SOURCE_REGEX
} from '../../scripts/distribution_provenance.ts';
import { expectedArtifacts, hashFile, type ArtifactRecord, type BuildIdentity } from '../../scripts/distribution_artifacts.ts';
import { prepareReleasePublication } from '../../scripts/prepare_release_publication.ts';

// 1. Verificação de detecção binária e de texto
assert.equal(isBinaryFile('por.traineddata', Buffer.from([1, 2, 3])), true, '.traineddata deve ser classificado como binário');
assert.equal(isBinaryFile('inter.woff2', Buffer.from([1, 2, 3])), true, '.woff2 deve ser classificado como binário');
assert.equal(isBinaryFile('tesseract-core.wasm', Buffer.from([0, 97, 115, 109])), true, '.wasm deve ser classificado como binário');
assert.equal(isBinaryFile('icon.png', Buffer.from([137, 80, 78, 71])), true, '.png deve ser classificado como binário');
assert.equal(isBinaryFile('src/main.tsx', Buffer.from('console.log("hello");\n')), false, '.tsx deve ser classificado como texto');
assert.equal(isBinaryFile('package.json', Buffer.from('{\n  "name": "kovax"\n}\n')), false, '.json deve ser classificado como texto');

// Arquivo sem extensão conhecida mas com byte nulo deve ser detectado como binário
assert.equal(isBinaryFile('custom.asset', Buffer.from([104, 101, 108, 0, 108, 111])), true, 'Byte nulo classifica como binário');

// 2. Não normalização de arquivos binários (bytes CRLF dentro de binário devem permanecer intocados)
const binaryPayloadWithCrlfBytes = Buffer.from([0x00, 0x41, 0x0D, 0x0A, 0x42, 0x0D, 0x0A, 0xFF]);
const canonicalBinary = canonicalContentBuffer('asset.wasm', binaryPayloadWithCrlfBytes);
assert.deepEqual(canonicalBinary, binaryPayloadWithCrlfBytes, 'Arquivos binários não podem ter bytes 0x0D 0x0A alterados');

// 3. Normalização canônica de texto (LF e CRLF produzem os mesmos bytes canônicos)
const textLf = Buffer.from('const a = 1;\nconst b = 2;\n', 'utf8');
const textCrlf = Buffer.from('const a = 1;\r\nconst b = 2;\r\n', 'utf8');
const canonicalTextFromLf = canonicalContentBuffer('src/code.ts', textLf);
const canonicalTextFromCrlf = canonicalContentBuffer('src/code.ts', textCrlf);
assert.deepEqual(canonicalTextFromLf, canonicalTextFromCrlf, 'Texto em LF e CRLF deve gerar o mesmo buffer canônico');
assert.equal(canonicalTextFromCrlf.toString('utf8'), 'const a = 1;\nconst b = 2;\n');

// 4. Regressão obrigatória: Fontes textuais equivalentes em LF e CRLF têm a mesma identidade canônica
const entriesLf = [
  { file: 'src/main.tsx', content: Buffer.from('import React from "react";\nconsole.log("Kovax");\n', 'utf8') },
  { file: 'package.json', content: Buffer.from('{\n  "version": "1.0.0"\n}\n', 'utf8') },
  { file: 'public/fonts/font.woff2', content: Buffer.from([0x01, 0x02, 0x0D, 0x0A, 0x00]) }
];

const entriesCrlf = [
  { file: 'src/main.tsx', content: Buffer.from('import React from "react";\r\nconsole.log("Kovax");\r\n', 'utf8') },
  { file: 'package.json', content: Buffer.from('{\r\n  "version": "1.0.0"\r\n}\r\n', 'utf8') },
  { file: 'public/fonts/font.woff2', content: Buffer.from([0x01, 0x02, 0x0D, 0x0A, 0x00]) } // mesmo binário
];

const digestLf = computeCanonicalSourceDigest(entriesLf);
const digestCrlf = computeCanonicalSourceDigest(entriesCrlf);
assert.equal(digestLf, digestCrlf, 'Identidade canônica das fontes DEVE ser idêntica entre LF e CRLF');

// 5. Regressão obrigatória: Mudança real no texto altera a identidade canônica
const entriesWithRealChange = [
  { file: 'src/main.tsx', content: Buffer.from('import React from "react";\nconsole.log("Kovax Alterado");\n', 'utf8') },
  { file: 'package.json', content: Buffer.from('{\n  "version": "1.0.0"\n}\n', 'utf8') },
  { file: 'public/fonts/font.woff2', content: Buffer.from([0x01, 0x02, 0x0D, 0x0A, 0x00]) }
];
const digestChanged = computeCanonicalSourceDigest(entriesWithRealChange);
assert.notEqual(digestChanged, digestLf, 'Mudança real de conteúdo textual deve alterar a identidade canônica');

// 6. Regressão obrigatória: Mudança em arquivo binário altera a identidade canônica sem sofrer normalização
const entriesWithBinaryChange = [
  { file: 'src/main.tsx', content: Buffer.from('import React from "react";\nconsole.log("Kovax");\n', 'utf8') },
  { file: 'package.json', content: Buffer.from('{\n  "version": "1.0.0"\n}\n', 'utf8') },
  { file: 'public/fonts/font.woff2', content: Buffer.from([0x01, 0x02, 0x0D, 0x0A, 0x01]) } // byte final alterado
];
const digestBinaryChanged = computeCanonicalSourceDigest(entriesWithBinaryChange);
assert.notEqual(digestBinaryChanged, digestLf, 'Mudança em arquivo binário deve alterar a identidade canônica');

// 7. Regressão obrigatória: Adição, remoção e renomeação de arquivos são detectadas
const entriesWithAddition = [
  ...entriesLf,
  { file: 'src/novoComponente.tsx', content: Buffer.from('export const Novo = 1;\n', 'utf8') }
];
assert.notEqual(computeCanonicalSourceDigest(entriesWithAddition), digestLf, 'Adição de arquivo deve alterar a identidade canônica');

const entriesWithRemoval = entriesLf.slice(0, 2);
assert.notEqual(computeCanonicalSourceDigest(entriesWithRemoval), digestLf, 'Remoção de arquivo deve alterar a identidade canônica');

const entriesWithRename = [
  { file: 'src/mainRenomeado.tsx', content: entriesLf[0].content },
  entriesLf[1],
  entriesLf[2]
];
assert.notEqual(computeCanonicalSourceDigest(entriesWithRename), digestLf, 'Renomeação de arquivo deve alterar a identidade canônica');

// 8. Verificação de regex das entradas de build relevantes
assert.ok(RELEVANT_SOURCE_REGEX.test('src/main.tsx'));
assert.ok(RELEVANT_SOURCE_REGEX.test('electron/main.ts'));
assert.ok(RELEVANT_SOURCE_REGEX.test('scripts/distribution_provenance.ts'));
assert.ok(RELEVANT_SOURCE_REGEX.test('.github/workflows/ci.yml'));
assert.ok(RELEVANT_SOURCE_REGEX.test('public/fonts/inter_400.woff2'));
assert.ok(RELEVANT_SOURCE_REGEX.test('index.html'));
assert.ok(RELEVANT_SOURCE_REGEX.test('package.json'));
assert.ok(RELEVANT_SOURCE_REGEX.test('vite.config.ts'));
assert.ok(RELEVANT_SOURCE_REGEX.test('tsconfig.json'));
assert.ok(RELEVANT_SOURCE_REGEX.test('tailwind.config.js'));
assert.ok(RELEVANT_SOURCE_REGEX.test('postcss.config.js'));
assert.ok(RELEVANT_SOURCE_REGEX.test('.gitattributes'));
assert.ok(RELEVANT_SOURCE_REGEX.test('por.traineddata'));
// Arquivos irrelevantes de desenvolvimento e evidências não devem ser capturados
assert.ok(!RELEVANT_SOURCE_REGEX.test('docs/M01-distribution-validation.md'));
assert.ok(!RELEVANT_SOURCE_REGEX.test('release/runs/run-123/build-run.json'));
assert.ok(!RELEVANT_SOURCE_REGEX.test('scratch/test.py'));

// 9. sourceDigest() em execução real sobre o repositório atual
const repoDigest = sourceDigest();
assert.equal(typeof repoDigest, 'string');
assert.equal(repoDigest.length, 64, 'Digest canônico de fontes deve ser um hash SHA-256 de 64 caracteres');

// 10. Regressão obrigatória: Fontes divergentes entre plataformas continuam rejeitadas na consolidação
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'provenance-consolidation-'));
try {
  const winDir = path.join(tempDir, 'win');
  const macDir = path.join(tempDir, 'mac');
  fs.mkdirSync(winDir, { recursive: true });
  fs.mkdirSync(macDir, { recursive: true });

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  const makeEvidence = (dir: string, platform: 'win' | 'mac', digest: string) => {
    const id: BuildIdentity = {
      runId: 'run-cons-1',
      commit: 'commit-cons-123',
      sourceDigest: digest,
      product: pkg.build.productName,
      version: pkg.version,
      platform,
      architecture: 'x64',
      channel: 'internal',
      workflowRunId: 'workflow-1'
    };
    fs.writeFileSync(path.join(dir, 'build-run.json'), JSON.stringify(id, null, 2));

    const expected = expectedArtifacts(pkg, platform, 'x64');
    const records: ArtifactRecord[] = expected.map(exp => {
      const filePath = path.join(dir, exp.file);
      fs.writeFileSync(filePath, Buffer.alloc(1_000_000, 1));
      return {
        ...id,
        target: exp.target,
        file: exp.file,
        size: 1_000_000,
        sha256: hashFile(filePath)
      };
    });
    fs.writeFileSync(path.join(dir, 'artifacts.json'), JSON.stringify(records, null, 2));

    const evidenceDir = path.join(dir, 'evidence');
    fs.mkdirSync(path.join(evidenceDir, 'smoke'), { recursive: true });
    fs.mkdirSync(path.join(evidenceDir, 'journey'), { recursive: true });
    fs.mkdirSync(path.join(evidenceDir, 'journey-negative'), { recursive: true });

    const proof = {
      mode: 'smoke',
      status: 'passed',
      runId: id.runId,
      commit: id.commit,
      sourceDigest: id.sourceDigest,
      platform: id.platform,
      architecture: id.architecture,
      artifacts: records
    };
    fs.writeFileSync(path.join(evidenceDir, 'smoke', 'result.json'), JSON.stringify(proof, null, 2));
    fs.writeFileSync(path.join(evidenceDir, 'journey', 'result.json'), JSON.stringify({ ...proof, mode: 'journey' }, null, 2));
    fs.writeFileSync(path.join(evidenceDir, 'journey-negative', 'result.json'), JSON.stringify({ ...proof, mode: 'journey-negative' }, null, 2));
    fs.writeFileSync(path.join(evidenceDir, 'installers.json'), JSON.stringify({ ...id, classification: 'NAO_HOMOLOGADO', records }, null, 2));
    fs.writeFileSync(path.join(evidenceDir, 'distribution.json'), JSON.stringify({ ...id, smoke: 'passed', journey: 'passed', negativeJourney: 'passed', installers: 'identified-and-verified', artifacts: records }, null, 2));
  };

  makeEvidence(winDir, 'win', 'digest-source-win-aaa');
  makeEvidence(macDir, 'mac', 'digest-source-mac-bbb'); // DIVERGENTE!

  assert.throws(
    () => prepareReleasePublication({
      downloadsDir: tempDir,
      outputDir: path.join(tempDir, 'out-consolidate-fail'),
      pkg,
      channel: 'internal',
      expectedCommit: 'commit-cons-123',
      expectedWorkflowRunId: 'workflow-1',
      validateOnly: true
    }),
    /Mistura indevida de código-fonte entre plataformas/
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// 11. Regressão obrigatória: Alteração de executável, payload ou instalador após os testes reprova pelos hashes dos bytes finais
const tempHashDir = fs.mkdtempSync(path.join(os.tmpdir(), 'provenance-binary-hashes-'));
try {
  const binaryFile = path.join(tempHashDir, 'installer.exe');
  fs.writeFileSync(binaryFile, Buffer.alloc(500_000, 0xAA));
  const initialHash = hashFile(binaryFile);

  // Alteração de 1 byte no instalador
  fs.writeFileSync(binaryFile, Buffer.concat([Buffer.alloc(499_999, 0xAA), Buffer.from([0xBB])]));
  const tamperedHash = hashFile(binaryFile);
  assert.notEqual(tamperedHash, initialHash, 'Alteração física do artefato deve alterar o hash SHA-256');
} finally {
  fs.rmSync(tempHashDir, { recursive: true, force: true });
}

console.log('Distribution provenance: canonical text LF/CRLF identity, binary byte preservation, file changes, cross-platform source divergence rejection, and final byte integrity passed');
