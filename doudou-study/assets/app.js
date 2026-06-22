/* 豆豆学习监督台 —— 纯前端,数据保存在浏览器 localStorage */
(function () {
  "use strict";

  const STORE_KEY = "doudou-study-v1";
  const DAILY_GOAL = 60; // 每日学习目标(分钟)

  const QUOTES = [
    "今天的努力,是明天的实力。",
    "字写得工整,作业才更漂亮。",
    "不懂就问,问就是进步。",
    "先复习再做题,效率更高哦。",
    "认真读题,一半的错就避免了。",
    "坚持每天阅读,词汇量悄悄长大。",
    "做完检查一遍,粗心也能改掉。",
    "劳逸结合,休息好才学得好。",
  ];

  const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const PLAN_SLOTS = ["放学后", "晚饭后", "睡前", "周末上午", "周末下午"];

  /* ---------- 数据层 ---------- */
  const defaultData = () => ({
    points: 0,
    streak: 0,
    lastCheckin: null,        // 'YYYY-MM-DD'
    tasks: [],                // {id,title,subject,points,done,date}
    focusLog: [],             // {id,minutes,subject,date,ts}
    mistakes: [],             // {id,subject,topic,content,note,resolved,date}
    rewards: [],              // {id,name,cost}
    pointLog: [],             // {id,text,delta,ts}
    plan: {},                 // key "slot|dayIndex" -> text
    totals: { tasksDone: 0, pomodoros: 0, minutes: 0 },
    minutesByDay: {},         // 'YYYY-MM-DD' -> minutes
    tasksDoneByDay: {},       // 'YYYY-MM-DD' -> count
  });

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultData();
      return Object.assign(defaultData(), JSON.parse(raw));
    } catch (e) {
      return defaultData();
    }
  }
  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  /* ---------- 工具 ---------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const todayStr = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (本地)
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function addPoints(delta, reason) {
    data.points += delta;
    if (data.points < 0) data.points = 0;
    data.pointLog.unshift({ id: uid(), text: reason, delta, ts: Date.now() });
    data.pointLog = data.pointLog.slice(0, 50);
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------- 导航 ---------- */
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      $$(".view").forEach((v) => v.classList.remove("active"));
      tab.classList.add("active");
      $("#view-" + tab.dataset.tab).classList.add("active");
      renderAll();
    });
  });

  /* ---------- 打卡 ---------- */
  $("#checkinBtn").addEventListener("click", () => {
    const today = todayStr();
    if (data.lastCheckin === today) {
      toast("今天已经打过卡啦 😊");
      return;
    }
    // 计算连续天数
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("sv-SE");
    data.streak = data.lastCheckin === yesterday ? data.streak + 1 : 1;
    data.lastCheckin = today;
    let bonus = 5;
    let msg = "打卡成功!+5⭐";
    if (data.streak > 0 && data.streak % 7 === 0) {
      bonus += 20;
      msg = `连续打卡 ${data.streak} 天!额外奖励 +20⭐`;
    }
    addPoints(bonus, `打卡(连续${data.streak}天)`);
    save();
    renderAll();
    toast(msg);
  });

  /* ---------- 鼓励按钮 ---------- */
  $$("[data-praise]").forEach((b) => {
    b.addEventListener("click", () => {
      $("#praiseFeedback").textContent = b.dataset.praise;
    });
  });

  /* ---------- 任务 ---------- */
  let taskFilter = "全部";
  $("#taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#taskTitle").value.trim();
    if (!title) return;
    data.tasks.unshift({
      id: uid(),
      title,
      subject: $("#taskSubject").value,
      points: parseInt($("#taskPoints").value, 10),
      done: false,
      date: todayStr(),
    });
    $("#taskTitle").value = "";
    save();
    renderTasks();
    renderDashboard();
    toast("任务已添加 ✏️");
  });

  $("#subjectFilter").addEventListener("click", (e) => {
    if (!e.target.dataset.filter) return;
    taskFilter = e.target.dataset.filter;
    $$("#subjectFilter .chip-btn").forEach((c) => c.classList.toggle("active", c === e.target));
    renderTasks();
  });

  function toggleTask(id) {
    const t = data.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    const today = todayStr();
    if (t.done) {
      addPoints(t.points, `完成任务:${t.title}`);
      data.totals.tasksDone++;
      data.tasksDoneByDay[today] = (data.tasksDoneByDay[today] || 0) + 1;
      toast(`完成任务 +${t.points}⭐ 棒!`);
    } else {
      addPoints(-t.points, `撤销任务:${t.title}`);
      data.totals.tasksDone = Math.max(0, data.totals.tasksDone - 1);
      data.tasksDoneByDay[today] = Math.max(0, (data.tasksDoneByDay[today] || 0) - 1);
    }
    save();
    renderAll();
  }
  function delTask(id) {
    data.tasks = data.tasks.filter((x) => x.id !== id);
    save();
    renderTasks();
    renderDashboard();
  }

  function renderTasks() {
    const list = $("#taskList");
    const items = data.tasks.filter((t) => taskFilter === "全部" || t.subject === taskFilter);
    $("#taskEmpty").style.display = items.length ? "none" : "block";
    list.innerHTML = items
      .map(
        (t) => `
      <li class="task-item ${t.done ? "completed" : ""}">
        <div class="task-check ${t.done ? "done" : ""}" data-toggle="${t.id}">${t.done ? "✓" : ""}</div>
        <div class="task-main">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            <span class="subject-tag s-${t.subject}">${t.subject}</span>
            <span>⭐ ${t.points} 分</span>
            <span>${t.date === todayStr() ? "今天" : t.date}</span>
          </div>
        </div>
        <button class="del-btn" data-del="${t.id}" title="删除">🗑</button>
      </li>`
      )
      .join("");
    list.querySelectorAll("[data-toggle]").forEach((el) =>
      el.addEventListener("click", () => toggleTask(el.dataset.toggle))
    );
    list.querySelectorAll("[data-del]").forEach((el) =>
      el.addEventListener("click", () => delTask(el.dataset.del))
    );
  }

  /* ---------- 番茄钟 ---------- */
  let timer = { remaining: 25 * 60, total: 25 * 60, running: false, interval: null };

  function fmt(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }
  function paintTimer() {
    $("#timerDisplay").textContent = fmt(timer.remaining);
  }
  $$("#view-focus [data-min]").forEach((b) => {
    b.addEventListener("click", () => {
      if (timer.running) return;
      $$("#view-focus [data-min]").forEach((x) => x.classList.toggle("active", x === b));
      timer.total = parseInt(b.dataset.min, 10) * 60;
      timer.remaining = timer.total;
      paintTimer();
    });
  });
  $("#startTimer").addEventListener("click", () => {
    if (timer.running) return;
    timer.running = true;
    $("#startTimer").disabled = true;
    $("#pauseTimer").disabled = false;
    timer.interval = setInterval(() => {
      timer.remaining--;
      paintTimer();
      if (timer.remaining <= 0) finishPomodoro();
    }, 1000);
  });
  $("#pauseTimer").addEventListener("click", () => {
    timer.running = false;
    clearInterval(timer.interval);
    $("#startTimer").disabled = false;
    $("#pauseTimer").disabled = true;
  });
  $("#resetTimer").addEventListener("click", () => {
    timer.running = false;
    clearInterval(timer.interval);
    timer.remaining = timer.total;
    $("#startTimer").disabled = false;
    $("#pauseTimer").disabled = true;
    paintTimer();
  });

  function finishPomodoro() {
    clearInterval(timer.interval);
    timer.running = false;
    $("#startTimer").disabled = false;
    $("#pauseTimer").disabled = true;
    const minutes = Math.round(timer.total / 60);
    const today = todayStr();
    const subject = $("#focusSubject").value.trim() || "自习";
    data.focusLog.unshift({ id: uid(), minutes, subject, date: today, ts: Date.now() });
    data.totals.pomodoros++;
    data.totals.minutes += minutes;
    data.minutesByDay[today] = (data.minutesByDay[today] || 0) + minutes;
    addPoints(8, `完成 ${minutes} 分钟番茄钟`);
    timer.remaining = timer.total;
    save();
    paintTimer();
    renderAll();
    toast(`专注完成 ${minutes} 分钟,+8⭐!休息一下吧 ☕`);
  }

  function renderFocus() {
    const today = todayStr();
    const items = data.focusLog.filter((f) => f.date === today);
    $("#focusEmpty").style.display = items.length ? "none" : "block";
    $("#focusLog").innerHTML = items
      .map(
        (f) => `<li><span>${escapeHtml(f.subject)} · ${f.minutes} 分钟</span>
          <span class="muted">${new Date(f.ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span></li>`
      )
      .join("");
  }

  /* ---------- 周计划 ---------- */
  function renderPlan() {
    const t = $("#planTable");
    let html = "<tr><th>时段</th>" + WEEK_DAYS.map((d) => `<th>${d}</th>`).join("") + "</tr>";
    PLAN_SLOTS.forEach((slot) => {
      html += `<tr><td class="plan-time">${slot}</td>`;
      WEEK_DAYS.forEach((_, di) => {
        const key = `${slot}|${di}`;
        html += `<td><textarea class="plan-cell" data-key="${key}" placeholder="—">${escapeHtml(data.plan[key] || "")}</textarea></td>`;
      });
      html += "</tr>";
    });
    t.innerHTML = html;
    t.querySelectorAll(".plan-cell").forEach((cell) => {
      cell.addEventListener("change", () => {
        data.plan[cell.dataset.key] = cell.value.trim();
        save();
        toast("计划已保存 📅");
      });
    });
  }

  /* ---------- 错题本 ---------- */
  $("#mistakeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const content = $("#mistakeContent").value.trim();
    if (!content) return;
    data.mistakes.unshift({
      id: uid(),
      subject: $("#mistakeSubject").value,
      topic: $("#mistakeTopic").value.trim(),
      content,
      note: $("#mistakeNote").value.trim(),
      resolved: false,
      date: todayStr(),
    });
    e.target.reset();
    save();
    renderMistakes();
    toast("错题已记录 📕");
  });

  function renderMistakes() {
    const wrap = $("#mistakeList");
    $("#mistakeEmpty").style.display = data.mistakes.length ? "none" : "block";
    wrap.innerHTML = data.mistakes
      .map(
        (m) => `
      <div class="mistake-card ${m.resolved ? "resolved" : ""}">
        <div class="mistake-top">
          <span class="subject-tag s-${m.subject}">${m.subject}${m.topic ? " · " + escapeHtml(m.topic) : ""}</span>
          <span class="muted">${m.date}</span>
        </div>
        <div class="mistake-q">❓ ${escapeHtml(m.content)}</div>
        ${m.note ? `<div class="mistake-a">✅ ${escapeHtml(m.note)}</div>` : ""}
        <div class="mistake-actions">
          <button class="chip-btn" data-resolve="${m.id}">${m.resolved ? "↺ 取消掌握" : "✓ 已掌握 +5⭐"}</button>
          <button class="chip-btn" data-delm="${m.id}">删除</button>
        </div>
      </div>`
      )
      .join("");
    wrap.querySelectorAll("[data-resolve]").forEach((b) =>
      b.addEventListener("click", () => {
        const m = data.mistakes.find((x) => x.id === b.dataset.resolve);
        if (!m) return;
        m.resolved = !m.resolved;
        addPoints(m.resolved ? 5 : -5, m.resolved ? `掌握错题:${m.topic || m.subject}` : "撤销掌握错题");
        save();
        renderMistakes();
        renderHeader();
        if (m.resolved) toast("又掌握一道错题,+5⭐ 💡");
      })
    );
    wrap.querySelectorAll("[data-delm]").forEach((b) =>
      b.addEventListener("click", () => {
        data.mistakes = data.mistakes.filter((x) => x.id !== b.dataset.delm);
        save();
        renderMistakes();
      })
    );
  }

  /* ---------- 奖励 ---------- */
  $("#rewardForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#rewardName").value.trim();
    const cost = parseInt($("#rewardCost").value, 10);
    if (!name || !cost || cost < 1) return;
    data.rewards.push({ id: uid(), name, cost });
    e.target.reset();
    save();
    renderRewards();
    toast("奖励已添加 🎁");
  });

  function renderRewards() {
    $("#rewardPoints").textContent = data.points;
    const wrap = $("#rewardList");
    $("#rewardEmpty").style.display = data.rewards.length ? "none" : "block";
    wrap.innerHTML = data.rewards
      .map(
        (r) => `
      <div class="reward-card">
        <div><strong>${escapeHtml(r.name)}</strong><div class="reward-cost">⭐ ${r.cost} 分</div></div>
        <div style="display:flex;gap:8px">
          <button class="btn-primary" data-redeem="${r.id}" ${data.points < r.cost ? "disabled" : ""}>兑换</button>
          <button class="del-btn" data-delr="${r.id}">🗑</button>
        </div>
      </div>`
      )
      .join("");
    wrap.querySelectorAll("[data-redeem]").forEach((b) =>
      b.addEventListener("click", () => {
        const r = data.rewards.find((x) => x.id === b.dataset.redeem);
        if (!r || data.points < r.cost) return;
        addPoints(-r.cost, `兑换奖励:${r.name}`);
        save();
        renderRewards();
        renderHeader();
        renderPointLog();
        toast(`兑换成功:${r.name} 🎉`);
      })
    );
    wrap.querySelectorAll("[data-delr]").forEach((b) =>
      b.addEventListener("click", () => {
        data.rewards = data.rewards.filter((x) => x.id !== b.dataset.delr);
        save();
        renderRewards();
      })
    );
  }

  function renderPointLog() {
    const list = $("#pointLog");
    $("#pointLogEmpty").style.display = data.pointLog.length ? "none" : "block";
    list.innerHTML = data.pointLog
      .map(
        (p) => `<li><span>${escapeHtml(p.text)}</span>
        <span class="tag" style="background:${p.delta >= 0 ? "#e7f8ee" : "#ffe9e9"};color:${p.delta >= 0 ? "#1f9d63" : "#e8554d"}">${p.delta >= 0 ? "+" : ""}${p.delta}</span></li>`
      )
      .join("");
  }

  /* ---------- 统计 ---------- */
  function last7Days() {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      arr.push({ key: d.toLocaleDateString("sv-SE"), label: WEEK_DAYS[(d.getDay() + 6) % 7] });
    }
    return arr;
  }
  function renderStats() {
    const days = last7Days();
    const maxMin = Math.max(10, ...days.map((d) => data.minutesByDay[d.key] || 0));
    $("#minutesChart").innerHTML = days
      .map((d) => {
        const v = data.minutesByDay[d.key] || 0;
        const h = Math.round((v / maxMin) * 100);
        return `<div class="bar-col"><div class="bar-val">${v}</div><div class="bar" style="height:${h}%"></div><div class="bar-label">${d.label}</div></div>`;
      })
      .join("");

    $("#totalTasksDone").textContent = data.totals.tasksDone;
    $("#totalPomodoros").textContent = data.totals.pomodoros;
    $("#totalMinutes").textContent = data.totals.minutes;

    // 各学科完成任务数
    const subjects = ["语文", "数学", "英语", "科学", "阅读", "其它"];
    const counts = {};
    subjects.forEach((s) => (counts[s] = 0));
    data.tasks.forEach((t) => {
      if (t.done && counts[t.subject] != null) counts[t.subject]++;
    });
    const maxC = Math.max(1, ...Object.values(counts));
    $("#subjectChart").innerHTML = subjects
      .map((s) => {
        const v = counts[s];
        const h = Math.round((v / maxC) * 100);
        return `<div class="bar-col"><div class="bar-val">${v}</div><div class="bar alt" style="height:${h}%"></div><div class="bar-label">${s}</div></div>`;
      })
      .join("");
  }

  /* ---------- 仪表盘 + 顶栏 ---------- */
  function renderHeader() {
    $("#streakCount").textContent = data.streak;
    $("#pointsCount").textContent = data.points;
  }
  function renderDashboard() {
    const today = todayStr();
    const todays = data.tasks.filter((t) => t.date === today);
    const done = todays.filter((t) => t.done).length;
    $("#todayDone").textContent = done;
    $("#todayTotal").textContent = todays.length;
    $("#todayProgress").style.width = todays.length ? (done / todays.length) * 100 + "%" : "0%";

    $("#todayMinutes").textContent = data.minutesByDay[today] || 0;
    $("#dailyGoal").textContent = DAILY_GOAL;

    const days = last7Days();
    $("#weekMinutes").textContent = days.reduce((sum, d) => sum + (data.minutesByDay[d.key] || 0), 0);

    $("#dashDateLabel").textContent = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });

    const pending = todays.filter((t) => !t.done).slice(0, 6);
    const ul = $("#dashTodayTasks");
    if (!todays.length) {
      ul.innerHTML = `<li class="muted">今天还没安排任务,去「作业任务」添加吧~</li>`;
    } else if (!pending.length) {
      ul.innerHTML = `<li class="muted">🎉 今天的任务全部完成,太棒了!</li>`;
    } else {
      ul.innerHTML = pending
        .map((t) => `<li><span>${escapeHtml(t.title)}</span><span class="tag">${t.subject}</span></li>`)
        .join("");
    }

    // 打卡按钮状态
    const btn = $("#checkinBtn");
    if (data.lastCheckin === today) {
      btn.textContent = "今日已打卡 ✓";
      btn.disabled = true;
      $("#checkinHint").textContent = `已连续打卡 ${data.streak} 天,继续保持!`;
    } else {
      btn.textContent = "立即打卡 +5⭐";
      btn.disabled = false;
    }

    // 每日固定一句鼓励
    const qi = Array.from(today).reduce((a, c) => a + c.charCodeAt(0), 0) % QUOTES.length;
    $("#dailyQuote").textContent = "“" + QUOTES[qi] + "”";
  }

  function renderAll() {
    renderHeader();
    renderDashboard();
    renderTasks();
    renderFocus();
    renderMistakes();
    renderRewards();
    renderPointLog();
    renderStats();
  }

  /* ---------- 重置 ---------- */
  $("#resetBtn").addEventListener("click", () => {
    if (confirm("确定要清空豆豆的全部学习数据吗?此操作不可恢复。")) {
      data = defaultData();
      save();
      renderAll();
      renderPlan();
      toast("数据已重置");
    }
  });

  /* ---------- 初始化 ---------- */
  paintTimer();
  renderPlan();
  renderAll();
})();
