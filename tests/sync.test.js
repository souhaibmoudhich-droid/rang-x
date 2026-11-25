// Tests de la fusion « meilleur score » (node --test tests/)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { window: {}, TextEncoder, TextDecoder, btoa, atob, URL, console };
vm.createContext(ctx);
for (const f of ['standards.js', 'social.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx);
const So = ctx.window.RX.Social;

test('garde le meilleur score : plus haut pour les reps, plus bas pour les temps', () => {
  const { records, gained } = So.mergeRecords({ pullups: 12, run5k: 1500 }, { pullups: 15, run5k: 1400 }, null);
  assert.equal(records.pullups, 15);
  assert.equal(records.run5k, 1400);
  assert.deepEqual([...gained].sort(), ['pullups', 'run5k']);
});

test('ne remplace pas un meilleur record local par un moins bon en ligne', () => {
  const { records, gained } = So.mergeRecords({ pullups: 20, run5k: 1300 }, { pullups: 15, run5k: 1400 }, null);
  assert.equal(records.pullups, 20);
  assert.equal(records.run5k, 1300);
  assert.equal(gained.length, 0);
});

test('ajoute un record présent seulement en ligne', () => {
  const { records } = So.mergeRecords({}, { dips: 18 }, null);
  assert.equal(records.dips, 18);
});

test("respecte une correction à la baisse faite sur ce téléphone", () => {
  // 30 tractions envoyées, puis corrigées à 25 dans le profil : la ligue n'a que l'ancienne valeur envoyée.
  const { records, gained } = So.mergeRecords({ pullups: 25 }, { pullups: 30 }, { pullups: 30 });
  assert.equal(records.pullups, 25);
  assert.equal(gained.length, 0);
});
