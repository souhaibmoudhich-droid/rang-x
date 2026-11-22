/* Rang X — standards de performance, calcul des rangs et composition corporelle.
 * Les seuils sont fixés sur des références externes (pas sur l'utilisateur) :
 *  - force : tables de standards 1RM / poids de corps (Kilgore-Rippetoe-Pendlay, ExRx)
 *  - poids du corps : normes de tests militaires et de street workout (US Army APFT, etc.)
 *  - course : temps de course amateur → national, X ≈ niveau élite
 *  - explosivité : normes de détente / saut sans élan (tests NFL/NBA Combine)
 *  - physique : FFMI (Kouri et al., 1995 : ~25 = plafond naturel) + % de masse grasse (ACE)
 */
(function (RX) {
  'use strict';

  const RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'X'];
  const RANK_NAMES = {
    E: 'Éveil', D: 'Recrue', C: 'Confirmé', B: 'Avancé', A: 'Élite', S: 'Champion', X: 'Légende'
  };

  // Seuils [D, C, B, A, S, X] — en dessous du premier : rang E.
  // dir 1 = plus c'est haut mieux c'est ; dir -1 = plus c'est bas mieux c'est (temps, % MG).
  const METRICS = {
    bench:    { label: 'Développé couché', short: 'DC', pillar: 'force', unit: 'kg', ratio: true, dir: 1, age: 'str',
                m: [0.5, 0.75, 1.0, 1.3, 1.6, 2.0], f: [0.3, 0.45, 0.65, 0.85, 1.05, 1.3] },
    squat:    { label: 'Squat', short: 'Squat', pillar: 'force', unit: 'kg', ratio: true, dir: 1, age: 'str',
                m: [0.75, 1.1, 1.5, 1.9, 2.3, 2.8], f: [0.5, 0.75, 1.05, 1.35, 1.65, 2.1] },
    deadlift: { label: 'Soulevé de terre', short: 'SdT', pillar: 'force', unit: 'kg', ratio: true, dir: 1, age: 'str',
                m: [1.0, 1.35, 1.8, 2.25, 2.7, 3.2], f: [0.65, 0.95, 1.25, 1.6, 2.0, 2.5] },
    pullups:  { label: 'Tractions', short: 'Tractions', pillar: 'maitrise', unit: 'reps', dir: 1, age: 'str',
                m: [3, 8, 13, 19, 26, 35], f: [1, 3, 6, 10, 15, 22] },
    dips:     { label: 'Dips', short: 'Dips', pillar: 'maitrise', unit: 'reps', dir: 1, age: 'str',
                m: [5, 12, 20, 30, 42, 55], f: [2, 6, 12, 18, 26, 36] },
    pushups:  { label: 'Pompes', short: 'Pompes', pillar: 'maitrise', unit: 'reps', dir: 1, age: 'str',
                m: [12, 25, 40, 55, 70, 90], f: [5, 12, 22, 33, 45, 60] },
    muscleups:{ label: 'Muscle-ups', short: 'MU', pillar: 'maitrise', unit: 'reps', dir: 1, age: 'str',
                m: [1, 3, 6, 10, 15, 22], f: [1, 2, 3, 5, 8, 12] },
    plank:    { label: 'Gainage', short: 'Gainage', pillar: 'maitrise', unit: 's', dir: 1, age: 'none',
                m: [45, 75, 120, 180, 270, 360], f: [40, 70, 110, 165, 250, 330] },
    run5k:    { label: 'Course 5 km', short: '5 km', pillar: 'vitesse', unit: 'time', dir: -1, age: 'run',
                m: [1920, 1620, 1410, 1230, 1050, 900], f: [2220, 1890, 1620, 1410, 1215, 1035] },
    run10k:   { label: 'Endurance 10 km', short: '10 km', pillar: 'endurance', unit: 'time', dir: -1, age: 'run',
                m: [3960, 3360, 2940, 2580, 2220, 1890], f: [4560, 3900, 3360, 2940, 2550, 2160] },
    broadjump:{ label: 'Saut en longueur sans élan', short: 'Longueur', pillar: 'explo', unit: 'cm', dir: 1, age: 'str',
                m: [165, 195, 220, 245, 270, 300], f: [130, 155, 175, 195, 215, 240] },
    vertjump: { label: 'Détente verticale', short: 'Détente', pillar: 'explo', unit: 'cm', dir: 1, age: 'str',
                m: [30, 40, 50, 60, 70, 82], f: [20, 28, 36, 44, 52, 62] },
    ffmi:     { label: 'Indice de masse maigre (FFMI)', short: 'FFMI', pillar: 'physique', unit: '', dir: 1, age: 'none', derived: true, weight: 0.6,
                m: [17, 18.5, 20, 21.5, 23, 25], f: [14, 15.2, 16.4, 17.6, 18.8, 20.5] },
    bodyfat:  { label: 'Masse grasse', short: '% MG', pillar: 'physique', unit: '%', dir: -1, age: 'none', derived: true, weight: 0.4,
                m: [25, 20, 16, 13, 10.5, 8], f: [34, 29, 25, 22, 19, 16] }
  };

  const PILLARS = [
    { id: 'force',     label: 'Force',       metrics: ['bench', 'squat', 'deadlift'] },
    { id: 'maitrise',  label: 'Maîtrise',    long: 'Maîtrise du corps', metrics: ['pullups', 'dips', 'pushups', 'muscleups', 'plank'] },
    { id: 'vitesse',   label: 'Vitesse',     long: 'Vitesse (5 km)', metrics: ['run5k'] },
    { id: 'endurance', label: 'Endurance',   long: 'Endurance (10 km)', metrics: ['run10k'] },
    { id: 'explo',     label: 'Explosivité', metrics: ['broadjump', 'vertjump'] },
    { id: 'physique',  label: 'Physique',    metrics: ['ffmi', 'bodyfat'] }
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Coefficient d'âge (inspiré de l'age-grading WMA) : un ado ou un master
  // est comparé à l'équivalent adulte de sa performance.
  function ageFactor(age, kind) {
    age = +age || 25;
    if (kind === 'str') {
      if (age < 18) return Math.max(0.7, 1 - 0.03 * (18 - age));
      if (age > 40) return Math.max(0.6, 1 - 0.01 * (age - 40));
      return 1;
    }
    if (kind === 'run') {
      if (age < 20) return Math.max(0.8, 1 - 0.015 * (20 - age));
      if (age > 35) return Math.max(0.6, 1 - 0.008 * (age - 35));
      return 1;
    }
    return 1;
  }

  // Score continu : 0–1 = E, 1–2 = D, … 5–6 = S, 6 = X.
  function scoreFrom(v, th, dir) {
    if (v == null || !isFinite(v)) return null;
    if (dir > 0) {
      if (v >= th[5]) return 6;
      if (v < th[0]) return clamp(v / th[0], 0, 0.999);
      for (let i = 0; i < 5; i++) if (v < th[i + 1]) return 1 + i + (v - th[i]) / (th[i + 1] - th[i]);
      return 6;
    }
    if (v <= th[5]) return 6;
    if (v > th[0]) return clamp(1 - (v - th[0]) / (th[0] * 0.5), 0, 0.999);
    for (let i = 0; i < 5; i++) if (v > th[i + 1]) return 1 + i + (th[i] - v) / (th[i] - th[i + 1]);
    return 6;
  }

  const rankOf = (score) => RANKS[clamp(Math.floor(score || 0), 0, 6)];
  const rankIndex = (score) => clamp(Math.floor(score || 0), 0, 6);

  function thresholds(id, sex) {
    const m = METRICS[id];
    return sex === 'f' ? m.f : m.m;
  }

  // Composition corporelle
  function bodyComp(p) {
    const h = (+p.height || 175) / 100;
    const w = +p.weight || 70;
    const age = +p.age || 25;
    const male = p.sex !== 'f';
    const bmi = w / (h * h);
    let bf = null, method = '';
    if (+p.bf > 0) { bf = +p.bf; method = 'valeur saisie'; }
    else if (+p.waist > 0 && +p.neck > 0 && (male || +p.hip > 0)) {
      const hc = h * 100;
      if (male && p.waist - p.neck > 0) {
        bf = 495 / (1.0324 - 0.19077 * Math.log10(p.waist - p.neck) + 0.15456 * Math.log10(hc)) - 450;
        method = 'formule Marine US';
      } else if (!male && (+p.waist + +p.hip - p.neck) > 0) {
        bf = 495 / (1.29579 - 0.35004 * Math.log10(+p.waist + +p.hip - p.neck) + 0.221 * Math.log10(hc)) - 450;
        method = 'formule Marine US';
      }
    }
    if (bf == null || !isFinite(bf)) {
      const s = male ? 1 : 0;
      bf = age < 16 ? 1.51 * bmi - 0.70 * age - 3.6 * s + 1.4 : 1.20 * bmi + 0.23 * age - 10.8 * s - 5.4;
      method = 'estimation par IMC (Deurenberg)';
    }
    bf = clamp(bf, 3, 60);
    const lean = w * (1 - bf / 100);
    const ffmi = lean / (h * h) + 6.1 * (1.8 - h);
    return { bmi, bf, lean, ffmi, method };
  }

  function epley(weight, reps) {
    weight = +weight; reps = Math.round(+reps);
    if (!(weight > 0) || !(reps > 0)) return null;
    if (reps === 1) return weight;
    return weight * (1 + Math.min(reps, 12) / 30);
  }

  // Évalue tout le profil.
  function evaluate(profile, records) {
    records = records || {};
    const sex = profile.sex === 'f' ? 'f' : 'm';
    const bw = +profile.weight || 70;
    const comp = bodyComp(profile);
    const raw = Object.assign({}, records, { ffmi: comp.ffmi, bodyfat: comp.bf });
    const metrics = {};
    for (const id in METRICS) {
      const def = METRICS[id];
      const v = raw[id];
      if (v == null || v === '' || !(+v > 0)) { metrics[id] = { id, tested: false, score: null }; continue; }
      const fac = ageFactor(profile.age, def.age);
      let cmp = def.ratio ? +v / bw : +v;
      cmp = def.dir > 0 ? cmp / fac : cmp * fac;
      const th = thresholds(id, sex);
      const score = scoreFrom(cmp, th, def.dir);
      const ri = rankIndex(score);
      let next = null;
      if (ri < 6) {
        let need = th[ri];
        need = def.dir > 0 ? need * fac : need / fac;
        if (def.ratio) need = need * bw;
        next = { rank: RANKS[ri + 1], value: need };
      }
      metrics[id] = { id, tested: true, value: +v, cmp, score, rank: RANKS[ri], next, ageFactor: fac };
    }
    const pillars = {};
    let sum = 0, tested = 0;
    for (const p of PILLARS) {
      let s = 0, wsum = 0, n = 0;
      for (const id of p.metrics) {
        const m = metrics[id];
        if (!m.tested) continue;
        const wgt = METRICS[id].weight || 1;
        s += m.score * wgt; wsum += wgt; n++;
      }
      const score = n ? s / wsum : 0;
      pillars[p.id] = { id: p.id, score, rank: rankOf(score), tested: n > 0, count: n, total: p.metrics.length };
      sum += score; if (n) tested++;
    }
    const gScore = sum / PILLARS.length;
    return { sex, comp, metrics, pillars, global: { score: gScore, rank: rankOf(gScore), tested } };
  }

  // Formatage
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(+sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const pad = (x) => String(x).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  function parseTime(str) {
    if (str == null) return null;
    str = String(str).trim().replace(/[hH']/g, ':').replace(/["s]/g, '').replace(',', '.');
    if (!str) return null;
    if (/^\d+(\.\d+)?$/.test(str)) return Math.round(parseFloat(str) * 60); // minutes seules
    const parts = str.split(':').map((x) => parseFloat(x));
    if (parts.some((x) => isNaN(x))) return null;
    let s = 0;
    for (const p of parts) s = s * 60 + p;
    return Math.round(s);
  }
  function fmtPace(secPerKm) {
    if (!isFinite(secPerKm) || secPerKm <= 0) return '–';
    return fmtTime(secPerKm) + '/km';
  }
  const frNum = (v, d) => Number(v).toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  function fmtValue(id, v) {
    if (v == null || !isFinite(v)) return '–';
    const u = METRICS[id] ? METRICS[id].unit : '';
    if (u === 'time') return fmtTime(v);
    if (u === 'kg') return `${frNum(round(v, 0.5), 1)} kg`;
    if (u === 'reps') return `${Math.round(v)} reps`;
    if (u === 's') return `${Math.round(v)} s`;
    if (u === 'cm') return `${Math.round(v)} cm`;
    if (u === '%') return `${frNum(v, 1)} %`;
    return frNum(v, 1);
  }
  function round(v, step) { return Math.round(v / step) * step; }

  RX.Std = { RANKS, RANK_NAMES, METRICS, PILLARS, ageFactor, scoreFrom, rankOf, rankIndex, thresholds, bodyComp, epley, evaluate, fmtTime, parseTime, fmtPace, fmtValue, round, clamp };
})(window.RX = window.RX || {});
