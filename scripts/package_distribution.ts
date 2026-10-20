import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build, Arch, Platform } from 'electron-builder';
import { sourceDigest } from './distribution_provenance';
import { distributionChannel } from './distribution_contract';
import { expectedArtifacts, hashFile, reserveDistributionDirectory, assertNoPublication, type ArtifactRecord, type BuildIdentity, type DistributionPlatform } from './distribution_artifacts';

const args = process.argv.slice(2);
assertNoPublication(args);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const platform: DistributionPlatform = args.includes('--win') ? 'win' : args.includes('--mac') ? 'mac' : args.includes('--linux') ? 'linux' : process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
const architecture = args.includes('--arm64') ? 'arm64' : args.includes('--x64') ? 'x64' : process.arch;
if (architecture !== 'x64' && architecture !== 'arm64') throw new Error('Arquitetura fora do escopo de distribuição');
const requiresSigning = args.some(a => a.includes('forceCodeSigning=true'));
const channel = process.env.DISTRIBUTION_CHANNEL ? distributionChannel() : requiresSigning || args.includes('--official') ? 'official' : distributionChannel({ DISTRIBUTION_CHANNEL: 'internal', ALLOW_UNSIGNED_INTERNAL: args.includes('--allow-unsigned-internal') ? 'true' : '' });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const runId = `${Date.now()}-${commit.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
const output = path.resolve(process.env.RELEASE_DIR || args.find(a => a.startsWith('--config.directories.output='))?.split('=')[1] || path.join('release/runs', runId));
reserveDistributionDirectory(output);
const identity: BuildIdentity = { runId, commit, sourceDigest: sourceDigest(), product: pkg.build.productName, version: pkg.version, platform, architecture, channel };
fs.writeFileSync(path.join(output, 'build-run.json'), JSON.stringify(identity, null, 2));
const records: ArtifactRecord[] = [];
const expected = expectedArtifacts(pkg, platform, architecture);
const builderPlatform = platform === 'win' ? Platform.WINDOWS : platform === 'mac' ? Platform.MAC : Platform.LINUX;
await build({
  targets: builderPlatform.createTarget(undefined, Arch[architecture]), publish: 'never',
  config: {
    directories: { output }, forceCodeSigning: requiresSigning || (channel === 'official' && platform !== 'linux'),
    ...(channel === 'official' && platform === 'mac' ? { dmg: { sign: true } } : {}),
    artifactBuildCompleted: event => {
      if (!event.target || !/\.(exe|dmg|zip|AppImage|deb|rpm)$/i.test(event.file)) return;
      if (event.arch === null || Arch[event.arch] !== architecture || event.packager.platform.buildConfigurationKey !== platform || event.packager.appInfo.version !== pkg.version) throw new Error('Metadados reais do builder divergem da execução');
      const file = path.basename(event.file);
      if (!expected.some(e => e.target === event.target!.name && e.file === file)) throw new Error(`Target inesperado do empacotador: ${event.target.name}/${file}`);
      records.push({ ...identity, target: event.target.name, file, size: fs.statSync(event.file).size, sha256: hashFile(event.file) });
    }
  }
});
fs.writeFileSync(path.join(output, 'artifacts.json'), JSON.stringify(records, null, 2));
fs.mkdirSync('release', { recursive: true });
fs.writeFileSync('release/last-run.json', JSON.stringify({ directory: output, runId }, null, 2));
console.log(`DISTRIBUTION_OUTPUT=${output}`);
