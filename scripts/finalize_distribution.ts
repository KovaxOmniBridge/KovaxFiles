import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { verifyArtifactDirectory, hashFile } from './distribution_artifacts';
import { distributionRoot, sourceDigest } from './distribution_provenance';
import { distributionChannel } from './distribution_contract';
import { generateReleaseManifest } from './generate_release_manifest';

const root = distributionRoot();
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const { identity, records } = verifyArtifactDirectory(root, pkg, { channel: distributionChannel(), sourceDigest: sourceDigest() });
const requiredProofModes = ['smoke', 'journey', 'journey-negative'] as const;
for (const mode of requiredProofModes) {
  const resultPath = path.join(root, 'evidence', mode, 'result.json');
  if (!fs.existsSync(resultPath)) {
    throw new Error(`[ERRO DE DISTRIBUIÇÃO] Evidência obrigatória ausente: ${mode} em ${resultPath}`);
  }
  const proof = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  assert.equal(proof.mode, mode, `Tipo de prova incorreto para ${mode}: esperado ${mode}, obtido ${proof.mode}`);
  assert.equal(proof.status, 'passed', `Smoke e jornadas devem passar: ${mode} teve status "${proof.status}"`);
  assert.equal(proof.runId, identity.runId, `Prova ${mode} pertence a outra execução: ${proof.runId} vs ${identity.runId}`);
  assert.equal(proof.sourceDigest, identity.sourceDigest, `Digest de fontes divergente na prova ${mode}`);
  assert.equal(proof.platform, identity.platform, `Plataforma divergente na prova ${mode}`);
  assert.equal(proof.architecture, identity.architecture, `Arquitetura divergente na prova ${mode}`);
  assert.deepEqual(proof.artifacts, records, `Provas de ${mode} devem atestar os mesmos bytes finais`);
  assert.equal(proof.executableSha256, hashFile(proof.executable), `Executável mudou após a validação de ${mode}`);
  assert.equal(proof.payloadSha256, hashFile(proof.payloadPath), `Payload mudou após a validação de ${mode}`);
}
const installersPath = path.join(root, 'evidence', 'installers.json');
if (!fs.existsSync(installersPath)) {
  throw new Error(`[ERRO DE DISTRIBUIÇÃO] Evidência de validação de instaladores ausente: ${installersPath}`);
}
const installers = JSON.parse(fs.readFileSync(installersPath, 'utf8'));
assert.equal(installers.runId, identity.runId, 'Validação de instaladores pertence a outra execução');
assert.deepEqual(installers.records, records, 'Registros de instaladores divergem');
const manifest = generateReleaseManifest({ dir: root, requiredPlatforms: [identity.platform] });
for (const artifact of records) assert.equal(manifest.entries.find(e => e.file === artifact.file)?.sha256, artifact.sha256);
fs.writeFileSync(path.join(root, 'evidence', 'distribution.json'), JSON.stringify({
  ...identity,
  classification: identity.channel === 'internal' ? 'NAO_HOMOLOGADO' : 'SIGNED_ARTIFACTS_VERIFIED',
  artifacts: records,
  smoke: 'passed',
  journey: 'passed',
  negativeJourney: 'passed',
  installers: 'identified-and-verified',
  cleanMachineAcceptance: 'pending',
  manifest: path.basename(manifest.manifestPath)
}, null, 2));
console.log('Manifesto final associado à execução, código-fonte, commit-base, versão, arquitetura, canal e provas reais.');
