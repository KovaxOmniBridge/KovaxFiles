import fs from 'node:fs';
import path from 'node:path';
import { distributionChannel, resolvePackagedExecutable, verifyOfficialSignature } from './distribution_contract';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const root = process.env.RELEASE_DIR || pkg.build.directories.output;
const channel = distributionChannel();
const executable = resolvePackagedExecutable(root, pkg);
const extensions = process.platform === 'win32' ? ['.exe'] : process.platform === 'darwin' ? ['.dmg', '.zip'] : ['.AppImage', '.deb', '.rpm'];
const files = fs.readdirSync(root).filter(f => extensions.includes(path.extname(f)));
if (!files.length) throw new Error('Instaladores obrigatórios ausentes');
if (process.platform === 'win32' && files.length < 2) throw new Error('Windows exige NSIS e portable');
if (process.platform === 'darwin' && !extensions.every(ext => files.some(file => file.endsWith(ext)))) throw new Error('macOS exige DMG e ZIP');
for (const file of files) {
  if (fs.statSync(path.join(root, file)).size < 1_000_000) throw new Error(`Instalador truncado: ${file}`);
}
if (channel === 'official') {
  verifyOfficialSignature(executable);
  for (const file of files.filter(f => !f.endsWith('.zip'))) verifyOfficialSignature(path.resolve(root, file));
}
console.log(`Instaladores verificados: ${files.join(', ')}; ${channel === 'internal' ? 'NÃO HOMOLOGADO, assinatura não atestada' : 'canal oficial'}`);
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(root, 'evidence', 'installers.json'), JSON.stringify({
  channel, classification: channel === 'internal' ? 'NAO_HOMOLOGADO' : 'OFFICIAL_SIGNATURE_VERIFIED',
  files, cleanMachineAcceptance: 'pending'
}, null, 2));
