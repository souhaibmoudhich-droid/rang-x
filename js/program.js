/* Rang X — générateur de programme hebdomadaire et nutrition. */
(function (RX) {
  'use strict';
  const S = RX.Std;

  const GOALS = {
    complet:   { label: 'Athlète complet',  desc: 'Les 6 piliers à égalité' },
    masse:     { label: 'Prise de masse',   desc: 'Hypertrophie et volume' },
    force:     { label: 'Renforcement',     desc: 'Charges lourdes, force pure' },
    explo:     { label: 'Explosivité',      desc: 'Sauts, sprints, puissance' },
    endurance: { label: 'Endurance',        desc: 'Course, 5 km et 10 km' }
  };

  const SCHEMES = {
    complet:   { sets: 4, reps: '6',    pct: 0.77, rest: '2 min',  cp: 0.65, cs: 4 },
    masse:     { sets: 4, reps: '8–10', pct: 0.70, rest: '90 s',   cp: 0.70, cs: 4 },
    force:     { sets: 5, reps: '5',    pct: 0.82, rest: '3 min',  cp: 0.50, cs: 5 },
    explo:     { sets: 6, reps: '3',    pct: 0.60, rest: '2 min',  cp: 0.45, cs: 5, note: 'Chaque rep à vitesse maximale' },
    endurance: { sets: 3, reps: '12',   pct: 0.60, rest: '60 s',   cp: 0.60, cs: 3 }
  };

  const TEMPLATES = {
    complet:   { 3: ['full', 'run_int', 'calis_explo'], 4: ['haut', 'run_int', 'bas_explo', 'run_long'],
                 5: ['haut', 'run_int', 'bas_explo', 'calis', 'run_long'], 6: ['haut', 'run_int', 'bas', 'calis', 'run_tempo', 'explo'] },
    masse:     { 3: ['haut', 'bas', 'full'], 4: ['haut', 'bas', 'haut', 'bas'],
                 5: ['haut', 'bas', 'calis', 'haut', 'run_easy'], 6: ['haut', 'bas', 'calis', 'haut', 'bas', 'run_easy'] },
    force:     { 3: ['full', 'haut', 'bas'], 4: ['haut', 'bas', 'haut', 'bas'],
                 5: ['haut', 'bas', 'calis', 'haut', 'bas'], 6: ['haut', 'bas', 'calis', 'haut', 'bas', 'run_easy'] },
    explo:     { 3: ['bas_explo', 'haut', 'explo'], 4: ['explo', 'haut', 'bas_explo', 'run_int'],
                 5: ['explo', 'haut', 'bas', 'run_int', 'calis'], 6: ['explo', 'haut', 'bas', 'run_int', 'calis', 'explo'] },
    endurance: { 3: ['run_int', 'full', 'run_long'], 4: ['run_int', 'full', 'run_tempo', 'run_long'],
                 5: ['run_int', 'haut', 'run_easy', 'run_tempo', 'run_long'], 6: ['run_int', 'haut', 'run_easy', 'run_tempo', 'bas', 'run_long'] }
  };
  const DAY_SLOTS = { 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
  const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const WAVE = [1, 1.025, 1.05, 0.9];

  const kg = (v) => `${S.round(v, 2.5)} kg`;
  const pace = (s) => S.fmtPace(s);

  function ctx(state, ev, week) {
    const p = state.profile, r = state.records || {};
    const goal = GOALS[p.goal] ? p.goal : 'complet';
    const wi = (week - 1) % 4;
    const vit = ev.pillars.vitesse.tested ? S.rankIndex(ev.pillars.vitesse.score) : 1;
    const end = ev.pillars.endurance.tested ? S.rankIndex(ev.pillars.endurance.score) : Math.max(0, vit - 1);
    let p5 = r.run5k ? r.run5k / 5 : (r.run10k ? (r.run10k / 10) / 1.0425 : 375);
    let p10 = r.run10k ? r.run10k / 10 : p5 * 1.0425;
    return { p, r, goal, sc: SCHEMES[goal], prog: WAVE[wi], deload: wi === 3, gym: p.equip !== 'maison', vit, end, p5, p10, ev };
  }

  // ——— Blocs d'exercices ———
  function lift(c, id, name) {
    const orm = c.r[id];
    const sets = c.deload ? c.sc.sets - 1 : c.sc.sets;
    const presc = `${sets} × ${c.sc.reps}`;
    const detail = orm ? `${kg(orm * c.sc.pct * c.prog)} · repos ${c.sc.rest}` : `Charge : un poids que tu pourrais faire 2 fois de plus · repos ${c.sc.rest}`;
    return { id, name, presc, detail, log: 'kg', metric: id, note: c.sc.note };
  }
  function bwReps(c, max, pct) {
    return Math.max(2, Math.round(max * pct * c.prog));
  }
  function pullups(c) {
    const m = c.r.pullups || 0;
    const sets = c.deload ? c.sc.cs - 1 : c.sc.cs;
    if (m < 1) return [
      { id: 'negpull', name: 'Tractions négatives', presc: '4 × 3', detail: 'Saute en haut, descends en 5 secondes' },
      { id: 'austr', name: 'Tractions australiennes', presc: '3 × 8', detail: 'Barre basse, corps gainé' }];
    if (m < 4) return [
      { id: 'pullups', name: 'Tractions', presc: `${sets + 1} × ${Math.max(1, m - 1)}`, detail: 'Amplitude complète, menton au-dessus de la barre', log: 'reps', metric: 'pullups', cam: 'pullups' },
      { id: 'negpull', name: 'Tractions négatives', presc: '3 × 3', detail: 'Descente 5 s' }];
    return [{ id: 'pullups', name: 'Tractions', presc: `${sets} × ${bwReps(c, m, c.sc.cp)}`, detail: c.goal === 'explo' ? 'Monte le plus vite possible, descente contrôlée' : 'Bras tendus en bas, menton au-dessus en haut', log: 'reps', metric: 'pullups', cam: 'pullups' }];
  }
  function dips(c) {
    const m = c.r.dips || 0;
    const sets = c.deload ? c.sc.cs - 1 : c.sc.cs;
    if (m < 3) return [{ id: 'benchdip', name: 'Dips sur banc', presc: '3 × 10', detail: 'Pieds au sol, coudes vers l\'arrière' }];
    return [{ id: 'dips', name: 'Dips', presc: `${sets} × ${bwReps(c, m, c.sc.cp)}`, detail: 'Descends jusqu\'à 90° aux coudes', log: 'reps', metric: 'dips', cam: 'dips' }];
  }
  function pushups(c) {
    const m = c.r.pushups || 0;
    const sets = c.deload ? c.sc.cs - 1 : c.sc.cs;
    if (m < 6) return [{ id: 'kneepush', name: 'Pompes inclinées (mains surélevées)', presc: '4 × 8', detail: 'Corps droit des épaules aux pieds' }];
    if (c.goal === 'explo' && m >= 15) return [{ id: 'clappush', name: 'Pompes claquées', presc: `${sets} × 5`, detail: 'Pousse fort, mains décollent du sol' }];
    return [{ id: 'pushups', name: 'Pompes', presc: `${sets} × ${bwReps(c, m, c.sc.cp)}`, detail: 'Poitrine à un poing du sol', log: 'reps', metric: 'pushups', cam: 'pushups' }];
  }
  function muscleup(c) {
    const pu = c.r.pullups || 0, mu = c.r.muscleups || 0;
    if (mu >= 1) return { id: 'muscleups', name: 'Muscle-ups', presc: `5 × ${Math.max(1, Math.round(mu * 0.5))}`, detail: 'Tirage explosif, poitrine au-dessus de la barre', log: 'reps', metric: 'muscleups', cam: 'muscleups' };
    if (pu >= 8) return { id: 'mutrans', name: 'Prépa muscle-up', presc: '5 × 3', detail: 'Tractions explosives poitrine à la barre + transitions sur barre basse' };
    if (pu >= 4) return { id: 'explopull', name: 'Tractions explosives', presc: '4 × 3', detail: 'Vise la poitrine à la barre. Objectif : 8 tractions strictes' };
    return null;
  }
  function plank(c) {
    const m = Math.max(c.r.plank || 0, 30);
    return { id: 'plank', name: 'Gainage', presc: `3 × ${Math.round(m * 0.6 / 5) * 5} s`, detail: 'Coudes sous les épaules, bassin aligné', log: 'time', metric: 'plank', cam: 'plank' };
  }
  function legsBW(c) {
    return [
      { id: 'bulgarian', name: 'Squat bulgare', presc: `${c.sc.sets} × ${c.goal === 'force' ? 6 : 10}/jambe`, detail: 'Sac à dos lesté si c\'est trop facile' },
      { id: 'squats', name: 'Squats', presc: `3 × ${c.goal === 'endurance' ? 25 : 15}`, detail: 'Cuisses parallèles au sol', cam: 'squats' }];
  }
  function explo(c, light) {
    const out = [
      { id: 'broadjump', name: 'Sauts en longueur sans élan', presc: light ? '4 × 2' : '5 × 3', detail: 'Récupération complète entre les sauts (60–90 s)', log: 'cm', metric: 'broadjump' },
      { id: 'jumpsquat', name: 'Squats sautés', presc: light ? '3 × 5' : '4 × 6', detail: 'Réception silencieuse, genoux dans l\'axe' }];
    if (!light) out.push({ id: 'sprint', name: 'Sprints 30 m', presc: '6 × 30 m', detail: 'Départ arrêté, marche retour' });
    if (!light && (c.r.pullups || 0) >= 5) out.push({ id: 'explopull', name: 'Tractions explosives', presc: '4 × 3', detail: 'Le plus haut possible' });
    return out;
  }

  // ——— Séances ———
  function build(kind, c, variant) {
    const lvlRuns = [[4, 400], [5, 400], [6, 400], [8, 400], [6, 800], [8, 800], [5, 1000]];
    const blocks = [];
    let title = '', tags = [], dur = 60;
    switch (kind) {
      case 'haut': {
        title = variant ? 'Haut du corps · B' : 'Haut du corps · A';
        tags = ['force', 'maitrise'];
        const ex = [];
        if (c.gym) ex.push(variant ? Object.assign(lift(c, 'bench', 'Développé couché'), { presc: `${c.sc.sets} × ${c.goal === 'force' ? '3' : '10'}` , detail: c.r.bench ? `${kg(c.r.bench * (c.goal === 'force' ? 0.86 : 0.65) * c.prog)} · repos ${c.sc.rest}` : lift(c, 'bench').detail }) : lift(c, 'bench', 'Développé couché'));
        ex.push(...pullups(c), ...dips(c));
        if (!c.gym || variant) ex.push(...pushups(c));
        if (c.gym && !variant) ex.push({ id: 'ohp', name: 'Développé militaire', presc: '3 × 8', detail: 'Barre ou haltères, gainage serré' });
        if (c.gym && variant) ex.push({ id: 'row', name: 'Rowing barre', presc: '3 × 10', detail: 'Dos plat, tire vers le nombril' });
        blocks.push({ name: 'Principal', ex });
        break;
      }
      case 'bas': case 'bas_explo': {
        title = kind === 'bas_explo' ? 'Bas du corps & explosivité' : 'Bas du corps';
        tags = kind === 'bas_explo' ? ['force', 'explo'] : ['force'];
        if (kind === 'bas_explo') blocks.push({ name: 'Explosivité (en premier, frais)', ex: explo(c, true) });
        const ex = [];
        if (c.gym) { ex.push(lift(c, 'squat', 'Squat')); ex.push(lift(c, 'deadlift', 'Soulevé de terre')); }
        else ex.push(...legsBW(c), { id: 'nordic', name: 'Hip thrust / pont fessier', presc: '3 × 12', detail: 'Une jambe si trop facile' });
        ex.push(plank(c));
        blocks.push({ name: 'Force', ex });
        break;
      }
      case 'full': {
        title = 'Corps complet'; tags = ['force', 'maitrise'];
        const ex = [];
        if (c.gym) { ex.push(lift(c, 'squat', 'Squat'), lift(c, 'bench', 'Développé couché')); }
        else ex.push(...legsBW(c).slice(0, 1), ...pushups(c));
        ex.push(...pullups(c), ...dips(c), plank(c));
        blocks.push({ name: 'Circuit principal', ex });
        break;
      }
      case 'calis': case 'calis_explo': {
        title = kind === 'calis' ? 'Maîtrise du corps' : 'Maîtrise & explosivité';
        tags = kind === 'calis' ? ['maitrise'] : ['maitrise', 'explo'];
        const mu = muscleup(c);
        const ex = [];
        if (mu) ex.push(mu);
        ex.push(...pullups(c), ...dips(c), ...pushups(c));
        ex.push({ id: 'lsit', name: 'L-sit (barres ou sol)', presc: '4 × 10–20 s', detail: 'Jambes tendues, épaules basses' });
        ex.push({ id: 'handstand', name: 'Équilibre contre le mur', presc: '4 × 30 s', detail: 'Ventre face au mur, corps gainé' });
        blocks.push({ name: 'Compétences', ex });
        if (kind === 'calis_explo') blocks.push({ name: 'Explosivité', ex: explo(c, true) });
        dur = 55;
        break;
      }
      case 'explo': {
        title = 'Explosivité'; tags = ['explo', 'vitesse'];
        blocks.push({ name: 'Échauffement', ex: [{ id: 'warm', name: 'Montées de genoux, talons-fesses, gammes', presc: '10 min', detail: 'Termine par 3 accélérations progressives' }] });
        blocks.push({ name: 'Puissance', ex: explo(c, false) });
        if (c.gym) blocks.push({ name: 'Force-vitesse', ex: [{ id: 'squat', name: 'Squat vitesse', presc: '6 × 3', detail: c.r.squat ? `${kg(c.r.squat * 0.55)} · remonte le plus vite possible` : '55 % de ton max, remontée explosive' }] });
        dur = 50;
        break;
      }
      case 'run_int': {
        const [n, d] = lvlRuns[c.vit];
        const rp = c.vit >= 4 ? c.p5 * 0.97 : c.p5 * 0.95;
        title = 'Fractionné'; tags = ['vitesse'];
        blocks.push({ name: 'Course', ex: [
          { id: 'warmrun', name: 'Échauffement footing', presc: '12 min', detail: `Allure facile ${pace(c.p5 * 1.28)}` },
          { id: 'intervals', name: `${n} × ${d} m`, presc: `${S.fmtTime(rp * d / 1000)} par ${d} m`, detail: `Allure ${pace(rp)} · récup ${d >= 800 ? '2 min' : '90 s'} trottinée` },
          { id: 'cool', name: 'Retour au calme', presc: '8 min', detail: 'Footing très lent + étirements' }] });
        dur = 45;
        break;
      }
      case 'run_tempo': {
        const mins = [10, 12, 15, 20, 25, 30, 35][c.vit];
        title = 'Course au seuil'; tags = ['vitesse', 'endurance'];
        blocks.push({ name: 'Course', ex: [
          { id: 'warmrun', name: 'Échauffement', presc: '10 min', detail: `Allure ${pace(c.p5 * 1.28)}` },
          { id: 'tempo', name: `Tempo ${mins} min`, presc: `${mins} min`, detail: `Allure ${pace(c.p10 + 8)} : soutenue, tu peux dire 3 mots` },
          { id: 'cool', name: 'Retour au calme', presc: '5 min', detail: 'Footing lent' }] });
        dur = 40;
        break;
      }
      case 'run_long': {
        const km = [4, 5, 7, 9, 12, 15, 18][c.end];
        title = 'Sortie longue'; tags = ['endurance'];
        blocks.push({ name: 'Course', ex: [{ id: 'long', name: `Footing ${km} km`, presc: `${km} km`, detail: `Allure ${pace(c.p10 * 1.18)} · tu dois pouvoir parler`, run: km }] });
        dur = Math.round(km * c.p10 * 1.18 / 60) + 10;
        break;
      }
      case 'run_easy': {
        title = 'Footing récupération'; tags = ['endurance'];
        blocks.push({ name: 'Course', ex: [{ id: 'easy', name: 'Footing facile', presc: c.goal === 'masse' ? '20 min' : '30 min', detail: `Allure ${pace(c.p5 * 1.32)} · garde-le facile` }] });
        dur = 30;
        break;
      }
    }
    return { kind, title, tags, dur, blocks };
  }

  function weakBlock(c, pid) {
    const map = {
      force: { name: 'Point faible : Force', ex: c.gym ? [Object.assign(lift(c, 'squat', 'Squat'), { presc: '3 × 5' })] : [{ id: 'pistol', name: 'Pistol squat (assisté)', presc: '4 × 5/jambe', detail: 'Tiens-toi à un poteau si besoin' }] },
      maitrise: { name: 'Point faible : Maîtrise', ex: [{ id: 'ladder', name: 'Échelle tractions + dips', presc: '1-2-3-4-3-2-1', detail: 'Tractions puis dips à chaque palier, sans pause' }] },
      vitesse: { name: 'Point faible : Vitesse', ex: [{ id: 'strides', name: '6 × 200 m', presc: `${S.fmtTime(c.p5 * 0.92 * 0.2)} par 200 m`, detail: 'Récup 1 min en marchant' }] },
      endurance: { name: 'Point faible : Endurance', ex: [{ id: 'finisher', name: 'Finisher footing', presc: '15 min', detail: `Allure ${pace(c.p10 * 1.2)}` }] },
      explo: { name: 'Point faible : Explosivité', ex: [{ id: 'broadjump', name: 'Sauts en longueur', presc: '5 × 2', detail: 'Repos complet', log: 'cm', metric: 'broadjump' }, { id: 'sprint', name: 'Sprints 20 m', presc: '4 × 20 m', detail: 'Départ arrêté' }] },
      physique: { name: 'Point faible : Physique', ex: [{ id: 'hyper', name: 'Superset bras & épaules', presc: '3 × 12', detail: 'Curls + extensions triceps + élévations latérales' }] }
    };
    return map[pid];
  }

  function weekNumber(state, now) {
    const start = state.programStart || Date.now();
    const d0 = mondayOf(new Date(start)), d1 = mondayOf(new Date(now || Date.now()));
    return Math.max(1, Math.round((d1 - d0) / (7 * 864e5)) + 1);
  }
  function mondayOf(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return x.getTime();
  }
  const todayIndex = () => (new Date().getDay() + 6) % 7;

  function weekPlan(state, ev, week) {
    week = week || weekNumber(state);
    const c = ctx(state, ev, week);
    const days = [3, 4, 5, 6].includes(+c.p.days) ? +c.p.days : 4;
    const kinds = TEMPLATES[c.goal][days];
    const slots = DAY_SLOTS[days];
    // point faible : pilier testé le plus bas (ou non testé)
    let weakest = null, low = 99;
    for (const p of S.PILLARS) { const sc = ev.pillars[p.id].score; if (sc < low) { low = sc; weakest = p.id; } }
    const seen = {};
    const out = [];
    for (let d = 0; d < 7; d++) {
      const k = slots.indexOf(d);
      if (k < 0) { out.push({ day: d, rest: true }); continue; }
      const kind = kinds[k];
      seen[kind] = (seen[kind] || 0) + 1;
      const s = build(kind, c, seen[kind] > 1);
      s.key = `${week}-${d}`;
      out.push({ day: d, session: s });
    }
    // ajoute le bloc point faible à la première séance qui ne le travaille pas déjà
    const target = out.find((x) => x.session && !x.session.tags.includes(weakest)) || out.find((x) => x.session);
    if (target && weakest) { target.session.blocks.push(weakBlock(c, weakest)); target.session.weak = weakest; }
    return { week, deload: c.deload, load: c.prog, goal: c.goal, days, weakest, list: out };
  }

  function nutrition(state, ev) {
    const p = state.profile;
    const w = +p.weight || 70, h = +p.height || 175, a = +p.age || 25;
    const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'f' ? -161 : 5);
    const act = { 3: 1.45, 4: 1.55, 5: 1.65, 6: 1.75 }[+p.days] || 1.55;
    const tdee = bmr * act;
    const goal = p.goal || 'complet';
    let delta = { masse: 300, force: 150 }[goal] || 0;
    let note = 'Maintien : mange à ta faim, surtout des aliments simples.';
    const bfRank = ev.metrics.bodyfat.tested ? S.rankIndex(ev.metrics.bodyfat.score) : 3;
    if (goal === 'masse') note = 'Léger surplus pour construire du muscle sans trop de gras.';
    else if (goal === 'force') note = 'Petit surplus pour soutenir les charges lourdes.';
    else if (bfRank <= 1) { delta = a < 18 ? -200 : -350; note = 'Léger déficit pour faire baisser la masse grasse.'; }
    if (a < 18) note += ' Tu es encore en croissance : pas de régime strict, dors 8–10 h.';
    const kcal = Math.round((tdee + delta) / 10) * 10;
    const prot = Math.round(w * (goal === 'masse' ? 2.0 : 1.8));
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, prot, water: Math.round(w * 0.035 * 10) / 10, note };
  }

  RX.Program = { GOALS, DAY_NAMES, weekPlan, weekNumber, todayIndex, nutrition };
})(window.RX = window.RX || {});
