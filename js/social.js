/* Rang X — classement entre amis : codes de partage + ligue en ligne optionnelle (Firebase). */
(function (RX) {
  'use strict';
  const S = RX.Std;
  const REC_KEYS = ['bench', 'squat', 'deadlift', 'pullups', 'dips', 'pushups', 'muscleups', 'plank', 'run5k', 'run10k', 'broadjump', 'vertjump'];

  function card(state, ev) {
    const r = {};
    for (const k of REC_KEYS) if (state.records[k] > 0) r[k] = Math.round(state.records[k] * 10) / 10;
    const p = {};
    for (const pl of S.PILLARS) p[pl.id] = Math.round(ev.pillars[pl.id].score * 100) / 100;
    const bosses = Object.values(state.bosses || {}).reduce((a, b) => a + b, 0);
    return {
      v: 1, id: state.id, n: (state.profile.name || 'Athlète').slice(0, 24), s: state.profile.sex === 'f' ? 'f' : 'm',
      a: +state.profile.age || null, bw: +state.profile.weight || null,
      g: Math.round(ev.global.score * 100) / 100, p, r, xp: state.xp || 0, b: bosses, t: Date.now()
    };
  }

  function b64e(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  const encode = (c) => 'RX1.' + b64e(JSON.stringify(c));

  // Nettoie une carte venant d'un ami (données non fiables).
  function sanitize(c) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^[a-z0-9]{6,32}$/i.test(c.id)) return null;
    const num = (x, max) => (typeof x === 'number' && isFinite(x) && x >= 0 && x <= max ? x : null);
    const out = { v: 1, id: c.id, n: String(c.n || 'Ami').slice(0, 24), s: c.s === 'f' ? 'f' : 'm', a: num(c.a, 120), bw: num(c.bw, 400),
                  g: num(c.g, 6) || 0, p: {}, r: {}, xp: num(c.xp, 1e9) || 0, b: num(c.b, 100) || 0, t: num(c.t, 1e14) || 0 };
    for (const pl of S.PILLARS) out.p[pl.id] = num(c.p && c.p[pl.id], 6) || 0;
    for (const k of REC_KEYS) { const x = num(c.r && c.r[k], 100000); if (x) out.r[k] = x; }
    return out;
  }
  function decode(text) {
    if (!text) return null;
    const m = String(text).match(/RX1\.([A-Za-z0-9_-]+)/);
    if (!m) return null;
    try { return sanitize(JSON.parse(b64d(m[1]))); } catch (e) { return null; }
  }

  // Ligue en ligne : Firebase Realtime Database (REST, sans SDK).
  function validDbUrl(u) {
    try {
      const x = new URL(u);
      return x.protocol === 'https:' && /(\.firebaseio\.com|\.firebasedatabase\.app)$/.test(x.hostname) ? x.origin : null;
    } catch (e) { return null; }
  }
  const validLeague = (c) => /^[A-Za-z0-9_-]{3,32}$/.test(c || '');

  const better = (k, a, b) => (S.METRICS[k].dir > 0 ? a > b : a < b);

  // Règle du meilleur score : garde, pour chaque record, la meilleure valeur entre le téléphone et la ligue.
  // `sent` = records envoyés lors de la dernière synchro réussie : si la ligue n'a que cette valeur,
  // c'est que l'athlète l'a corrigée à la baisse sur ce téléphone, on ne la réimpose donc pas.
  function mergeRecords(local, remote, sent) {
    const records = Object.assign({}, local || {});
    const gained = [];
    for (const k of REC_KEYS) {
      const r = remote && remote[k], l = records[k];
      if (!(r > 0) || (sent && sent[k] === r)) continue;
      if (!(l > 0) || better(k, r, l)) { records[k] = r; gained.push(k); }
    }
    return { records, gained };
  }

  // Lit la ligue, laisse l'app fusionner sa propre fiche (makeCard reçoit la version en ligne, ou null),
  // puis envoie la fiche fusionnée. Rien n'est écrit dans l'app tant que l'envoi n'a pas réussi.
  async function syncLeague(dbUrl, league, id, makeCard) {
    const base = validDbUrl(dbUrl);
    if (!base) throw new Error('Adresse de base invalide (elle doit finir par firebaseio.com ou firebasedatabase.app)');
    if (!validLeague(league)) throw new Error('Code de ligue invalide : 3 à 32 lettres, chiffres, - ou _');
    const path = `${base}/ligues/${encodeURIComponent(league)}`;
    const res = await fetch(`${path}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'Accès refusé : vérifie les règles de ta base (voir le guide)' : `Lecture impossible (${res.status})`);
    const data = (await res.json()) || {};
    const members = Object.values(data).map(sanitize).filter(Boolean);
    const own = members.find((m) => m.id === id) || null;
    const myCard = makeCard(own);
    const put = await fetch(`${path}/${myCard.id}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(myCard) });
    if (!put.ok) throw new Error(put.status === 401 || put.status === 403 ? 'Accès refusé : vérifie les règles de ta base (voir le guide)' : `Erreur serveur (${put.status})`);
    return { members: members.filter((m) => m.id !== id).concat([myCard]), own, card: myCard };
  }

  RX.Social = { card, encode, decode, sanitize, mergeRecords, syncLeague, validDbUrl, validLeague, REC_KEYS };
})(window.RX = window.RX || {});
