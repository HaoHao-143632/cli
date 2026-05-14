// 小学英语乐园 - App logic

const STORAGE_KEY = 'english_fun_land_progress';

// ---------- Progress (localStorage) ----------
const progress = {
    load() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || this.defaults();
        } catch {
            return this.defaults();
        }
    },
    save(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },
    defaults() {
        return {
            doneLessons: {},   // { lessonId: true }
            seenWords: {},     // { en: true }
            stars: 0,
            bestQuiz: 0
        };
    },
    reset() {
        localStorage.removeItem(STORAGE_KEY);
    }
};

let state = progress.load();

// ---------- Speech (Web Speech API) ----------
function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.85;
    u.pitch = 1.1;
    window.speechSynthesis.speak(u);
}

// ---------- Navigation ----------
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const target = document.getElementById(page);
    if (target) target.classList.add('active');
    document.querySelectorAll(`.nav-link[data-nav="${page}"]`).forEach(l => l.classList.add('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // refresh dynamic pages
    if (page === 'grades') renderGrades();
    if (page === 'vocab') renderVocab();
    if (page === 'quiz') renderQuizSetup();
    if (page === 'games') renderGamesMenu();
    if (page === 'progress') renderProgress();
}

document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(el.dataset.nav);
    });
});

document.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.go));
});

// ---------- GRADES PAGE ----------
function renderGrades() {
    document.getElementById('lesson-view').classList.add('hidden');
    document.getElementById('word-view').classList.add('hidden');
    const grid = document.getElementById('grade-grid');
    grid.classList.remove('hidden');
    grid.innerHTML = '';

    for (const g of [1, 2, 3, 4, 5, 6]) {
        const data = CURRICULUM[g];
        const totalLessons = data.lessons.length;
        const doneCount = data.lessons.filter(l => state.doneLessons[l.id]).length;
        const card = document.createElement('div');
        card.className = `grade-card g${g}`;
        card.innerHTML = `
            <div class="grade-num">${g}</div>
            <h3>${data.name}</h3>
            <p class="grade-count">${totalLessons} 课 · ${data.desc}</p>
            <div class="grade-stars">⭐ ${doneCount}/${totalLessons}</div>
        `;
        card.addEventListener('click', () => openGrade(g));
        grid.appendChild(card);
    }
}

function openGrade(g) {
    const data = CURRICULUM[g];
    document.getElementById('grade-grid').classList.add('hidden');
    document.getElementById('word-view').classList.add('hidden');
    const view = document.getElementById('lesson-view');
    view.classList.remove('hidden');
    document.getElementById('lesson-grade-title').textContent = data.name + ' - 课程列表';
    const list = document.getElementById('lesson-list');
    list.innerHTML = '';
    data.lessons.forEach(lesson => {
        const card = document.createElement('div');
        card.className = 'lesson-card' + (state.doneLessons[lesson.id] ? ' done' : '');
        card.innerHTML = `
            <h4>${lesson.title}</h4>
            <div class="lesson-meta">${lesson.words.length} 个单词</div>
        `;
        card.addEventListener('click', () => openLesson(g, lesson.id));
        list.appendChild(card);
    });
}

document.getElementById('back-to-grades').addEventListener('click', renderGrades);

let currentLesson = null;
function openLesson(grade, lessonId) {
    const data = CURRICULUM[grade];
    const lesson = data.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    currentLesson = { grade, lesson };
    document.getElementById('lesson-view').classList.add('hidden');
    document.getElementById('grade-grid').classList.add('hidden');
    const view = document.getElementById('word-view');
    view.classList.remove('hidden');
    document.getElementById('word-lesson-title').textContent = `${data.name} · ${lesson.title}`;
    const container = document.getElementById('word-cards');
    container.innerHTML = '';
    lesson.words.forEach(w => container.appendChild(makeWordCard(w)));
    state.seenWords = state.seenWords || {};
    lesson.words.forEach(w => { state.seenWords[w.en] = true; });
    progress.save(state);
}

function makeWordCard(w) {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.innerHTML = `
        <button class="sound-btn" title="播放发音">🔊</button>
        <div class="word-emoji">${w.emoji}</div>
        <div class="word-en">${w.en}</div>
        <div class="word-zh">${w.zh}</div>
    `;
    card.addEventListener('click', () => speak(w.en));
    return card;
}

document.getElementById('back-to-lessons').addEventListener('click', () => {
    if (currentLesson) openGrade(currentLesson.grade);
    else renderGrades();
});

document.getElementById('mark-lesson-done').addEventListener('click', () => {
    if (!currentLesson) return;
    const id = currentLesson.lesson.id;
    if (!state.doneLessons[id]) {
        state.doneLessons[id] = true;
        state.stars += 3;
        progress.save(state);
        alert('🎉 太棒了！获得 3 颗 ⭐');
    } else {
        alert('这一课已经完成啦！');
    }
});

document.getElementById('quiz-this-lesson').addEventListener('click', () => {
    if (!currentLesson) return;
    navigateTo('quiz');
    startQuiz(currentLesson.grade, currentLesson.lesson.words);
});

// ---------- VOCAB PAGE ----------
function renderVocab() {
    const search = document.getElementById('vocab-search').value.toLowerCase().trim();
    const filter = document.getElementById('vocab-filter').value;
    const list = document.getElementById('vocab-list');
    const all = getAllWords();
    const filtered = all.filter(w => {
        if (filter !== 'all' && w.grade !== Number(filter)) return false;
        if (!search) return true;
        return w.en.toLowerCase().includes(search) || w.zh.includes(search);
    });
    list.innerHTML = '';
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;">没有找到匹配的单词 😢</p>';
        return;
    }
    filtered.forEach(w => list.appendChild(makeWordCard(w)));
}

document.getElementById('vocab-search').addEventListener('input', renderVocab);
document.getElementById('vocab-filter').addEventListener('change', renderVocab);

// ---------- QUIZ ----------
let quizState = null;

function renderQuizSetup() {
    document.getElementById('quiz-setup').classList.remove('hidden');
    document.getElementById('quiz-game').classList.add('hidden');
    document.getElementById('quiz-result').classList.add('hidden');
    const wrap = document.getElementById('quiz-grade-buttons');
    wrap.innerHTML = '';
    for (const g of [1, 2, 3, 4, 5, 6]) {
        const btn = document.createElement('button');
        btn.className = 'quiz-grade-btn';
        btn.textContent = CURRICULUM[g].name;
        btn.addEventListener('click', () => startQuiz(g));
        wrap.appendChild(btn);
    }
    const mix = document.createElement('button');
    mix.className = 'quiz-grade-btn';
    mix.textContent = '🎲 混合测验';
    mix.style.background = 'var(--c-primary)';
    mix.style.color = 'white';
    mix.addEventListener('click', () => startQuiz('mix'));
    wrap.appendChild(mix);
}

function pickRandom(arr, n) {
    const copy = [...arr];
    const out = [];
    while (out.length < n && copy.length) {
        out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
}

function startQuiz(grade, customPool) {
    const pool = customPool || (grade === 'mix' ? getAllWords() : getWordsByGrade(grade));
    if (pool.length < 4) {
        alert('单词数量不够 😅');
        return;
    }
    const questions = pickRandom(pool, Math.min(10, pool.length));
    quizState = { questions, idx: 0, score: 0, grade };
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-result').classList.add('hidden');
    document.getElementById('quiz-game').classList.remove('hidden');
    showQuizQuestion();
}

function showQuizQuestion() {
    const q = quizState.questions[quizState.idx];
    document.getElementById('quiz-progress').textContent = `第 ${quizState.idx + 1} 题 / 共 ${quizState.questions.length} 题`;
    document.getElementById('quiz-score').textContent = `得分: ${quizState.score}`;

    // Half: English -> Chinese, half: Chinese -> English (alternating)
    const mode = quizState.idx % 2 === 0 ? 'en2zh' : 'zh2en';
    const allPool = getAllWords();
    const wrongs = pickRandom(allPool.filter(w => w.en !== q.en), 3);
    const options = pickRandom([q, ...wrongs], 4);

    const qEl = document.getElementById('quiz-question');
    if (mode === 'en2zh') {
        qEl.innerHTML = `
            <div class="q-emoji">${q.emoji}</div>
            <div class="q-text">${q.en}</div>
            <div class="q-sub">这个单词是什么意思？</div>
        `;
        speak(q.en);
    } else {
        qEl.innerHTML = `
            <div class="q-emoji">${q.emoji}</div>
            <div class="q-text">${q.zh}</div>
            <div class="q-sub">用英语怎么说？</div>
        `;
    }

    const optsEl = document.getElementById('quiz-options');
    optsEl.innerHTML = '';
    options.forEach(opt => {
        const b = document.createElement('button');
        b.className = 'quiz-option';
        b.textContent = mode === 'en2zh' ? opt.zh : opt.en;
        b.addEventListener('click', () => answerQuiz(b, opt, q, mode));
        optsEl.appendChild(b);
    });

    document.getElementById('quiz-feedback').textContent = '';
    document.getElementById('quiz-next').classList.add('hidden');
}

function answerQuiz(btn, opt, q, mode) {
    const correct = opt.en === q.en;
    document.querySelectorAll('.quiz-option').forEach(b => {
        b.disabled = true;
        const label = b.textContent;
        if (label === (mode === 'en2zh' ? q.zh : q.en)) b.classList.add('correct');
    });
    if (correct) {
        btn.classList.add('correct');
        quizState.score += 10;
        document.getElementById('quiz-feedback').textContent = '✅ 答对了！Great!';
        document.getElementById('quiz-feedback').style.color = '#51cf66';
    } else {
        btn.classList.add('wrong');
        document.getElementById('quiz-feedback').textContent = `❌ 正确答案是 "${mode === 'en2zh' ? q.zh : q.en}"`;
        document.getElementById('quiz-feedback').style.color = '#e03131';
    }
    document.getElementById('quiz-score').textContent = `得分: ${quizState.score}`;
    document.getElementById('quiz-next').classList.remove('hidden');
}

document.getElementById('quiz-next').addEventListener('click', () => {
    quizState.idx++;
    if (quizState.idx >= quizState.questions.length) {
        finishQuiz();
    } else {
        showQuizQuestion();
    }
});

function finishQuiz() {
    document.getElementById('quiz-game').classList.add('hidden');
    document.getElementById('quiz-result').classList.remove('hidden');
    const score = quizState.score;
    const total = quizState.questions.length * 10;
    const percent = Math.round((score / total) * 100);

    let title, text;
    if (percent === 100) {
        title = '🌟 满分！太厉害了！';
        text = `你答对了所有题目！获得 5 颗 ⭐`;
        state.stars += 5;
    } else if (percent >= 80) {
        title = '🎉 表现优秀！';
        text = `得分 ${score}/${total}，获得 3 颗 ⭐`;
        state.stars += 3;
    } else if (percent >= 60) {
        title = '👍 不错哦！';
        text = `得分 ${score}/${total}，获得 1 颗 ⭐，继续加油！`;
        state.stars += 1;
    } else {
        title = '💪 再加油！';
        text = `得分 ${score}/${total}，多复习单词，下次会更好！`;
    }

    if (score > state.bestQuiz) state.bestQuiz = score;
    progress.save(state);

    document.getElementById('quiz-result-title').textContent = title;
    document.getElementById('quiz-result-text').textContent = text;
}

document.getElementById('quiz-restart').addEventListener('click', () => {
    if (quizState && quizState.grade) startQuiz(quizState.grade);
    else renderQuizSetup();
});

document.getElementById('quiz-back').addEventListener('click', renderQuizSetup);

// ---------- GAMES ----------
function renderGamesMenu() {
    document.getElementById('game-area').classList.add('hidden');
    document.querySelector('.game-menu').classList.remove('hidden');
}

document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
        const g = card.dataset.game;
        document.querySelector('.game-menu').classList.add('hidden');
        document.getElementById('game-area').classList.remove('hidden');
        if (g === 'match') startMatchGame();
        else if (g === 'spell') startSpellGame();
        else if (g === 'listen') startListenGame();
    });
});

document.getElementById('back-to-games').addEventListener('click', renderGamesMenu);

// ----- MATCH GAME -----
function startMatchGame() {
    const all = getAllWords();
    const pairs = pickRandom(all, 6);
    const tiles = [];
    pairs.forEach(p => {
        tiles.push({ key: p.en, label: p.en, kind: 'en' });
        tiles.push({ key: p.en, label: `${p.emoji} ${p.zh}`, kind: 'zh' });
    });
    // shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    const area = document.getElementById('game-content');
    area.innerHTML = `
        <h2 class="page-title">🧩 记忆配对</h2>
        <p>点击两个卡片，把英文和中文意思配对起来！</p>
        <div class="match-board" id="match-board"></div>
        <p id="match-status" style="text-align:center;margin-top:16px;font-weight:bold;"></p>
        <button class="btn-primary" id="match-restart" style="margin-top:16px;">再来一局</button>
    `;
    const board = document.getElementById('match-board');
    let selected = null;
    let matchedCount = 0;
    let locked = false;

    tiles.forEach(t => {
        const el = document.createElement('div');
        el.className = 'match-tile';
        el.dataset.key = t.key;
        el.dataset.kind = t.kind;
        el.textContent = t.label;
        el.addEventListener('click', () => {
            if (locked || el.classList.contains('matched') || el.classList.contains('selected')) return;
            el.classList.add('selected');
            if (t.kind === 'en') speak(t.label);
            if (!selected) {
                selected = el;
            } else {
                locked = true;
                if (selected.dataset.key === el.dataset.key && selected.dataset.kind !== el.dataset.kind) {
                    setTimeout(() => {
                        selected.classList.remove('selected');
                        el.classList.remove('selected');
                        selected.classList.add('matched');
                        el.classList.add('matched');
                        matchedCount++;
                        selected = null;
                        locked = false;
                        if (matchedCount === pairs.length) {
                            document.getElementById('match-status').textContent = '🎉 全部配对完成！获得 2 颗 ⭐';
                            state.stars += 2;
                            progress.save(state);
                        }
                    }, 400);
                } else {
                    el.classList.add('wrong');
                    setTimeout(() => {
                        selected.classList.remove('selected');
                        el.classList.remove('selected', 'wrong');
                        selected = null;
                        locked = false;
                    }, 700);
                }
            }
        });
        board.appendChild(el);
    });
    document.getElementById('match-restart').addEventListener('click', startMatchGame);
}

// ----- SPELL GAME -----
function startSpellGame() {
    const area = document.getElementById('game-content');
    area.innerHTML = `
        <h2 class="page-title">🔤 单词拼写</h2>
        <div class="spell-area" id="spell-area"></div>
        <div style="text-align:center;margin-top:16px;">
            <button class="btn-secondary" id="spell-hear">🔊 再听一次</button>
            <button class="btn-ghost" id="spell-next">下一个 →</button>
        </div>
    `;
    let score = 0;
    function nextWord() {
        const all = getAllWords().filter(w => w.en.length <= 8 && /^[a-zA-Z]+$/.test(w.en));
        const w = pickRandom(all, 1)[0];
        const letters = w.en.split('');
        // add extra random letters
        const extras = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !letters.includes(c));
        const extraCount = Math.max(0, Math.min(3, 8 - letters.length));
        const pool = [...letters, ...pickRandom(extras, extraCount)];
        // shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const sa = document.getElementById('spell-area');
        sa.innerHTML = `
            <div class="spell-emoji">${w.emoji}</div>
            <div class="spell-zh">${w.zh}</div>
            <div class="spell-slots" id="spell-slots"></div>
            <div class="spell-letters" id="spell-letters"></div>
            <p id="spell-feedback" style="margin-top:12px;font-weight:bold;min-height:24px;"></p>
            <p style="margin-top:8px;color:#888;">本次得分: ${score} ⭐</p>
        `;
        const slots = document.getElementById('spell-slots');
        for (let i = 0; i < w.en.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'spell-slot';
            slot.dataset.idx = i;
            slots.appendChild(slot);
        }
        const lettersDiv = document.getElementById('spell-letters');
        const letterEls = [];
        pool.forEach((c, i) => {
            const btn = document.createElement('button');
            btn.className = 'spell-letter';
            btn.textContent = c;
            btn.addEventListener('click', () => placeLetter(c, btn));
            lettersDiv.appendChild(btn);
            letterEls.push(btn);
        });

        let pos = 0;
        const placed = [];
        function placeLetter(c, btn) {
            if (pos >= w.en.length) return;
            const slot = slots.children[pos];
            slot.textContent = c.toLowerCase() === w.en[pos].toLowerCase() ? w.en[pos] : c;
            placed.push({ btn, c });
            btn.disabled = true;
            pos++;
            if (pos === w.en.length) {
                const guess = placed.map(p => p.c).join('').toLowerCase();
                const fb = document.getElementById('spell-feedback');
                if (guess === w.en.toLowerCase()) {
                    fb.textContent = '✅ 拼写正确！';
                    fb.style.color = '#51cf66';
                    score++;
                    state.stars += 1;
                    progress.save(state);
                    speak(w.en);
                } else {
                    fb.textContent = `❌ 正确拼写是 "${w.en}"`;
                    fb.style.color = '#e03131';
                    // show correct
                    [...slots.children].forEach((s, i) => s.textContent = w.en[i]);
                }
            }
        }
        speak(w.en);
        document.getElementById('spell-hear').onclick = () => speak(w.en);
        document.getElementById('spell-next').onclick = nextWord;
    }
    nextWord();
}

// ----- LISTEN GAME -----
function startListenGame() {
    const area = document.getElementById('game-content');
    area.innerHTML = `
        <h2 class="page-title">👂 听音选词</h2>
        <p>点击大喇叭听单词发音，然后选出正确的单词！</p>
        <div class="listen-area" id="listen-area"></div>
    `;
    let score = 0;
    function nextRound() {
        const all = getAllWords();
        const correct = pickRandom(all, 1)[0];
        const wrongs = pickRandom(all.filter(w => w.en !== correct.en), 3);
        const opts = pickRandom([correct, ...wrongs], 4);
        const la = document.getElementById('listen-area');
        la.innerHTML = `
            <button class="big-sound-btn" id="big-sound">🔊</button>
            <p style="margin-bottom:16px;color:#888;">点击播放，仔细听</p>
            <div class="listen-options" id="listen-opts"></div>
            <p id="listen-feedback" style="margin-top:16px;font-weight:bold;min-height:24px;"></p>
            <p style="margin-top:8px;color:#888;">本次得分: ${score} ⭐</p>
            <button class="btn-primary" id="listen-next" style="margin-top:12px;display:none;">下一题 →</button>
        `;
        const optsDiv = document.getElementById('listen-opts');
        opts.forEach(o => {
            const b = document.createElement('button');
            b.className = 'quiz-option';
            b.textContent = o.en;
            b.addEventListener('click', () => {
                document.querySelectorAll('#listen-opts .quiz-option').forEach(x => x.disabled = true);
                const fb = document.getElementById('listen-feedback');
                if (o.en === correct.en) {
                    b.classList.add('correct');
                    fb.textContent = '✅ 答对了！';
                    fb.style.color = '#51cf66';
                    score++;
                    state.stars += 1;
                    progress.save(state);
                } else {
                    b.classList.add('wrong');
                    fb.textContent = `❌ 正确答案是 "${correct.en}" ${correct.emoji}`;
                    fb.style.color = '#e03131';
                    document.querySelectorAll('#listen-opts .quiz-option').forEach(x => {
                        if (x.textContent === correct.en) x.classList.add('correct');
                    });
                }
                document.getElementById('listen-next').style.display = 'inline-block';
            });
            optsDiv.appendChild(b);
        });
        document.getElementById('big-sound').onclick = () => speak(correct.en);
        document.getElementById('listen-next').onclick = nextRound;
        speak(correct.en);
    }
    nextRound();
}

// ---------- PROGRESS PAGE ----------
function renderProgress() {
    state = progress.load();
    document.getElementById('stat-stars').textContent = state.stars || 0;
    document.getElementById('stat-words').textContent = Object.keys(state.seenWords || {}).length;
    document.getElementById('stat-lessons').textContent = Object.keys(state.doneLessons || {}).length;
    document.getElementById('stat-quiz').textContent = state.bestQuiz || 0;

    const wrap = document.getElementById('grade-progress');
    wrap.innerHTML = '';
    for (const g of [1, 2, 3, 4, 5, 6]) {
        const data = CURRICULUM[g];
        const total = data.lessons.length;
        const done = data.lessons.filter(l => state.doneLessons[l.id]).length;
        const pct = total > 0 ? (done / total) * 100 : 0;
        const row = document.createElement('div');
        row.className = 'grade-prog-row';
        row.innerHTML = `
            <div class="grade-prog-label">${data.name.split(' ')[0]}</div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            <div class="grade-prog-stars">⭐ ${done}/${total}</div>
        `;
        wrap.appendChild(row);
    }
}

document.getElementById('reset-progress').addEventListener('click', () => {
    if (confirm('确定要清空所有学习进度吗？')) {
        progress.reset();
        state = progress.load();
        renderProgress();
        alert('进度已清空');
    }
});

// ---------- INIT ----------
navigateTo('home');
