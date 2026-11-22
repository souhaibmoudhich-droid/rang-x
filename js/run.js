/* Rang X — suivi de course : GPS + podomètre (accéléromètre). */
(function (RX) {
  'use strict';

  function haversine(a, b) {
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  // Longueur de pas estimée à partir de la taille et de la cadence (pas/min).
  function stepLength(heightCm, cadence) {
    const h = (heightCm || 175) / 100;
    if (!cadence || cadence < 130) return h * 0.413;
    return h * Math.min(0.75, 0.45 + (cadence - 130) * 0.004);
  }

  // À appeler directement dans le gestionnaire du clic (iOS exige un geste).
  function requestMotion() {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        return DeviceMotionEvent.requestPermission().then((r) => r === 'granted').catch(() => false);
      }
    } catch (e) { /* ignoré */ }
    return Promise.resolve(typeof DeviceMotionEvent !== 'undefined');
  }

  function create(opts) {
    const o = Object.assign({ target: 0, heightCm: 175, onUpdate() {}, onKm() {}, onSplit() {} }, opts);
    const st = {
      running: false, paused: false, t0: 0, elapsedBefore: 0, resumeT: 0,
      gpsDist: 0, gpsPts: 0, last: null, gpsOk: false, gpsErr: '',
      steps: 0, stepDist: 0, stepTimes: [], lastStep: 0, lp: 9.81, mean: 9.81, above: false,
      splits: {}, kmDone: 0, watch: null, wake: null, timer: null, motionOk: false
    };

    const elapsed = () => st.elapsedBefore + (st.running && !st.paused ? (Date.now() - st.resumeT) / 1000 : 0);
    const cadence = () => {
      const now = Date.now();
      const recent = st.stepTimes.filter((t) => now - t < 10000);
      if (recent.length < 4) return 0;
      return (recent.length - 1) / ((recent[recent.length - 1] - recent[0]) / 60000);
    };
    const distance = () => (st.gpsOk && st.gpsDist > 30 ? st.gpsDist : Math.max(st.gpsDist, st.stepDist));
    const source = () => (st.gpsOk && st.gpsDist > 30 ? 'GPS' : (st.steps > 0 ? 'Pas' : (st.gpsOk ? 'GPS' : '—')));

    function onPos(pos) {
      if (!st.running || st.paused) return;
      const c = pos.coords;
      st.gpsOk = true; st.gpsErr = '';
      if (c.accuracy > 35) return;
      const pt = { lat: c.latitude, lon: c.longitude, t: pos.timestamp || Date.now() };
      if (st.last) {
        const d = haversine(st.last, pt);
        const dt = Math.max(0.5, (pt.t - st.last.t) / 1000);
        if (d / dt > 11) return; // saut GPS improbable
        if (d < 3) return;
        st.gpsDist += d; st.gpsPts++;
      }
      st.last = pt;
      tick();
    }
    function onPosErr(err) { st.gpsErr = err && err.code === 1 ? 'GPS refusé' : 'Signal GPS faible'; tick(); }

    function onMotion(e) {
      if (!st.running || st.paused) return;
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      st.motionOk = true;
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      st.lp += 0.35 * (mag - st.lp);         // lissage
      st.mean += 0.02 * (st.lp - st.mean);   // ligne de base
      const now = Date.now();
      const thr = st.mean + 1.6;
      if (!st.above && st.lp > thr && now - st.lastStep > 250) {
        st.above = true; st.lastStep = now; st.steps++;
        st.stepTimes.push(now); if (st.stepTimes.length > 40) st.stepTimes.shift();
        st.stepDist += stepLength(o.heightCm, cadence());
      } else if (st.above && st.lp < st.mean) st.above = false;
    }

    function tick() {
      const d = distance(), t = elapsed();
      const km = Math.floor(d / 1000);
      if (km > st.kmDone) { st.kmDone = km; o.onKm(km, t, d); }
      for (const goal of [5000, 10000]) {
        if (st.splits[goal] == null && d >= goal) {
          // temps de passage interpolé
          st.splits[goal] = t * (goal / d);
          o.onSplit(goal, st.splits[goal]);
        }
      }
      o.onUpdate({ distance: d, elapsed: t, pace: d > 50 ? t / (d / 1000) : null, steps: st.steps, cadence: Math.round(cadence()), source: source(), gpsErr: st.gpsErr, motionOk: st.motionOk, splits: st.splits, paused: st.paused });
    }

    async function lockScreen() {
      try { if ('wakeLock' in navigator) st.wake = await navigator.wakeLock.request('screen'); } catch (e) { st.wake = null; }
    }
    function onVis() { if (document.visibilityState === 'visible' && st.running && !st.wake) lockScreen(); }

    return {
      start() {
        st.running = true; st.paused = false; st.resumeT = Date.now(); st.t0 = Date.now();
        if ('geolocation' in navigator) {
          try { st.watch = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }); }
          catch (e) { st.gpsErr = 'GPS indisponible'; }
        } else st.gpsErr = 'GPS indisponible';
        window.addEventListener('devicemotion', onMotion);
        document.addEventListener('visibilitychange', onVis);
        lockScreen();
        st.timer = setInterval(tick, 500);
        tick();
      },
      pause() { if (!st.paused) { st.elapsedBefore = elapsed(); st.paused = true; st.last = null; tick(); } },
      resume() { if (st.paused) { st.paused = false; st.resumeT = Date.now(); tick(); } },
      stop() {
        const res = { distance: distance(), elapsed: elapsed(), steps: st.steps, source: source(), splits: Object.assign({}, st.splits) };
        st.running = false;
        if (st.watch != null) try { navigator.geolocation.clearWatch(st.watch); } catch (e) { /* ignoré */ }
        window.removeEventListener('devicemotion', onMotion);
        document.removeEventListener('visibilitychange', onVis);
        clearInterval(st.timer);
        try { st.wake && st.wake.release(); } catch (e) { /* ignoré */ }
        st.wake = null;
        return res;
      },
      get paused() { return st.paused; }
    };
  }

  RX.Run = { create, requestMotion, stepLength, haversine };
})(window.RX = window.RX || {});
