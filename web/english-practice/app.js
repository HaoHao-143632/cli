/* 英语练习网站 —— 纯前端逻辑（无框架，无后端）
 * 模块：单词卡片 / 单词听写 / 词义测验 / 语法 / 听力 / 阅读 / 错词本
 */
(function () {
  "use strict";
  const D = window.AppData;

  /* ---------- 工具 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const escapeAttr = (s) => String(s).replace(/"/g, "&quot;");

  // 年级列表（按词汇出现顺序去重）
  const grades = D.vocabulary.reduce((a, c) => (a.includes(c.grade) ? a : a.concat(c.grade)), []);

  /* ---------- 语音合成（朗读） ---------- */
  const speak = (text) => {
    if (!("speechSynthesis" in window)) {
      alert("当前浏览器不支持语音朗读，请使用 Chrome / Edge 等现代浏览器。");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    const v = window.speechSynthesis.getVoices().find((x) => /en[-_]/i.test(x.lang));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };

  /* ---------- 进度记录 ---------- */
  const Store = {
    key: "eng-practice-stats",
    get() {
      try {
        return JSON.parse(localStorage.getItem(this.key)) || { done: 0, correct: 0, total: 0 };
      } catch {
        return { done: 0, correct: 0, total: 0 };
      }
    },
    add(correct, total) {
      const s = this.get();
      s.done += 1;
      s.correct += correct;
      s.total += total;
      localStorage.setItem(this.key, JSON.stringify(s));
      renderStats();
    },
  };

  /* ---------- 错词本 ---------- */
  const Mistakes = {
    key: "eng-practice-mistakes",
    get() {
      try {
        return JSON.parse(localStorage.getItem(this.key)) || [];
      } catch {
        return [];
      }
    },
    save(arr) {
      localStorage.setItem(this.key, JSON.stringify(arr));
      renderStats();
    },
    add(w) {
      if (!w || !w.word) return;
      const a = this.get();
      if (!a.some((x) => x.word === w.word)) {
        a.push({ word: w.word, cn: w.cn, ipa: w.ipa || "", example: w.example || "" });
        this.save(a);
      }
    },
    remove(word) {
      this.save(this.get().filter((x) => x.word !== word));
    },
    clear() {
      this.save([]);
    },
  };

  function renderStats() {
    const s = Store.get();
    const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    if ($("#stat-done")) $("#stat-done").textContent = s.done;
    if ($("#stat-acc")) $("#stat-acc").textContent = acc + "%";
    if ($("#stat-total")) $("#stat-total").textContent = s.total;
    const mc = Mistakes.get().length;
    if ($("#stat-mistakes")) $("#stat-mistakes").textContent = mc;
    const tab = $('[data-tab="mistakes"]');
    if (tab) tab.textContent = mc ? `📕 错词本 (${mc})` : "📕 错词本";
  }

  /* ---------- 通用：年级选择 chip 行 ---------- */
  function buildGradeChips(container, list, current, onPick) {
    container.innerHTML = "";
    list.forEach((g) => {
      const chip = el("button", "chip" + (g === current ? " active" : ""), g);
      chip.onclick = () => onPick(g);
      container.appendChild(chip);
    });
  }

  /* ================= 单词卡片 ================= */
  const Vocab = {
    grade: grades[0],
    cat: 0,
    idx: 0,
    units() {
      return D.vocabulary.filter((c) => c.grade === this.grade);
    },
    init() {
      buildGradeChips($("#vocab-grades"), grades, this.grade, (g) => {
        this.grade = g;
        this.cat = 0;
        this.idx = 0;
        this.init();
      });
      const units = this.units();
      const chips = $("#vocab-chips");
      chips.innerHTML = "";
      units.forEach((c, i) => {
        const chip = el("button", "chip" + (i === this.cat ? " active" : ""), c.icon + " " + c.category);
        chip.onclick = () => {
          this.cat = i;
          this.idx = 0;
          chips.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
          chip.classList.add("active");
          this.render();
        };
        chips.appendChild(chip);
      });
      this.render();
    },
    render() {
      const words = this.units()[this.cat].words;
      const w = words[this.idx];
      $("#flash").className = "flashcard";
      $("#flash").innerHTML = `
        <div class="flash-inner">
          <div class="flash-face flash-front">
            <div class="flash-word">${w.word}</div>
            <div class="flash-ipa">${w.ipa}</div>
            <button class="small-audio" style="margin-top:14px" data-speak="${escapeAttr(w.word)}">🔊 朗读</button>
            <div class="flip-hint">点击卡片看中文 ↻</div>
          </div>
          <div class="flash-face flash-back">
            <div class="flash-cn">${w.cn}</div>
            <div class="flash-ex">${w.example}</div>
            <div class="flip-hint">点击卡片返回 ↻</div>
          </div>
        </div>`;
      $("#vocab-counter").textContent = `${this.idx + 1} / ${words.length}`;
    },
    flip(e) {
      if (e.target.closest("[data-speak]")) return;
      $("#flash").classList.toggle("flipped");
    },
    next() {
      const words = this.units()[this.cat].words;
      this.idx = (this.idx + 1) % words.length;
      this.render();
    },
    prev() {
      const words = this.units()[this.cat].words;
      this.idx = (this.idx - 1 + words.length) % words.length;
      this.render();
    },
  };

  /* ================= 拼写引擎（听写 + 错词本共用） ================= */
  // container: 渲染容器; list: 单词数组; opts.onCorrect(w)/onWrong(w); opts.onRestart(); opts.restartLabel
  function runSpelling(container, list, opts) {
    opts = opts || {};
    let i = 0,
      correct = 0;

    function show() {
      if (i >= list.length) return finish();
      const w = list[i];
      container.innerHTML = `
        <div class="progress-bar"><div class="progress-fill" style="width:${(i / list.length) * 100}%"></div></div>
        <div style="text-align:center">
          <button class="play-big" data-play>🔊</button>
          <div class="section-sub">第 ${i + 1} / ${list.length} 个 · 中文提示：<b style="color:var(--text)">${w.cn}</b></div>
          <input class="spell-input" data-input placeholder="在这里拼写单词…" autocomplete="off" autocapitalize="off" spellcheck="false" />
          <div class="spell-feedback" data-fb></div>
          <div class="btn-row" style="justify-content:center">
            <button class="btn ghost" data-again>🔊 再听一次</button>
            <button class="btn" data-check>提交</button>
          </div>
        </div>`;
      const input = $("[data-input]", container);
      const play = () => speak(w.word);
      $("[data-play]", container).onclick = play;
      $("[data-again]", container).onclick = play;
      $("[data-check]", container).onclick = check;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") check();
      });
      input.focus();
      setTimeout(play, 300);
    }

    function check() {
      const w = list[i];
      const input = $("[data-input]", container);
      if (!input || input.disabled) return;
      const ans = input.value.trim().toLowerCase();
      const right = w.word.toLowerCase();
      const fb = $("[data-fb]", container);
      input.disabled = true;
      $("[data-check]", container).disabled = true;
      if (ans === right) {
        correct++;
        input.classList.add("ok");
        fb.innerHTML = `✅ 正确！<b>${w.word}</b> — ${w.cn}`;
        fb.className = "spell-feedback ok";
        if (opts.onCorrect) opts.onCorrect(w);
      } else {
        input.classList.add("bad");
        fb.innerHTML = `❌ 正确拼写：<b>${w.word}</b>　你写的：${ans || "(空)"}`;
        fb.className = "spell-feedback bad";
        if (opts.onWrong) opts.onWrong(w);
      }
      const next = el("button", "btn", i < list.length - 1 ? "下一个 →" : "看结果 🎉");
      next.onclick = () => {
        i++;
        show();
      };
      const row = el("div", "btn-row");
      row.style.justifyContent = "center";
      row.appendChild(next);
      container.appendChild(row);
    }

    function finish() {
      Store.add(correct, list.length);
      const pct = Math.round((correct / list.length) * 100);
      const emoji = pct === 100 ? "🏆" : pct >= 60 ? "😃" : "💪";
      container.innerHTML = `
        <div class="result">
          <div class="emoji">${emoji}</div>
          <div class="score">${correct} / ${list.length}</div>
          <p>${pct === 100 ? "全对！拼写小能手！" : pct >= 60 ? "不错，继续练习！" : "多听多写就能记住啦！"}</p>
        </div>`;
      if (opts.onRestart) {
        const again = el("button", "btn", opts.restartLabel || "再来一组 🔄");
        again.onclick = opts.onRestart;
        const row = el("div", "btn-row");
        row.style.justifyContent = "center";
        row.appendChild(again);
        container.appendChild(row);
      }
    }

    if (!list.length) {
      container.innerHTML = '<p class="section-sub" style="text-align:center">没有可练习的单词。</p>';
      return;
    }
    show();
  }

  /* ================= 单词听写（按年级 + 单元） ================= */
  const Spell = {
    grade: grades[0],
    unit: "全部", // "全部" 或 单元 category 名
    init() {
      buildGradeChips($("#spell-grades"), grades, this.grade, (g) => {
        this.grade = g;
        this.unit = "全部";
        this.init();
      });
      // 单元 chips（含“全部单元”）
      const units = D.vocabulary.filter((c) => c.grade === this.grade);
      const ubox = $("#spell-units");
      ubox.innerHTML = "";
      const allChip = el("button", "chip" + (this.unit === "全部" ? " active" : ""), "📚 全部单元");
      allChip.onclick = () => {
        this.unit = "全部";
        this.init();
      };
      ubox.appendChild(allChip);
      units.forEach((c) => {
        const chip = el("button", "chip" + (this.unit === c.category ? " active" : ""), c.category);
        chip.onclick = () => {
          this.unit = c.category;
          this.init();
        };
        ubox.appendChild(chip);
      });
      this.start();
    },
    start() {
      const cats = D.vocabulary.filter(
        (c) => c.grade === this.grade && (this.unit === "全部" || c.category === this.unit)
      );
      const pool = cats.flatMap((c) => c.words).filter((w) => !/\s/.test(w.word));
      const list = shuffle(pool).slice(0, Math.min(10, pool.length));
      runSpelling($("#spell-area"), list, {
        restartLabel: "再来一组 🔄",
        onRestart: () => this.start(),
        onWrong: (w) => Mistakes.add(w),
      });
    },
  };

  /* ================= 通用选择题（语法 / 听力 / 阅读题 / 词义） ================= */
  function runQuiz(container, items, opts) {
    let i = 0,
      correct = 0;
    container.innerHTML = "";
    const fill = el("div", "progress-bar", '<div class="progress-fill"></div>');
    const stage = el("div");
    container.append(fill, stage);

    function show() {
      const it = items[i];
      $(".progress-fill", fill).style.width = (i / items.length) * 100 + "%";
      stage.innerHTML = "";
      if (opts.header) stage.appendChild(opts.header(it, i));
      stage.appendChild(el("div", "question", `${i + 1}. ${opts.text(it)}`));
      const box = el("div", "options");
      it.options.forEach((o, idx) => {
        const b = el("button", "option", o);
        b.onclick = () => choose(b, idx, box, it);
        box.appendChild(b);
      });
      stage.appendChild(box);
      if (it.explain) stage.appendChild(el("div", "explain", "💡 " + it.explain));
    }

    function choose(btn, idx, box, it) {
      [...box.children].forEach((b) => (b.disabled = true));
      if (idx === it.answer) {
        btn.classList.add("correct");
        correct++;
      } else {
        btn.classList.add("wrong");
        [...box.children].forEach((b) => {
          if (b.textContent === it.options[it.answer]) b.classList.add("correct");
        });
        if (opts.onWrong) opts.onWrong(it);
      }
      $(".explain", stage)?.classList.add("show");
      const nextBtn = el("button", "btn", i < items.length - 1 ? "下一题 →" : "查看结果 🎉");
      nextBtn.style.marginTop = "16px";
      nextBtn.onclick = () => {
        i++;
        if (i < items.length) show();
        else finish();
      };
      stage.appendChild(nextBtn);
    }

    function finish() {
      Store.add(correct, items.length);
      const pct = Math.round((correct / items.length) * 100);
      const emoji = pct === 100 ? "🏆" : pct >= 60 ? "😃" : "💪";
      const tip = pct === 100 ? "完美！太棒了！" : pct >= 60 ? "做得不错，继续加油！" : "多练习一定会进步！";
      stage.innerHTML = `
        <div class="result">
          <div class="emoji">${emoji}</div>
          <div class="score">${correct} / ${items.length}</div>
          <p>${tip}</p>
        </div>`;
      const again = el("button", "btn", "再来一次 🔄");
      again.onclick = () => opts.restart();
      const row = el("div", "btn-row");
      row.style.justifyContent = "center";
      row.appendChild(again);
      stage.appendChild(row);
      $(".progress-fill", fill).style.width = "100%";
    }

    if (!items.length) {
      container.innerHTML = '<p class="section-sub" style="text-align:center">该年级暂无题目，换一个年级试试～</p>';
      return;
    }
    show();
  }

  /* ---------- 通用：带年级筛选的练习面板（语法/听力/阅读用） ---------- */
  // prefix 对应 #<prefix>-grades 和 #<prefix>-quiz; run(grade) 执行一次练习
  function initGradeQuizPanel(prefix, run) {
    const tags = ["全部"].concat(grades);
    const box = $("#" + prefix + "-grades");
    let current = "全部";
    const draw = () =>
      buildGradeChips(box, tags, current, (g) => {
        current = g;
        draw();
        run(g);
      });
    draw();
    run(current);
  }

  /* ================= 语法 ================= */
  function initGrammar() {
    initGradeQuizPanel("grammar", (grade) => {
      const pool = D.grammar.filter((x) => grade === "全部" || x.grade === grade);
      runQuiz($("#grammar-quiz"), shuffle(pool).slice(0, Math.min(8, pool.length)), {
        text: (it) => it.q,
        restart: () => initGrammar(),
      });
    });
  }

  /* ================= 听力 ================= */
  function initListening() {
    initGradeQuizPanel("listening", (grade) => {
      const pool = D.listening.filter((x) => grade === "全部" || x.grade === grade);
      runQuiz($("#listening-quiz"), shuffle(pool), {
        text: () => "你听到的是哪一句？",
        header: (it) => {
          const wrap = el("div");
          wrap.style.textAlign = "center";
          const btn = el("button", "play-big", "🔊");
          btn.onclick = () => speak(it.sentence);
          wrap.appendChild(btn);
          const hint = el("div", "section-sub", "点击喇叭听句子，可重复播放");
          hint.style.textAlign = "center";
          wrap.appendChild(hint);
          setTimeout(() => speak(it.sentence), 300);
          return wrap;
        },
        restart: () => initListening(),
      });
    });
  }

  /* ================= 阅读 ================= */
  const Reading = { idx: 0 };
  function initReading() {
    initGradeQuizPanel("reading", (grade) => {
      Reading.idx = 0;
      Reading.pool = D.reading.filter((x) => grade === "全部" || x.grade === grade);
      showReading();
    });
  }
  function showReading() {
    const pool = Reading.pool || D.reading;
    const box = $("#reading-content");
    if (!pool.length) {
      box.innerHTML = '<p class="section-sub" style="text-align:center">该年级暂无短文，换一个年级试试～</p>';
      return;
    }
    const r = pool[Reading.idx % pool.length];
    box.innerHTML = `
      <h3>${r.title} <button class="small-audio" data-speak="${escapeAttr(r.passage)}">🔊 朗读全文</button></h3>
      <div class="passage">${r.passage}</div>
      <div id="reading-quiz"></div>`;
    runQuiz($("#reading-quiz", box), r.questions, {
      text: (it) => it.q,
      restart: () => {
        Reading.idx = (Reading.idx + 1) % pool.length;
        showReading();
      },
    });
  }

  /* ================= 词义测验（中↔英 混合选择） ================= */
  const Mixed = { grade: "全部" };
  function pickDistractors(pool, target, field, n) {
    const seen = new Set([target[field]]);
    const out = [];
    for (const w of shuffle(pool)) {
      if (out.length >= n) break;
      if (!seen.has(w[field])) {
        seen.add(w[field]);
        out.push(w);
      }
    }
    return out;
  }
  function initMixed() {
    initGradeQuizPanel("mixed", (grade) => {
      Mixed.grade = grade;
      startMixed();
    });
  }
  function startMixed() {
    const pool = D.vocabulary
      .filter((c) => Mixed.grade === "全部" || c.grade === Mixed.grade)
      .flatMap((c) => c.words);
    const targets = shuffle(pool).slice(0, Math.min(10, pool.length));
    const items = targets.map((t) => {
      const en2cn = Math.random() < 0.5;
      const field = en2cn ? "cn" : "word";
      const distract = pickDistractors(pool, t, field, 3).map((w) => w[field]);
      const optList = shuffle([t[field], ...distract]);
      return {
        q: en2cn ? `“${t.word}” 的中文意思是？` : `“${t.cn}” 的英文是哪个？`,
        options: optList,
        answer: optList.indexOf(t[field]),
        _target: t,
      };
    });
    runQuiz($("#mixed-quiz"), items, {
      text: (it) => it.q,
      onWrong: (it) => Mistakes.add(it._target),
      restart: () => startMixed(),
    });
  }

  /* ================= 错词本 ================= */
  function initMistakes() {
    const list = Mistakes.get();
    const box = $("#mistakes-content");
    if (!list.length) {
      box.innerHTML =
        '<p class="section-sub" style="text-align:center">🎉 错词本是空的！做「单词听写」或「词义测验」答错的单词会自动收集到这里。</p>';
      return;
    }
    box.innerHTML = `
      <div class="btn-row" style="margin-bottom:14px">
        <button class="btn" id="mk-practice">✍️ 听写练这些词 (${list.length})</button>
        <button class="btn ghost" id="mk-clear">🗑️ 清空</button>
      </div>
      <div id="mk-list"></div>`;
    const ul = $("#mk-list", box);
    list.forEach((w) => {
      const row = el("div", "mk-item");
      row.innerHTML = `
        <button class="small-audio" data-speak="${escapeAttr(w.word)}">🔊</button>
        <span class="mk-word">${w.word}</span>
        <span class="mk-cn">${w.cn}</span>
        <button class="mk-del" title="移除" data-del="${escapeAttr(w.word)}">✖</button>`;
      ul.appendChild(row);
    });
    $("#mk-clear", box).onclick = () => {
      if (confirm("确定清空错词本吗？")) {
        Mistakes.clear();
        initMistakes();
      }
    };
    $("#mk-practice", box).onclick = () => {
      box.innerHTML = '<div id="mk-spell"></div>';
      runSpelling($("#mk-spell", box), shuffle(Mistakes.get()), {
        restartLabel: "再练剩余错词 🔄",
        onCorrect: (w) => Mistakes.remove(w.word), // 拼对即从错词本移除
        onRestart: () => initMistakes(),
      });
    };
    ul.addEventListener("click", (e) => {
      const d = e.target.closest("[data-del]");
      if (d) {
        Mistakes.remove(d.getAttribute("data-del"));
        initMistakes();
      }
    });
  }

  /* ================= 导航 ================= */
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
    if (name === "vocab") Vocab.init();
    if (name === "spell") Spell.init();
    if (name === "mixed") initMixed();
    if (name === "grammar") initGrammar();
    if (name === "listening") initListening();
    if (name === "reading") initReading();
    if (name === "mistakes") initMistakes();
    if (name === "home") renderStats();
  }

  /* ================= 启动 ================= */
  document.addEventListener("DOMContentLoaded", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => switchTab(t.dataset.tab)));

    document.body.addEventListener("click", (e) => {
      const s = e.target.closest("[data-speak]");
      if (s) {
        e.stopPropagation();
        speak(s.getAttribute("data-speak"));
      }
    });

    $("#flash").addEventListener("click", (e) => Vocab.flip(e));
    $("#vocab-next").onclick = () => Vocab.next();
    $("#vocab-prev").onclick = () => Vocab.prev();

    renderStats();
    switchTab("home");
  });
})();
