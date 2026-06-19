/* ============================================================
 *  飞机大战 / Airplane Shooter
 *  纯原生 JS + Canvas，无任何依赖。打开 index.html 即可游玩。
 * ============================================================ */
(() => {
  'use strict';

  // ---------- 基础设置 ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // 逻辑分辨率（设计尺寸），实际像素按 DPR 缩放，保证清晰
  const VW = 480;          // 逻辑宽
  const VH = 720;          // 逻辑高
  let scale = 1;           // canvas 在屏幕上的显示缩放
  let dpr = window.devicePixelRatio || 1;

  function fit() {
    // 让画布在保持比例的前提下尽量铺满窗口
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    scale = Math.min(maxW / VW, maxH / VH);
    const cssW = Math.round(VW * scale);
    const cssH = Math.round(VH * scale);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(VW * dpr);
    canvas.height = Math.round(VH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------- 工具函数 ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, lo, hi) => v < lo ? lo : (v > hi ? hi : v);
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

  // ---------- 音效 / 背景音乐（Web Audio 过程合成，无需音频文件）----------
  const Sound = {
    ctx: null,
    master: null,
    muted: false,
    musicTimer: null,
    musicStep: 0,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.4;
      this.master.connect(this.ctx.destination);
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    // 单个振荡器音（可滑音）
    blip(freq, dur, type = 'square', vol = 0.3, slideTo = null) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + dur + 0.02);
    },
    // 白噪声（用于爆炸）
    noise(dur, vol = 0.3, filterFreq = 1000) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
      const g = this.ctx.createGain(); g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t);
    },
    // —— 各类音效 ——
    shoot()  { this.blip(880, 0.07, 'square', 0.10, 320); },
    hit()    { this.blip(420, 0.04, 'square', 0.07, 220); },
    explode(){ this.noise(0.3, 0.35, 1400); this.blip(180, 0.3, 'sawtooth', 0.18, 55); },
    power()  { this.blip(523, 0.08, 'square', 0.22); setTimeout(() => this.blip(784, 0.1, 'square', 0.22), 80); setTimeout(() => this.blip(1047, 0.14, 'square', 0.22), 180); },
    life()   { this.blip(659, 0.1, 'triangle', 0.28); setTimeout(() => this.blip(988, 0.18, 'triangle', 0.28), 100); },
    hurt()   { this.noise(0.25, 0.4, 600); this.blip(150, 0.35, 'sawtooth', 0.3, 45); },
    over()   { this.blip(440, 0.2, 'sawtooth', 0.22, 330); setTimeout(() => this.blip(330, 0.25, 'sawtooth', 0.22, 247), 190); setTimeout(() => this.blip(220, 0.5, 'sawtooth', 0.22, 110), 400); },
    bomb()   { this.noise(0.6, 0.5, 2200); this.blip(120, 0.55, 'sawtooth', 0.3, 40); this.blip(300, 0.4, 'square', 0.18, 60); },
    bossWarn(){ this.blip(330, 0.18, 'square', 0.25); setTimeout(() => this.blip(330, 0.18, 'square', 0.25), 260); setTimeout(() => this.blip(440, 0.3, 'square', 0.25), 520); },
    bossDown(){ this.noise(0.9, 0.5, 1600); this.blip(200, 0.8, 'sawtooth', 0.25, 50); setTimeout(() => this.blip(150, 0.7, 'sawtooth', 0.22, 40), 250); setTimeout(() => this.blip(100, 0.9, 'sawtooth', 0.2, 30), 500); },
    // 背景音乐：A 小调循环琶音 + 低音
    bass(freq, dur) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
      osc.type = 'triangle'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + dur + 0.02);
    },
    startMusic() {
      if (!this.ctx || this.musicTimer) return;
      const notes = [220, 261.6, 329.6, 440, 329.6, 261.6, 196, 261.6];
      const step = () => {
        if (!this.muted) {
          const f = notes[this.musicStep % notes.length];
          this.bass(f / 2, 0.5);                 // 低音
          this.blip(f * 2, 0.12, 'square', 0.04); // 高音点缀
          this.musicStep++;
        }
        this.musicTimer = setTimeout(step, 300);
      };
      step();
    },
    stopMusic() { if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = null; } },
    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    },
  };

  // ---------- 游戏状态 ----------
  const State = { START: 0, PLAY: 1, PAUSE: 2, OVER: 3 };
  let state = State.START;

  const BEST_KEY = 'airplane_best_score';
  let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;

  let score = 0;
  let spawnTimer = 0;
  let spawnInterval = 70;   // 帧数，越小越密
  let difficultyTimer = 0;
  let frame = 0;

  // 实体集合
  let player = null;
  let bullets = [];
  let enemies = [];
  let enemyBullets = [];
  let powerups = [];
  let particles = [];
  let stars = [];

  // Boss 战 & 炸弹
  let boss = null;              // 当前 Boss（无则 null）
  let bossLevel = 0;            // 已出场 Boss 次数（越多越强）
  let nextBossScore = 800;      // 下一次触发 Boss 的分数门槛
  let bossWarnTimer = 0;        // Boss 出现前的警告倒计时（帧）
  let flash = 0;                // 屏幕白闪强度 0~1（炸弹/Boss 死亡）

  // ---------- 星空背景 ----------
  function initStars() {
    stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * VW,
        y: Math.random() * VH,
        r: rand(0.4, 1.8),
        v: rand(0.3, 1.6),
      });
    }
  }

  function updateStars() {
    for (const s of stars) {
      s.y += s.v;
      if (s.y > VH) { s.y = -2; s.x = Math.random() * VW; }
    }
  }

  function drawStars() {
    ctx.save();
    for (const s of stars) {
      ctx.globalAlpha = 0.25 + s.v / 2;
      ctx.fillStyle = '#aecbff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.restore();
  }

  // ---------- 玩家 ----------
  function createPlayer() {
    return {
      x: VW / 2,
      y: VH - 110,
      w: 38,
      h: 44,
      speed: 5,
      lives: 3,
      power: 1,            // 火力等级 1~5
      bombs: 2,            // 清屏炸弹数量
      fireCooldown: 0,
      fireRate: 9,         // 越小越快
      invincible: 0,       // 受伤后无敌帧
    };
  }

  // 输入
  const keys = {};
  let pointerActive = false;
  let pointerX = 0, pointerY = 0;

  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'p') togglePause();
    if (e.key.toLowerCase() === 'm') setMute(Sound.toggleMute());
    if (e.key.toLowerCase() === 'b' || e.key === ' ') useBomb();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // 指针（鼠标 / 触摸）控制
  function canvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * VW,
      y: (clientY - rect.top) / rect.height * VH,
    };
  }
  canvas.addEventListener('pointerdown', (e) => {
    pointerActive = true;
    const p = canvasPos(e.clientX, e.clientY);
    pointerX = p.x; pointerY = p.y;
  });
  window.addEventListener('pointermove', (e) => {
    if (!pointerActive) return;
    const p = canvasPos(e.clientX, e.clientY);
    pointerX = p.x; pointerY = p.y;
  });
  window.addEventListener('pointerup', () => { pointerActive = false; });

  // ---------- 敌人 ----------
  // 三种敌机：小兵(快、脆)、普通、精英(慢、肉、会射击)
  function spawnEnemy() {
    const r = Math.random();
    let type;
    if (r < 0.6) type = 'small';
    else if (r < 0.9) type = 'normal';
    else type = 'elite';

    const cfg = {
      small:  { w: 30, h: 30, hp: 1, v: rand(2.4, 3.4), score: 10, color: '#ff7a7a', shoot: false },
      normal: { w: 42, h: 42, hp: 3, v: rand(1.4, 2.2), score: 25, color: '#ffb24d', shoot: false },
      elite:  { w: 58, h: 56, hp: 7, v: rand(0.8, 1.3), score: 60, color: '#c479ff', shoot: true },
    }[type];

    enemies.push({
      type,
      x: rand(cfg.w, VW - cfg.w),
      y: -cfg.h,
      w: cfg.w, h: cfg.h,
      hp: cfg.hp, maxHp: cfg.hp,
      v: cfg.v,
      score: cfg.score,
      color: cfg.color,
      shoot: cfg.shoot,
      shootTimer: randInt(40, 90),
      wobble: rand(0, Math.PI * 2),
      hitFlash: 0,
    });
  }

  function enemyShoot(e) {
    enemyBullets.push({ x: e.x, y: e.y + e.h / 2, vx: 0, vy: 4.2, r: 5 });
  }

  // ---------- Boss ----------
  function spawnBoss() {
    const hp = 120 + bossLevel * 60;   // 随出场次数变强
    boss = {
      x: VW / 2, y: -90,
      w: 150, h: 95,
      hp, maxHp: hp,
      vx: 1.6,
      entering: true,
      hitFlash: 0,
      shootTimer: 60,
      pattern: 0,           // 当前弹幕模式
      patternTimer: 0,
      wob: 0,
    };
  }

  // Boss 弹幕：扇形 / 瞄准 / 环形
  function bossShoot(b) {
    const cx = b.x, cy = b.y + b.h / 2;
    if (b.pattern === 0) {
      // 扇形 5 发
      for (let i = -2; i <= 2; i++) {
        const a = Math.PI / 2 + i * 0.22;
        enemyBullets.push({ x: cx, y: cy, vx: Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6, r: 6, boss: true });
      }
    } else if (b.pattern === 1) {
      // 瞄准玩家 3 连
      const ang = Math.atan2(player.y - cy, player.x - cx);
      for (let i = -1; i <= 1; i++) {
        const a = ang + i * 0.14;
        enemyBullets.push({ x: cx, y: cy, vx: Math.cos(a) * 4.4, vy: Math.sin(a) * 4.4, r: 6, boss: true });
      }
    } else {
      // 环形弹幕
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        enemyBullets.push({ x: cx, y: cy, vx: Math.cos(a) * 2.8, vy: Math.sin(a) * 2.8, r: 5, boss: true });
      }
    }
  }

  function updateBoss() {
    const b = boss;
    b.wob += 0.03;
    b.hitFlash = Math.max(0, b.hitFlash - 1);

    if (b.entering) {
      b.y += 1.6;
      if (b.y >= 110) { b.y = 110; b.entering = false; }
      return; // 入场时不开火、不结算
    }

    // 左右移动
    b.x += b.vx;
    if (b.x < b.w / 2 + 6) { b.x = b.w / 2 + 6; b.vx *= -1; }
    if (b.x > VW - b.w / 2 - 6) { b.x = VW - b.w / 2 - 6; b.vx *= -1; }

    // 切换弹幕模式
    b.patternTimer++;
    if (b.patternTimer > 300) { b.patternTimer = 0; b.pattern = (b.pattern + 1) % 3; }

    // 开火（血量越低越密）
    b.shootTimer--;
    const fireGap = 26 + Math.floor((b.hp / b.maxHp) * 24);
    if (b.shootTimer <= 0) { bossShoot(b); b.shootTimer = fireGap; }

    // 与玩家子弹碰撞
    for (let j = bullets.length - 1; j >= 0; j--) {
      const bl = bullets[j];
      if (Math.abs(bl.x - b.x) < b.w / 2 && Math.abs(bl.y - b.y) < b.h / 2) {
        b.hp -= bl.dmg;
        b.hitFlash = 3;
        bullets.splice(j, 1);
        explode(bl.x, bl.y, '#fff', 3);
        if (b.hp <= 0) { killBoss(); return; }
      }
    }

    // 撞到玩家
    if (player.invincible === 0 &&
        Math.abs(player.x - b.x) < (player.w + b.w) / 2.6 &&
        Math.abs(player.y - b.y) < (player.h + b.h) / 2.6) {
      hurtPlayer();
    }
  }

  function killBoss() {
    const bx = boss.x, by = boss.y;
    score += 500;
    flash = 1;
    shake = 22;
    Sound.bossDown();
    explode(bx, by, '#ffd36a', 60);
    // 连环爆炸（围绕 Boss 残骸）
    for (let i = 0; i < 20; i++) {
      setTimeout(() => explode(rand(bx - 70, bx + 70), rand(by - 40, by + 40), '#ffb24d', 12), i * 35);
    }
    // 掉落奖励：道具 + 1 颗炸弹
    spawnPowerup(bx - 30, by);
    spawnPowerup(bx + 30, by);
    player.bombs = Math.min(5, player.bombs + 1);
    boss = null;
    bossLevel++;
    nextBossScore = score + 1200 + bossLevel * 400;
    spawnTimer = 0;
  }

  // ---------- 道具 ----------
  function spawnPowerup(x, y) {
    // power: 升级火力, life: 加命
    const type = Math.random() < 0.78 ? 'power' : 'life';
    powerups.push({ x, y, w: 24, h: 24, v: 1.6, type, wobble: rand(0, 6.28) });
  }

  // ---------- 子弹 ----------
  function playerFire() {
    const p = player;
    if (p.fireCooldown > 0) return;
    p.fireCooldown = p.fireRate;
    Sound.shoot();
    const bx = p.x, by = p.y - p.h / 2;
    const spread = [];
    switch (p.power) {
      case 1: spread.push([0, -9]); break;
      case 2: spread.push([-5, -9], [5, -9]); break;
      case 3: spread.push([0, -9.5], [-5, -9], [5, -9]); break;
      case 4: spread.push([-7, -8.5], [-2.5, -9.5], [2.5, -9.5], [7, -8.5]); break;
      default: spread.push([-8, -8], [-3, -9.5], [0, -10], [3, -9.5], [8, -8]); break;
    }
    for (const [vx, vy] of spread) {
      bullets.push({ x: bx, y: by, vx, vy, r: 4, dmg: 1 });
    }
  }

  // ---------- 粒子 / 爆炸 ----------
  function explode(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(1, 5);
      particles.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(18, 36), max: 36,
        color, r: rand(1.5, 3.5),
      });
    }
  }

  // ============================================================
  //  更新逻辑
  // ============================================================
  function update() {
    frame++;
    updateStars();

    // --- 玩家移动 ---
    const p = player;
    if (pointerActive) {
      // 跟随指针，带平滑
      p.x += (pointerX - p.x) * 0.3;
      p.y += (pointerY - p.y) * 0.3;
    } else {
      let dx = 0, dy = 0;
      if (keys['arrowleft'] || keys['a']) dx -= 1;
      if (keys['arrowright'] || keys['d']) dx += 1;
      if (keys['arrowup'] || keys['w']) dy -= 1;
      if (keys['arrowdown'] || keys['s']) dy += 1;
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      p.x += dx * p.speed;
      p.y += dy * p.speed;
    }
    p.x = clamp(p.x, p.w / 2, VW - p.w / 2);
    p.y = clamp(p.y, p.h / 2, VH - p.h / 2);

    if (p.fireCooldown > 0) p.fireCooldown--;
    if (p.invincible > 0) p.invincible--;
    playerFire(); // 自动开火

    // --- 难度递增 ---
    difficultyTimer++;
    if (difficultyTimer >= 600 && spawnInterval > 28) { // 每 10 秒变难一点
      difficultyTimer = 0;
      spawnInterval -= 4;
    }

    // --- Boss 触发 / 更新 ---
    if (!boss && bossWarnTimer <= 0 && score >= nextBossScore) {
      bossWarnTimer = 120;       // 2 秒警告
      Sound.bossWarn();
    }
    if (bossWarnTimer > 0) {
      bossWarnTimer--;
      if (bossWarnTimer === 0) spawnBoss();
    }
    if (boss) updateBoss();

    // --- 生成敌人（Boss 出现或警告期间不刷小怪）---
    const spawningPaused = boss || bossWarnTimer > 0;
    if (!spawningPaused) {
      spawnTimer++;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnEnemy();
      }
    }

    // --- 玩家子弹 ---
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy;
      if (b.y < -10 || b.x < -10 || b.x > VW + 10) { bullets.splice(i, 1); }
    }

    // --- 敌机 ---
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.v;
      e.wobble += 0.05;
      if (e.type !== 'small') e.x += Math.sin(e.wobble) * 0.8;
      if (e.hitFlash > 0) e.hitFlash--;

      // 敌人射击
      if (e.shoot) {
        e.shootTimer--;
        if (e.shootTimer <= 0 && e.y > 0 && e.y < VH * 0.7) {
          enemyShoot(e);
          e.shootTimer = randInt(70, 120);
        }
      }

      // 出界
      if (e.y > VH + e.h) { enemies.splice(i, 1); continue; }

      // 与玩家子弹碰撞
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - e.x) < e.w / 2 + b.r && Math.abs(b.y - e.y) < e.h / 2 + b.r) {
          e.hp -= b.dmg;
          e.hitFlash = 4;
          bullets.splice(j, 1);
          explode(b.x, b.y, '#fff', 4);
          if (e.hp <= 0) {
            score += e.score;
            Sound.explode();
            explode(e.x, e.y, e.color, e.type === 'elite' ? 26 : 14);
            // 掉落道具
            const dropChance = e.type === 'elite' ? 0.55 : (e.type === 'normal' ? 0.18 : 0.05);
            if (Math.random() < dropChance) spawnPowerup(e.x, e.y);
            enemies.splice(i, 1);
            break;
          } else {
            Sound.hit();
          }
        }
      }
      if (e.hp <= 0) continue;

      // 与玩家碰撞
      if (p.invincible === 0 &&
          Math.abs(p.x - e.x) < (p.w + e.w) / 2.4 &&
          Math.abs(p.y - e.y) < (p.h + e.h) / 2.4) {
        explode(e.x, e.y, e.color, 18);
        enemies.splice(i, 1);
        hurtPlayer();
      }
    }

    // --- 敌方子弹 ---
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx; b.y += b.vy;
      if (b.y > VH + 12 || b.y < -12 || b.x < -12 || b.x > VW + 12) { enemyBullets.splice(i, 1); continue; }
      if (p.invincible === 0 && dist2(b.x, b.y, p.x, p.y) < (b.r + p.w / 3) ** 2) {
        enemyBullets.splice(i, 1);
        explode(p.x, p.y, '#9bf', 10);
        hurtPlayer();
      }
    }

    // --- 道具 ---
    for (let i = powerups.length - 1; i >= 0; i--) {
      const u = powerups[i];
      u.y += u.v;
      u.wobble += 0.1;
      u.x += Math.sin(u.wobble) * 0.6;
      if (u.y > VH + 20) { powerups.splice(i, 1); continue; }
      if (Math.abs(u.x - p.x) < (u.w + p.w) / 2 && Math.abs(u.y - p.y) < (u.h + p.h) / 2) {
        if (u.type === 'power') { p.power = Math.min(5, p.power + 1); explode(u.x, u.y, '#7df', 12); Sound.power(); }
        else { p.lives = Math.min(5, p.lives + 1); explode(u.x, u.y, '#7fffa0', 12); Sound.life(); }
        powerups.splice(i, 1);
      }
    }

    // --- 粒子 ---
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vx *= 0.94; pt.vy *= 0.94;
      pt.life--;
      if (pt.life <= 0) particles.splice(i, 1);
    }
  }

  // 清屏炸弹：清空敌方子弹、秒杀小怪、对 Boss 造成大额伤害
  function useBomb() {
    if (state !== State.PLAY || !player || player.bombs <= 0) return;
    player.bombs--;
    flash = 1;
    shake = 18;
    Sound.bomb();
    // 清空所有敌方子弹
    for (const b of enemyBullets) explode(b.x, b.y, '#9bd6ff', 4);
    enemyBullets = [];
    // 秒杀所有普通敌机并计分
    for (const e of enemies) {
      score += e.score;
      explode(e.x, e.y, e.color, 16);
    }
    enemies = [];
    // 对 Boss 造成大额伤害
    if (boss && !boss.entering) {
      boss.hp -= Math.ceil(boss.maxHp * 0.18);
      boss.hitFlash = 4;
      explode(boss.x, boss.y, '#ffd36a', 24);
      if (boss.hp <= 0) killBoss();
    }
  }

  function hurtPlayer() {
    const p = player;
    p.lives--;
    p.power = Math.max(1, p.power - 1); // 受伤掉一级火力
    p.invincible = 90;                  // 1.5 秒无敌
    // 屏幕抖动
    shake = 12;
    Sound.hurt();
    if (p.lives <= 0) gameOver();
  }

  // ============================================================
  //  渲染
  // ============================================================
  let shake = 0;

  function draw() {
    ctx.clearRect(0, 0, VW, VH);

    // 屏幕抖动
    let ox = 0, oy = 0;
    if (shake > 0) {
      ox = rand(-shake, shake);
      oy = rand(-shake, shake);
      shake *= 0.85;
      if (shake < 0.5) shake = 0;
    }
    ctx.save();
    ctx.translate(ox, oy);

    drawStars();

    // 道具
    for (const u of powerups) drawPowerup(u);

    // 敌方子弹（Boss 子弹用橙色区分）
    for (const b of enemyBullets) {
      ctx.fillStyle = b.boss ? '#ffb13d' : '#ff5d7a';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, 6.283);
      ctx.fill();
    }

    // 敌机
    for (const e of enemies) drawEnemy(e);

    // Boss
    if (boss) drawBoss();

    // 玩家子弹
    for (const b of bullets) {
      ctx.fillStyle = '#bfe9ff';
      ctx.shadowColor = '#69d2ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 1.8, 0, 0, 6.283);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 粒子
    for (const pt of particles) {
      ctx.globalAlpha = pt.life / pt.max;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.r, pt.y - pt.r, pt.r * 2, pt.r * 2);
    }
    ctx.globalAlpha = 1;

    // 玩家
    if (state === State.PLAY || state === State.PAUSE) drawPlayer();

    ctx.restore();

    // 屏幕白闪（炸弹 / Boss 死亡）
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.6) + ')';
      ctx.fillRect(0, 0, VW, VH);
      flash *= 0.88;
      if (flash < 0.02) flash = 0;
    }

    // Boss 出场警告
    if (bossWarnTimer > 0 && Math.floor(bossWarnTimer / 12) % 2 === 0) {
      ctx.save();
      ctx.fillStyle = '#ff5566';
      ctx.font = 'bold 34px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠ BOSS 来袭 ⚠', VW / 2, VH / 2);
      ctx.restore();
    }

    // HUD
    drawHUD();
  }

  function drawBoss() {
    const b = boss;
    ctx.save();
    ctx.translate(b.x, b.y);
    const c = b.hitFlash > 0 ? '#ffffff' : '#d24b8c';

    // 机身（菱形战舰）
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, b.h / 2);
    ctx.lineTo(b.w / 2, 0);
    ctx.lineTo(b.w / 4, -b.h / 2);
    ctx.lineTo(-b.w / 4, -b.h / 2);
    ctx.lineTo(-b.w / 2, 0);
    ctx.closePath();
    ctx.fill();

    // 装甲细节
    ctx.fillStyle = 'rgba(20,10,30,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, -2, b.w * 0.18, b.h * 0.22, 0, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = '#ff86c0';
    ctx.beginPath();
    ctx.arc(0, 2, 7 + Math.sin(b.wob * 4) * 2, 0, 6.283); // 核心
    ctx.fill();

    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    // 受伤无敌闪烁
    if (p.invincible > 0 && Math.floor(p.invincible / 5) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);

    // 尾焰
    const flame = 8 + Math.sin(frame * 0.5) * 4;
    ctx.fillStyle = 'rgba(120,200,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(-6, p.h / 2 - 6);
    ctx.lineTo(0, p.h / 2 + flame);
    ctx.lineTo(6, p.h / 2 - 6);
    ctx.closePath();
    ctx.fill();

    // 机身
    ctx.fillStyle = '#4fd1ff';
    ctx.beginPath();
    ctx.moveTo(0, -p.h / 2);                 // 机头
    ctx.lineTo(p.w / 2, p.h / 2 - 4);        // 右翼
    ctx.lineTo(p.w / 4, p.h / 2);
    ctx.lineTo(-p.w / 4, p.h / 2);
    ctx.lineTo(-p.w / 2, p.h / 2 - 4);       // 左翼
    ctx.closePath();
    ctx.fill();

    // 座舱
    ctx.fillStyle = '#e8faff';
    ctx.beginPath();
    ctx.ellipse(0, -2, 5, 9, 0, 0, 6.283);
    ctx.fill();

    // 机翼描边
    ctx.strokeStyle = '#bff0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const c = e.hitFlash > 0 ? '#ffffff' : e.color;

    ctx.fillStyle = c;
    ctx.beginPath();
    // 敌机朝下：机头在下
    ctx.moveTo(0, e.h / 2);
    ctx.lineTo(e.w / 2, -e.h / 2 + 4);
    ctx.lineTo(e.w / 4, -e.h / 2);
    ctx.lineTo(-e.w / 4, -e.h / 2);
    ctx.lineTo(-e.w / 2, -e.h / 2 + 4);
    ctx.closePath();
    ctx.fill();

    // 座舱
    ctx.fillStyle = 'rgba(10,15,30,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 2, e.w * 0.13, e.h * 0.18, 0, 0, 6.283);
    ctx.fill();

    // 血条（仅多血敌机）
    if (e.maxHp > 1 && e.hp < e.maxHp) {
      const bw = e.w * 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-bw / 2, -e.h / 2 - 8, bw, 4);
      ctx.fillStyle = '#6dff9a';
      ctx.fillRect(-bw / 2, -e.h / 2 - 8, bw * (e.hp / e.maxHp), 4);
    }
    ctx.restore();
  }

  function drawPowerup(u) {
    ctx.save();
    ctx.translate(u.x, u.y);
    const pulse = 1 + Math.sin(frame * 0.15) * 0.12;
    ctx.scale(pulse, pulse);
    if (u.type === 'power') {
      ctx.fillStyle = '#33d6ff';
      ctx.strokeStyle = '#d6f6ff';
    } else {
      ctx.fillStyle = '#46e08a';
      ctx.strokeStyle = '#d8ffe8';
    }
    ctx.lineWidth = 2;
    roundRect(-u.w / 2, -u.h / 2, u.w, u.h, 6);
    ctx.fill(); ctx.stroke();

    // 图标
    ctx.fillStyle = '#04121e';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.type === 'power' ? '⚡' : '♥', 0, 1);
    ctx.restore();
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

  function drawHUD() {
    ctx.save();
    ctx.textBaseline = 'top';

    // 分数
    ctx.fillStyle = '#eaf3ff';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('分数 ' + score, 14, 12);

    // 最高分
    ctx.fillStyle = '#9fb4d8';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText('最高 ' + Math.max(best, score), 16, 40);

    // 生命（右上）
    ctx.textAlign = 'right';
    ctx.font = '20px sans-serif';
    let hearts = '';
    for (let i = 0; i < player.lives; i++) hearts += '♥';
    ctx.fillStyle = '#ff6a87';
    ctx.fillText(hearts || '·', VW - 14, 12);

    // 火力等级
    ctx.fillStyle = '#7fe3ff';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText('火力 Lv.' + player.power, VW - 14, 40);

    // 炸弹数（右上，火力下方）
    ctx.fillStyle = '#ffd36a';
    ctx.fillText('💣 ×' + player.bombs, VW - 14, 58);

    // Boss 血条（顶部横贯）
    if (boss && !boss.entering) {
      const bw = VW - 120, bx = 60, by = 64;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(bx, by, bw, 8);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, 8);
      ctx.fillStyle = '#ffd0da';
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', VW / 2, by - 12);
    }

    ctx.restore();
  }

  // ============================================================
  //  主循环
  // ============================================================
  function loop() {
    if (state === State.PLAY) {
      update();
      draw();
    } else if (state === State.PAUSE) {
      draw(); // 静止渲染
    }
    requestAnimationFrame(loop);
  }

  // ============================================================
  //  状态切换 & UI
  // ============================================================
  const startScreen = document.getElementById('startScreen');
  const overScreen = document.getElementById('overScreen');
  const pauseScreen = document.getElementById('pauseScreen');

  function resetGame() {
    score = 0;
    spawnTimer = 0;
    spawnInterval = 70;
    difficultyTimer = 0;
    frame = 0;
    bullets = [];
    enemies = [];
    enemyBullets = [];
    powerups = [];
    particles = [];
    shake = 0;
    boss = null;
    bossLevel = 0;
    nextBossScore = 800;
    bossWarnTimer = 0;
    flash = 0;
    player = createPlayer();
    initStars();
  }

  function startGame() {
    resetGame();
    state = State.PLAY;
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    // 音频需在用户手势中初始化（点击开始按钮即手势）
    Sound.init();
    Sound.resume();
    Sound.startMusic();
  }

  function gameOver() {
    state = State.OVER;
    Sound.stopMusic();
    Sound.over();
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
    document.getElementById('finalScore').textContent = score;
    document.getElementById('bestScore').textContent = best;
    overScreen.classList.remove('hidden');
  }

  function togglePause() {
    if (state === State.PLAY) {
      state = State.PAUSE;
      pauseScreen.classList.remove('hidden');
      Sound.stopMusic();
    } else if (state === State.PAUSE) {
      state = State.PLAY;
      pauseScreen.classList.add('hidden');
      Sound.resume();
      Sound.startMusic();
    }
  }

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('retryBtn').addEventListener('click', startGame);
  document.getElementById('resumeBtn').addEventListener('click', togglePause);

  // 静音开关
  const muteBtn = document.getElementById('muteBtn');
  function setMute(muted) {
    if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
  }
  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Sound.init();           // 首次点击也可初始化
      setMute(Sound.toggleMute());
    });
  }

  // 炸弹按钮（手机用）
  const bombBtn = document.getElementById('bombBtn');
  if (bombBtn) {
    bombBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      useBomb();
    });
  }

  // 初始展示一帧星空
  initStars();
  player = createPlayer();
  drawStars();

  loop();
})();
