import assert from 'node:assert/strict';
import fs from 'node:fs';
import { load, dump } from 'js-yaml';
import { validateWorkflow, validateBuilderScripts } from '../../scripts/workflow_policy.ts';
const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
for (const file of ['.github/workflows/ci.yml', '.github/workflows/build-release.yml']) {
  const lf = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  validateWorkflow(lf, scripts);
  validateWorkflow(lf.replace(/\n/g, '\r\n'), scripts);
  validateWorkflow(dump(load(lf), { indent: 4, sortKeys: true, flowLevel: 4 }), scripts);
}
const base = load(fs.readFileSync('.github/workflows/build-release.yml', 'utf8')) as any;
function rejects(mutate: (workflow: any) => void) {
  const fixture = structuredClone(base); mutate(fixture);
  assert.throws(() => validateWorkflow(dump(fixture), scripts));
}
rejects(w => w.permissions.contents = 'write');
rejects(w => w.jobs.preflight_ci.permissions = { contents: 'write' });
rejects(w => w.jobs.preflight_ci.permissions = 'write-all');
rejects(w => w.jobs.preflight_ci.permissions = { packages: 'write' });
rejects(w => w.jobs.build_installers.env = { RELEASE_DIR: 'release/${{ runner.os }}' });
rejects(w => w.jobs.build_installers.steps.unshift({ run: 'npm run test:release' }));
rejects(w => w.jobs.build_installers.steps.unshift({ run: 'npm run test:release && npm run package:internal' }));
rejects(w => w.jobs.build_installers.steps.push({ run: 'npm run test:journey || true' }));
rejects(w => w.jobs.build_installers.steps = w.jobs.build_installers.steps.filter((s: { run?: string }) => s.run !== 'npm run test:installers'));
rejects(w => w.jobs.build_installers.steps = w.jobs.build_installers.steps.filter((s: { run?: string }) => s.run !== 'npm run distribution:finalize'));
rejects(w => w.jobs.build_installers.steps.unshift({ uses: 'softprops/action-gh-release@v2' }));
rejects(w => w.jobs.publish_release.if = 'always()');
rejects(w => w.jobs.build_installers.steps.push({ run: 'npx electron-builder --publish always' }));
assert.throws(() => validateBuilderScripts({ package: 'electron-builder --win' }));
assert.throws(() => validateBuilderScripts({ package: 'electron-builder --publish never --publish always' }));
assert.throws(() => validateBuilderScripts({ package: 'tsx scripts/package_distribution.ts' }));
validateBuilderScripts({ package: 'electron-builder --win --publish never' });
console.log('Workflow policy: LF/CRLF, reformatting and negative fixtures passed');
