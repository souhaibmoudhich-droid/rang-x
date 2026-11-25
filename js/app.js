/* Rang X — application : état, écrans, navigation. */
(function (RX) {
  'use strict';
  const S = RX.Std, Pg = RX.Program, B = RX.Boss, So = RX.Social;
  const KEY = 'rangx.v1';
  const PREVIEW = !!window.RX_PREVIEW;
  const previewNote = (what) => (PREVIEW ? `<div class="note">Aperçu en ligne : ${what} ne marche que dans l'app installée sur ton téléphone (voir le guide LISEZMOI). Ici, tu peux tout essayer à la main.</div>` : '');

  // ——— Utilitaires ———
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
  const num = (x) => { const v = parseFloat(String(x == null ? '' : x).replace(',', '.')); return isFinite(v) ? v : null; };
  const fr = (x, d) => Number(x).toLocaleString('fr-FR', { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: d || 0 });

  const ICONS = {
    statut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4z"/><path d="M12 7.5l4 2.3v4.4l-4 2.3-4-2.3V9.8z"/></svg>',
    programme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M8 14h3M8 17h6"/></svg>',
    boss: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 8L3 2.5l5 3.5M19 8l2-5.5-5 3.5"/><path d="M5 7.5Q12 3.5 19 7.5l1.2 6.5Q19 20 12 22q-7-2-8.2-8z"/><path d="M8 12.5l3 1M16 12.5l-3 1M9.5 17.5h5"/></svg>',
    course: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14.5" cy="4.5" r="2"/><path d="M7 21l3.5-6 3 2.5V22M10.5 15l1.5-6 4 3.5 3.5.5M12 9l-4 1-2 3.5"/></svg>',
    classement: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3.5 20.5v-7h5v7M8.5 20.5V8h7v12.5M15.5 20.5v-10h5v10M2 20.5h20"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 7.5h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/></svg>'
  };
  const TABS = [
    ['statut', 'Statut'], ['programme', 'Programme'], ['boss', 'Boss'], ['course', 'Course'], ['classement', 'Classement']
  ];

  // ——— État ———
  function blank() {
    return { v: 1, id: rid(), profile: null, records: {}, history: [], log: [], bosses: {}, runs: [], xp: 0, friends: {},
             league: { url: '', code: '', members: [], last: 0 }, programStart: Date.now(), settings: { sound: true, voice: false } };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) return Object.assign(blank(), s); }
    } catch (e) { /* stockage indisponible */ }
    return blank();
  }
  let state = load();
  let ev = null;
  let tab = 'statut';
  let lbCat = 'global';
  let storageOk = true;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; }
  }
  function recompute() {
    if (!state.profile) { ev = null; return; }
    ev = S.evaluate(state.profile, state.records);
    document.documentElement.style.setProperty('--accent', `var(--rk-${ev.global.rank})`);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0b0d12');
  }
  function commit(fn, opts) {
    const before = ev;
    fn();
    save(); recompute();
    if (!(opts && opts.quiet)) checkRankUp(before, ev);
    render();
    for (const l of layers) if (l.refresh) l.refresh();
    if (!(opts && opts.fromSync)) autoSync(2000);
  }
  function setRecord(metric, value, src) {
    const def = S.METRICS[metric];
    if (!def || !(value > 0)) return false;
    const cur = state.records[metric];
    const better = !(cur > 0) || (def.dir > 0 ? value > cur : value < cur);
    if (better) { state.records[metric] = value; state.history.push({ t: Date.now(), m: metric, v: value, src }); }
    return better;
  }
  const level = (xp) => Math.floor(Math.sqrt((xp || 0) / 40)) + 1;
  const xpFor = (lv) => 40 * (lv - 1) * (lv - 1);
  function addXp(n) { state.xp = (state.xp || 0) + Math.round(n); }

  // ——— Sons / voix ———
  let actx = null;
  function beep(freq, dur, vol) {
    if (!state.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = freq || 880;
      const t = actx.currentTime, d = dur || 0.08;
      g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* audio indisponible */ }
  }
  function fanfare(win) {
    const notes = win ? [523, 659, 784, 1047] : [392, 330, 262];
    notes.forEach((f, i) => setTimeout(() => beep(f, 0.16, 0.14), i * 150));
  }
  function say(text) {
    if (!state.settings.voice || !('speechSynthesis' in window)) return;
    try { const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.rate = 1.15; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* ignoré */ }
  }
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignoré */ } }

  // ——— Composants ———
  const badge = (r, size) => `<span class="badge ${size || ''} ${r === 'X' ? 'x-glow' : ''}" style="--c:var(--rk-${r})"><b>${r}</b></span>`;
  const bar = (pct, c, thin) => `<div class="bar ${thin ? 'thin' : ''}"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%;${c ? `--c:var(--rk-${c})` : ''}"></i></div>`;
  const pctToNext = (score) => (score >= 6 ? 100 : (score - Math.floor(score)) * 100);
  const nextRank = (r) => S.RANKS[Math.min(6, S.RANKS.indexOf(r) + 1)];

  function radar(e, other) {
    const W = 360, H = 300, cx = 180, cy = 152, R = 92;
    const pts = (fn) => S.PILLARS.map((p, i) => {
      const a = (-90 + i * 60) * Math.PI / 180;
      const r = fn(p, i);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    const poly = (arr) => arr.map((q) => q.map((x) => x.toFixed(1)).join(',')).join(' ');
    let rings = '';
    for (let s = 1; s <= 6; s++) rings += `<polygon points="${poly(pts(() => R * s / 6))}" fill="none" stroke="var(--line)" stroke-width="${s === 6 ? 1.5 : 1}"/>`;
    const axes = pts(() => R).map(([x, y]) => `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`).join('');
    const mine = pts((p) => R * Math.max(0.25, e.pillars[p.id].score) / 6);
    const otherPoly = other ? `<polygon points="${poly(pts((p) => R * Math.max(0.25, other.p[p.id] || 0) / 6))}" fill="none" stroke="var(--fg)" stroke-dasharray="4 4" stroke-width="1.5" opacity=".7"/>` : '';
    const labels = S.PILLARS.map((p, i) => {
      const a = (-90 + i * 60) * Math.PI / 180;
      const x = cx + Math.cos(a) * (R + 22), y = cy + Math.sin(a) * (R + 22);
      const anchor = Math.abs(Math.cos(a)) < 0.1 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
      const pr = e.pillars[p.id];
      const dy = i === 0 ? -18 : (i === 3 ? 10 : -6);
      return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" class="lbl">${esc(p.label)}</text>
              <text x="${x.toFixed(1)}" y="${(y + dy + 21).toFixed(1)}" text-anchor="${anchor}" class="rk" fill="${pr.tested ? `var(--rk-${pr.rank})` : 'var(--dim)'}">${pr.tested ? pr.rank : '?'}</text>`;
    }).join('');
    const dots = mine.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--accent)"/>`).join('');
    return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hexagone des 6 piliers">
      ${rings}${axes}${otherPoly}
      <polygon points="${poly(mine)}" fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
      ${dots}${labels}</svg>`;
  }

  function pillarHint(pid) {
    const p = S.PILLARS.find((x) => x.id === pid);
    const tested = p.metrics.map((id) => ev.metrics[id]).filter((m) => m.tested);
    if (!tested.length) return 'Non testé — compte comme E';
    const weakest = tested.sort((a, b) => a.score - b.score)[0];
    if (!weakest.next) return 'Rang X atteint';
    return `${S.METRICS[weakest.id].short} : ${S.fmtValue(weakest.id, weakest.next.value)} → ${weakest.next.rank}`;
  }

  // ——— Couches ———
  const layers = [];
  function openLayer(html, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'layer ' + (opts.cls || '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = html;
    document.getElementById('layers').appendChild(el);
    const L = { el, onClose: opts.onClose };
    layers.push(L);
    document.body.style.overflow = 'hidden';
    if (opts.onMount) opts.onMount(el, L);
    return L;
  }
  function closeLayer(L) {
    L = L || layers[layers.length - 1];
    if (!L) return;
    const i = layers.indexOf(L);
    if (i >= 0) layers.splice(i, 1);
    try { L.onClose && L.onClose(); } catch (e) { /* ignoré */ }
    L.el.remove();
    if (!layers.length) document.body.style.overflow = '';
  }
  function sheet(title, body, opts) {
    return openLayer(`<header class="sheet-head"><div class="inner">
        <button class="icon-btn" data-act="close" aria-label="Fermer">${ICONS.back}</button>
        <h2>${title}</h2>${(opts && opts.headRight) || ''}</div></header>
      <div class="sheet-body">${body}</div>`, opts);
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ——— Montée de rang ———
  function checkRankUp(before, after) {
    if (!before || !after) return;
    const ups = [];
    const gi0 = S.RANKS.indexOf(before.global.rank), gi1 = S.RANKS.indexOf(after.global.rank);
    if (gi1 > gi0) ups.push({ label: 'Rang d\'athlète', rank: after.global.rank, main: true });
    for (const p of S.PILLARS) {
      const a = before.pillars[p.id], b = after.pillars[p.id];
      if (b.tested && S.RANKS.indexOf(b.rank) > S.RANKS.indexOf(a.rank)) ups.push({ label: p.long || p.label, rank: b.rank });
    }
    if (!ups.length) return;
    const top = ups.find((u) => u.main) || ups[0];
    fanfare(true); buzz([60, 60, 120]);
    say(`Rang ${top.rank} atteint`);
    openLayer(`<div class="modal-card rankup" style="--c:var(--rk-${top.rank})">
        <div class="eyebrow">${esc(top.label)}</div>
        ${badge(top.rank, 'xl')}
        <h2>Rang ${top.rank} atteint</h2>
        <p class="muted">${esc(S.RANK_NAMES[top.rank])}${ups.length > 1 ? ' · ' + ups.filter((u) => u !== top).map((u) => `${esc(u.label)} ${u.rank}`).join(' · ') : ''}</p>
        <button class="btn primary block" data-act="close">Continuer</button></div>`, { cls: 'modal' });
  }

  // ——— Rendu principal ———
  function render() {
    const root = document.getElementById('app');
    if (!state.profile) { root.innerHTML = ''; if (!layers.some((l) => l.el.classList.contains('onboarding'))) openOnboarding(); return; }
    const lv = level(state.xp);
    root.innerHTML = `
      <header class="topbar">
        <div class="logo">RANG <span>${ev.global.rank}</span></div>
        <div class="top-actions">
          <span class="chip accent num">Niv. ${lv}</span>
          <button class="icon-btn" data-act="profile" aria-label="Profil et tests">${ICONS.gear}</button>
        </div>
      </header>
      <main class="view" id="view">${VIEWS[tab]()}</main>
      <nav class="tabs" aria-label="Navigation">${TABS.map(([id, label]) => `<button class="tab" data-act="tab" data-id="${id}" ${id === tab ? 'aria-current="page"' : ''}>${ICONS[id]}<span>${label}</span></button>`).join('')}</nav>`;
  }

  const VIEWS = {
    statut() {
      const g = ev.global, lv = level(state.xp);
      const xpIn = state.xp - xpFor(lv), xpNeed = xpFor(lv + 1) - xpFor(lv);
      const plan = Pg.weekPlan(state, ev);
      const today = plan.list[Pg.todayIndex()];
      const untested = S.PILLARS.filter((p) => !ev.pillars[p.id].tested);
      return `
        <section class="card hero">
          ${badge(g.rank, 'xl')}
          <div class="meta">
            <div class="eyebrow">Rang d'athlète</div>
            <h1 class="hero-title">Rang ${g.rank}<span>${S.RANK_NAMES[g.rank]}</span></h1>
            ${bar(pctToNext(g.score))}
            <div class="small muted num">${g.score >= 6 ? 'Sommet atteint' : `${Math.round(pctToNext(g.score))} % vers ${nextRank(g.rank)}`} · ${fr(g.score, 2)} / 6</div>
          </div>
          <div class="xp">
            <div class="row small"><span class="grow muted">Niveau ${lv}</span><span class="num muted">${Math.round(xpIn)} / ${xpNeed} XP</span></div>
            ${bar(xpIn / xpNeed * 100, null, true)}
          </div>
        </section>
        ${untested.length ? `<div class="note row"><span class="grow">${untested.length === 6 ? 'Aucun pilier testé.' : `${untested.map((p) => p.label).join(', ')} : non testé${untested.length > 1 ? 's' : ''}.`} Un pilier non testé compte comme E.</span><button class="btn sm" data-act="profile" data-tests="1">Faire les tests</button></div>` : ''}
        <section class="card">
          <div class="card-head"><h2>Hexagone de l'athlète</h2><span class="small muted">E → X</span></div>
          ${radar(ev)}
          <div>${S.PILLARS.map((p) => {
            const pr = ev.pillars[p.id];
            return `<button class="pillar" data-act="pillar" data-id="${p.id}">
              ${pr.tested ? badge(pr.rank, 'sm') : '<span class="badge sm" style="--c:var(--dim)"><b>?</b></span>'}
              <span class="info"><span class="name">${esc(p.long || p.label)}</span>${bar(pr.tested ? pctToNext(pr.score) : 0, pr.tested ? pr.rank : 'E', true)}<span class="hint">${esc(pillarHint(p.id))}</span></span>
              <span class="score">${pr.tested ? fr(pr.score, 1) : '–'}</span></button>`;
          }).join('')}</div>
        </section>
        <section class="card">
          <div class="card-head"><h2>Aujourd'hui</h2><span class="small muted">${Pg.DAY_NAMES[Pg.todayIndex()]} · semaine ${plan.week}</span></div>
          ${today.rest ? `<p class="muted">Repos. Récupère : sommeil, marche, mobilité. Tu peux quand même affronter un boss.</p>
            <div class="btn-row"><button class="btn" data-act="tab" data-id="boss">Affronter un boss</button></div>`
            : `<div class="row"><div class="grow"><div class="dtitle"><b>${esc(today.session.title)}</b></div><div class="tags">${today.session.tags.map((t) => `<span class="tag">${esc(S.PILLARS.find((p) => p.id === t).label)}</span>`).join('')}<span class="tag">≈ ${today.session.dur} min</span></div></div>
              ${isDone(today.session.key) ? `<span class="done-dot on">${ICONS.check}</span>` : ''}</div>
              <button class="btn primary block" data-act="session" data-day="${today.day}">${isDone(today.session.key) ? 'Revoir la séance' : 'Commencer la séance'}</button>`}
        </section>`;
    },

    programme() {
      const plan = Pg.weekPlan(state, ev);
      const nut = Pg.nutrition(state, ev);
      const mon = new Date(); mon.setDate(mon.getDate() - Pg.todayIndex());
      const doneCount = plan.list.filter((d) => d.session && isDone(d.session.key)).length;
      const total = plan.list.filter((d) => d.session).length;
      return `
        <section class="card">
          <div class="card-head"><div><div class="eyebrow">Semaine ${plan.week}${plan.deload ? ' · décharge' : ''}</div><h2>${esc(Pg.GOALS[plan.goal].label)}</h2></div>
          <button class="btn sm" data-act="profile" data-goal="1">Modifier</button></div>
          <div class="split3">
            <div class="stat"><b class="num">${doneCount}/${total}</b><span>séances faites</span></div>
            <div class="stat"><b class="num">${Math.round(plan.load * 100)} %</b><span>charge du cycle</span></div>
            <div class="stat"><b>${esc(S.PILLARS.find((p) => p.id === plan.weakest).label)}</b><span>point faible</span></div>
          </div>
          <p class="small muted">${plan.deload ? 'Semaine allégée : moins de séries pour laisser le corps assimiler.' : 'Cycle de 4 semaines : 100 %, 102,5 %, 105 %, puis décharge. Les charges suivent tes records.'}</p>
        </section>
        <div class="stack">${plan.list.map((d) => {
          const date = new Date(mon); date.setDate(mon.getDate() + d.day);
          const dl = `${date.getDate()}/${date.getMonth() + 1}`;
          const today = d.day === Pg.todayIndex() ? 'today' : '';
          if (d.rest) return `<div class="day rest ${today}"><div><div class="dname">${Pg.DAY_NAMES[d.day].slice(0, 3)}</div><div class="ddate">${dl}</div></div><div>Repos</div><span></span></div>`;
          const s = d.session, done = isDone(s.key);
          return `<button class="day ${today}" data-act="session" data-day="${d.day}">
            <div><div class="dname">${Pg.DAY_NAMES[d.day].slice(0, 3)}</div><div class="ddate">${dl}</div></div>
            <div style="min-width:0"><div class="dtitle">${esc(s.title)}</div><div class="tags">${s.tags.map((t) => `<span class="tag">${esc(S.PILLARS.find((p) => p.id === t).label)}</span>`).join('')}<span class="tag">${s.dur} min</span>${s.weak ? '<span class="tag">+ point faible</span>' : ''}</div></div>
            <span class="done-dot ${done ? 'on' : ''}">${done ? ICONS.check : ''}</span></button>`;
        }).join('')}</div>
        <section class="card">
          <div class="card-head"><h2>Nutrition du jour</h2><span class="small muted">Mifflin-St Jeor</span></div>
          <div class="split3">
            <div class="stat"><b class="num">${fr(nut.kcal, 0)}</b><span>kcal / jour</span></div>
            <div class="stat"><b class="num">${nut.prot} g</b><span>protéines</span></div>
            <div class="stat"><b class="num">${fr(nut.water, 1)} L</b><span>eau</span></div>
          </div>
          <p class="small muted">${esc(nut.note)} Dépense estimée : ${fr(nut.tdee, 0)} kcal.</p>
        </section>`;
    },

    boss() {
      const sex = state.profile.sex;
      const beatenTotal = Object.values(state.bosses).reduce((a, b) => a + b, 0);
      return `${previewNote('la caméra')}
        <section class="card">
          <div class="card-head"><div><div class="eyebrow">Donjons</div><h2>Bats les boss étage par étage</h2></div></div>
          <p class="small muted">La caméra compte tes répétitions. Chaque rep frappe le boss ; enchaîne vite pour faire monter le combo et frapper plus fort. ${beatenTotal} boss vaincu${beatenTotal > 1 ? 's' : ''} sur 42.</p>
        </section>
        <div class="dungeons">${B.DUNGEONS.map((d) => {
          const fl = Math.min(6, state.bosses[d.id] || 0), cleared = (state.bosses[d.id] || 0) >= 7;
          return `<button class="dungeon" data-act="dungeon" data-id="${d.id}" style="--c:var(--rk-${S.RANKS[fl]})">
            ${B.svg(fl)}
            <div><h3>${esc(d.label)}</h3><div class="small muted">${cleared ? 'Donjon terminé' : `Étage ${S.RANKS[fl]} · ${esc(B.describe(d, fl, sex))}`}</div></div>
            <div class="pips">${S.RANKS.map((r, i) => `<i class="${i < (state.bosses[d.id] || 0) ? 'on' : ''}" style="--c:var(--rk-${r})"></i>`).join('')}</div>
          </button>`;
        }).join('')}</div>`;
    },

    course() {
      const r = state.records, m = ev.metrics;
      const runCard = (id, dist, title) => {
        const x = m[id];
        return `<section class="card">
          <div class="card-head"><div><div class="eyebrow">${title}</div><h2>${dist} km</h2></div>${x.tested ? badge(x.rank, 'lg') : '<span class="badge lg" style="--c:var(--dim)"><b>?</b></span>'}</div>
          <div class="split">
            <div class="stat"><b class="num">${r[id] ? S.fmtTime(r[id]) : '–'}</b><span>record</span></div>
            <div class="stat"><b class="num">${x.next ? S.fmtTime(x.next.value) : '—'}</b><span>${x.next ? `pour le rang ${x.next.rank}` : 'rang X atteint'}</span></div>
          </div>
          <button class="btn primary block" data-act="run" data-km="${dist}">Lancer le test ${dist} km</button>
        </section>`;
      };
      const hist = state.runs.slice(-8).reverse();
      return `${previewNote('le suivi GPS')}
        ${runCard('run5k', 5, 'Vitesse')}
        ${runCard('run10k', 10, 'Endurance')}
        <section class="card">
          <h2>Autres options</h2>
          <div class="btn-row">
            <button class="btn" data-act="run" data-km="0">Course libre</button>
            <button class="btn" data-act="runmanual">Saisir un temps</button>
          </div>
          <p class="small muted">L'app utilise le GPS et compte tes pas avec l'accéléromètre. Garde l'app ouverte et l'écran allumé pendant la course (téléphone au bras ou en main) : un navigateur met en pause le suivi quand l'écran se verrouille. Les passages à 5 km et 10 km sont enregistrés automatiquement.</p>
        </section>
        <section class="card">
          <h2>Historique</h2>
          ${hist.length ? hist.map((x) => `<div class="row" style="border-top:1px solid var(--line);padding-top:10px"><div class="grow"><b class="num">${fr(x.dist / 1000, 2)} km</b> <span class="muted small">· ${new Date(x.t).toLocaleDateString('fr-FR')}</span><div class="small muted num">${S.fmtTime(x.dur)} · ${x.dist > 50 ? S.fmtPace(x.dur / (x.dist / 1000)) : '–'}${x.steps ? ` · ${x.steps} pas` : ''}${x.src ? ` · ${esc(x.src)}` : ''}</div></div></div>`).join('')
            : '<div class="empty"><p>Pas encore de course enregistrée.</p></div>'}
        </section>`;
    },

    classement() {
      const me = So.card(state, ev);
      const people = allPeople(me);
      const cats = [['global', 'Global'], ...S.PILLARS.map((p) => [p.id, p.label]), ...So.REC_KEYS.map((k) => [k, S.METRICS[k].short])];
      const val = lbValue(lbCat);
      const sorted = people.map((p) => ({ p, v: val(p) })).filter((x) => x.v != null)
        .sort((a, b) => (lbDir(lbCat) > 0 ? b.v - a.v : a.v - b.v));
      const missing = people.filter((p) => val(p) == null);
      const lg = state.league;
      const pending = leaguePending();
      return `
        <section class="card">
          <div class="card-head"><div><div class="eyebrow">Toi et tes amis</div><h2>Classement</h2></div><span class="small muted">${people.length} athlète${people.length > 1 ? 's' : ''}</span></div>
          <div class="btn-row">
            <button class="btn primary" data-act="share">Partager mon profil</button>
            <button class="btn" data-act="addfriend">Ajouter un ami</button>
          </div>
        </section>
        <div class="cats" role="group" aria-label="Catégorie">${cats.map(([id, l]) => `<button data-act="lbcat" data-id="${id}" aria-pressed="${id === lbCat}">${esc(l)}</button>`).join('')}</div>
        <section class="card">
          ${sorted.map((x, i) => lbRow(x.p, x.v, i + 1, x.p.id === state.id)).join('')}
          ${missing.length ? `<p class="small muted">Pas encore de résultat : ${missing.map((p) => esc(p.n)).join(', ')}</p>` : ''}
          ${people.length === 1 ? '<div class="empty"><p>Tu es seul pour l\'instant. Envoie ton profil à un ami : il installe l\'app, colle ton code, et vous vous comparez.</p></div>' : ''}
        </section>
        <section class="card">
          <div class="card-head"><h2>Ligue en ligne</h2><span class="small muted">optionnel</span></div>
          ${lg.url && lg.code ? `<p class="small muted">Ligue <b>${esc(lg.code)}</b>${lg.last ? ` · synchronisée le ${new Date(lg.last).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}. Tout le monde voit les mises à jour sans s'échanger de code.</p>
            ${pending ? `<p class="small" data-sync-status>${navigator.onLine === false ? 'Hors ligne : tes nouveaux records sont gardés sur le téléphone et partiront dès le retour du réseau.' : 'Nouveaux records en attente d\'envoi…'}</p>` : ''}
            <div class="btn-row"><button class="btn primary" data-act="sync">Synchroniser</button><button class="btn" data-act="league">Réglages</button></div>`
          : `<p class="small muted">Avec une base Firebase gratuite, le classement se met à jour tout seul pour toute la bande. Sans ça, les codes de partage suffisent.</p><button class="btn" data-act="league">Configurer</button>`}
        </section>`;
    }
  };

  // ——— Classement : données ———
  function allPeople(me) {
    const map = {};
    for (const f of Object.values(state.friends)) map[f.id] = f;
    for (const f of state.league.members || []) if (!map[f.id] || (map[f.id].t || 0) < f.t) map[f.id] = f;
    map[me.id] = me;
    return Object.values(map);
  }
  function lbDir(cat) { return S.METRICS[cat] ? S.METRICS[cat].dir : 1; }
  function lbValue(cat) {
    if (cat === 'global') return (p) => p.g;
    if (S.PILLARS.some((x) => x.id === cat)) return (p) => (p.p[cat] > 0 ? p.p[cat] : null);
    return (p) => (p.r[cat] > 0 ? p.r[cat] : null);
  }
  function cardRankForMetric(p, cat, v) {
    if (cat === 'global' || S.PILLARS.some((x) => x.id === cat)) return S.rankOf(v);
    const def = S.METRICS[cat];
    let cmp = def.ratio ? v / (p.bw || 70) : v;
    const fac = S.ageFactor(p.a || 25, def.age);
    cmp = def.dir > 0 ? cmp / fac : cmp * fac;
    return S.rankOf(S.scoreFrom(cmp, S.thresholds(cat, p.s), def.dir));
  }
  function lbRow(p, v, pos, isMe) {
    const r = cardRankForMetric(p, lbCat, v);
    const shown = lbCat === 'global' || S.PILLARS.some((x) => x.id === lbCat) ? fr(v, 2) : S.fmtValue(lbCat, v);
    const mini = S.PILLARS.map((pl) => { const rr = S.rankOf(p.p[pl.id]); return `<b style="color:var(--rk-${rr})">${rr}</b>`; }).join('');
    return `<button class="lb ${isMe ? 'me' : ''}" data-act="${isMe ? 'tab' : 'friend'}" data-id="${isMe ? 'statut' : esc(p.id)}">
      <span class="pos">${pos}</span>${badge(r, 'sm')}
      <span class="who">${esc(p.n)}${isMe ? ' (toi)' : ''}<small><span class="mini-ranks">${mini}</span> · niv. ${level(p.xp)}</small></span>
      <span class="val">${shown}</span></button>`;
  }

  const isDone = (key) => state.log.some((l) => l.key === key);

  // ——— Feuilles ———
  function openPillar(pid) {
    const p = S.PILLARS.find((x) => x.id === pid);
    const pr = ev.pillars[pid];
    const sex = ev.sex, bw = +state.profile.weight;
    const rows = p.metrics.map((id) => {
      const m = ev.metrics[id], def = S.METRICS[id];
      const th = S.thresholds(id, sex);
      const fac = S.ageFactor(state.profile.age, def.age);
      const cells = th.map((t, i) => {
        let v = def.dir > 0 ? t * fac : t / fac;
        if (def.ratio) v *= bw;
        const you = m.tested && S.RANKS.indexOf(m.rank) === i + 1;
        return `<td class="${you ? 'you' : ''}">${def.unit === 'time' ? S.fmtTime(v) : (def.unit === 'kg' ? Math.round(v) : (def.unit === '%' ? fr(v, 1) : fr(v, def.unit === '' ? 1 : 0)))}</td>`;
      }).join('');
      return { id, m, def, cells };
    });
    const comp = ev.comp;
    sheet(esc(p.long || p.label), `
      <section class="card hero" style="--accent:var(--rk-${pr.rank})">
        ${pr.tested ? badge(pr.rank, 'lg') : '<span class="badge lg" style="--c:var(--dim)"><b>?</b></span>'}
        <div class="meta"><div class="eyebrow">Rang du pilier</div><h1 class="hero-title" style="font-size:1.9rem">${pr.tested ? `Rang ${pr.rank}` : 'Non testé'}<span>${pr.tested ? S.RANK_NAMES[pr.rank] : 'compte comme E'}</span></h1>${bar(pctToNext(pr.score))}</div>
      </section>
      ${pid === 'physique' ? `<section class="card"><div class="split3">
          <div class="stat"><b class="num">${fr(comp.ffmi, 1)}</b><span>FFMI</span></div>
          <div class="stat"><b class="num">${fr(comp.bf, 1)} %</b><span>masse grasse</span></div>
          <div class="stat"><b class="num">${fr(comp.lean, 1)} kg</b><span>masse maigre</span></div></div>
          <p class="small muted">Masse grasse : ${esc(comp.method)}. Pour plus de précision, ajoute tes tours de taille et de cou dans ton profil. IMC : ${fr(comp.bmi, 1)}.</p></section>` : ''}
      <section class="card">
        <h2>Tes résultats</h2>
        ${rows.map(({ id, m, def }) => `<div class="row" style="border-top:1px solid var(--line);padding-top:10px">
            ${m.tested ? badge(m.rank, 'sm') : '<span class="badge sm" style="--c:var(--dim)"><b>?</b></span>'}
            <div class="grow"><b>${esc(def.label)}</b><div class="small muted">${m.tested ? `${S.fmtValue(id, m.value)}${def.ratio ? ` · ${fr(m.value / bw, 2)} × ton poids` : ''}${m.next ? ` · ${S.fmtValue(id, m.next.value)} pour ${m.next.rank}` : ' · sommet'}` : 'Pas encore testé'}</div></div></div>`).join('')}
        ${pid !== 'physique' ? '<button class="btn block" data-act="profile" data-tests="1">Mettre à jour mes tests</button>' : '<button class="btn block" data-act="profile">Modifier mes mensurations</button>'}
      </section>
      <section class="card">
        <div class="card-head"><h2>Barème</h2><span class="small muted">${sex === 'f' ? 'femmes' : 'hommes'}${S.ageFactor(state.profile.age, 'str') !== 1 || S.ageFactor(state.profile.age, 'run') !== 1 ? ' · ajusté à ton âge' : ''}</span></div>
        <div class="table-wrap"><table class="scale"><thead><tr><th></th>${S.RANKS.slice(1).map((r) => `<th style="color:var(--rk-${r})">${r}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(({ def, cells }) => `<tr><td>${esc(def.short)}${def.unit === 'kg' ? ' (kg)' : def.unit === 'cm' ? ' (cm)' : def.unit === 's' ? ' (s)' : ''}</td>${cells}</tr>`).join('')}</tbody></table></div>
        <p class="small muted">Valeurs minimales pour chaque rang. ${pid === 'force' ? `Calculées pour ton poids (${fr(bw, 1)} kg) à partir de ratios charge maximale / poids de corps.` : ''} Le rang X correspond au niveau des meilleurs athlètes ; S s'en approche.</p>
      </section>`);
  }

  function openSession(day) {
    const plan = Pg.weekPlan(state, ev);
    const d = plan.list[day];
    if (!d || !d.session) return;
    const s = d.session;
    const done = isDone(s.key);
    const exHtml = (ex, bi, ei) => {
      const id = `lg-${bi}-${ei}`;
      let logbox = '';
      if (ex.log === 'kg') logbox = `<span class="logbox"><input type="number" inputmode="decimal" id="${id}-w" placeholder="kg" aria-label="Charge en kg"><span class="muted">×</span><input type="number" inputmode="numeric" id="${id}-r" placeholder="reps" aria-label="Répétitions"></span>`;
      else if (ex.log === 'reps') logbox = `<span class="logbox"><input type="number" inputmode="numeric" id="${id}-r" placeholder="max" aria-label="Meilleure série"><span class="muted small">reps (meilleure série)</span></span>`;
      else if (ex.log === 'time') logbox = `<span class="logbox"><input type="number" inputmode="numeric" id="${id}-r" placeholder="s" aria-label="Secondes"><span class="muted small">s (meilleure série)</span></span>`;
      else if (ex.log === 'cm') logbox = `<span class="logbox"><input type="number" inputmode="numeric" id="${id}-r" placeholder="cm" aria-label="Centimètres"><span class="muted small">cm (meilleur saut)</span></span>`;
      const cam = ex.cam ? `<button class="btn sm" data-act="camcount" data-ex="${ex.cam}" data-target="${esc(String(ex.presc).split('×').pop().trim().replace(/\D.*$/, ''))}" data-field="${id}-r">${ICONS.cam}Compter</button>` : '';
      const run = ex.run ? `<button class="btn sm" data-act="run" data-km="0">Lancer le suivi</button>` : '';
      return `<div class="ex" data-metric="${ex.metric || ''}" data-log="${ex.log || ''}" data-field="${id}">
        <div class="ename">${esc(ex.name)}</div><div class="presc">${esc(ex.presc)}</div>
        <div class="detail">${esc(ex.detail || '')}${ex.note ? ` · ${esc(ex.note)}` : ''}</div>
        ${logbox || cam || run ? `<div class="tools">${logbox}${cam}${run}</div>` : ''}</div>`;
    };
    sheet(esc(s.title), `
      <div class="row"><div class="grow"><div class="eyebrow">${Pg.DAY_NAMES[day]} · semaine ${plan.week}</div>
        <div class="tags">${s.tags.map((t) => `<span class="tag">${esc(S.PILLARS.find((p) => p.id === t).label)}</span>`).join('')}<span class="tag">≈ ${s.dur} min</span></div></div>
        ${done ? `<span class="done-dot on">${ICONS.check}</span>` : ''}</div>
      ${s.blocks.map((b, bi) => `<section class="card"><div class="eyebrow">${esc(b.name)}</div>${b.ex.map((e, ei) => exHtml(e, bi, ei)).join('')}</section>`).join('')}
      <p class="small muted">Note tes meilleurs résultats : ils mettent à jour tes records, ton rang et les charges des prochaines séances.</p>
      <button class="btn primary block" data-act="finish" data-key="${s.key}" data-title="${esc(s.title)}">${done ? 'Enregistrer à nouveau' : 'Séance terminée · +100 XP'}</button>`);
  }

  function finishSession(btn) {
    const root = btn.closest('.layer');
    const news = [];
    commit(() => {
      $$('.ex', root).forEach((ex) => {
        const metric = ex.dataset.metric, log = ex.dataset.log, f = ex.dataset.field;
        if (!metric || !log) return;
        if (log === 'kg') {
          const w = num($(`#${f}-w`, root) && $(`#${f}-w`, root).value), r = num($(`#${f}-r`, root) && $(`#${f}-r`, root).value);
          const orm = S.epley(w, r || 1);
          if (orm && setRecord(metric, Math.round(orm * 2) / 2, 'séance')) news.push(`${S.METRICS[metric].short} ${S.fmtValue(metric, orm)}`);
        } else {
          const v = num($(`#${f}-r`, root) && $(`#${f}-r`, root).value);
          if (v && setRecord(metric, v, 'séance')) news.push(`${S.METRICS[metric].short} ${S.fmtValue(metric, v)}`);
        }
      });
      const key = btn.dataset.key;
      if (!isDone(key)) { state.log.push({ t: Date.now(), key, title: btn.dataset.title }); addXp(100); }
    });
    closeLayer(layers.find((l) => l.el === root));
    toast(news.length ? `Nouveau record : ${news.join(', ')}` : 'Séance enregistrée');
  }

  function dungeonBody(id) {
    const d = B.byId(id), sex = state.profile.sex;
    const cur = state.bosses[id] || 0;
    return `
      <p class="small muted">${esc(d.setup)}</p>
      <div class="stack">${S.RANKS.map((r, i) => {
        const beaten = i < cur, open = i <= cur;
        return `<div class="floor ${open ? '' : 'locked'} ${beaten ? 'beaten' : ''}" style="--c:var(--rk-${r})">
          ${B.svg(i)}
          <div style="min-width:0"><div class="fstate">Étage ${r} · ${beaten ? 'vaincu' : open ? 'disponible' : 'verrouillé'}</div>
            <div class="fname">${esc(B.BOSSES[i].name)}</div><div class="fgoal">${esc(B.describe(d, i, sex))}</div></div>
          ${open ? `<button class="btn sm ${beaten ? '' : 'primary'}" data-act="fight" data-id="${id}" data-tier="${i}">${beaten ? 'Rejouer' : 'Combattre'}</button>` : `<span class="muted">${ICONS.lock}</span>`}
        </div>`;
      }).join('')}</div>
      <button class="btn block" data-act="free" data-id="${id}">Compteur libre (sans boss)</button>`;
  }
  function openDungeon(id) {
    const L = sheet(`Donjon · ${esc(B.byId(id).label)}`, dungeonBody(id));
    L.refresh = () => { $('.sheet-body', L.el).innerHTML = dungeonBody(id); };
  }

  // ——— Combat / compteur caméra ———
  function openFight(id, tier, mode, opts) {
    opts = opts || {};
    const d = B.byId(id), sex = state.profile.sex;
    const isBoss = mode === 'boss';
    const target = isBoss ? B.target(d, tier, sex) : (opts.target || null);
    const boss = isBoss ? B.BOSSES[tier] : null;
    const rk = isBoss ? S.RANKS[tier] : ev.global.rank;
    const F = { d, tier, isBoss, target, hp: target, combo: 0, lastRep: 0, reps: 0, held: 0, phase: 'setup', manual: false,
                facing: 'user', stream: null, raf: 0, timer: null, t0: 0, counter: RX.Pose.makeCounter(id), landmarker: null, lastDetect: 0, cdTimer: null, ended: false };
    const goalTxt = isBoss ? B.describe(d, tier, sex) : (target ? `Objectif : ${target} ${d.mode === 'hold' ? 's' : 'reps'}` : 'Compte tes répétitions');

    const L = openLayer(`<div class="arena mirror" style="--c:var(--rk-${rk})">
        <video playsinline muted autoplay></video><canvas class="cam"></canvas>
        <div class="hud-top">
          ${isBoss ? B.svg(tier) : `<span class="badge sm" style="--c:var(--rk-${rk})"><b>${rk}</b></span>`}
          <div style="min-width:0"><div class="bname">${isBoss ? esc(boss.name) : esc(d.label)}</div>
            ${isBoss || target ? `<div class="hp"><i style="width:100%"></i></div>${isBoss ? `<div class="hp-txt">${target * 100} / ${target * 100} PV</div>` : ''}` : `<div class="small" style="opacity:.75">${esc(goalTxt)}</div>`}</div>
          <div class="hud-timer num">${d.mode === 'hold' ? '0:00' : (isBoss ? S.fmtTime(d.time) : '0:00')}</div>
        </div>
        <div class="hud-combo" hidden></div>
        <div class="hud-mid"><div class="big-count num">0</div></div>
        <div class="hud-msg" hidden></div>
        <div class="hud-bottom">
          <button class="btn sm" data-f="quit">Quitter</button>
          <button class="btn sm" data-f="flip">${ICONS.cam}Caméra</button>
          <button class="btn sm" data-f="plus">+1</button>
          <button class="btn sm primary" data-f="end">Terminer</button>
        </div>
        <div class="panel" data-panel>
          <div class="inner">
            ${isBoss ? B.svg(tier) : badge(rk, 'xl')}
            <div class="eyebrow" style="color:var(--c)">${isBoss ? `Étage ${S.RANKS[tier]} · ${esc(d.label)}` : 'Compteur libre'}</div>
            <h2>${isBoss ? esc(boss.name) : esc(d.label)}</h2>
            ${isBoss ? `<p class="muted">${esc(boss.line)}</p>` : ''}
            <div class="goal">${esc(goalTxt)}</div>
            <div class="tip">${esc(d.setup)}</div>
            <div class="btn-row">${PREVIEW ? '' : `<button class="btn primary" data-f="camera">${ICONS.cam}Activer la caméra</button>`}<button class="btn ${PREVIEW ? 'primary' : ''}" data-f="manual">Compter à la main</button></div>
            <button class="btn ghost sm" data-f="quit">Retour</button>
            <p class="small" style="opacity:.6" data-status></p>
          </div>
        </div>
      </div>`, { onClose: cleanup });
    const el = L.el;
    const video = $('video', el), canvas = $('canvas', el), ctx = canvas.getContext('2d');
    const big = $('.big-count', el), msg = $('.hud-msg', el), combo = $('.hud-combo', el), timerEl = $('.hud-timer', el);
    const hpBar = $('.hp i', el), hpTxt = $('.hp-txt', el), panel = $('[data-panel]', el), status = $('[data-status]', el);
    const setHp = () => { if (hpTxt) hpTxt.textContent = `${Math.ceil(Math.max(0, F.hp) * 100)} / ${target * 100} PV`; };

    function cleanup() {
      F.ended = true;
      cancelAnimationFrame(F.raf); clearInterval(F.timer); clearInterval(F.cdTimer);
      if (F.stream) F.stream.getTracks().forEach((t) => t.stop());
      F.stream = null;
    }
    function setMsg(t) { if (t) { msg.textContent = t; msg.hidden = false; } else msg.hidden = true; }
    function showPanel(html) { panel.innerHTML = `<div class="inner">${html}</div>`; panel.hidden = false; }

    async function startCamera() {
      status.textContent = 'Chargement de la vision… (la première fois peut prendre quelques secondes)';
      $$('[data-f="camera"],[data-f="manual"]', el).forEach((b) => { b.disabled = true; });
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocam');
        const camP = openStream();
        F.landmarker = await RX.Pose.load();
        await camP;
        panel.hidden = true;
        F.phase = 'ready';
        setMsg(d.mode === 'hold' ? 'Place-toi de profil, puis appuie sur Commencer' : 'Place-toi dans le cadre, puis appuie sur Commencer');
        showStart();
        loop();
      } catch (e) {
        status.textContent = e && e.name === 'NotAllowedError' ? 'Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, ou compte à la main.'
          : (e && e.message === 'nocam' ? 'Caméra indisponible ici. Compte à la main.' : 'Impossible de lancer la caméra ou la vision. Compte à la main.');
        $$('[data-f="camera"],[data-f="manual"]', el).forEach((b) => { b.disabled = false; });
        $('[data-f="camera"]', el).hidden = true;
      }
    }
    async function openStream() {
      if (F.stream) F.stream.getTracks().forEach((t) => t.stop());
      F.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: F.facing, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      video.srcObject = F.stream;
      await video.play().catch(() => {});
      el.firstElementChild.classList.toggle('mirror', F.facing === 'user');
    }
    function showStart() {
      const hb = $('.hud-bottom', el);
      hb.innerHTML = `<button class="btn sm" data-f="quit">Quitter</button><button class="btn sm" data-f="flip">${ICONS.cam}Caméra</button><button class="btn primary" data-f="go">Commencer</button>`;
    }
    function showFightButtons() {
      const hb = $('.hud-bottom', el);
      hb.innerHTML = `<button class="btn sm" data-f="quit">Abandonner</button>${F.manual ? '' : `<button class="btn sm" data-f="plus">+1</button>`}<button class="btn sm primary" data-f="end">Terminer</button>`;
    }
    function startManual() {
      F.manual = true;
      panel.hidden = true;
      el.firstElementChild.classList.remove('mirror');
      if (d.mode === 'hold') { setMsg('Appuie sur Commencer quand tu es en position'); showStart(); return; }
      const tz = document.createElement('button');
      tz.className = 'tapzone'; tz.setAttribute('data-f', 'tap'); tz.setAttribute('aria-label', 'Ajouter une répétition');
      el.firstElementChild.insertBefore(tz, $('.hud-top', el));
      setMsg('Touche l\'écran à chaque répétition');
      showStart();
    }
    function countdown() {
      F.phase = 'countdown';
      let n = 5;
      big.textContent = n; setMsg('Mets-toi en position');
      $('.hud-bottom', el).innerHTML = `<button class="btn sm" data-f="quit">Quitter</button>`;
      beep(660, 0.1); say(String(n));
      F.cdTimer = setInterval(() => {
        n--;
        if (n > 0) { big.textContent = n; beep(660, 0.1); say(String(n)); return; }
        clearInterval(F.cdTimer);
        beep(1200, 0.25, 0.16); say('Go');
        go();
      }, 1000);
    }
    function go() {
      F.phase = 'fight'; F.t0 = Date.now();
      big.textContent = d.mode === 'hold' ? '0' : '0';
      showFightButtons();
      setMsg(F.manual ? (d.mode === 'hold' ? 'Tiens la position. Appuie sur Terminer quand tu lâches.' : 'Touche l\'écran à chaque répétition') : '');
      F.timer = setInterval(tick, 100);
    }
    function tick() {
      if (F.phase !== 'fight') return;
      const el2 = (Date.now() - F.t0) / 1000;
      if (d.mode === 'hold') {
        if (F.manual) F.held = el2;
        timerEl.textContent = S.fmtTime(F.held);
        big.textContent = Math.floor(F.held);
        if (target) { const left = Math.max(0, target - F.held); F.hp = left; if (hpBar) hpBar.style.width = (left / target * 100) + '%'; setHp(); }
        if (isBoss && F.held >= target) return end();
        return;
      }
      if (isBoss) {
        const left = d.time - el2;
        timerEl.textContent = S.fmtTime(Math.ceil(Math.max(0, left)));
        timerEl.classList.toggle('low', left <= 10);
        if (left <= 0) return end();
      } else timerEl.textContent = S.fmtTime(el2);
      if (F.combo >= 2 && Date.now() - F.lastRep > 2200) { F.combo = 0; combo.hidden = true; }
    }
    function rep() {
      if (F.phase !== 'fight') return;
      const now = Date.now();
      F.combo = now - F.lastRep < 2200 ? F.combo + 1 : 1;
      F.lastRep = now;
      F.reps++;
      big.textContent = F.reps;
      big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop');
      beep(F.combo >= 5 ? 1100 : 880, 0.07); buzz(25);
      if (state.settings.voice) say(String(F.reps));
      if (target) {
        const mult = isBoss ? 1 + Math.min(F.combo - 1, 10) * 0.03 : 1;
        F.hp = Math.max(0, F.hp - mult);
        if (hpBar) hpBar.style.width = (F.hp / target * 100) + '%';
        setHp();
        if (isBoss) {
          const dmg = document.createElement('div');
          dmg.className = 'dmg num'; dmg.textContent = `-${Math.round(mult * 100)}`;
          el.firstElementChild.appendChild(dmg); setTimeout(() => dmg.remove(), 800);
          if (F.combo >= 2) { combo.textContent = `COMBO ×${mult.toFixed(2).replace('.', ',')}`; combo.hidden = false; }
          if (F.hp <= 0) end();
        }
      }
    }
    let skel = null;
    function loop() {
      if (F.ended) return;
      if (!skel) skel = getComputedStyle(el.firstElementChild).getPropertyValue('--c').trim() || '#ffffff';
      const t = performance.now();
      if (video.readyState >= 2 && F.landmarker && t - F.lastDetect > 40) {
        F.lastDetect = t;
        const vw = video.videoWidth, vh = video.videoHeight;
        if (canvas.width !== vw || canvas.height !== vh) { canvas.width = vw; canvas.height = vh; }
        let res = null;
        try { res = F.landmarker.detectForVideo(video, t); } catch (e) { res = null; }
        ctx.clearRect(0, 0, vw, vh);
        const lm = res && res.landmarks && res.landmarks[0];
        if (lm) {
          RX.Pose.draw(ctx, lm, vw, vh, skel, false);
          if (F.phase === 'fight') {
            const out = F.counter.update(lm, vw / vh, t);
            if (d.mode === 'hold') {
              F.held = out.held;
              setMsg(out.msg);
              if (out.broken) end();
            } else {
              if (out.rep) rep();
              setMsg(out.msg);
            }
          } else if (F.phase === 'ready') {
            setMsg('Je te vois. Appuie sur Commencer');
          }
        } else if (F.phase === 'fight' || F.phase === 'ready') setMsg('Je ne te vois pas : recule ou change l\'angle');
      }
      F.raf = requestAnimationFrame(loop);
    }
    function end() {
      if (F.phase === 'end') return;
      const wasFight = F.phase === 'fight';
      F.phase = 'end';
      clearInterval(F.timer);
      cancelAnimationFrame(F.raf);
      if (F.stream) F.stream.getTracks().forEach((t) => t.stop());
      if (!wasFight) { closeLayer(L); return; }
      const value = d.mode === 'hold' ? Math.round(F.held) : F.reps;
      const win = isBoss && (d.mode === 'hold' ? F.held >= target : F.hp <= 0);
      let record = false, xp = 0;
      commit(() => {
        if (d.metric && value > 0) record = setRecord(d.metric, value, isBoss ? 'boss' : 'compteur');
        if (win) {
          xp = 40 + 30 * tier;
          state.bosses[id] = Math.max(state.bosses[id] || 0, tier + 1);
        } else xp = Math.min(30, value);
        addXp(xp);
      });
      if (opts.onDone) opts.onDone(value);
      fanfare(win || !isBoss);
      const unit = d.mode === 'hold' ? 's' : 'reps';
      const time = d.mode === 'hold' ? '' : ` en ${S.fmtTime((Date.now() - F.t0) / 1000)}`;
      showPanel(`
        ${isBoss ? B.svg(tier) : badge(rk, 'xl')}
        <div class="eyebrow" style="color:var(--c)">${isBoss ? (win ? 'Victoire' : 'Défaite') : 'Série terminée'}</div>
        <h2>${isBoss ? (win ? 'Boss vaincu' : `${esc(boss.name)} résiste`) : `${value} ${unit}`}</h2>
        ${isBoss ? `<div class="goal num">${value} ${unit}${time}</div>` : ''}
        ${isBoss && !win ? `<p class="muted">Il lui restait ${d.mode === 'hold' ? Math.ceil(target - F.held) + ' s' : Math.ceil(F.hp * 100) + ' PV'}. ${d.mode === 'hold' ? 'Tiens plus longtemps la prochaine fois.' : 'Enchaîne plus vite pour profiter du combo.'}</p>` : ''}
        ${isBoss && win && tier < 6 ? `<p class="muted">Étage ${S.RANKS[tier + 1]} débloqué : ${esc(B.BOSSES[tier + 1].name)}.</p>` : ''}
        <div class="tip">+${xp} XP${record ? ` · nouveau record : ${S.fmtValue(d.metric, value)}` : ''}</div>
        <div class="btn-row">
          ${isBoss && win && tier < 6 ? `<button class="btn primary" data-f="next">Étage suivant</button>` : ''}
          <button class="btn ${isBoss && win && tier < 6 ? '' : 'primary'}" data-f="again">${isBoss ? 'Rejouer' : 'Recommencer'}</button>
          <button class="btn" data-f="quit">Fermer</button>
        </div>`);
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      const f = b.dataset.f;
      if (f === 'camera') startCamera();
      else if (f === 'manual') startManual();
      else if (f === 'go') countdown();
      else if (f === 'tap' || f === 'plus') rep();
      else if (f === 'flip') { F.facing = F.facing === 'user' ? 'environment' : 'user'; openStream().catch(() => toast('Impossible de changer de caméra')); }
      else if (f === 'end') end();
      else if (f === 'quit') { if (F.phase === 'fight') end(); else closeLayer(L); }
      else if (f === 'again') { closeLayer(L); openFight(id, tier, mode, opts); }
      else if (f === 'next') { closeLayer(L); openFight(id, tier + 1, 'boss'); }
    });
    return L;
  }

  // ——— Course ———
  function openRun(km) {
    const target = km * 1000;
    let tracker = null, confirmStop = false;
    const L = sheet(km ? `Test ${km} km` : 'Course libre', `
      <section class="card" style="text-align:center">
        <div class="eyebrow">${km ? (km === 5 ? 'Vitesse' : 'Endurance') : 'Course libre'}</div>
        <div class="run-big num" data-r="time">0:00</div>
        <div class="src" data-r="src"><i class="off"></i>En attente</div>
        ${target ? `${bar(0)}<div class="small muted num" data-r="left">${km} km restants</div>` : ''}
      </section>
      <div class="run-stats">
        <div class="stat"><b class="num" data-r="dist">0,00</b><span>km</span></div>
        <div class="stat"><b class="num" data-r="pace">–</b><span>allure moyenne</span></div>
        <div class="stat"><b class="num" data-r="steps">0</b><span>pas</span></div>
        <div class="stat"><b class="num" data-r="cad">–</b><span>pas / min</span></div>
      </div>
      <div class="note" data-r="note">Appuie sur Départ. Autorise la localisation et les mouvements si on te le demande. Garde l'écran allumé.</div>
      <div class="btn-row" data-r="btns"><button class="btn primary" data-act="run-start">Départ</button></div>`, { onClose: () => { if (tracker) tracker.stop(); } });
    const el = L.el;
    const q = (k) => $(`[data-r="${k}"]`, el);

    function update(u) {
      q('time').textContent = S.fmtTime(u.elapsed);
      q('dist').textContent = fr(u.distance / 1000, 2);
      q('pace').textContent = u.pace ? S.fmtTime(u.pace) : '–';
      q('steps').textContent = u.steps;
      q('cad').textContent = u.cadence || '–';
      const ok = u.source !== '—';
      q('src').innerHTML = `<i class="${ok ? '' : 'off'}"></i>${u.paused ? 'En pause' : (ok ? `Distance : ${u.source}` : (u.gpsErr || 'Recherche du signal…'))}${u.motionOk ? ' · podomètre actif' : ''}`;
      if (target) {
        const b = $('.bar > i', el); if (b) b.style.width = Math.min(100, u.distance / target * 100) + '%';
        const left = Math.max(0, target - u.distance);
        q('left').textContent = u.splits[target] != null ? `${km} km en ${S.fmtTime(u.splits[target])}` : `${fr(left / 1000, 2)} km restants`;
      }
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'run-start') {
        e.stopPropagation();
        RX.Run.requestMotion(); // doit partir du geste
        tracker = RX.Run.create({
          heightCm: +state.profile.height,
          onUpdate: update,
          onKm: (k, t) => { beep(990, 0.15); say(`Kilomètre ${k}. Allure ${Math.floor(t / k / 60)} minutes ${Math.round(t / k % 60)}`); },
          onSplit: (goal, t) => { fanfare(true); say(`${goal / 1000} kilomètres en ${Math.floor(t / 60)} minutes ${Math.round(t % 60)}`); toast(`${goal / 1000} km en ${S.fmtTime(t)}`); }
        });
        tracker.start();
        q('note').textContent = 'Course en cours. Les passages à 5 et 10 km sont chronométrés automatiquement.';
        q('btns').innerHTML = `<button class="btn" data-act="run-pause">Pause</button><button class="btn danger" data-act="run-stop">Terminer</button>`;
      } else if (a === 'run-pause') {
        e.stopPropagation();
        if (tracker.paused) { tracker.resume(); b.textContent = 'Pause'; } else { tracker.pause(); b.textContent = 'Reprendre'; }
      } else if (a === 'run-stop') {
        e.stopPropagation();
        if (!confirmStop) { confirmStop = true; b.textContent = 'Confirmer l\'arrêt'; setTimeout(() => { confirmStop = false; if (b.isConnected) b.textContent = 'Terminer'; }, 3000); return; }
        const res = tracker.stop(); tracker = null;
        saveRun(res, km);
        closeLayer(L);
      }
    });
  }
  function saveRun(res, km) {
    const news = [];
    commit(() => {
      if (res.distance > 100) {
        state.runs.push({ t: Date.now(), dist: Math.round(res.distance), dur: Math.round(res.elapsed), steps: res.steps, src: res.source, target: km });
        addXp(Math.round(res.distance / 1000 * 10));
      }
      if (res.splits[5000] && setRecord('run5k', Math.round(res.splits[5000]), 'course')) news.push(`5 km en ${S.fmtTime(res.splits[5000])}`);
      if (res.splits[10000] && setRecord('run10k', Math.round(res.splits[10000]), 'course')) news.push(`10 km en ${S.fmtTime(res.splits[10000])}`);
    });
    if (news.length) toast(`Nouveau record : ${news.join(', ')}`);
    else if (km && !res.splits[km * 1000]) toast(`Course enregistrée. ${km} km non atteints : pas de temps classé.`);
    else toast('Course enregistrée');
  }
  function openRunManual() {
    const L = sheet('Saisir un temps', `
      <p class="small muted">Pour une course chronométrée avec une montre, Strava ou sur piste.</p>
      <div class="field"><span>Distance</span><div class="seg" role="group"><button data-km="5" aria-pressed="true">5 km</button><button data-km="10" aria-pressed="false">10 km</button></div></div>
      <div class="field"><span>Temps</span><div class="inline-time"><input type="number" inputmode="numeric" id="rm-h" placeholder="h" aria-label="Heures"><b>:</b><input type="number" inputmode="numeric" id="rm-m" placeholder="min" aria-label="Minutes"><b>:</b><input type="number" inputmode="numeric" id="rm-s" placeholder="s" aria-label="Secondes"></div></div>
      <button class="btn primary block" data-act="rm-save">Enregistrer</button>`);
    let km = 5;
    L.el.addEventListener('click', (e) => {
      const s = e.target.closest('.seg button');
      if (s) { km = +s.dataset.km; $$('.seg button', L.el).forEach((x) => x.setAttribute('aria-pressed', String(x === s))); return; }
      if (e.target.closest('[data-act="rm-save"]')) {
        e.stopPropagation();
        const t = (num($('#rm-h', L.el).value) || 0) * 3600 + (num($('#rm-m', L.el).value) || 0) * 60 + (num($('#rm-s', L.el).value) || 0);
        if (t < (km === 5 ? 720 : 1560)) { toast('Ce temps est plus rapide que le record du monde : vérifie la saisie'); return; }
        let better = false;
        commit(() => { better = setRecord(km === 5 ? 'run5k' : 'run10k', t, 'saisie'); state.runs.push({ t: Date.now(), dist: km * 1000, dur: t, steps: 0, src: 'saisie', target: km }); });
        closeLayer(L);
        toast(better ? `Nouveau record : ${km} km en ${S.fmtTime(t)}` : 'Temps enregistré (ton record reste meilleur)');
      }
    });
  }

  // ——— Partage ———
  function openShare() {
    const code = So.encode(So.card(state, ev));
    const name = state.profile.name || 'Athlète';
    const text = `${name} est rang ${ev.global.rank} sur Rang X. Ajoute-moi : ouvre l'app → Classement → Ajouter un ami, et colle ce code :\n${code}`;
    const L = sheet('Partager mon profil', `
      <p class="muted">Envoie ce code à tes amis (WhatsApp, SMS…). Dans leur app : Classement → Ajouter un ami → coller. Renvoie-le après tes progrès pour mettre leur classement à jour.</p>
      <textarea id="share-code" readonly>${esc(code)}</textarea>
      <div class="btn-row"><button class="btn primary" data-act="sh-copy">Copier le code</button>${navigator.share ? '<button class="btn" data-act="sh-share">Envoyer…</button>' : ''}</div>`);
    L.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="sh-copy"]')) {
        e.stopPropagation();
        const ta = $('#share-code', L.el);
        const done = () => toast('Code copié');
        try { navigator.clipboard.writeText(text).then(done, () => { ta.select(); toast('Sélectionné : copie-le avec le menu'); }); }
        catch (err) { ta.select(); toast('Sélectionné : copie-le avec le menu'); }
      } else if (e.target.closest('[data-act="sh-share"]')) {
        e.stopPropagation();
        navigator.share({ title: 'Rang X', text }).catch(() => {});
      }
    });
  }
  function openAddFriend(prefill) {
    const L = sheet('Ajouter un ami', `
      <p class="muted">Colle le code (ou le message entier) que ton ami t'a envoyé. S'il est déjà dans ta liste, ses résultats sont mis à jour.</p>
      <textarea id="friend-code" placeholder="RX1.…">${esc(prefill || '')}</textarea>
      <button class="btn primary block" data-act="af-save">Ajouter</button>`);
    L.el.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act="af-save"]')) return;
      e.stopPropagation();
      const c = So.decode($('#friend-code', L.el).value);
      if (!c) { toast('Code illisible : vérifie qu\'il commence par RX1.'); return; }
      if (c.id === state.id) { toast('C\'est ton propre code'); return; }
      const existed = !!state.friends[c.id];
      commit(() => { state.friends[c.id] = c; }, { quiet: true });
      closeLayer(L);
      lbCat = 'global'; tab = 'classement'; render();
      toast(existed ? `${c.n} mis à jour` : `${c.n} ajouté au classement`);
    });
  }
  function openFriend(id) {
    const me = So.card(state, ev);
    const f = allPeople(me).find((p) => p.id === id);
    if (!f) return;
    const line = (label, a, b, dir, fmt) => {
      const wa = a != null && b != null && (dir > 0 ? a > b : a < b), wb = a != null && b != null && (dir > 0 ? b > a : b < a);
      return `<div class="cmp"><span class="l ${wa ? 'win' : ''}">${a != null ? fmt(a) : '–'}</span><span class="m">${esc(label)}</span><span class="${wb ? 'win' : ''}">${b != null ? fmt(b) : '–'}</span></div>`;
    };
    const fake = { pillars: {} };
    for (const p of S.PILLARS) fake.pillars[p.id] = { score: me.p[p.id], tested: me.p[p.id] > 0, rank: S.rankOf(me.p[p.id]) };
    const isFriend = !!state.friends[id];
    const L = sheet(esc(f.n), `
      <section class="card">
        <div class="cmp"><b class="l" style="color:var(--accent)">Toi</b><span class="m">vs</span><b>${esc(f.n)}</b></div>
        ${radar(Object.assign({}, ev), f)}
        <p class="small muted" style="text-align:center">Trait plein : toi · pointillés : ${esc(f.n)}</p>
      </section>
      <section class="card">
        <h2>Piliers</h2>
        ${line('Global', me.g, f.g, 1, (x) => `${S.rankOf(x)} · ${fr(x, 2)}`)}
        ${S.PILLARS.map((p) => line(p.label, me.p[p.id] || null, f.p[p.id] || null, 1, (x) => `${S.rankOf(x)} · ${fr(x, 1)}`)).join('')}
      </section>
      <section class="card">
        <h2>Records</h2>
        ${So.REC_KEYS.map((k) => line(S.METRICS[k].short, me.r[k] || null, f.r[k] || null, S.METRICS[k].dir, (x) => S.fmtValue(k, x))).join('')}
        ${line('Boss vaincus', me.b, f.b, 1, (x) => String(x))}
      </section>
      <p class="small muted">Mis à jour le ${new Date(f.t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}.</p>
      ${isFriend ? '<button class="btn danger block" data-act="rm-friend">Retirer du classement</button>' : ''}`);
    L.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act="rm-friend"]');
      if (!b) return;
      e.stopPropagation();
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Appuie encore pour confirmer'; return; }
      commit(() => { delete state.friends[id]; }, { quiet: true });
      closeLayer(L);
    });
  }
  function openLeague() {
    const lg = state.league;
    const L = sheet('Ligue en ligne', `
      <p class="muted">Crée une base Firebase Realtime Database gratuite (le guide est dans le fichier LISEZMOI), puis colle son adresse ici. Donne la même adresse et le même code de ligue à tes amis.</p>
      <label class="field"><span>Adresse de la base</span><input type="text" id="lg-url" placeholder="https://ma-bande-default-rtdb.europe-west1.firebasedatabase.app" value="${esc(lg.url)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <label class="field"><span>Code de ligue</span><input type="text" id="lg-code" placeholder="les-titans" value="${esc(lg.code)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <p class="small muted">Ce qui est envoyé : ton pseudo, sexe, âge, poids, tes rangs, records, XP et boss vaincus. Toute personne qui a l'adresse et le code peut les lire.</p>
      <div class="btn-row"><button class="btn primary" data-act="lg-save">Enregistrer et synchroniser</button>${lg.url ? '<button class="btn danger" data-act="lg-off">Quitter la ligue</button>' : ''}</div>`);
    L.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="lg-off"]')) {
        e.stopPropagation();
        commit(() => { state.league = { url: '', code: '', members: [], last: 0 }; }, { quiet: true, fromSync: true });
        closeLayer(L); return;
      }
      if (!e.target.closest('[data-act="lg-save"]')) return;
      e.stopPropagation();
      const url = $('#lg-url', L.el).value.trim(), code = $('#lg-code', L.el).value.trim();
      if (!So.validDbUrl(url)) { toast('Adresse invalide : elle doit finir par firebaseio.com ou firebasedatabase.app'); return; }
      if (!So.validLeague(code)) { toast('Code de ligue : 3 à 32 lettres, chiffres, - ou _'); return; }
      commit(() => {
        if (url !== state.league.url || code !== state.league.code) { state.league.sig = ''; state.league.sent = null; }
        state.league.url = url; state.league.code = code;
      }, { quiet: true, fromSync: true });
      closeLayer(L);
      syncLeague();
    });
  }
  // ——— Ligue : synchro automatique ———
  // Les records battus hors ligne restent sur le téléphone ; dès que le réseau revient (ou à la
  // prochaine ouverture de l'app), la fiche est renvoyée à la ligue en gardant le meilleur score.
  const cardSig = (c) => JSON.stringify(Object.assign({}, c, { t: 0 }));
  function leaguePending() {
    const lg = state.league;
    return !!(lg.url && lg.code && ev && cardSig(So.card(state, ev)) !== lg.sig);
  }
  let syncing = null, syncTimer = 0, retryDelay = 0;
  function autoSync(delay) {
    clearTimeout(syncTimer);
    if (!leaguePending()) return;
    syncTimer = setTimeout(() => {
      if (navigator.onLine === false) return; // l'événement « online » relancera la synchro
      syncLeague({ auto: true });
    }, delay);
  }
  function syncLeague(opts) {
    const auto = !!(opts && opts.auto);
    const lg = state.league;
    if (!lg.url || !lg.code || !ev) return Promise.resolve(false);
    if (syncing) return syncing;
    if (!auto) toast('Synchronisation…');
    const wasPending = leaguePending();
    syncing = (async () => {
      try {
        let merged = state.records, xp = state.xp || 0, gained = [];
        const res = await So.syncLeague(lg.url, lg.code, state.id, (own) => {
          if (own) {
            const m = So.mergeRecords(state.records, own.r, lg.sent);
            merged = m.records; gained = m.gained; xp = Math.max(xp, own.xp || 0);
          }
          const c = So.card(Object.assign({}, state, { records: merged, xp }), S.evaluate(state.profile, merged));
          if (own) c.b = Math.max(c.b, own.b || 0);
          return c;
        });
        commit(() => {
          for (const k of gained) {
            if (merged[k] !== state.records[k]) { state.records[k] = merged[k]; state.history.push({ t: Date.now(), m: k, v: merged[k], src: 'ligue' }); }
          }
          state.xp = Math.max(state.xp || 0, xp);
          state.league.members = res.members.filter((m) => m.id !== state.id);
          state.league.last = Date.now();
          state.league.sent = Object.assign({}, res.card.r);
          state.league.sig = cardSig(So.card(state, S.evaluate(state.profile, state.records)));
        }, { quiet: true, fromSync: true });
        retryDelay = 0;
        const n = res.members.length;
        if (gained.length) toast(`Meilleur score récupéré de la ligue : ${gained.map((k) => S.METRICS[k].short).join(', ')}`);
        else if (!auto) toast(`Ligue à jour : ${n} athlète${n > 1 ? 's' : ''}`);
        else if (wasPending) toast('Records hors ligne envoyés à la ligue');
        return true;
      } catch (e) {
        if (!auto) toast(e && e.message ? e.message : 'Synchronisation impossible');
        // nouvel essai plus tard : 30 s, 1 min, 2 min… jusqu'à 15 min
        retryDelay = Math.min(15 * 60e3, retryDelay ? retryDelay * 2 : 30e3);
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => { if (navigator.onLine !== false) syncLeague({ auto: true }); }, retryDelay);
        return false;
      } finally {
        syncing = null;
      }
    })();
    return syncing;
  }

  // ——— Profil & tests ———
  function testsHtml(r) {
    const lift = (id, label) => `<div class="test-row two"><span class="tl">${label}<small>meilleure charge × reps${r[id] ? ` · actuel ≈ ${Math.round(r[id])} kg` : ''}</small></span>
      <input type="number" inputmode="decimal" id="t-${id}-w" placeholder="kg" value="${r[id] ? Math.round(r[id] * 2) / 2 : ''}" aria-label="${label} : kg">
      <input type="number" inputmode="numeric" id="t-${id}-r" placeholder="reps" value="${r[id] ? 1 : ''}" aria-label="${label} : reps"></div>`;
    const reps = (id, label, hint) => `<div class="test-row"><span class="tl">${label}<small>${hint}</small></span><input type="number" inputmode="numeric" id="t-${id}" placeholder="${S.METRICS[id].unit === 'reps' ? 'reps' : S.METRICS[id].unit}" value="${r[id] || ''}" aria-label="${label}"></div>`;
    const time = (id, label, hint) => {
      const v = r[id] || 0, m = Math.floor(v / 60), s = Math.round(v % 60);
      return `<div class="test-row two"><span class="tl">${label}<small>${hint}</small></span>
        <input type="number" inputmode="numeric" id="t-${id}-m" placeholder="min" value="${v ? m : ''}" aria-label="${label} : minutes">
        <input type="number" inputmode="numeric" id="t-${id}-s" placeholder="s" value="${v ? s : ''}" aria-label="${label} : secondes"></div>`;
    };
    return `
      <section class="card"><div class="eyebrow">Force · charge maximale</div>
        <p class="small muted">Indique la plus lourde charge que tu as soulevée et pour combien de reps : l'app estime ton max sur 1 rep (formule d'Epley). Laisse vide si tu ne sais pas.</p>
        <div>${lift('bench', 'Développé couché')}${lift('squat', 'Squat')}${lift('deadlift', 'Soulevé de terre')}</div></section>
      <section class="card"><div class="eyebrow">Maîtrise du corps · max d'affilée</div>
        <div>${reps('pullups', 'Tractions', 'strictes, bras tendus en bas')}${reps('dips', 'Dips', 'coudes à 90°')}${reps('pushups', 'Pompes', 'sans pause')}${reps('muscleups', 'Muscle-ups', 'stricts ou avec élan')}${reps('plank', 'Gainage', 'en secondes')}</div>
        <p class="small muted">Tu peux aussi les mesurer avec la caméra dans l'onglet Boss.</p></section>
      <section class="card"><div class="eyebrow">Course</div>
        <div>${time('run5k', 'Course 5 km', 'meilleur temps')}${time('run10k', 'Course 10 km', 'meilleur temps')}</div>
        <p class="small muted">Pas de temps ? Fais le test dans l'onglet Course.</p></section>
      <section class="card"><div class="eyebrow">Explosivité</div>
        <div>${reps('broadjump', 'Saut en longueur', 'sans élan, pieds joints, en cm')}${reps('vertjump', 'Détente verticale', 'en cm (marque au mur)')}</div></section>`;
  }
  function readTests(root, into) {
    const r = Object.assign({}, into);
    for (const id of ['bench', 'squat', 'deadlift']) {
      const w = num($(`#t-${id}-w`, root).value), n = num($(`#t-${id}-r`, root).value);
      const orm = S.epley(w, n || 1);
      if (orm) r[id] = Math.round(orm * 2) / 2; else delete r[id];
    }
    for (const id of ['pullups', 'dips', 'pushups', 'muscleups', 'plank', 'broadjump', 'vertjump']) {
      const v = num($(`#t-${id}`, root).value);
      if (v > 0) r[id] = v; else delete r[id];
    }
    for (const id of ['run5k', 'run10k']) {
      const t = (num($(`#t-${id}-m`, root).value) || 0) * 60 + (num($(`#t-${id}-s`, root).value) || 0);
      if (t > 0) r[id] = t; else delete r[id];
    }
    return r;
  }
  function profileHtml(p) {
    p = p || {};
    const goal = p.goal || 'complet', days = +p.days || 4, equip = p.equip || 'salle', sex = p.sex || 'm';
    return `
      <section class="card"><div class="eyebrow">Toi</div>
        <label class="field"><span>Pseudo (visible par tes amis)</span><input type="text" id="p-name" maxlength="24" value="${esc(p.name || '')}" placeholder="Ton pseudo"></label>
        <div class="field"><span>Sexe (les barèmes diffèrent)</span><div class="seg" data-seg="sex"><button data-v="m" aria-pressed="${sex === 'm'}">Homme</button><button data-v="f" aria-pressed="${sex === 'f'}">Femme</button></div></div>
        <div class="split3">
          <label class="field"><span>Âge</span><input type="number" inputmode="numeric" id="p-age" value="${esc(p.age || '')}" placeholder="ans"></label>
          <label class="field"><span>Taille</span><input type="number" inputmode="numeric" id="p-height" value="${esc(p.height || '')}" placeholder="cm"></label>
          <label class="field"><span>Poids</span><input type="number" inputmode="decimal" id="p-weight" value="${esc(p.weight || '')}" placeholder="kg"></label>
        </div>
        <details ${p.bf || p.waist ? 'open' : ''}><summary>Affiner ma masse grasse (optionnel)</summary>
          <div class="stack" style="margin-top:10px">
            <div class="split">
              <label class="field"><span>Tour de taille (nombril)</span><input type="number" inputmode="decimal" id="p-waist" value="${esc(p.waist || '')}" placeholder="cm"></label>
              <label class="field"><span>Tour de cou</span><input type="number" inputmode="decimal" id="p-neck" value="${esc(p.neck || '')}" placeholder="cm"></label>
            </div>
            <div class="split">
              <label class="field"><span>Tour de hanches (femmes)</span><input type="number" inputmode="decimal" id="p-hip" value="${esc(p.hip || '')}" placeholder="cm"></label>
              <label class="field"><span>Ou % de masse grasse connu</span><input type="number" inputmode="decimal" id="p-bf" value="${esc(p.bf || '')}" placeholder="%"></label>
            </div>
          </div></details>
      </section>
      <section class="card" id="goal-card"><div class="eyebrow">Objectif</div>
        <div class="stack" data-seg="goal">${Object.entries(Pg.GOALS).map(([k, g]) => `<button class="choice" data-v="${k}" aria-pressed="${k === goal}"><b>${esc(g.label)}</b><span>${esc(g.desc)}</span></button>`).join('')}</div>
        <div class="field"><span>Séances par semaine</span><div class="seg" data-seg="days">${[3, 4, 5, 6].map((n) => `<button data-v="${n}" aria-pressed="${n === days}">${n}</button>`).join('')}</div></div>
        <div class="field"><span>Matériel</span><div class="seg" data-seg="equip"><button data-v="salle" aria-pressed="${equip === 'salle'}">Salle (barre + poids)</button><button data-v="maison" aria-pressed="${equip === 'maison'}">Poids du corps</button></div></div>
      </section>`;
  }
  function readProfile(root, base) {
    const p = Object.assign({}, base);
    p.name = $('#p-name', root).value.trim().slice(0, 24) || 'Athlète';
    for (const k of ['age', 'height', 'weight', 'waist', 'neck', 'hip', 'bf']) { const v = num($(`#p-${k}`, root).value); if (v > 0) p[k] = v; else delete p[k]; }
    for (const k of ['sex', 'goal', 'days', 'equip']) { const b = $(`[data-seg="${k}"] [aria-pressed="true"]`, root); if (b) p[k] = k === 'days' ? +b.dataset.v : b.dataset.v; }
    return p;
  }
  function validProfile(p) {
    if (!(p.age >= 10 && p.age <= 100)) return 'Indique un âge entre 10 et 100 ans';
    if (!(p.height >= 120 && p.height <= 230)) return 'Indique ta taille en cm (entre 120 et 230)';
    if (!(p.weight >= 30 && p.weight <= 250)) return 'Indique ton poids en kg (entre 30 et 250)';
    return null;
  }
  function wireSegs(root) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-seg] [data-v]');
      if (!b) return;
      const seg = b.closest('[data-seg]');
      $$('[data-v]', seg).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
  }

  function openProfile(focus) {
    const L = sheet('Profil & tests', `
      ${profileHtml(state.profile)}
      <div class="eyebrow" id="tests-anchor" style="margin-top:6px">Tests</div>
      ${testsHtml(state.records)}
      <button class="btn primary block" data-act="pf-save">Enregistrer et recalculer</button>
      <section class="card"><div class="eyebrow">Réglages</div>
        <label class="row"><input type="checkbox" id="s-sound" ${state.settings.sound ? 'checked' : ''}><span class="grow">Sons (bips de répétition)</span></label>
        <label class="row"><input type="checkbox" id="s-voice" ${state.settings.voice ? 'checked' : ''}><span class="grow">Voix (compte à voix haute)</span></label>
      </section>
      <section class="card"><div class="eyebrow">Méthode</div>
        <p class="small muted">Les rangs ne dépendent pas de toi mais de références externes : ratios charge / poids de corps des tables de standards de force, normes de tests militaires pour les pompes et tractions, temps de course du niveau débutant au niveau élite, normes de détente des tests NFL/NBA, et FFMI (Kouri et al., 1995). Rang X = niveau des meilleurs athlètes. Un coefficient d'âge compare un ado ou un master à l'équivalent adulte.</p>
        <button class="btn" data-act="science">Voir tous les barèmes</button></section>
      <section class="card"><div class="eyebrow">Mes données</div>
        <p class="small muted">Tout est enregistré sur ce téléphone. Fais une copie de sauvegarde avant de changer d'appareil.${storageOk ? '' : ' Attention : le stockage est bloqué dans ce navigateur, tes données seront perdues à la fermeture.'}</p>
        <div class="btn-row"><button class="btn" data-act="backup">Sauvegarde</button><button class="btn danger" data-act="reset">Tout effacer</button></div></section>`);
    wireSegs(L.el);
    if (focus === 'tests') setTimeout(() => { const a = $('#tests-anchor', L.el); if (a) L.el.scrollTop = a.offsetTop - 70; }, 50);
    if (focus === 'goal') setTimeout(() => { const a = $('#goal-card', L.el); if (a) L.el.scrollTop = a.offsetTop - 70; }, 50);
    L.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'pf-save') {
        e.stopPropagation();
        const p = readProfile(L.el, state.profile);
        const err = validProfile(p);
        if (err) { toast(err); return; }
        const r = readTests(L.el, state.records);
        commit(() => {
          const changed = Object.keys(Object.assign({}, r, state.records)).filter((k) => r[k] !== state.records[k]);
          for (const k of changed) if (r[k]) state.history.push({ t: Date.now(), m: k, v: r[k], src: 'profil' });
          state.profile = p; state.records = r;
          state.settings.sound = $('#s-sound', L.el).checked; state.settings.voice = $('#s-voice', L.el).checked;
        });
        closeLayer(L);
        toast('Profil recalculé');
      } else if (b.dataset.act === 'reset') {
        e.stopPropagation();
        if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Appuie encore : tout sera effacé'; return; }
        try { localStorage.removeItem(KEY); } catch (err) { /* ignoré */ }
        state = blank(); ev = null;
        while (layers.length) closeLayer();
        render();
      }
    });
  }
  function openBackup() {
    const data = JSON.stringify(state);
    const L = sheet('Sauvegarde', `
      <p class="muted">Copie ce texte et garde-le (notes, e-mail à toi-même). Pour restaurer, colle-le ci-dessous sur le nouveau téléphone.</p>
      <textarea id="bk-out" readonly>${esc(data)}</textarea>
      <button class="btn" data-act="bk-copy">Copier</button>
      <label class="field"><span>Restaurer une sauvegarde</span><textarea id="bk-in" placeholder='{"v":1,…}'></textarea></label>
      <button class="btn primary" data-act="bk-restore">Restaurer</button>`);
    L.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'bk-copy') {
        e.stopPropagation();
        try { navigator.clipboard.writeText(data).then(() => toast('Copié'), () => { $('#bk-out', L.el).select(); }); } catch (err) { $('#bk-out', L.el).select(); }
      } else if (b.dataset.act === 'bk-restore') {
        e.stopPropagation();
        try {
          const s = JSON.parse($('#bk-in', L.el).value);
          if (!s || s.v !== 1 || !s.profile) throw new Error('bad');
          state = Object.assign(blank(), s); save(); recompute();
          while (layers.length) closeLayer();
          render(); toast('Sauvegarde restaurée'); autoSync(1500);
        } catch (err) { toast('Sauvegarde illisible'); }
      }
    });
  }
  function openScience() {
    const sex = ev.sex;
    const fmtTh = (id, t) => {
      const def = S.METRICS[id];
      if (def.unit === 'time') return S.fmtTime(t);
      if (def.ratio) return `${fr(t, 2)}×`;
      return fr(t, def.unit === '' || def.unit === '%' ? 1 : 0);
    };
    sheet('Barèmes', `
      <p class="muted">Valeurs minimales par rang (${sex === 'f' ? 'femmes' : 'hommes'}, adulte de 20 à 35 ans). Force : multiple du poids de corps sur 1 rep. En dessous de D : rang E.</p>
      ${S.PILLARS.map((p) => `<section class="card"><h3>${esc(p.long || p.label)}</h3>
        <div class="table-wrap"><table class="scale"><thead><tr><th></th>${S.RANKS.slice(1).map((r) => `<th style="color:var(--rk-${r})">${r}</th>`).join('')}</tr></thead>
        <tbody>${p.metrics.map((id) => `<tr><td>${esc(S.METRICS[id].short)}</td>${S.thresholds(id, sex).map((t) => `<td>${fmtTh(id, t)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('')}
      <section class="card"><h3>Sources</h3>
        <p class="small muted">Force : tables de standards 1RM/poids de corps (Kilgore, Rippetoe & Pendlay ; ExRx). Poids du corps : barèmes US Army (APFT) et standards de street workout. Course : du coureur débutant au niveau national ; X ≈ 15:00 au 5 km pour un homme. Explosivité : normes de détente et de saut sans élan des tests NFL/NBA Combine. Physique : FFMI normalisé (Kouri et al., 1995), % de masse grasse (ACE), formule Marine US ou Deurenberg. Nutrition : Mifflin-St Jeor.</p></section>`);
  }

  // ——— Accueil (première ouverture) ———
  function openOnboarding() {
    let step = 0;
    let draft = { sex: 'm', goal: 'complet', days: 4, equip: 'salle' };
    let rec = {};
    const L = openLayer('<div class="sheet-body" id="ob"></div>', { cls: 'onboarding' });
    const root = $('#ob', L.el);
    wireSegs(L.el);
    const dots = (n) => `<div class="step-dots">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
    function show() {
      L.el.scrollTop = 0;
      if (step === 0) {
        root.innerHTML = `<div class="intro-hero">
          <div class="logo" style="font-size:2rem">RANG <span style="color:var(--rk-X)">X</span></div>
          <h1>Deviens l'athlète <em>parfait</em>.</h1>
          <p class="muted">Force, maîtrise du corps, vitesse, endurance, explosivité, physique. L'app te classe sur des barèmes scientifiques, te donne ton programme de la semaine et te fait affronter des boss avec la caméra.</p>
          <div class="ladder">${S.RANKS.map((r) => badge(r)).join('')}</div>
          <p class="small muted">${S.RANKS.map((r) => `<b style="color:var(--rk-${r})">${r}</b> ${esc(S.RANK_NAMES[r])}`).join(' · ')}</p>
          <button class="btn primary block" data-ob="next">Commencer l'évaluation</button>
          <p class="small muted">Tes données restent sur ton téléphone.</p></div>`;
      } else if (step === 1) {
        root.innerHTML = `${dots(1)}<h2>Ton profil</h2><p class="muted">Ta taille, ton poids et ta masse servent à calculer ton physique et tes charges.</p>${profileHtml(draft)}
          <div class="btn-row"><button class="btn" data-ob="back">Retour</button><button class="btn primary" data-ob="next">Continuer</button></div>`;
      } else if (step === 2) {
        root.innerHTML = `${dots(2)}<h2>Tes tests</h2><p class="muted">Remplis ce que tu connais, laisse vide le reste : tu pourras faire les tests plus tard (caméra pour les reps, GPS pour la course). Un pilier non testé compte comme E.</p>${testsHtml(rec)}
          <div class="btn-row"><button class="btn" data-ob="back">Retour</button><button class="btn primary" data-ob="next">Calculer mon rang</button></div>`;
      } else if (step === 3) {
        state.profile = draft; state.records = rec; state.programStart = Date.now();
        save(); recompute();
        const g = ev.global;
        fanfare(true);
        root.innerHTML = `${dots(3)}<div class="eyebrow">Évaluation terminée</div>
          <div class="card hero rankup" style="--accent:var(--rk-${g.rank})">${badge(g.rank, 'xl')}<div class="meta"><h1 class="hero-title">Rang ${g.rank}<span>${S.RANK_NAMES[g.rank]}</span></h1><div class="small muted">score ${fr(g.score, 2)} / 6</div></div></div>
          <section class="card">${radar(ev)}</section>
          <p class="muted">Ton programme de la semaine est prêt : ${esc(Pg.GOALS[draft.goal].label.toLowerCase())}, ${draft.days} séances. Il cible en plus ton point faible.</p>
          <button class="btn primary block" data-ob="done">Voir mon programme</button>`;
      }
    }
    L.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ob]');
      if (!b) return;
      const a = b.dataset.ob;
      if (a === 'back') { if (step === 2) rec = readTests(root, rec); step--; show(); return; }
      if (a === 'done') { closeLayer(L); tab = 'programme'; render(); return; }
      if (step === 1) {
        const p = readProfile(root, draft);
        const err = validProfile(p);
        if (err) { toast(err); return; }
        draft = p;
      }
      if (step === 2) rec = readTests(root, {});
      step++; show();
    });
    show();
  }

  // ——— Actions globales ———
  const ACTIONS = {
    tab: (b) => { tab = b.dataset.id; render(); window.scrollTo(0, 0); try { history.replaceState(null, '', '#' + tab); } catch (e) { /* ignoré */ } },
    close: () => closeLayer(),
    profile: (b) => openProfile(b.dataset.tests ? 'tests' : (b.dataset.goal ? 'goal' : null)),
    pillar: (b) => openPillar(b.dataset.id),
    session: (b) => openSession(+b.dataset.day),
    finish: (b) => finishSession(b),
    dungeon: (b) => openDungeon(b.dataset.id),
    fight: (b) => { openFight(b.dataset.id, +b.dataset.tier, 'boss'); },
    free: (b) => openFight(b.dataset.id, 0, 'free'),
    camcount: (b) => {
      const field = b.dataset.field, root = b.closest('.layer');
      openFight(b.dataset.ex, 0, 'free', { target: +b.dataset.target || null, onDone: (v) => { const inp = root && $(`#${field}`, root); if (inp && v > 0 && (!num(inp.value) || v > num(inp.value))) inp.value = v; } });
    },
    run: (b) => openRun(+b.dataset.km),
    runmanual: () => openRunManual(),
    share: () => openShare(),
    addfriend: () => openAddFriend(),
    friend: (b) => openFriend(b.dataset.id),
    lbcat: (b) => { lbCat = b.dataset.id; render(); },
    league: () => openLeague(),
    sync: () => syncLeague(),
    science: () => openScience(),
    backup: () => openBackup()
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !ACTIONS[b.dataset.act]) return;
    ACTIONS[b.dataset.act](b, e);
  });

  // ——— Démarrage ———
  function boot() {
    const h = (location.hash || '').slice(1);
    if (TABS.some(([id]) => id === h)) tab = h;
    recompute();
    render();
    // code ami passé dans le lien (#ami-RX1.…)
    const m = (location.hash || '').match(/RX1\.[A-Za-z0-9_-]+/);
    if (m && state.profile) openAddFriend(m[0]);
    if (!PREVIEW && 'serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    window.addEventListener('online', () => { retryDelay = 0; autoSync(500); if (tab === 'classement') render(); });
    window.addEventListener('offline', () => { if (tab === 'classement') render(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoSync(1000); });
    autoSync(1500);
    window.addEventListener('hashchange', () => {
      const x = (location.hash || '').slice(1);
      if (TABS.some(([id]) => id === x) && x !== tab) { tab = x; render(); }
    });
  }
  RX.App = { boot, get state() { return state; } };
})(window.RX = window.RX || {});
