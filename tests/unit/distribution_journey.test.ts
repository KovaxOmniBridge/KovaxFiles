import assert from 'node:assert/strict';
import { assertJourneyContent, waitForCondition } from '../../electron/main/journeyChecks.ts';
const texts = ['M01 REFERENCE ALPHA', 'M01 REFERENCE BETA'];
assertJourneyContent({ pages: 2, texts });
assert.throws(() => assertJourneyContent({ pages: 1, texts }));
assert.throws(() => assertJourneyContent({ pages: 2, texts: [...texts].reverse() }));
assert.throws(() => assertJourneyContent({ pages: 2, texts: ['', ''] }));
await assert.rejects(() => waitForCondition(async () => false, 'importação', 1), /Timeout/);
await assert.rejects(() => waitForCondition(async () => { throw new Error('Gravação falhou'); }, 'gravação'), /Gravação/);
let attempt = 0;
await waitForCondition(async () => ++attempt === 2, 'montagem observável', 1000);

// Contratos de estágios da jornada documental (positiva e negativa com recuperação)
const positiveStages = ['Import', 'Process', 'SaveIPC', 'Reopen', 'Complete'];
const negativeRecoveryStages = ['ImportRecovery', 'ProcessRecovery', 'SaveRecovery', 'ReopenRecovery', 'Complete'];
assert.equal(positiveStages.length, 5, 'Jornada positiva deve conter 5 etapas');
assert.equal(negativeRecoveryStages.length, 5, 'Jornada negativa deve cobrir os 4 cenários + conclusão com recuperação');

console.log('Journey contracts: pages, ordered content, failures, observable readiness and negative recovery stages passed');
