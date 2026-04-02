// ===== State =====
const state = {
  currentPage: 'home',
  score: 0,
  streak: 0,
  dailyAnswered: 0,
  dailyTotal: 5,
  progress: {},      // { subjectId: { answered: N, correct: N, topicAnswered: {topicId: N} } }
  quizActive: false,
  quizQuestions: [],
  quizIndex: 0,
  quizCorrect: 0,
  quizAnswered: false,
};

// Load persisted state
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('tutoring_state') || '{}');
    Object.assign(state, saved);
  } catch (e) { /* ignore */ }
}

function saveState() {
  const toSave = { score: state.score, streak: state.streak, dailyAnswered: state.dailyAnswered, progress: state.progress };
  localStorage.setItem('tutoring_state', JSON.stringify(toSave));
}

function getSubjectProgress(subjectId) {
  return state.progress[subjectId] || { answered: 0, correct: 0 };
}

function recordAnswer(subjectId, correct) {
  if (!state.progress[subjectId]) state.progress[subjectId] = { answered: 0, correct: 0 };
  state.progress[subjectId].answered++;
  if (correct) state.progress[subjectId].correct++;
  if (correct) state.score += 10;
  state.dailyAnswered = Math.min(state.dailyAnswered + 1, state.dailyTotal);
  saveState();
  updateHeaderStats();
}

// ===== Navigation =====
function navigate(page, extra) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById('page-' + page);
  if (!target) return;
  target.classList.add('active');
  state.currentPage = page;

  const navBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (page === 'home')     renderHome();
  if (page === 'subjects') renderSubjects();
  if (page === 'quiz')     renderQuizPage();
  if (page === 'progress') renderProgress();
  if (page === 'subject-detail' && extra) renderSubjectDetail(extra);

  window.scrollTo(0, 0);
}

// ===== Header =====
function updateHeaderStats() {
  document.getElementById('score-val').textContent = state.score;
  document.getElementById('streak-val').textContent = state.streak;
}

// ===== Subject Card =====
function createSubjectCard(subject, showProgress) {
  const prog = getSubjectProgress(subject.id);
  const total = QUESTIONS.filter(q => q.subject === subject.id).length;
  const pct = total ? Math.round((prog.correct / total) * 100) : 0;

  const card = document.createElement('div');
  card.className = 'subject-card';
  card.innerHTML = `
    <div class="subject-icon">${subject.icon}</div>
    <div class="subject-name">${subject.name}</div>
    <div class="subject-tag">${subject.desc}</div>
    ${showProgress ? `<div class="subject-bar-wrap">
      <div class="subject-bar" style="width:${pct}%;background:${subject.color}"></div>
    </div>` : ''}
  `;
  card.addEventListener('click', () => navigate('subject-detail', subject.id));
  return card;
}

// ===== Home Page =====
function renderHome() {
  // Subject grid
  const grid = document.getElementById('home-subjects');
  grid.innerHTML = '';
  SUBJECTS.forEach(s => grid.appendChild(createSubjectCard(s, true)));

  // Daily progress
  const pct = Math.round((state.dailyAnswered / state.dailyTotal) * 100);
  document.getElementById('daily-progress').style.width = pct + '%';
  document.getElementById('daily-label').textContent = `${state.dailyAnswered} / ${state.dailyTotal} 题`;

  // Daily question
  renderDailyQuestion();
}

function renderDailyQuestion() {
  const container = document.getElementById('daily-question-card');
  const q = QUESTIONS[Math.floor(Date.now() / 86400000) % QUESTIONS.length];
  const subject = SUBJECTS.find(s => s.id === q.subject);

  container.innerHTML = `
    <div class="q-subject" style="background:${subject.color}22;color:${subject.color}">${subject.icon} ${subject.name}</div>
    <div class="q-text">${q.q}</div>
    <ul class="options-list" id="daily-opts"></ul>
    <div id="daily-feedback"></div>
  `;

  const opts = container.querySelector('#daily-opts');
  q.opts.forEach((opt, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleDailyAnswer(q, i, container));
    li.appendChild(btn);
    opts.appendChild(li);
  });
}

function handleDailyAnswer(q, chosen, container) {
  const buttons = container.querySelectorAll('.option-btn');
  buttons.forEach(b => b.disabled = true);
  const correct = chosen === q.ans;
  buttons[chosen].classList.add(correct ? 'correct' : 'wrong');
  if (!correct) buttons[q.ans].classList.add('correct');

  const fb = container.querySelector('#daily-feedback');
  fb.className = 'feedback ' + (correct ? 'correct' : 'wrong');
  fb.innerHTML = (correct ? '✅ 回答正确！' : '❌ 回答错误') +
    `<div class="explanation">💡 ${q.exp}</div>`;

  recordAnswer(q.subject, correct);
}

// ===== Subjects Page =====
function renderSubjects() {
  const grid = document.getElementById('all-subjects');
  grid.innerHTML = '';
  SUBJECTS.forEach(s => grid.appendChild(createSubjectCard(s, true)));
}

// ===== Subject Detail =====
function renderSubjectDetail(subjectId) {
  const subject = SUBJECTS.find(s => s.id === subjectId);
  if (!subject) return;

  const container = document.getElementById('subject-detail-content');
  const subjectQs = QUESTIONS.filter(q => q.subject === subjectId);
  const prog = getSubjectProgress(subjectId);
  const pct = subjectQs.length ? Math.round((prog.correct / subjectQs.length) * 100) : 0;

  container.innerHTML = `
    <div class="detail-header">
      <div class="detail-icon">${subject.icon}</div>
      <div>
        <div class="detail-title">${subject.name}</div>
        <div class="detail-desc">${subject.desc}</div>
        <div style="margin-top:8px;font-size:.85rem;color:var(--text-muted)">
          已掌握：${prog.correct || 0} / ${subjectQs.length} 题（${pct}%）
        </div>
      </div>
    </div>

    <section class="knowledge-section">
      <h3 class="section-title">📝 知识点</h3>
      ${subject.knowledge.map(k => `
        <div class="knowledge-card">
          <h4>${k.title}</h4>
          <ul>${k.body.split('\n').map(l => `<li>${l}</li>`).join('')}</ul>
        </div>
      `).join('')}
    </section>

    <section>
      <h3 class="section-title">🗂️ 专题</h3>
      <div class="topic-grid">
        ${subject.topics.map(t => {
          const tQs = subjectQs.filter(q => q.topic === t.id).length;
          return `
            <div class="topic-card" data-topic="${t.id}" data-subject="${subjectId}">
              <div class="topic-name">${t.name}</div>
              <div class="topic-count">${tQs} 道练习题</div>
              <div class="topic-progress">
                <div class="topic-progress-fill" style="width:0%"></div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </section>

    <section>
      <h3 class="section-title">✏️ 练习题</h3>
      <div id="subject-quiz-area"></div>
    </section>
  `;

  // Topic click → filter questions
  container.querySelectorAll('.topic-card').forEach(card => {
    card.addEventListener('click', () => {
      const topicId = card.dataset.topic;
      const qs = subjectQs.filter(q => q.topic === topicId);
      renderInlineQuiz(document.getElementById('subject-quiz-area'), qs, subjectId, card);
    });
  });

  // Default: show all subject questions
  renderInlineQuiz(document.getElementById('subject-quiz-area'), subjectQs, subjectId, null);
}

function renderInlineQuiz(container, questions, subjectId, highlightCard) {
  if (!questions.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">暂无题目</p>';
    return;
  }

  const subject = SUBJECTS.find(s => s.id === subjectId);
  let html = '';
  questions.forEach((q, idx) => {
    html += `
      <div class="quiz-card" style="margin-bottom:16px" id="inline-q-${q.id}">
        <div class="q-subject" style="background:${subject.color}22;color:${subject.color}">第 ${idx+1} 题</div>
        <div class="q-text" style="margin:8px 0">${q.q}</div>
        <ul class="options-list">
          ${q.opts.map((opt, i) => `
            <li><button class="option-btn" data-qi="${q.id}" data-oi="${i}">${opt}</button></li>
          `).join('')}
        </ul>
        <div class="feedback" id="ifb-${q.id}" style="display:none"></div>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qId = parseInt(btn.dataset.qi);
      const oIdx = parseInt(btn.dataset.oi);
      const q = QUESTIONS.find(x => x.id === qId);
      const card = document.getElementById('inline-q-' + qId);
      const btns = card.querySelectorAll('.option-btn');
      btns.forEach(b => b.disabled = true);
      const correct = oIdx === q.ans;
      btns[oIdx].classList.add(correct ? 'correct' : 'wrong');
      if (!correct) btns[q.ans].classList.add('correct');
      const fb = document.getElementById('ifb-' + qId);
      fb.style.display = 'block';
      fb.className = 'feedback ' + (correct ? 'correct' : 'wrong');
      fb.innerHTML = (correct ? '✅ 正确！' : '❌ 错误') + `<div class="explanation">💡 ${q.exp}</div>`;
      recordAnswer(q.subject, correct);
    });
  });
}

// ===== Quiz Page =====
function renderQuizPage() {
  const sel = document.getElementById('quiz-subject-select');
  // Populate options once
  if (sel.options.length <= 1) {
    SUBJECTS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.icon + ' ' + s.name;
      sel.appendChild(opt);
    });
  }
  document.getElementById('quiz-container').classList.add('hidden');
  document.getElementById('quiz-result').classList.add('hidden');
  document.getElementById('quiz-selector').classList.remove('hidden');
}

function startQuiz() {
  const subjectId = document.getElementById('quiz-subject-select').value;
  const count = parseInt(document.getElementById('quiz-count-select').value);

  let pool = subjectId === 'all' ? [...QUESTIONS] : QUESTIONS.filter(q => q.subject === subjectId);
  pool = shuffle(pool).slice(0, count);

  state.quizQuestions = pool;
  state.quizIndex = 0;
  state.quizCorrect = 0;
  state.quizAnswered = false;

  document.getElementById('quiz-selector').classList.add('hidden');
  document.getElementById('quiz-result').classList.add('hidden');
  document.getElementById('quiz-container').classList.remove('hidden');

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const container = document.getElementById('quiz-container');
  const q = state.quizQuestions[state.quizIndex];
  const total = state.quizQuestions.length;
  const current = state.quizIndex + 1;
  const subject = SUBJECTS.find(s => s.id === q.subject);
  const pct = Math.round(((current - 1) / total) * 100);

  container.innerHTML = `
    <div class="quiz-progress-info">
      <span>${subject.icon} ${subject.name}</span>
      <span>${current} / ${total}</span>
    </div>
    <div class="quiz-bar-wrap"><div class="quiz-bar-fill" style="width:${pct}%"></div></div>
    <div class="quiz-card">
      <div class="q-text">${q.q}</div>
      <ul class="options-list" id="quiz-opts" style="margin-top:14px"></ul>
      <div id="quiz-feedback" style="display:none" class="feedback"></div>
      <button class="btn btn-primary quiz-next-btn hidden" id="quiz-next">
        ${current < total ? '下一题 →' : '查看结果 🎉'}
      </button>
    </div>
  `;

  const opts = document.getElementById('quiz-opts');
  q.opts.forEach((opt, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleQuizAnswer(q, i));
    li.appendChild(btn);
    opts.appendChild(li);
  });

  document.getElementById('quiz-next').addEventListener('click', () => {
    state.quizIndex++;
    if (state.quizIndex < state.quizQuestions.length) renderQuizQuestion();
    else showQuizResult();
  });
}

function handleQuizAnswer(q, chosen) {
  const btns = document.querySelectorAll('#quiz-opts .option-btn');
  btns.forEach(b => b.disabled = true);
  const correct = chosen === q.ans;
  btns[chosen].classList.add(correct ? 'correct' : 'wrong');
  if (!correct) btns[q.ans].classList.add('correct');

  const fb = document.getElementById('quiz-feedback');
  fb.style.display = 'block';
  fb.className = 'feedback ' + (correct ? 'correct' : 'wrong');
  fb.innerHTML = (correct ? '✅ 回答正确！' : '❌ 回答错误') + `<div class="explanation">💡 ${q.exp}</div>`;

  document.getElementById('quiz-next').classList.remove('hidden');
  if (correct) state.quizCorrect++;
  recordAnswer(q.subject, correct);
}

function showQuizResult() {
  document.getElementById('quiz-container').classList.add('hidden');
  const result = document.getElementById('quiz-result');
  result.classList.remove('hidden');
  const total = state.quizQuestions.length;
  const correct = state.quizCorrect;
  const wrong = total - correct;
  const pct = Math.round((correct / total) * 100);

  let emoji = pct >= 90 ? '🏆' : pct >= 70 ? '😊' : pct >= 50 ? '🙂' : '📖';
  let msg = pct >= 90 ? '太棒了！' : pct >= 70 ? '不错哦！' : pct >= 50 ? '继续努力！' : '多加练习吧！';

  result.innerHTML = `
    <div style="font-size:3rem;margin-bottom:8px">${emoji}</div>
    <div class="result-score">${pct}%</div>
    <div class="result-label">${msg}</div>
    <div class="result-breakdown">
      <div class="result-stat correct"><strong>${correct}</strong><span>答对</span></div>
      <div class="result-stat"><strong>${total}</strong><span>总题数</span></div>
      <div class="result-stat wrong"><strong>${wrong}</strong><span>答错</span></div>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-primary" id="retry-quiz">再来一次</button>
      <button class="btn btn-outline" id="back-to-subjects-btn">去学习</button>
    </div>
  `;

  document.getElementById('retry-quiz').addEventListener('click', () => {
    document.getElementById('quiz-result').classList.add('hidden');
    document.getElementById('quiz-selector').classList.remove('hidden');
  });
  document.getElementById('back-to-subjects-btn').addEventListener('click', () => navigate('subjects'));
}

// ===== Progress Page =====
function renderProgress() {
  const overview = document.getElementById('progress-overview');
  const totalAnswered = Object.values(state.progress).reduce((s, p) => s + p.answered, 0);
  const totalCorrect  = Object.values(state.progress).reduce((s, p) => s + p.correct,  0);
  const accuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  overview.innerHTML = `
    <div class="overview-card"><div class="overview-num">${state.score}</div><div class="overview-label">总积分</div></div>
    <div class="overview-card"><div class="overview-num">${totalAnswered}</div><div class="overview-label">已答题目</div></div>
    <div class="overview-card"><div class="overview-num">${totalCorrect}</div><div class="overview-label">答对题目</div></div>
    <div class="overview-card"><div class="overview-num">${accuracy}%</div><div class="overview-label">正确率</div></div>
    <div class="overview-card"><div class="overview-num">${state.streak}</div><div class="overview-label">连续天数</div></div>
  `;

  const list = document.getElementById('subject-progress-list');
  list.innerHTML = '';
  SUBJECTS.forEach(s => {
    const prog = getSubjectProgress(s.id);
    const total = QUESTIONS.filter(q => q.subject === s.id).length;
    const pct = total ? Math.round((prog.correct / total) * 100) : 0;
    const item = document.createElement('div');
    item.className = 'sp-item';
    item.innerHTML = `
      <div class="sp-row">
        <span class="sp-icon">${s.icon}</span>
        <span class="sp-name">${s.name}</span>
        <span class="sp-pct">${prog.correct || 0} / ${total}（${pct}%）</span>
      </div>
      <div class="sp-bar-wrap">
        <div class="sp-bar-fill" style="width:${pct}%;background:${s.color}"></div>
      </div>
    `;
    list.appendChild(item);
  });
}

// ===== Utilities =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== Event Bindings =====
function bindEvents() {
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Back buttons
  document.getElementById('back-from-detail').addEventListener('click', () => navigate('subjects'));

  // Quiz start
  document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
}

// ===== Boot =====
loadState();
bindEvents();
updateHeaderStats();
navigate('home');
