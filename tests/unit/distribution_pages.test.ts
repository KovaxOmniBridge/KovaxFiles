import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load, dump } from 'js-yaml';
import { landingFiles, prepareLandingArtifact } from '../../scripts/prepare_landing_artifact.ts';

export function validateLandingWorkflow(source: string): void {
  const workflow = load(source) as { on: { push: { paths: string[] } }; jobs: { deploy: { steps: { uses?: string; with?: { path?: string }; run?: string }[] } } };
  assert.deepEqual([...workflow.on.push.paths].sort(), landingFiles.map(f => 'docs/' + f).sort(), 'Deploy automático deve limitar-se aos arquivos da landing page');
  const steps = workflow.jobs.deploy.steps;
  assert.ok(steps.some(s => s.run === 'node scripts/prepare_landing_artifact.ts'), 'Publicação exige staging da lista permitida');
  assert.equal(steps.find(s => s.uses?.startsWith('actions/upload-pages-artifact@'))?.with?.path, 'release/pages-artifact', 'Relatórios internos não podem integrar o artefato de Pages');
}
const workflow = fs.readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
validateLandingWorkflow(workflow);
validateLandingWorkflow(workflow.replace(/\r?\n/g, '\r\n'));
const fixture = load(workflow) as any;
fixture.on.push.paths = ['docs/**'];
assert.throws(() => validateLandingWorkflow(dump(fixture)));
const internalChanges = ['docs/M01-distribution-validation.md', 'docs/evidence/m01/run/result.json', '.github/workflows/deploy-pages.yml'];
assert.ok(internalChanges.every(file => !landingFiles.some(site => file === 'docs/' + site)));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'm01-pages-'));
try {
  const source = path.join(temp, 'docs'), target = path.join(temp, 'pages');
  fs.mkdirSync(source);
  for (const file of landingFiles) fs.writeFileSync(path.join(source, file), file);
  fs.mkdirSync(path.join(source, 'evidence'));
  fs.writeFileSync(path.join(source, 'evidence', 'internal.json'), 'internal');
  fs.writeFileSync(path.join(source, 'M01-distribution-validation.md'), 'internal report');
  prepareLandingArtifact(source, target);
  assert.deepEqual(fs.readdirSync(target).sort(), [...landingFiles].sort());
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log('Pages isolation: internal changes do not trigger deployment or enter its artifact');
