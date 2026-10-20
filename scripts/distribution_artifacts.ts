import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type DistributionPlatform = 'win' | 'mac' | 'linux';
export interface BuildIdentity {
  runId: string; commit: string; sourceDigest: string; product: string; version: string;
  platform: DistributionPlatform; architecture: string; channel: 'internal' | 'official';
}
export interface ArtifactRecord extends BuildIdentity { target: string; file: string; size: number; sha256: string }
export interface DistributionPackage {
  name: string; version: string;
  build: { productName: string; artifactName: string; win: { target: string[] }; mac: { target: string[] }; linux: { target: string[] }; nsis: { artifactName: string }; portable: { artifactName: string } };
}
export function expectedArtifacts(pkg: DistributionPackage, platform: DistributionPlatform, architecture: string) {
  return pkg.build[platform].target.map(target => {
    const ext = ({ nsis: 'exe', portable: 'exe', dmg: 'dmg', zip: 'zip', AppImage: 'AppImage', deb: 'deb', rpm: 'rpm' } as Record<string, string>)[target];
    assert.ok(ext, `Target sem identificação explícita: ${target}`);
    const template = target === 'nsis' ? pkg.build.nsis.artifactName : target === 'portable' ? pkg.build.portable.artifactName : pkg.build.artifactName;
    const values: Record<string, string> = { productName: pkg.build.productName, name: pkg.name, version: pkg.version, os: platform, arch: architecture, ext };
    const file = template.replace(/\$\{(\w+)\}/g, (_, key: string) => { assert.ok(values[key], `Macro desconhecida: ${key}`); return values[key]; });
    assert.equal(path.basename(file), file, 'Nome de artefato deve ser local');
    return { target, file };
  });
}
export function validateArtifactInventory(expected: { target: string; file: string }[], identity: BuildIdentity, records: ArtifactRecord[], observedFiles: string[]): void {
  assert.equal(records.length, expected.length, 'Quantidade de targets divergente');
  assert.equal(new Set(records.map(r => r.target)).size, records.length, 'Target duplicado');
  assert.equal(new Set(records.map(r => r.file)).size, records.length, 'Artefato duplicado');
  assert.deepEqual([...observedFiles].sort(), expected.map(e => e.file).sort(), 'Artefatos ausentes, antigos, misturados ou inesperados');
  for (const item of expected) {
    const record = records.find(r => r.target === item.target);
    assert.ok(record && record.file === item.file, `Target obrigatório ausente ou incorreto: ${item.target}`);
    for (const key of Object.keys(identity) as (keyof BuildIdentity)[]) assert.equal(record[key], identity[key], `Proveniência divergente: ${key}`);
    assert.ok(record.size >= 1_000_000, `Instalador truncado: ${record.file}`);
    assert.match(record.sha256, /^[a-f0-9]{64}$/);
  }
}
export const hashFile = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function reserveDistributionDirectory(output: string): void {
  if (fs.existsSync(output)) throw new Error(`Saída deve ser nova e exclusiva: ${output}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(output);
}
export function assertNoPublication(args: string[]): void {
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--publish' && args[index + 1] !== 'never') throw new Error('Publicação pelo builder é proibida');
    if (args[index].startsWith('--publish=') && args[index] !== '--publish=never') throw new Error('Publicação pelo builder é proibida');
  }
}
export function verifyArtifactDirectory(root: string, pkg: DistributionPackage, expectedIdentity: Partial<BuildIdentity>) {
  const identity: BuildIdentity = JSON.parse(fs.readFileSync(path.join(root, 'build-run.json'), 'utf8'));
  for (const [key, value] of Object.entries(expectedIdentity)) assert.equal(identity[key as keyof BuildIdentity], value, `Build incorreto: ${key}`);
  assert.equal(identity.product, pkg.build.productName); assert.equal(identity.version, pkg.version);
  const records: ArtifactRecord[] = JSON.parse(fs.readFileSync(path.join(root, 'artifacts.json'), 'utf8'));
  const files = fs.readdirSync(root).filter(f => /\.(exe|dmg|zip|AppImage|deb|rpm)$/i.test(f));
  validateArtifactInventory(expectedArtifacts(pkg, identity.platform, identity.architecture), identity, records, files);
  for (const record of records) {
    assert.equal(fs.statSync(path.join(root, record.file)).size, record.size, 'Tamanho final divergente');
    assert.equal(hashFile(path.join(root, record.file)), record.sha256, 'Hash final divergente');
  }
  return { identity, records };
}
