import { load } from 'js-yaml';
import assert from 'node:assert/strict';

type Step = { run?: string; uses?: string };
type Permissions = Record<string, string> | string;
type Job = { permissions?: Permissions; if?: string; needs?: string | string[]; steps?: Step[]; env?: Record<string, string> };
type Workflow = { permissions?: Permissions; jobs: Record<string, Job> };
const publicationGuard = "startsWith(github.ref, 'refs/tags/') && (inputs.allow_unsigned_dev != true)";
const expression = (value: string) => value.replace(/^\s*\$\{\{|\}\}\s*$/g, '').replace(/\s+/g, '');
function readOnly(permissions: Permissions | undefined): boolean {
  return permissions === 'read-all' || (!!permissions && typeof permissions === 'object' && permissions.contents === 'read' && !Object.values(permissions).some(p => p === 'write'));
}
function noWrite(permissions: Permissions | undefined): boolean {
  return permissions === undefined || permissions === 'read-all' || (typeof permissions === 'object' && !Object.values(permissions).some(p => p === 'write'));
}
export function validateBuilderScripts(scripts: Record<string, string>): void {
  for (const command of Object.values(scripts)) {
    if (!/\belectron-builder\b|\bpackage_distribution\.ts\b/.test(command)) continue;
    const options = [...command.matchAll(/--publish(?:=|\s+)([\w-]+)/g)].map(m => m[1]);
    assert.ok(options.length > 0 && options.every(value => value === 'never'), 'Builder: publicação implícita ou pública proibida');
  }
}
export function validateWorkflow(source: string, scripts: Record<string, string>): void {
  const workflow = load(source) as Workflow;
  assert.ok(workflow && workflow.jobs && readOnly(workflow.permissions), 'Permissões globais devem ser somente leitura');
  validateBuilderScripts(scripts);
  for (const platform of ['win', 'mac']) assert.ok(scripts[`package:release:${platform}`]?.includes(`--config.${platform}.forceCodeSigning=true`), `Canal oficial ${platform} deve exigir assinatura`);
  for (const [id, job] of Object.entries(workflow.jobs)) {
    for (const value of Object.values(job.env || {})) assert.ok(!/\$\{\{[^}]*\brunner\s*\./.test(String(value)), `${id}: contexto runner indisponível em env do job; usar matrix`);
    const publishing = id === 'publish_release';
    if (publishing) {
      assert.ok(typeof job.permissions === 'object' && job.permissions.contents === 'write', 'Publicação exige permissão explícita');
      assert.equal(expression(job.if || ''), expression(publicationGuard), 'Publicação deve exigir tag oficial e rejeitar unsigned');
      assert.ok([job.needs].flat().includes('build_installers'), 'Publicação exige instaladores validados');
    } else assert.ok(noWrite(job.permissions), `Job interno ${id} não pode adquirir escrita`);
    let packaged = false;
    let smoked = false, journey = false, journeyNegative = false, installers = false, finalized = false;
    for (const step of job.steps || []) {
      const run = step.run || '';
      const publishes = /(?:action-gh-release|release-action)@/.test(step.uses || '') || /\bgh\s+release\s+(?:create|upload)|\bcurl\b[^\n]*\/releases\b/.test(run);
      assert.ok(!publishes || publishing, `Publicação interna proibida: ${id}`);
      for (const line of run.split(/\r?\n/)) {
        validateBuilderScripts({ step: line });
        const commands = [...line.matchAll(/\bnpm\s+run\s+(package:[\w:-]+|test:(?:release|journey(?::negative)?|installers)|distribution:finalize)\b|\belectron-builder\b/g)];
        for (const command of commands) {
          if (command[1]?.startsWith('test:') || command[1] === 'distribution:finalize') {
            assert.ok(packaged, `${id}: smoke/jornada antes do pacote`);
            assert.ok(!/\|\|\s*true\b/.test(line), 'Falhas obrigatórias não podem ser ignoradas');
            if (command[1] === 'test:release') smoked = true;
            if (command[1] === 'test:journey') { assert.ok(smoked, 'Jornada deve seguir smoke'); journey = true; }
            if (command[1] === 'test:journey:negative') { assert.ok(journey, 'Jornada negativa deve seguir jornada positiva'); journeyNegative = true; }
            if (command[1] === 'test:installers') { assert.ok(smoked && journey && journeyNegative, 'Instaladores exigem smoke, jornada positiva e jornada negativa'); installers = true; }
            if (command[1] === 'distribution:finalize') { assert.ok(installers, 'Manifesto exige validação de instaladores/assinaturas'); finalized = true; }
          } else { packaged = true; smoked = journey = journeyNegative = installers = finalized = false; }
        }
      }
    }
    if (packaged) assert.ok(smoked && journey && journeyNegative && installers && finalized, `${id}: pacote exige todos os gates posteriores`);
  }
}
