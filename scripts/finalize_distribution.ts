import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { verifyArtifactDirectory } from './distribution_artifacts';
import { distributionRoot, sourceDigest } from './distribution_provenance';
import { distributionChannel, readAndValidateDistributionProof, readAndValidateInstallersProof } from './distribution_contract';
import { generateReleaseManifest } from './generate_release_manifest';

const root = distributionRoot();
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const { identity, records } = verifyArtifactDirectory(root, pkg, { channel: distributionChannel(), sourceDigest: sourceDigest() });
const requiredProofModes = ['smoke', 'journey', 'journey-negative'] as const;
for (const mode of requiredProofModes) {
  const resultPath = path.join(root, 'evidence', mode, 'result.json');
  readAndValidateDistributionProof(resultPath, mode, identity, records, { checkExecutableAndPayload: true });
}
const installersPath = path.join(root, 'evidence', 'installers.json');
readAndValidateInstallersProof(installersPath, identity, records);
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
