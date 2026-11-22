/* Rang X — détection de posture (MediaPipe Pose) et compteurs de répétitions. */
(function (RX) {
  'use strict';

  let landmarker = null, loading = null;
  const BASE = new URL('vendor/mediapipe/', document.baseURI).href;

  async function load() {
    if (landmarker) return landmarker;
    if (loading) return loading;
    loading = (async () => {
      const vision = await import(BASE + 'vision_bundle.mjs');
      const fileset = await vision.FilesetResolver.forVisionTasks(BASE + 'wasm');
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: BASE + 'pose_landmarker_lite.task', delegate },
        runningMode: 'VIDEO', numPoses: 1,
        minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5
      });
      try { landmarker = await vision.PoseLandmarker.createFromOptions(fileset, opts('GPU')); }
      catch (e) { landmarker = await vision.PoseLandmarker.createFromOptions(fileset, opts('CPU')); }
      return landmarker;
    })();
    try { return await loading; } catch (e) { loading = null; throw e; }
  }

  // Indices des points MediaPipe
  const P = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 };
  const SKELETON = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

  const v = (p) => (p && (p.visibility == null ? 1 : p.visibility)) || 0;
  function angle(a, b, c, ar) {
    const abx = (a.x - b.x) * ar, aby = a.y - b.y, cbx = (c.x - b.x) * ar, cby = c.y - b.y;
    const m = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
    if (!m) return null;
    return Math.acos(Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / m))) * 180 / Math.PI;
  }
  // Choisit le côté du corps le mieux vu par la caméra
  function side(lm, L, R) {
    const vl = Math.min(...L.map((i) => v(lm[i]))), vr = Math.min(...R.map((i) => v(lm[i])));
    return vl >= vr ? { ids: L, vis: vl } : { ids: R, vis: vr };
  }
  function tilt(a, b, ar) { // angle de la ligne a→b par rapport à l'horizontale
    return Math.abs(Math.atan2(b.y - a.y, (b.x - a.x) * ar) * 180 / Math.PI) % 180;
  }
  const horiz = (deg) => Math.min(deg, 180 - deg);

  function ema(prev, x, a) { return prev == null ? x : prev + a * (x - prev); }

  /* Chaque compteur reçoit les points du corps et renvoie
   * { reps, phase, ok, value, msg } ; le gainage renvoie aussi held (secondes). */
  function makeCounter(kind) {
    const st = { reps: 0, phase: null, val: null, msg: '', lastRep: 0, held: 0, lastT: 0, lostSince: 0, started: false };

    function angleCounter(lm, ar, cfg) {
      const s = side(lm, cfg.L, cfg.R);
      if (s.vis < 0.5) return { ok: false, msg: cfg.hide };
      const [a, b, c] = s.ids.map((i) => lm[i]);
      const ang = angle(a, b, c, ar);
      if (ang == null) return { ok: false, msg: cfg.hide };
      st.val = ema(st.val, ang, 0.5);
      if (cfg.guard) { const g = cfg.guard(lm, ar, s); if (g) return { ok: false, msg: g }; }
      let rep = false;
      if (st.val > cfg.up) { if (st.phase === 'down') { st.reps++; rep = true; } st.phase = 'up'; }
      else if (st.val < cfg.down && st.phase === 'up') st.phase = 'down';
      if (st.phase == null && st.val > cfg.up) st.phase = 'up';
      return { ok: true, rep, msg: st.phase === 'down' ? cfg.goUp : cfg.goDown };
    }

    const handlers = {
      pushups(lm, ar) {
        return angleCounter(lm, ar, {
          L: [P.ls, P.le, P.lw], R: [P.rs, P.re, P.rw], up: 150, down: 95,
          hide: 'Mets tout ton bras dans le cadre (de profil)',
          goDown: 'Descends, poitrine près du sol', goUp: 'Pousse !',
          guard(lm, ar, s) {
            const L = s.ids[0] === P.ls;
            const sh = lm[L ? P.ls : P.rs], hip = lm[L ? P.lh : P.rh], an = lm[L ? P.la : P.ra];
            if (v(hip) > 0.4 && v(an) > 0.4 && horiz(tilt(sh, an, ar)) > 50) return 'Mets-toi en position de pompe';
            return null;
          }
        });
      },
      squats(lm, ar) {
        return angleCounter(lm, ar, {
          L: [P.lh, P.lk, P.la], R: [P.rh, P.rk, P.ra], up: 160, down: 100,
          hide: 'Recule : hanches, genoux et chevilles visibles',
          goDown: 'Descends, cuisses parallèles', goUp: 'Remonte !'
        });
      },
      dips(lm, ar) {
        return angleCounter(lm, ar, {
          L: [P.ls, P.le, P.lw], R: [P.rs, P.re, P.rw], up: 150, down: 100,
          hide: 'Mets ton bras entier dans le cadre (de profil)',
          goDown: 'Descends à 90° aux coudes', goUp: 'Pousse !'
        });
      },
      pullups(lm, ar) {
        const need = [P.nose, P.ls, P.rs, P.le, P.re, P.lw, P.rw];
        if (Math.min(...need.map((i) => v(lm[i]))) < 0.45) return { ok: false, msg: 'Mains, coudes et tête doivent être visibles' };
        const wy = (lm[P.lw].y + lm[P.rw].y) / 2;
        const elbow = ((angle(lm[P.ls], lm[P.le], lm[P.lw], ar) || 0) + (angle(lm[P.rs], lm[P.re], lm[P.rw], ar) || 0)) / 2;
        st.val = ema(st.val, elbow, 0.5);
        const chinOver = lm[P.nose].y < wy + 0.01;
        const hang = st.val > 140 && lm[P.nose].y > wy + 0.08;
        let rep = false;
        if (hang) st.phase = 'down';
        else if (chinOver && st.phase === 'down') { st.reps++; rep = true; st.phase = 'up'; }
        if (st.phase == null) return { ok: true, msg: 'Suspends-toi bras tendus pour commencer' };
        return { ok: true, rep, msg: st.phase === 'down' ? 'Tire ! Menton au-dessus de la barre' : 'Redescends bras tendus' };
      },
      muscleups(lm, ar) {
        const need = [P.nose, P.ls, P.rs, P.lw, P.rw, P.le, P.re];
        if (Math.min(...need.map((i) => v(lm[i]))) < 0.45) return { ok: false, msg: 'Mains, épaules et tête doivent être visibles' };
        const wy = (lm[P.lw].y + lm[P.rw].y) / 2, sy = (lm[P.ls].y + lm[P.rs].y) / 2;
        const elbow = ((angle(lm[P.ls], lm[P.le], lm[P.lw], ar) || 0) + (angle(lm[P.rs], lm[P.re], lm[P.rw], ar) || 0)) / 2;
        st.val = ema(st.val, elbow, 0.5);
        const hang = wy < lm[P.nose].y - 0.05 && st.val > 135;
        const top = sy < wy - 0.06 && st.val > 130;
        let rep = false;
        if (hang) st.phase = 'down';
        else if (top && st.phase === 'down') { st.reps++; rep = true; st.phase = 'up'; }
        if (st.phase == null) return { ok: true, msg: 'Suspends-toi bras tendus pour commencer' };
        return { ok: true, rep, msg: st.phase === 'down' ? 'Tire et passe au-dessus de la barre !' : 'Verrouille les bras, puis redescends' };
      },
      plank(lm, ar, t) {
        const s = side(lm, [P.ls, P.lh, P.la], [P.rs, P.rh, P.ra]);
        const dt = st.lastT ? Math.min(0.5, (t - st.lastT) / 1000) : 0;
        st.lastT = t;
        let good = false, msg = 'Mets-toi en gainage, de profil';
        if (s.vis >= 0.45) {
          const [sh, hip, an] = s.ids.map((i) => lm[i]);
          const line = angle(sh, hip, an, ar);
          st.val = ema(st.val, line, 0.4);
          const flat = horiz(tilt(sh, an, ar)) < 35;
          if (flat && st.val > 155) { good = true; msg = 'Tiens ! Bassin aligné'; }
          else if (flat) msg = st.val <= 155 ? 'Aligne ton bassin' : msg;
        } else msg = 'Épaules, hanches et chevilles doivent être visibles';
        if (good) { st.held += dt; st.started = true; st.lostSince = 0; }
        else if (st.started && !st.lostSince) st.lostSince = t;
        const broken = st.started && st.lostSince && t - st.lostSince > 3000;
        return { ok: good, msg, broken };
      }
    };

    return {
      kind,
      update(lm, ar, t) {
        const r = handlers[kind](lm, ar, t) || {};
        st.msg = r.msg || '';
        return Object.assign({ reps: st.reps, held: st.held, value: st.val, phase: st.phase }, r);
      },
      addManual() { st.reps++; return st.reps; },
      get reps() { return st.reps; },
      get held() { return st.held; }
    };
  }

  function draw(ctx, lm, w, h, color, mirror) {
    ctx.save();
    if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.lineWidth = Math.max(3, w / 160);
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    for (const [a, b] of SKELETON) {
      if (v(lm[a]) < 0.4 || v(lm[b]) < 0.4) continue;
      ctx.beginPath(); ctx.moveTo(lm[a].x * w, lm[a].y * h); ctx.lineTo(lm[b].x * w, lm[b].y * h); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      if (v(lm[i]) < 0.4) continue;
      ctx.beginPath(); ctx.arc(lm[i].x * w, lm[i].y * h, Math.max(3, w / 140), 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  RX.Pose = { load, makeCounter, draw, isLoaded: () => !!landmarker };
})(window.RX = window.RX || {});
