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
const proofs = ['smoke', 'journey'].map(mode => JSON.parse(fs.readFileSync(path.join(root, 'evidence', mode, 'result.json'), 'utf8')));
for (const proof of proofs) {
  assert.equal(proof.status, 'passed', 'Smoke e jornada devem passar');
  assert.equal(proof.runId, identity.runId); assert.equal(proof.sourceDigest, identity.sourceDigest);
  assert.deepEqual(proof.artifacts, records, 'Provas devem atestar os mesmos bytes finais');
  assert.equal(proof.executableSha256, hashFile(proof.executable), 'Executável mudou após a validação');
  assert.equal(proof.payloadSha256, hashFile(proof.payloadPath), 'Payload mudou após a validação');
}
const installers = JSON.parse(fs.readFileSync(path.join(root, 'evidence', 'installers.json'), 'utf8'));
assert.equal(installers.runId, identity.runId); assert.deepEqual(installers.records, records);
const manifest = generateReleaseManifest({ dir: root, requiredPlatforms: [identity.platform] });
for (const artifact of records) assert.equal(manifest.entries.find(e => e.file === artifact.file)?.sha256, artifact.sha256);
fs.writeFileSync(path.join(root, 'evidence', 'distribution.json'), JSON.stringify({ ...identity, classification: identity.channel === 'internal' ? 'NAO_HOMOLOGADO' : 'SIGNED_ARTIFACTS_VERIFIED', artifacts: records, smoke: 'passed', journey: 'passed', installers: 'identified-and-verified', cleanMachineAcceptance: 'pending', manifest: path.basename(manifest.manifestPath) }, null, 2));
console.log('Manifesto final associado à execução, código-fonte, commit-base, versão, arquitetura, canal e provas reais.');
