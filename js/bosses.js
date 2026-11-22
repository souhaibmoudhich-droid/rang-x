/* Rang X — donjons et boss. Chaque donjon a 7 étages (E → X). */
(function (RX) {
  'use strict';
  const RANKS = RX.Std.RANKS;

  const BOSSES = [
    { name: 'Larve de Fer',          line: 'Un échauffement. Montre que tu sais bouger.' },
    { name: 'Gobelin Ferrailleur',   line: 'Il frappe vite mais tombe vite.' },
    { name: 'Sentinelle de Granit',  line: 'Lente, lourde, patiente. Ne t\'arrête pas.' },
    { name: 'Chevalier sans Visage', line: 'Il punit chaque pause trop longue.' },
    { name: 'Golem d\'Acier',         line: 'Seul un rythme constant le fissure.' },
    { name: 'Hydre Écarlate',        line: 'Chaque tête tombée en fait pousser une autre.' },
    { name: 'Le Souverain',          line: 'Le sommet. Peu d\'humains l\'ont vu tomber.' }
  ];

  // Objectifs inspirés des tests en 2 minutes (US Army APFT, tests de police/pompiers)
  // et des records de street workout pour les étages S et X.
  const DUNGEONS = [
    { id: 'pushups',   label: 'Pompes',     mode: 'reps', time: 120, metric: 'pushups',
      m: [10, 20, 32, 45, 60, 75, 90], f: [4, 10, 18, 28, 38, 50, 62],
      setup: 'Pose le téléphone au sol à 1,5–2 m, de profil. Tout ton corps doit être visible.' },
    { id: 'squats',    label: 'Squats',     mode: 'reps', time: 120,
      m: [20, 35, 50, 65, 80, 95, 115], f: [15, 28, 42, 55, 68, 82, 100],
      setup: 'Téléphone à hauteur de hanches, de profil, à 2–3 m. Corps entier visible.' },
    { id: 'pullups',   label: 'Tractions',  mode: 'reps', time: 120, metric: 'pullups',
      m: [2, 5, 10, 16, 22, 30, 40], f: [1, 2, 5, 8, 12, 17, 24],
      setup: 'Téléphone face à la barre, à 2–3 m. La barre et tes mains doivent être dans le cadre.' },
    { id: 'dips',      label: 'Dips',       mode: 'reps', time: 120, metric: 'dips',
      m: [4, 10, 18, 28, 40, 52, 65], f: [2, 5, 10, 16, 24, 32, 42],
      setup: 'Téléphone de profil, à hauteur des barres, à 2 m.' },
    { id: 'muscleups', label: 'Muscle-ups', mode: 'reps', time: 180, metric: 'muscleups',
      m: [1, 2, 4, 7, 11, 16, 22], f: [1, 1, 2, 3, 5, 8, 12],
      setup: 'Téléphone face à la barre, assez loin pour voir tes mains et tes hanches au-dessus de la barre.' },
    { id: 'plank',     label: 'Gainage',    mode: 'hold', time: null, metric: 'plank',
      m: [30, 60, 90, 120, 180, 240, 300], f: [25, 50, 80, 110, 165, 220, 280],
      setup: 'Téléphone au sol de profil à 1,5 m. Le combat s\'arrête si tu casses la position plus de 3 s.' }
  ];

  function target(d, tier, sex) { return (sex === 'f' ? d.f : d.m)[tier]; }

  function describe(d, tier, sex) {
    const t = target(d, tier, sex);
    if (d.mode === 'hold') return `Tiens ${t >= 120 ? RX.Std.fmtTime(t) : t + ' s'} de gainage`;
    return `${t} ${d.label.toLowerCase()} en ${RX.Std.fmtTime(d.time)}`;
  }

  // Masque de boss procédural : plus le rang monte, plus il a de cornes et d'yeux.
  function svg(tier, cls) {
    const c = `var(--rk-${RANKS[tier]})`;
    const horns = [];
    const hn = Math.min(tier, 4);
    for (let i = 0; i < hn; i++) {
      const y = 34 - i * 7, x = 22 - i * 4, len = 14 + i * 4;
      horns.push(`<path d="M${x} ${y} L${x - 6 - i * 2} ${y - len} L${x + 8} ${y - 4} Z" fill="${c}" opacity="${0.55 + i * 0.1}"/>`);
      horns.push(`<path d="M${100 - x} ${y} L${106 - x + i * 2} ${y - len} L${92 - x} ${y - 4} Z" fill="${c}" opacity="${0.55 + i * 0.1}"/>`);
    }
    const crown = tier === 6 ? `<path d="M30 20 L36 6 L44 16 L50 2 L56 16 L64 6 L70 20 Z" fill="${c}"/>` : '';
    const third = tier >= 4 ? `<path d="M46 40 L50 33 L54 40 L50 46 Z" fill="${c}"/>` : '';
    const teeth = tier >= 2 ? `<path d="M36 74 L40 80 L44 74 L48 80 L52 74 L56 80 L60 74 L64 80" stroke="${c}" stroke-width="2.5" fill="none" stroke-linejoin="round"/>` : `<path d="M40 76 H60" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    const scars = tier >= 3 ? `<path d="M70 30 L62 46" stroke="${c}" stroke-width="2" opacity=".6"/>` : '';
    return `<svg class="${cls || 'boss-svg'}" viewBox="0 0 100 100" aria-hidden="true">
      ${horns.join('')}${crown}
      <path d="M22 30 Q50 14 78 30 L84 58 Q80 86 50 96 Q20 86 16 58 Z" fill="var(--boss-skin)" stroke="${c}" stroke-width="2.5"/>
      <path d="M28 50 L44 54 L42 60 L30 58 Z" fill="${c}"/>
      <path d="M72 50 L56 54 L58 60 L70 58 Z" fill="${c}"/>
      ${third}${teeth}${scars}
    </svg>`;
  }

  RX.Boss = { BOSSES, DUNGEONS, target, describe, svg, byId: (id) => DUNGEONS.find((d) => d.id === id) };
})(window.RX = window.RX || {});
