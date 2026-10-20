import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { assertOcrAssets } from '../electron/main/packagedSmokeChecks.ts';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const file of ['dist/index.html', 'dist-electron/main.js', 'dist-electron/preload.cjs']) assert.ok(fs.statSync(file).size > 0, `${file} obrigatório`);
assertOcrAssets(file => fs.statSync(path.join('dist/tessdata', file)).size);
for (const root of ['dist', 'dist-electron']) {
  const inspect = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      assert.ok(!/\.py$|^\.venv$|^tests?$/i.test(entry.name), `Runtime de desenvolvimento proibido: ${path.join(dir, entry.name)}`);
      if (entry.isDirectory()) inspect(path.join(dir, entry.name));
    }
  };
  inspect(root);
}
assert.deepEqual(pkg.build.files, ['dist/**/*', 'dist-electron/**/*']);
assert.equal(pkg.build.appId, 'com.kovaxfiles.desktop');
assert.equal(pkg.build.win.signAndEditExecutable, true);
assert.equal(pkg.build.win.verifyUpdateCodeSignature, true);
assert.equal(pkg.build.mac.hardenedRuntime, true);
assert.equal(pkg.build.mac.gatekeeperAssess, true);
const entitlements = fs.readFileSync(pkg.build.mac.entitlements, 'utf8');
assert.ok(entitlements.includes('com.apple.security.cs.allow-jit') && entitlements.includes('<false/>'));
const fonts = fs.readdirSync('dist/fonts');
assert.ok(fonts.some(file => /\.(ttf|woff2|otf)$/.test(file)), 'Fontes offline obrigatórias');
console.log('Configuração e bundle aprovados; execução e instaladores exigem gates separados.');
