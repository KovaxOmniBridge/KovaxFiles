import fs from 'node:fs';
import path from 'node:path';
import { distributionChannel, resolvePackagedExecutable, verifyOfficialSignature } from './distribution_contract';
import { verifyArtifactDirectory } from './distribution_artifacts';
import { distributionRoot, sourceDigest } from './distribution_provenance';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const root = distributionRoot();
const channel = distributionChannel();
const platform = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
const { identity, records } = verifyArtifactDirectory(root, pkg, { platform, architecture: process.arch, channel, sourceDigest: sourceDigest() });
const executable = resolvePackagedExecutable(root, pkg);
if (channel === 'official') {
  verifyOfficialSignature(executable);
  for (const artifact of records.filter(r => r.target !== 'zip')) verifyOfficialSignature(path.join(root, artifact.file));
}
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(root, 'evidence', 'installers.json'), JSON.stringify({ ...identity, classification: channel === 'internal' ? 'NAO_HOMOLOGADO' : 'OFFICIAL_SIGNATURE_VERIFIED', records, cleanMachineAcceptance: 'pending', guarantees: 'Builder identity, final hashes and official native signature gate; does not attest installation' }, null, 2));
console.log(`Targets verificados: ${records.map(r => r.target).join(', ')}; ${channel === 'internal' ? 'NÃO HOMOLOGADO' : 'assinaturas oficiais verificadas'}`);
