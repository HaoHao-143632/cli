(() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const levelEl = document.getElementById('level');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayText = document.getElementById('overlayText');
    const startBtn = document.getElementById('startBtn');

    const keys = {};
    let state = 'menu'; // menu | playing | paused | over
    let lastTime = 0;
    let spawnTimer = 0;
    let enemySpawnInterval = 1000;
    let score = 0;
    let lives = 3;
    let level = 1;
    let stars = [];

    const player = {
        x: W / 2,
        y: H - 80,
        w: 40,
        h: 44,
        speed: 320,
        cooldown: 0,
        fireRate: 220,
        invincible: 0,
    };

    const bullets = [];
    const enemies = [];
    const enemyBullets = [];
    const particles = [];

    // Initialize starfield background
    function initStars() {
        stars = [];
        for (let i = 0; i < 80; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: Math.random() * 1.6 + 0.4,
                speed: Math.random() * 60 + 20,
            });
        }
    }

    function resetGame() {
        player.x = W / 2;
        player.y = H - 80;
        player.cooldown = 0;
        player.invincible = 0;
        bullets.length = 0;
        enemies.length = 0;
        enemyBullets.length = 0;
        particles.length = 0;
        score = 0;
        lives = 3;
        level = 1;
        spawnTimer = 0;
        enemySpawnInterval = 1000;
        updateHUD();
        initStars();
    }

    function updateHUD() {
        scoreEl.textContent = score;
        livesEl.textContent = lives;
        levelEl.textContent = level;
    }

    function showOverlay(title, text, btnText = '开始游戏') {
        overlayTitle.textContent = title;
        overlayText.textContent = text;
        startBtn.textContent = btnText;
        overlay.classList.remove('hidden');
    }

    function hideOverlay() {
        overlay.classList.add('hidden');
    }

    // Input handlers
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ') e.preventDefault();
        if (e.key.toLowerCase() === 'p' && state === 'playing') {
            state = 'paused';
            showOverlay('暂停', '按继续按钮或 P 键恢复游戏', '继续');
        } else if (e.key.toLowerCase() === 'p' && state === 'paused') {
            state = 'playing';
            hideOverlay();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    startBtn.addEventListener('click', () => {
        if (state === 'paused') {
            state = 'playing';
            hideOverlay();
            return;
        }
        resetGame();
        state = 'playing';
        hideOverlay();
    });

    // Shooting
    function fireBullet() {
        bullets.push({ x: player.x, y: player.y - 20, vy: -520, w: 4, h: 12 });
        // Extra shots at higher levels
        if (level >= 3) {
            bullets.push({ x: player.x - 12, y: player.y - 10, vy: -520, w: 4, h: 12 });
            bullets.push({ x: player.x + 12, y: player.y - 10, vy: -520, w: 4, h: 12 });
        }
    }

    // Enemy spawning
    function spawnEnemy() {
        const roll = Math.random();
        let type;
        if (roll < 0.7) type = 'grunt';
        else if (roll < 0.92) type = 'shooter';
        else type = 'tank';

        const config = {
            grunt: { w: 32, h: 32, hp: 1, speed: 110 + level * 10, score: 10, color: '#ff5252' },
            shooter: { w: 36, h: 36, hp: 2, speed: 80 + level * 8, score: 25, color: '#ffb300', canShoot: true },
            tank: { w: 52, h: 52, hp: 5, speed: 60 + level * 5, score: 60, color: '#7c4dff' },
        }[type];

        enemies.push({
            type,
            x: Math.random() * (W - config.w) + config.w / 2,
            y: -config.h,
            w: config.w,
            h: config.h,
            hp: config.hp,
            speed: config.speed,
            score: config.score,
            color: config.color,
            canShoot: config.canShoot,
            shootTimer: 1000 + Math.random() * 1500,
            drift: (Math.random() - 0.5) * 60,
        });
    }

    function spawnExplosion(x, y, color, count = 14) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 180 + 40;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1,
                size: Math.random() * 3 + 1,
                color,
            });
        }
    }

    // Collision detection
    function collide(a, b) {
        return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
               Math.abs(a.y - b.y) < (a.h + b.h) / 2;
    }

    // Update loop
    function update(dt) {
        // Stars
        for (const s of stars) {
            s.y += s.speed * dt;
            if (s.y > H) {
                s.y = 0;
                s.x = Math.random() * W;
            }
        }

        if (state !== 'playing') return;

        // Player movement
        let dx = 0, dy = 0;
        if (keys['arrowleft'] || keys['a']) dx -= 1;
        if (keys['arrowright'] || keys['d']) dx += 1;
        if (keys['arrowup'] || keys['w']) dy -= 1;
        if (keys['arrowdown'] || keys['s']) dy += 1;
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
        player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));
        player.y = Math.max(player.h / 2, Math.min(H - player.h / 2, player.y));

        // Shooting
        player.cooldown -= dt * 1000;
        if (keys[' '] && player.cooldown <= 0) {
            fireBullet();
            player.cooldown = player.fireRate;
        }

        if (player.invincible > 0) player.invincible -= dt;

        // Bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.y += b.vy * dt;
            if (b.y < -20) bullets.splice(i, 1);
        }

        // Enemy spawning
        spawnTimer += dt * 1000;
        if (spawnTimer >= enemySpawnInterval) {
            spawnTimer = 0;
            spawnEnemy();
        }

        // Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.y += e.speed * dt;
            e.x += e.drift * dt;
            if (e.x < e.w / 2 || e.x > W - e.w / 2) e.drift *= -1;

            if (e.canShoot) {
                e.shootTimer -= dt * 1000;
                if (e.shootTimer <= 0) {
                    e.shootTimer = 1500 + Math.random() * 1000;
                    const dxb = player.x - e.x;
                    const dyb = player.y - e.y;
                    const d = Math.hypot(dxb, dyb) || 1;
                    enemyBullets.push({
                        x: e.x, y: e.y + e.h / 2,
                        vx: (dxb / d) * 220, vy: (dyb / d) * 220,
                        w: 6, h: 6,
                    });
                }
            }

            if (e.y > H + e.h) {
                enemies.splice(i, 1);
                continue;
            }

            // Player collision
            if (player.invincible <= 0 && collide(e, player)) {
                enemies.splice(i, 1);
                spawnExplosion(e.x, e.y, e.color, 20);
                spawnExplosion(player.x, player.y, '#4fc3f7', 20);
                damagePlayer();
                continue;
            }

            // Bullet collision
            for (let j = bullets.length - 1; j >= 0; j--) {
                if (collide(e, bullets[j])) {
                    bullets.splice(j, 1);
                    e.hp -= 1;
                    spawnExplosion(bullets[j] ? bullets[j].x : e.x, e.y - e.h / 2, '#fff', 4);
                    if (e.hp <= 0) {
                        score += e.score;
                        spawnExplosion(e.x, e.y, e.color, 18);
                        enemies.splice(i, 1);
                        updateHUD();
                        checkLevelUp();
                    }
                    break;
                }
            }
        }

        // Enemy bullets
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.y > H + 20 || b.y < -20 || b.x < -20 || b.x > W + 20) {
                enemyBullets.splice(i, 1);
                continue;
            }
            if (player.invincible <= 0 && collide(b, player)) {
                enemyBullets.splice(i, 1);
                spawnExplosion(player.x, player.y, '#4fc3f7', 14);
                damagePlayer();
            }
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function damagePlayer() {
        lives -= 1;
        player.invincible = 1.5;
        updateHUD();
        if (lives <= 0) {
            state = 'over';
            showOverlay('游戏结束', `最终得分：${score}`, '再来一局');
        }
    }

    function checkLevelUp() {
        const newLevel = Math.floor(score / 300) + 1;
        if (newLevel > level) {
            level = newLevel;
            enemySpawnInterval = Math.max(300, 1000 - (level - 1) * 80);
            updateHUD();
        }
    }

    // Drawing
    function drawStars() {
        ctx.fillStyle = '#fff';
        for (const s of stars) {
            ctx.globalAlpha = s.size / 2;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        ctx.globalAlpha = 1;
    }

    function drawPlayer() {
        if (player.invincible > 0 && Math.floor(player.invincible * 10) % 2 === 0) return;
        ctx.save();
        ctx.translate(player.x, player.y);
        // Body
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(-18, 14);
        ctx.lineTo(-8, 8);
        ctx.lineTo(0, 18);
        ctx.lineTo(8, 8);
        ctx.lineTo(18, 14);
        ctx.closePath();
        ctx.fill();
        // Cockpit
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        // Engine glow
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(-4, 14);
        ctx.lineTo(0, 22 + Math.random() * 4);
        ctx.lineTo(4, 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawEnemy(e) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.fillStyle = e.color;
        if (e.type === 'tank') {
            ctx.beginPath();
            ctx.moveTo(0, e.h / 2);
            ctx.lineTo(-e.w / 2, 0);
            ctx.lineTo(-e.w / 2 + 6, -e.h / 2);
            ctx.lineTo(e.w / 2 - 6, -e.h / 2);
            ctx.lineTo(e.w / 2, 0);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, e.h / 2);
            ctx.lineTo(-e.w / 2, -e.h / 2);
            ctx.lineTo(e.w / 2, -e.h / 2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawBullets() {
        ctx.fillStyle = '#ffeb3b';
        for (const b of bullets) {
            ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        }
        ctx.fillStyle = '#ff5252';
        for (const b of enemyBullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.w / 2 + 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        drawStars();
        drawBullets();
        for (const e of enemies) drawEnemy(e);
        drawParticles();
        if (state !== 'over') drawPlayer();
    }

    // Main loop
    function loop(ts) {
        const dt = Math.min((ts - lastTime) / 1000, 0.05) || 0;
        lastTime = ts;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }

    initStars();
    updateHUD();
    requestAnimationFrame(loop);
})();
