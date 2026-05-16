(() => {
    'use strict';

    const STORAGE_KEY = 'study-reminder-state-v1';
    const RING_CIRCUMFERENCE = 2 * Math.PI * 90;

    const MODES = {
        focus: { label: '专注时段', durationKey: 'focusDuration', ringClass: '' },
        shortBreak: { label: '短休息', durationKey: 'shortBreakDuration', ringClass: 'break' },
        longBreak: { label: '长休息', durationKey: 'longBreakDuration', ringClass: 'break' },
    };

    const el = {
        timeDisplay: document.getElementById('timeDisplay'),
        modeLabel: document.getElementById('modeLabel'),
        ringFg: document.querySelector('.ring-fg'),
        timerDisplay: document.querySelector('.timer-display'),
        tabs: document.querySelectorAll('.tab'),
        subject: document.getElementById('subject'),
        startBtn: document.getElementById('startBtn'),
        pauseBtn: document.getElementById('pauseBtn'),
        resetBtn: document.getElementById('resetBtn'),
        roundCount: document.getElementById('roundCount'),
        completedCount: document.getElementById('completedCount'),
        focusDuration: document.getElementById('focusDuration'),
        shortBreakDuration: document.getElementById('shortBreakDuration'),
        longBreakDuration: document.getElementById('longBreakDuration'),
        roundsBeforeLongBreak: document.getElementById('roundsBeforeLongBreak'),
        autoStart: document.getElementById('autoStart'),
        soundEnabled: document.getElementById('soundEnabled'),
        notifyEnabled: document.getElementById('notifyEnabled'),
        totalMinutes: document.getElementById('totalMinutes'),
        totalSessions: document.getElementById('totalSessions'),
        historyList: document.getElementById('historyList'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        toast: document.getElementById('toast'),
    };

    const state = {
        mode: 'focus',
        remaining: 25 * 60,
        totalForMode: 25 * 60,
        running: false,
        intervalId: null,
        round: 1,
        completedFocus: 0,
        history: [],
        today: todayKey(),
        settings: {
            focusDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            roundsBeforeLongBreak: 4,
            autoStart: true,
            soundEnabled: true,
            notifyEnabled: true,
        },
    };

    el.ringFg.style.strokeDasharray = RING_CIRCUMFERENCE;

    function todayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved.settings) Object.assign(state.settings, saved.settings);
            if (saved.today === state.today) {
                state.round = saved.round || 1;
                state.completedFocus = saved.completedFocus || 0;
                state.history = saved.history || [];
            }
        } catch (e) {
            console.warn('加载状态失败', e);
        }
    }

    function saveState() {
        const payload = {
            settings: state.settings,
            today: state.today,
            round: state.round,
            completedFocus: state.completedFocus,
            history: state.history,
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.warn('保存状态失败', e);
        }
    }

    function applySettingsToInputs() {
        el.focusDuration.value = state.settings.focusDuration;
        el.shortBreakDuration.value = state.settings.shortBreakDuration;
        el.longBreakDuration.value = state.settings.longBreakDuration;
        el.roundsBeforeLongBreak.value = state.settings.roundsBeforeLongBreak;
        el.autoStart.checked = state.settings.autoStart;
        el.soundEnabled.checked = state.settings.soundEnabled;
        el.notifyEnabled.checked = state.settings.notifyEnabled;
    }

    function getDuration(mode) {
        return state.settings[MODES[mode].durationKey] * 60;
    }

    function switchMode(mode, { announce = true } = {}) {
        stopTimer();
        state.mode = mode;
        state.totalForMode = getDuration(mode);
        state.remaining = state.totalForMode;
        el.tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
        el.modeLabel.textContent = MODES[mode].label;
        el.ringFg.classList.toggle('break', !!MODES[mode].ringClass);
        render();
        if (announce) toast(`已切换到「${MODES[mode].label}」`);
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function render() {
        el.timeDisplay.textContent = formatTime(state.remaining);
        const progress = state.totalForMode > 0 ? state.remaining / state.totalForMode : 0;
        el.ringFg.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
        el.roundCount.textContent = state.round;
        el.completedCount.textContent = state.completedFocus;
        renderHistory();
        document.title = state.running ? `${formatTime(state.remaining)} · ${MODES[state.mode].label}` : '学习时间提醒';
    }

    function renderHistory() {
        const focusEntries = state.history.filter(h => h.mode === 'focus');
        const totalMin = focusEntries.reduce((sum, h) => sum + h.minutes, 0);
        el.totalMinutes.textContent = totalMin;
        el.totalSessions.textContent = focusEntries.length;

        if (state.history.length === 0) {
            el.historyList.innerHTML = '<li class="empty">今天还没有学习记录，开始第一个专注时段吧！</li>';
            return;
        }
        el.historyList.innerHTML = state.history.slice().reverse().map(h => {
            const time = new Date(h.endedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const icon = h.mode === 'focus' ? '📖' : '☕';
            const subject = h.subject ? ` · ${escapeHtml(h.subject)}` : '';
            return `<li>
                <span>${icon} ${MODES[h.mode].label} ${h.minutes} 分钟${subject}</span>
                <span class="history-time">${time}</span>
            </li>`;
        }).join('');
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    function startTimer() {
        if (state.running) return;
        state.running = true;
        el.startBtn.disabled = true;
        el.pauseBtn.disabled = false;
        el.timerDisplay.classList.add('running');
        el.timerDisplay.classList.remove('paused');

        const endAt = Date.now() + state.remaining * 1000;
        state.intervalId = setInterval(() => {
            const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
            state.remaining = left;
            render();
            if (left <= 0) handleSessionEnd();
        }, 250);
        render();
    }

    function pauseTimer() {
        if (!state.running) return;
        stopTimer();
        el.timerDisplay.classList.add('paused');
        toast('已暂停');
    }

    function stopTimer() {
        state.running = false;
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }
        el.startBtn.disabled = false;
        el.pauseBtn.disabled = true;
        el.timerDisplay.classList.remove('running');
    }

    function resetTimer() {
        stopTimer();
        state.remaining = state.totalForMode;
        el.timerDisplay.classList.remove('paused');
        render();
    }

    function handleSessionEnd() {
        stopTimer();
        const finishedMode = state.mode;
        const minutes = state.settings[MODES[finishedMode].durationKey];
        const subject = el.subject.value.trim();
        state.history.push({
            mode: finishedMode,
            minutes,
            subject: finishedMode === 'focus' ? subject : '',
            endedAt: Date.now(),
        });

        let nextMode;
        let message;
        if (finishedMode === 'focus') {
            state.completedFocus += 1;
            const useLong = state.completedFocus % state.settings.roundsBeforeLongBreak === 0;
            nextMode = useLong ? 'longBreak' : 'shortBreak';
            message = `🎉 完成 ${minutes} 分钟专注！该${useLong ? '长' : '短'}休息了～`;
        } else {
            state.round += 1;
            nextMode = 'focus';
            message = '⏰ 休息结束，准备下一轮专注！';
        }

        notifyUser(message);
        playChime(finishedMode === 'focus');
        saveState();
        switchMode(nextMode, { announce: false });

        if (state.settings.autoStart) {
            setTimeout(() => startTimer(), 600);
        }
    }

    function notifyUser(message) {
        toast(message);
        if (state.settings.notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('学习时间提醒', { body: message, icon: '' });
            } catch (e) { /* ignore */ }
        }
    }

    let toastTimer = null;
    function toast(message) {
        el.toast.textContent = message;
        el.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.toast.classList.remove('show'), 3200);
    }

    let audioCtx = null;
    function playChime(isFocusEnd) {
        if (!state.settings.soundEnabled) return;
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            const ctx = audioCtx;
            const notes = isFocusEnd ? [523.25, 659.25, 783.99] : [659.25, 523.25];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
                gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.2 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.45);
                osc.connect(gain).connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.2);
                osc.stop(ctx.currentTime + i * 0.2 + 0.5);
            });
        } catch (e) { /* ignore */ }
    }

    function requestNotificationPermission() {
        if (!state.settings.notifyEnabled) return;
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }

    // Event listeners
    el.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (state.running) {
                if (!confirm('计时器正在运行，确认要切换模式吗？')) return;
            }
            switchMode(tab.dataset.mode);
        });
    });

    el.startBtn.addEventListener('click', () => {
        requestNotificationPermission();
        startTimer();
    });

    el.pauseBtn.addEventListener('click', pauseTimer);
    el.resetBtn.addEventListener('click', resetTimer);

    [el.focusDuration, el.shortBreakDuration, el.longBreakDuration, el.roundsBeforeLongBreak].forEach(input => {
        input.addEventListener('change', () => {
            const v = parseInt(input.value, 10);
            const min = parseInt(input.min, 10);
            const max = parseInt(input.max, 10);
            if (isNaN(v) || v < min) input.value = min;
            if (v > max) input.value = max;
            const key = input.id;
            state.settings[key] = parseInt(input.value, 10);
            if ((key === 'focusDuration' && state.mode === 'focus') ||
                (key === 'shortBreakDuration' && state.mode === 'shortBreak') ||
                (key === 'longBreakDuration' && state.mode === 'longBreak')) {
                if (!state.running) {
                    state.totalForMode = getDuration(state.mode);
                    state.remaining = state.totalForMode;
                    render();
                }
            }
            saveState();
        });
    });

    [el.autoStart, el.soundEnabled, el.notifyEnabled].forEach(input => {
        input.addEventListener('change', () => {
            state.settings[input.id] = input.checked;
            if (input.id === 'notifyEnabled' && input.checked) {
                requestNotificationPermission();
            }
            saveState();
        });
    });

    el.clearHistoryBtn.addEventListener('click', () => {
        if (!confirm('确认清空今日学习记录？')) return;
        state.history = [];
        state.completedFocus = 0;
        state.round = 1;
        saveState();
        render();
        toast('今日记录已清空');
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') {
            e.preventDefault();
            state.running ? pauseTimer() : startTimer();
        } else if (e.key === 'r' || e.key === 'R') {
            resetTimer();
        }
    });

    window.addEventListener('beforeunload', (e) => {
        if (state.running) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Init
    loadState();
    applySettingsToInputs();
    switchMode('focus', { announce: false });
    render();
})();
