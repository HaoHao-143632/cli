(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const subtitle = document.getElementById('subtitle');
  const finalScoreEl = document.getElementById('finalScore');
  const speedEl = document.getElementById('speed');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const nitroPctEl = document.getElementById('nitroPct');
  const nitroFillEl = document.getElementById('nitroFill');

  // ---- Audio (procedural, no assets) ------------------------------------
  let audioCtx = null;
  let engineOsc = null;
  let engineGain = null;
  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = audioCtx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = audioCtx.createGain();
      engineGain.gain.value = 0;
      const filt = audioCtx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 500;
      engineOsc.connect(filt).connect(engineGain).connect(audioCtx.destination);
      engineOsc.start();
    } catch (e) { audioCtx = null; }
  }
  function setEngineSound(speedNorm, running) {
    if (!audioCtx) return;
    const targetFreq = 60 + speedNorm * 240;
    const targetGain = running ? 0.04 + speedNorm * 0.08 : 0;
    engineOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.05);
    engineGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.05);
  }
  function blip(freq, dur, type, vol) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol || 0.1;
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  }
  function crashSound() {
    if (!audioCtx) return;
    const noise = audioCtx.createBufferSource();
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.6, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    noise.buffer = buf;
    const g = audioCtx.createGain();
    g.gain.value = 0.5;
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
    noise.connect(g).connect(audioCtx.destination);
    noise.start();
  }

  // ---- Road / lanes ------------------------------------------------------
  const ROAD_LEFT = 60;
  const ROAD_RIGHT = W - 60;
  const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
  const LANES = 4;
  const LANE_W = ROAD_W / LANES;
  const laneCenter = (i) => ROAD_LEFT + LANE_W * (i + 0.5);

  // ---- Input -------------------------------------------------------------
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyR') resetAndStart();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  function left()  { return keys['ArrowLeft']  || keys['KeyA']; }
  function right() { return keys['ArrowRight'] || keys['KeyD']; }
  function up()    { return keys['ArrowUp']    || keys['KeyW']; }
  function down()  { return keys['ArrowDown']  || keys['KeyS']; }
  function nitro() { return keys['ShiftLeft'] || keys['ShiftRight'] || keys['Space']; }

  // ---- Game state --------------------------------------------------------
  const state = {
    running: false,
    paused: false,
    crashed: false,
    t: 0,
    distance: 0,
    score: 0,
    best: Number(localStorage.getItem('nfs.best') || 0),
    roadOffset: 0,
    enemies: [],
    particles: [],
    stripes: [],
    cityFar: [],
    cityNear: [],
    spawnTimer: 0,
    flash: 0,
    shake: 0,
  };
  bestEl.textContent = state.best;

  const player = {
    x: laneCenter(1),
    y: H - 130,
    targetX: laneCenter(1),
    lane: 1,
    w: 44,
    h: 78,
    speed: 0,         // current forward speed (world units per frame)
    maxSpeed: 12,
    minSpeed: 2,
    accel: 0.05,
    brake: 0.12,
    nitro: 100,       // 0..100
    nitroActive: false,
    tilt: 0,
  };

  // ---- Buildings (parallax silhouettes) ---------------------------------
  function genCity(count, minH, maxH) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * W,
        w: 30 + Math.random() * 50,
        h: minH + Math.random() * (maxH - minH),
        windowSeed: Math.floor(Math.random() * 99999),
      });
    }
    return arr;
  }
  state.cityFar = genCity(18, 60, 140);
  state.cityNear = genCity(14, 100, 220);

  // ---- Enemy spawning ----------------------------------------------------
  const ENEMY_COLORS = ['#ff3c1e', '#ffae00', '#00d4ff', '#9b59ff', '#1eff8a', '#ff1e8a'];
  function spawnEnemy() {
    const lane = Math.floor(Math.random() * LANES);
    // Avoid stacking too many in same lane
    for (const e of state.enemies) {
      if (e.lane === lane && e.y < 200) return;
    }
    const speed = 2 + Math.random() * 3;
    state.enemies.push({
      lane,
      x: laneCenter(lane),
      y: -120,
      w: 42,
      h: 76,
      speed,
      color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
      scored: false,
    });
  }

  function spawnExplosion(x, y) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 6;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 30 + Math.random() * 30,
        max: 60,
        color: ['#ff3c1e','#ffae00','#ffe070','#fff'][Math.floor(Math.random()*4)],
        size: 2 + Math.random() * 3,
      });
    }
  }

  function spawnNitroSpark(x, y) {
    state.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 4 + Math.random() * 3,
      life: 14,
      max: 14,
      color: Math.random() < 0.5 ? '#00d4ff' : '#00ffaa',
      size: 2 + Math.random() * 2,
    });
  }

  // ---- Collision ---------------------------------------------------------
  function rectsOverlap(a, b) {
    return Math.abs(a.x - b.x) < (a.w + b.w) * 0.45 &&
           Math.abs(a.y - b.y) < (a.h + b.h) * 0.45;
  }

  // ---- Update ------------------------------------------------------------
  function update() {
    if (!state.running || state.paused || state.crashed) return;
    state.t++;

    // Speed control
    const wantNitro = nitro() && state.nitro > 0;
    if (up()) player.speed += player.accel;
    else if (down()) player.speed -= player.brake;
    else player.speed -= 0.02;

    let cap = player.maxSpeed;
    if (wantNitro) {
      cap = player.maxSpeed * 1.6;
      player.speed += player.accel * 1.5;
      state.nitro = Math.max(0, state.nitro - 0.5);
      player.nitroActive = true;
      spawnNitroSpark(player.x - 10, player.y + player.h * 0.45);
      spawnNitroSpark(player.x + 10, player.y + player.h * 0.45);
    } else {
      player.nitroActive = false;
      state.nitro = Math.min(100, state.nitro + 0.08);
    }
    player.speed = Math.max(player.minSpeed, Math.min(cap, player.speed));

    // Lateral (lane change)
    if (left())  { player.lane = Math.max(0, player.lane - 1);    keys['ArrowLeft'] = false; keys['KeyA'] = false; }
    if (right()) { player.lane = Math.min(LANES-1, player.lane+1); keys['ArrowRight'] = false; keys['KeyD'] = false; }
    player.targetX = laneCenter(player.lane);
    const dx = player.targetX - player.x;
    player.x += dx * 0.22;
    player.tilt = dx * 0.04;

    // World scroll
    const scroll = player.speed;
    state.roadOffset = (state.roadOffset + scroll) % 60;
    state.distance += scroll;

    // City parallax
    for (const b of state.cityFar) {
      b.x -= scroll * 0.04;
      if (b.x + b.w < 0) { b.x = W + Math.random() * 100; b.h = 60 + Math.random() * 80; b.w = 30 + Math.random()*50; }
    }
    for (const b of state.cityNear) {
      b.x -= scroll * 0.12;
      if (b.x + b.w < 0) { b.x = W + Math.random() * 100; b.h = 100 + Math.random()*120; b.w = 30 + Math.random()*50; }
    }

    // Enemies
    const diffSpeedBonus = Math.min(3, state.distance / 8000);
    for (const e of state.enemies) {
      e.y += scroll - e.speed + diffSpeedBonus;
      if (!e.scored && e.y > player.y + 60) {
        e.scored = true;
        state.score += 10;
      }
    }
    state.enemies = state.enemies.filter(e => e.y < H + 100);

    // Spawning rate increases with distance
    state.spawnTimer -= 1 + Math.min(2, state.distance / 5000);
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = 50 - Math.min(35, state.distance / 600);
    }

    // Collision
    for (const e of state.enemies) {
      if (rectsOverlap(player, e)) {
        crash(e);
        return;
      }
    }

    // Particles
    for (const p of state.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life--;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    // Score from speed
    state.score += player.speed * 0.05;

    // Effects decay
    state.flash *= 0.92;
    state.shake *= 0.85;

    // Engine audio
    setEngineSound((player.speed - player.minSpeed) / (player.maxSpeed * 1.6 - player.minSpeed), true);

    // HUD
    speedEl.textContent = Math.round(player.speed * 28);
    scoreEl.textContent = Math.floor(state.score);
    nitroPctEl.textContent = Math.round(state.nitro);
    nitroFillEl.style.width = state.nitro + '%';
  }

  function crash(enemy) {
    state.crashed = true;
    state.running = false;
    state.flash = 1;
    state.shake = 20;
    spawnExplosion((player.x + enemy.x) / 2, (player.y + enemy.y) / 2);
    crashSound();
    setEngineSound(0, false);

    if (state.score > state.best) {
      state.best = Math.floor(state.score);
      localStorage.setItem('nfs.best', state.best);
      bestEl.textContent = state.best;
    }

    setTimeout(() => {
      overlay.classList.add('crashed');
      overlay.classList.remove('hidden');
      overlay.querySelector('h1').textContent = '撞 毁';
      subtitle.textContent = '检修一下再战 · CRASHED';
      finalScoreEl.style.display = 'block';
      finalScoreEl.innerHTML = `本局得分 <b>${Math.floor(state.score)}</b> · 最高 <b>${state.best}</b>`;
      startBtn.textContent = '重新发车 RESTART';
    }, 700);
  }

  // ---- Drawing -----------------------------------------------------------
  function drawBackground() {
    // sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, '#0a0a22');
    sky.addColorStop(0.5, '#2a1248');
    sky.addColorStop(1, '#ff3c64');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.55);

    // sun / glow
    const sunY = H * 0.43;
    const grad = ctx.createRadialGradient(W/2, sunY, 10, W/2, sunY, 160);
    grad.addColorStop(0, 'rgba(255,200,80,0.8)');
    grad.addColorStop(1, 'rgba(255,60,30,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.55);

    // far buildings
    ctx.fillStyle = '#1a0a30';
    for (const b of state.cityFar) {
      ctx.fillRect(b.x, H * 0.55 - b.h, b.w, b.h);
    }
    // far windows
    ctx.fillStyle = 'rgba(255, 200, 100, 0.35)';
    for (const b of state.cityFar) {
      let s = b.windowSeed;
      for (let wy = H*0.55 - b.h + 8; wy < H*0.55 - 4; wy += 8) {
        for (let wx = b.x + 4; wx < b.x + b.w - 4; wx += 6) {
          s = (s * 9301 + 49297) % 233280;
          if (s % 5 === 0) ctx.fillRect(wx, wy, 2, 3);
        }
      }
    }

    // near buildings
    ctx.fillStyle = '#0a0418';
    for (const b of state.cityNear) {
      ctx.fillRect(b.x, H * 0.55 - b.h, b.w, b.h);
    }
    ctx.fillStyle = 'rgba(120, 220, 255, 0.45)';
    for (const b of state.cityNear) {
      let s = b.windowSeed + 1;
      for (let wy = H*0.55 - b.h + 10; wy < H*0.55 - 6; wy += 10) {
        for (let wx = b.x + 5; wx < b.x + b.w - 5; wx += 7) {
          s = (s * 9301 + 49297) % 233280;
          if (s % 4 === 0) ctx.fillRect(wx, wy, 3, 4);
        }
      }
    }
  }

  function drawRoad() {
    // ground (below horizon)
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // road body
    ctx.fillStyle = '#181828';
    ctx.fillRect(ROAD_LEFT, H * 0.55, ROAD_W, H * 0.45);

    // road shoulders glow
    const lg = ctx.createLinearGradient(ROAD_LEFT - 30, 0, ROAD_LEFT, 0);
    lg.addColorStop(0, 'rgba(255, 60, 30, 0)');
    lg.addColorStop(1, 'rgba(255, 60, 30, 0.35)');
    ctx.fillStyle = lg;
    ctx.fillRect(ROAD_LEFT - 30, H * 0.55, 30, H * 0.45);

    const rg = ctx.createLinearGradient(ROAD_RIGHT, 0, ROAD_RIGHT + 30, 0);
    rg.addColorStop(0, 'rgba(0, 200, 255, 0.35)');
    rg.addColorStop(1, 'rgba(0, 200, 255, 0)');
    ctx.fillStyle = rg;
    ctx.fillRect(ROAD_RIGHT, H * 0.55, 30, H * 0.45);

    // road edges
    ctx.strokeStyle = '#ff3c1e';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff3c1e';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT, H * 0.55);
    ctx.lineTo(ROAD_LEFT, H);
    ctx.stroke();

    ctx.strokeStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.beginPath();
    ctx.moveTo(ROAD_RIGHT, H * 0.55);
    ctx.lineTo(ROAD_RIGHT, H);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // lane dashes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 28]);
    ctx.lineDashOffset = -state.roadOffset;
    for (let i = 1; i < LANES; i++) {
      const x = ROAD_LEFT + LANE_W * i;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.55);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawCar(x, y, w, h, color, tilt, isPlayer) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt || 0);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, h*0.55, w*0.55, 6, 0, 0, Math.PI*2);
    ctx.fill();

    // body
    const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
    grad.addColorStop(0, shade(color, -0.4));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, shade(color, -0.4));
    ctx.fillStyle = grad;
    roundRect(-w/2, -h/2, w, h, 8);
    ctx.fill();

    // hood line
    ctx.fillStyle = shade(color, -0.5);
    ctx.fillRect(-w/2 + 4, -h/2 + h*0.45, w - 8, 2);

    // windshield
    ctx.fillStyle = 'rgba(20, 30, 60, 0.95)';
    roundRect(-w/2 + 6, -h/2 + 10, w - 12, h * 0.28, 3);
    ctx.fill();
    // rear window
    ctx.fillStyle = 'rgba(20, 30, 60, 0.85)';
    roundRect(-w/2 + 6, h/2 - h * 0.32, w - 12, h * 0.22, 3);
    ctx.fill();

    // racing stripe
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-2, -h/2 + 4, 4, h - 8);

    // wheels
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-w/2 - 3, -h/2 + 8, 5, 14);
    ctx.fillRect( w/2 - 2, -h/2 + 8, 5, 14);
    ctx.fillRect(-w/2 - 3,  h/2 - 22, 5, 14);
    ctx.fillRect( w/2 - 2,  h/2 - 22, 5, 14);

    // headlights / taillights
    if (isPlayer) {
      ctx.fillStyle = '#fff8c8';
      ctx.shadowColor = '#ffe070';
      ctx.shadowBlur = 12;
      ctx.fillRect(-w/2 + 6, -h/2 + 2, 8, 4);
      ctx.fillRect( w/2 - 14, -h/2 + 2, 8, 4);
      ctx.shadowBlur = 0;
      // tail
      ctx.fillStyle = '#ff2030';
      ctx.fillRect(-w/2 + 6,  h/2 - 4, 8, 3);
      ctx.fillRect( w/2 - 14, h/2 - 4, 8, 3);
    } else {
      // enemy faces toward player; tail lights on top (they go same direction as us but slower)
      ctx.fillStyle = '#ff2030';
      ctx.shadowColor = '#ff2030';
      ctx.shadowBlur = 8;
      ctx.fillRect(-w/2 + 6,  h/2 - 4, 8, 3);
      ctx.fillRect( w/2 - 14, h/2 - 4, 8, 3);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd860';
      ctx.fillRect(-w/2 + 6, -h/2 + 2, 8, 3);
      ctx.fillRect( w/2 - 14, -h/2 + 2, 8, 3);
    }

    ctx.restore();
  }

  function drawHeadlightBeam() {
    const grad = ctx.createLinearGradient(player.x, player.y - player.h/2, player.x, 0);
    grad.addColorStop(0, 'rgba(255, 240, 180, 0.25)');
    grad.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(player.x - 14, player.y - player.h/2);
    ctx.lineTo(player.x + 14, player.y - player.h/2);
    ctx.lineTo(player.x + 80, H * 0.55);
    ctx.lineTo(player.x - 80, H * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  function drawParticles() {
    for (const p of state.particles) {
      const a = p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.save();
    if (state.shake > 0.5) {
      ctx.translate((Math.random()-0.5) * state.shake, (Math.random()-0.5) * state.shake);
    }

    drawBackground();
    drawRoad();
    drawHeadlightBeam();

    // enemies
    for (const e of state.enemies) {
      drawCar(e.x, e.y, e.w, e.h, e.color, 0, false);
    }

    drawParticles();

    // player
    if (!state.crashed) {
      drawCar(player.x, player.y, player.w, player.h, '#e8e8f0', player.tilt, true);
    }

    // crash flash
    if (state.flash > 0.01) {
      ctx.fillStyle = `rgba(255, 200, 80, ${state.flash})`;
      ctx.fillRect(0, 0, W, H);
    }

    // pause overlay
    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂停 / PAUSED', W/2, H/2);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#aab';
      ctx.fillText('按 P 继续', W/2, H/2 + 28);
    }

    ctx.restore();
  }

  // ---- Helpers -----------------------------------------------------------
  function shade(hex, percent) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
    r = Math.max(0, Math.min(255, Math.round(r + 255 * percent)));
    g = Math.max(0, Math.min(255, Math.round(g + 255 * percent)));
    b = Math.max(0, Math.min(255, Math.round(b + 255 * percent)));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- Game loop ---------------------------------------------------------
  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  // ---- Flow --------------------------------------------------------------
  function resetAndStart() {
    state.running = true;
    state.paused = false;
    state.crashed = false;
    state.t = 0;
    state.distance = 0;
    state.score = 0;
    state.roadOffset = 0;
    state.enemies = [];
    state.particles = [];
    state.spawnTimer = 0;
    state.flash = 0;
    state.shake = 0;
    player.x = laneCenter(1);
    player.targetX = laneCenter(1);
    player.lane = 1;
    player.speed = player.minSpeed + 2;
    player.tilt = 0;
    state.nitro = 100;
    overlay.classList.add('hidden');
    overlay.classList.remove('crashed');
    overlay.querySelector('h1').textContent = '极品飞车';
    subtitle.textContent = '夜幕降临，城市赛道为你而生';
    finalScoreEl.style.display = 'none';
    startBtn.textContent = '点火启动 START';
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    blip(440, 0.08, 'square', 0.08);
    setTimeout(() => blip(660, 0.12, 'square', 0.08), 120);
  }

  function togglePause() {
    if (!state.running || state.crashed) return;
    state.paused = !state.paused;
    if (state.paused) setEngineSound(0, false);
  }

  startBtn.addEventListener('click', resetAndStart);

  // Kick off render loop (so overlay menu is alive even before play)
  loop();
})();
