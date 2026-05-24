// ===== 数据存储 =====
const STORAGE_KEY = 'kidStudyReminder_v1';

const defaultData = {
  nickname: '小朋友',
  tasks: [],
  doneToday: {},
  stars: 0,
  pomodoros: 0,
  pomodorosToday: 0,
  lastPomodoroDate: '',
  studyDays: [],
  enableNotify: false,
  enableSound: true,
  unlockedBadges: [],
  dailyHistory: {},
};

let data = loadData();

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    return { ...defaultData, ...JSON.parse(raw) };
  } catch (e) {
    return { ...defaultData };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== 日期工具 =====
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d = new Date()) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${weekdays[d.getDay()]}`;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ===== 励志语录 =====
const quotes = [
  '📖 今天的努力,是明天的实力!',
  '🌱 每天进步一点点,棒棒哒!',
  '⭐ 你比想象中更优秀!',
  '🚀 学习是一场冒险,加油!',
  '🌈 坚持就会有彩虹!',
  '💡 好好学习,天天向上!',
  '🦁 勇敢的小狮子,加油吧!',
  '🌟 你今天也很棒哦!',
  '🍎 一份耕耘,一份收获!',
  '🎈 学习让你越来越聪明!',
];

// ===== 页面切换 =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('page-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'reward') renderWeekStats();
  });
});

// ===== 渲染:今日页面 =====
function renderToday() {
  document.getElementById('currentDate').textContent = formatDate();
  document.getElementById('dailyQuote').textContent = quotes[new Date().getDate() % quotes.length];

  const greet = `${data.nickname},${greetingByTime()}`;
  document.getElementById('greeting').textContent = greet;
  document.getElementById('totalStars').textContent = data.stars;

  const list = document.getElementById('todayTasks');
  list.innerHTML = '';
  const today = todayKey();
  const doneMap = data.doneToday[today] || {};

  if (data.tasks.length === 0) {
    list.innerHTML = '<p class="empty-tip">还没有添加任务哦,去"我的计划"添加吧!</p>';
    document.getElementById('progressText').textContent = '0 / 0 完成';
    document.getElementById('progressFill').style.width = '0%';
    return;
  }

  const sorted = [...data.tasks].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  let done = 0;
  sorted.forEach(task => {
    const isDone = doneMap[task.id];
    if (isDone) done++;
    const item = document.createElement('div');
    item.className = 'task-item' + (isDone ? ' done' : '');
    item.innerHTML = `
      <div class="task-info">
        <span class="task-subject">${escapeHtml(task.subject)}</span>
        <span class="task-meta">⏰ ${task.time} · ⏱️ ${task.duration} 分钟</span>
      </div>
      <div class="task-actions">
        <button data-action="toggle" data-id="${task.id}" title="完成">${isDone ? '↩️' : '✅'}</button>
        <button data-action="delete" data-id="${task.id}" title="删除">🗑️</button>
      </div>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      const action = e.currentTarget.dataset.action;
      if (action === 'toggle') toggleDone(id);
      if (action === 'delete') deleteTask(id);
    });
  });

  document.getElementById('progressText').textContent = `${done} / ${sorted.length} 完成`;
  document.getElementById('progressFill').style.width = `${(done / sorted.length) * 100}%`;

  renderNextReminder();
}

function greetingByTime() {
  const h = new Date().getHours();
  if (h < 6) return '深夜了,早点休息哦 🌙';
  if (h < 12) return '早上好,今天也要加油呀!☀️';
  if (h < 14) return '中午好,记得吃午饭 🍚';
  if (h < 18) return '下午好,放学了吗?📚';
  if (h < 21) return '晚上好,今天学习了吗?✨';
  return '该准备睡觉啦 🌙';
}

function renderNextReminder() {
  const card = document.getElementById('nextReminderCard');
  const now = nowMinutes();
  const today = todayKey();
  const doneMap = data.doneToday[today] || {};
  const upcoming = data.tasks
    .filter(t => !doneMap[t.id] && timeToMinutes(t.time) > now)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))[0];

  if (!upcoming) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';
  document.getElementById('nextReminderText').textContent =
    `${upcoming.time} - ${upcoming.subject}(${upcoming.duration} 分钟)`;

  const diff = timeToMinutes(upcoming.time) - now;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  document.getElementById('countdownText').textContent =
    `还有 ${h > 0 ? h + ' 小时 ' : ''}${m} 分钟 ⏳`;
}

// ===== 任务操作 =====
function toggleDone(id) {
  const today = todayKey();
  if (!data.doneToday[today]) data.doneToday[today] = {};
  if (data.doneToday[today][id]) {
    delete data.doneToday[today][id];
  } else {
    data.doneToday[today][id] = true;
    addStars(2);
    markStudyDay();
    playDing();
    showCelebration('真棒!', '完成任务,获得 ⭐⭐ 2 颗星星!');
  }
  recordDailyHistory();
  saveData();
  renderToday();
  renderRewards();
}

function deleteTask(id) {
  if (!confirm('确定要删除这个任务吗?')) return;
  data.tasks = data.tasks.filter(t => t.id !== id);
  saveData();
  renderToday();
  renderPlan();
}

function addStars(n) {
  data.stars += n;
  saveData();
}

function markStudyDay() {
  const today = todayKey();
  if (!data.studyDays.includes(today)) {
    data.studyDays.push(today);
  }
}

function recordDailyHistory() {
  const today = todayKey();
  const doneMap = data.doneToday[today] || {};
  const doneCount = Object.keys(doneMap).length;
  data.dailyHistory[today] = {
    tasksCompleted: doneCount,
    pomodoros: today === data.lastPomodoroDate ? data.pomodorosToday : (data.dailyHistory[today]?.pomodoros || 0),
  };
}

// ===== 渲染:计划页面 =====
function renderPlan() {
  const list = document.getElementById('planList');
  list.innerHTML = '';
  if (data.tasks.length === 0) {
    list.innerHTML = '<p class="empty-tip">还没有计划,快来添加吧!</p>';
    return;
  }
  const sorted = [...data.tasks].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  sorted.forEach(task => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.innerHTML = `
      <div class="task-info">
        <span class="task-subject">${escapeHtml(task.subject)}</span>
        <span class="task-meta">⏰ ${task.time} · ⏱️ ${task.duration} 分钟</span>
      </div>
      <div class="task-actions">
        <button data-action="delete" data-id="${task.id}" title="删除">🗑️</button>
      </div>
    `;
    list.appendChild(item);
  });
  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => deleteTask(e.currentTarget.dataset.id));
  });
}

document.getElementById('addTaskForm').addEventListener('submit', e => {
  e.preventDefault();
  const subject = document.getElementById('taskSubject').value.trim();
  const time = document.getElementById('taskTime').value;
  const duration = parseInt(document.getElementById('taskDuration').value, 10);
  if (!subject || !time || !duration) return;
  data.tasks.push({
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    subject,
    time,
    duration,
  });
  saveData();
  document.getElementById('addTaskForm').reset();
  document.getElementById('taskDuration').value = 30;
  renderPlan();
  renderToday();
});

document.getElementById('loadSuggestion').addEventListener('click', () => {
  if (!confirm('这会添加推荐的 5 个学习任务到你的计划中,确定吗?')) return;
  const suggestions = [
    { subject: '语文作业 📖', time: '17:00', duration: 30 },
    { subject: '数学作业 ➕', time: '17:30', duration: 30 },
    { subject: '英语阅读 🌍', time: '19:00', duration: 20 },
    { subject: '课外阅读 📚', time: '19:30', duration: 30 },
    { subject: '整理书包 🎒', time: '20:00', duration: 10 },
  ];
  suggestions.forEach(s => {
    data.tasks.push({
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      ...s,
    });
  });
  saveData();
  renderPlan();
  renderToday();
  showCelebration('已加载推荐计划!', '一起努力学习吧~ 💪');
});

// ===== 番茄钟 =====
let timerInterval = null;
let timerSeconds = 25 * 60;
let isBreak = false;
let isRunning = false;

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  document.getElementById('timerDisplay').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.title = isRunning
    ? `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} - ${isBreak ? '休息中' : '专注中'}`
    : '🌈 小小学习管家';
}

function setTimerMode(breakMode) {
  isBreak = breakMode;
  const focus = parseInt(document.getElementById('focusMinutes').value, 10) || 25;
  const breakM = parseInt(document.getElementById('breakMinutes').value, 10) || 5;
  timerSeconds = (breakMode ? breakM : focus) * 60;
  document.getElementById('timerMode').textContent = breakMode ? '☕ 休息时间' : '📚 专注学习时间';
  document.getElementById('timerStatus').textContent = breakMode
    ? '放松一下,喝口水,看看远方 👀'
    : '点击开始,开启你的专注之旅 🚀';
  updateTimerDisplay();
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  document.getElementById('btnStart').disabled = true;
  document.getElementById('btnPause').disabled = false;
  document.getElementById('timerStatus').textContent = isBreak
    ? '休息一下,补充能量~ 🍵'
    : '专心一点点,你能做到!💪';

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      finishTimer();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnPause').disabled = true;
  document.getElementById('timerStatus').textContent = '⏸️ 已暂停,点击开始继续';
}

function resetTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  setTimerMode(false);
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnPause').disabled = true;
}

function finishTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  playDing();

  if (!isBreak) {
    // 完成专注
    const today = todayKey();
    if (data.lastPomodoroDate !== today) {
      data.lastPomodoroDate = today;
      data.pomodorosToday = 0;
    }
    data.pomodorosToday++;
    data.pomodoros++;
    addStars(5);
    markStudyDay();
    recordDailyHistory();
    saveData();

    notify('🍅 番茄完成!', '太棒了!获得 ⭐⭐⭐⭐⭐ 5 颗星星,休息一下吧!');
    showCelebration('🎉 完成一个番茄!', `获得 5 颗星星 ⭐\n累计完成 ${data.pomodoros} 个番茄!`);

    setTimerMode(true);
    renderToday();
    renderRewards();
  } else {
    // 完成休息
    notify('☕ 休息结束', '准备好继续学习了吗?');
    showCelebration('休息结束', '准备好再次专注了吗?💪');
    setTimerMode(false);
  }

  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnPause').disabled = true;
  document.getElementById('pomodoroCount').textContent = data.pomodorosToday;
}

document.getElementById('btnStart').addEventListener('click', startTimer);
document.getElementById('btnPause').addEventListener('click', pauseTimer);
document.getElementById('btnReset').addEventListener('click', resetTimer);

document.getElementById('focusMinutes').addEventListener('change', () => {
  if (!isRunning && !isBreak) setTimerMode(false);
});
document.getElementById('breakMinutes').addEventListener('change', () => {
  if (!isRunning && isBreak) setTimerMode(true);
});

// ===== 渲染:奖励页面 =====
const BADGES = {
  first: () => data.pomodoros >= 1,
  five: () => data.pomodoros >= 5,
  ten: () => data.pomodoros >= 10,
  streak3: () => calcStreak() >= 3,
  streak7: () => calcStreak() >= 7,
  stars50: () => data.stars >= 50,
};

function calcStreak() {
  if (data.studyDays.length === 0) return 0;
  const sorted = [...data.studyDays].sort();
  let streak = 1;
  const today = new Date();
  const last = new Date(sorted[sorted.length - 1]);
  // 必须包含今天或昨天才算连续
  const diffToday = Math.floor((today - last) / 86400000);
  if (diffToday > 1) return 0;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const cur = new Date(sorted[i]);
    const next = new Date(sorted[i + 1]);
    const diff = Math.floor((next - cur) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function renderRewards() {
  document.getElementById('totalStarsBig').textContent = data.stars;
  document.getElementById('totalDays').textContent = data.studyDays.length;
  document.getElementById('totalPomodoros').textContent = data.pomodoros;
  document.getElementById('streakDays').textContent = calcStreak();

  document.querySelectorAll('.badge').forEach(badge => {
    const key = badge.dataset.badge;
    const unlocked = BADGES[key]?.();
    if (unlocked) {
      badge.classList.remove('locked');
      badge.classList.add('unlocked');
      if (!data.unlockedBadges.includes(key)) {
        data.unlockedBadges.push(key);
        saveData();
        setTimeout(() => {
          showCelebration('🎖️ 获得新勋章!', badge.querySelector('.badge-name').textContent);
        }, 500);
      }
    } else {
      badge.classList.add('locked');
      badge.classList.remove('unlocked');
    }
  });
}

function renderWeekStats() {
  const container = document.getElementById('weekStats');
  container.innerHTML = '';
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const history = data.dailyHistory[key] || {};
    const tasks = history.tasksCompleted || 0;
    const pomos = history.pomodoros || 0;
    const total = tasks + pomos;
    days.push({ d, total, key });
  }
  const max = Math.max(1, ...days.map(d => d.total));
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  days.forEach(({ d, total }) => {
    const bar = document.createElement('div');
    bar.className = 'day-bar';
    const height = (total / max) * 130 + 4;
    bar.innerHTML = `
      <div style="flex:1;display:flex;align-items:flex-end;width:100%;justify-content:center;">
        <div class="bar" style="height:${height}px;">
          ${total > 0 ? `<span class="bar-value">${total}</span>` : ''}
        </div>
      </div>
      <div class="day-label">${weekdays[d.getDay()]}<br/>${d.getMonth() + 1}/${d.getDate()}</div>
    `;
    container.appendChild(bar);
  });
}

// ===== 设置 =====
document.getElementById('nicknameInput').value = data.nickname;
document.getElementById('enableNotify').checked = data.enableNotify;
document.getElementById('enableSound').checked = data.enableSound;

document.getElementById('saveNickname').addEventListener('click', () => {
  const name = document.getElementById('nicknameInput').value.trim() || '小朋友';
  data.nickname = name;
  saveData();
  renderToday();
  showCelebration('保存成功!', `你好,${name}!`);
});

document.getElementById('enableNotify').addEventListener('change', async e => {
  if (e.target.checked) {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        e.target.checked = false;
        alert('需要允许通知权限才能使用哦!');
        return;
      }
    } else {
      e.target.checked = false;
      alert('你的浏览器不支持通知功能');
      return;
    }
  }
  data.enableNotify = e.target.checked;
  saveData();
});

document.getElementById('enableSound').addEventListener('change', e => {
  data.enableSound = e.target.checked;
  saveData();
});

document.getElementById('clearAllData').addEventListener('click', () => {
  if (!confirm('确定要清空所有数据吗?这个操作无法恢复哦!')) return;
  if (!confirm('真的真的要清空吗?')) return;
  localStorage.removeItem(STORAGE_KEY);
  data = { ...defaultData };
  saveData();
  renderToday();
  renderPlan();
  renderRewards();
  showCelebration('已清空', '所有数据已重置~');
});

// ===== 通知和声音 =====
function notify(title, body) {
  if (data.enableNotify && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '' });
  }
}

function playDing() {
  if (!data.enableSound) return;
  // 使用 Web Audio API 生成简单的提示音
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    o.type = 'sine';
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.5);
    // 第二个音
    setTimeout(() => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.value = 1320;
      o2.type = 'sine';
      g2.gain.setValueAtTime(0.3, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o2.start();
      o2.stop(ctx.currentTime + 0.5);
    }, 200);
  } catch (e) { /* ignore */ }
}

// ===== 庆祝弹窗 =====
function showCelebration(title, text) {
  document.getElementById('celebrationTitle').textContent = title;
  document.getElementById('celebrationText').textContent = text;
  document.getElementById('celebrationModal').style.display = 'flex';
}

document.getElementById('celebrationOk').addEventListener('click', () => {
  document.getElementById('celebrationModal').style.display = 'none';
});

document.getElementById('celebrationModal').addEventListener('click', e => {
  if (e.target.id === 'celebrationModal') {
    document.getElementById('celebrationModal').style.display = 'none';
  }
});

// ===== 学习提醒检查 =====
const notifiedTasks = new Set();

function checkReminders() {
  const now = nowMinutes();
  const today = todayKey();
  const doneMap = data.doneToday[today] || {};

  data.tasks.forEach(task => {
    const taskKey = `${today}_${task.id}`;
    const taskTime = timeToMinutes(task.time);
    // 提前 1 分钟提醒,且提醒一次
    if (
      !doneMap[task.id] &&
      !notifiedTasks.has(taskKey) &&
      now >= taskTime &&
      now < taskTime + 2
    ) {
      notifiedTasks.add(taskKey);
      playDing();
      notify('⏰ 学习时间到!', `${task.subject} - ${task.duration} 分钟`);
      showCelebration('⏰ 时间到!', `开始学习:${task.subject}(${task.duration} 分钟)`);
    }
  });
  renderNextReminder();
}

// ===== 辅助 =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== 启动 =====
function init() {
  setTimerMode(false);
  renderToday();
  renderPlan();
  renderRewards();
  renderWeekStats();
  document.getElementById('pomodoroCount').textContent =
    data.lastPomodoroDate === todayKey() ? data.pomodorosToday : 0;

  // 每 30 秒检查一次提醒和刷新倒计时
  setInterval(checkReminders, 30 * 1000);
  // 每分钟刷新今日页面
  setInterval(() => {
    if (document.getElementById('page-today').classList.contains('active')) {
      renderNextReminder();
    }
  }, 60 * 1000);
}

init();
