/* 英语练习网站 —— 纯前端逻辑（无框架，无后端） */
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
    const v = window.speechSynthesis
      .getVoices()
      .find((x) => /en[-_]/i.test(x.lang));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };

  /* ---------- 进度记录（localStorage） ---------- */
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

  function renderStats() {
    const s = Store.get();
    const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    $("#stat-done").textContent = s.done;
    $("#stat-acc").textContent = acc + "%";
    $("#stat-total").textContent = s.total;
  }

  // 年级列表（按出现顺序去重）
  const grades = D.vocabulary.reduce((a, c) => (a.includes(c.grade) ? a : a.concat(c.grade)), []);

  /* ================= 单词卡片 ================= */
  const Vocab = {
    grade: grades[0],
    cat: 0, // 在当前年级内的下标
    idx: 0,
    init() {
      // 年级选择
      const gbox = $("#vocab-grades");
      gbox.innerHTML = "";
      grades.forEach((g) => {
        const chip = el("button", "chip" + (g === this.grade ? " active" : ""), g);
        chip.onclick = () => {
          this.grade = g;
          this.cat = 0;
          this.idx = 0;
          this.init();
        };
        gbox.appendChild(chip);
      });
      // 当前年级的单元
      const units = D.vocabulary.filter((c) => c.grade === this.grade);
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
    units() {
      return D.vocabulary.filter((c) => c.grade === this.grade);
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
            <button class="small-audio" style="margin-top:14px" data-speak="${w.word}">🔊 朗读</button>
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
      if (e.target.closest("[data-speak]")) return; // 点朗读按钮不翻转
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

  /* ================= 单词听写 ================= */
  const Spell = {
    grade: grades[0],
    list: [],
    i: 0,
    correct: 0,
    init() {
      const gbox = $("#spell-grades");
      gbox.innerHTML = "";
      grades.forEach((g) => {
        const chip = el("button", "chip" + (g === this.grade ? " active" : ""), g);
        chip.onclick = () => {
          this.grade = g;
          gbox.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
          chip.classList.add("active");
          this.start();
        };
        gbox.appendChild(chip);
      });
      this.start();
    },
    start() {
      // 从该年级所有单元里随机抽 10 个单词（跳过含空格的词组，便于拼写）
      const pool = D.vocabulary
        .filter((c) => c.grade === this.grade)
        .flatMap((c) => c.words)
        .filter((w) => !/\s/.test(w.word));
      this.list = shuffle(pool).slice(0, 10);
      this.i = 0;
      this.correct = 0;
      this.show();
    },
    show() {
      const area = $("#spell-area");
      if (this.i >= this.list.length) return this.finish();
      const w = this.list[this.i];
      area.innerHTML = `
        <div class="progress-bar"><div class="progress-fill" style="width:${(this.i / this.list.length) * 100}%"></div></div>
        <div style="text-align:center">
          <button class="play-big" id="spell-play">🔊</button>
          <div class="section-sub">第 ${this.i + 1} / ${this.list.length} 个 · 中文提示：<b style="color:var(--text)">${w.cn}</b></div>
          <input id="spell-input" class="spell-input" placeholder="在这里拼写单词…" autocomplete="off" autocapitalize="off" spellcheck="false" />
          <div id="spell-feedback" class="spell-feedback"></div>
          <div class="btn-row" style="justify-content:center">
            <button class="btn ghost" id="spell-again">🔊 再听一次</button>
            <button class="btn" id="spell-check">提交</button>
          </div>
        </div>`;
      const input = $("#spell-input");
      const play = () => speak(w.word);
      $("#spell-play").onclick = play;
      $("#spell-again").onclick = play;
      $("#spell-check").onclick = () => this.check();
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.check();
      });
      input.focus();
      setTimeout(play, 300); // 进入自动读一次
    },
    check() {
      const w = this.list[this.i];
      const input = $("#spell-input");
      if (input.disabled) return; // 已提交
      const ans = input.value.trim().toLowerCase();
      const right = w.word.toLowerCase();
      const fb = $("#spell-feedback");
      input.disabled = true;
      $("#spell-check").disabled = true;
      if (ans === right) {
        this.correct++;
        input.classList.add("ok");
        fb.innerHTML = `✅ 正确！<b>${w.word}</b> — ${w.cn}`;
        fb.className = "spell-feedback ok";
      } else {
        input.classList.add("bad");
        fb.innerHTML = `❌ 正确拼写：<b>${w.word}</b>　你写的：${ans || "(空)"}`;
        fb.className = "spell-feedback bad";
      }
      const next = el("button", "btn", this.i < this.list.length - 1 ? "下一个 →" : "看结果 🎉");
      next.onclick = () => {
        this.i++;
        this.show();
      };
      const row = el("div", "btn-row");
      row.style.justifyContent = "center";
      row.appendChild(next);
      $("#spell-area").appendChild(row);
    },
    finish() {
      Store.add(this.correct, this.list.length);
      const pct = Math.round((this.correct / this.list.length) * 100);
      const emoji = pct === 100 ? "🏆" : pct >= 60 ? "😃" : "💪";
      $("#spell-area").innerHTML = `
        <div class="result">
          <div class="emoji">${emoji}</div>
          <div class="score">${this.correct} / ${this.list.length}</div>
          <p>${pct === 100 ? "全对！拼写小能手！" : pct >= 60 ? "不错，继续练习！" : "多听多写就能记住啦！"}</p>
        </div>`;
      const again = el("button", "btn", "再来一组 🔄");
      again.onclick = () => this.start();
      const row = el("div", "btn-row");
      row.style.justifyContent = "center";
      row.appendChild(again);
      $("#spell-area").appendChild(row);
    },
  };

  /* ================= 通用测验（语法 / 听力 / 阅读题） ================= */
  // 渲染一组题目并统计得分，结束后调用 onDone
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
      const qEl = el("div", "question", `${i + 1}. ${opts.text(it)}`);
      stage.appendChild(qEl);
      const optsBox = el("div", "options");
      it._opts = it._opts || it.options.map((o, idx) => ({ o, idx }));
      it._opts.forEach(({ o, idx }) => {
        const b = el("button", "option", o);
        b.onclick = () => choose(b, idx, optsBox, it);
        optsBox.appendChild(b);
      });
      stage.appendChild(optsBox);
      const ex = el("div", "explain", it.explain ? "💡 " + it.explain : "");
      if (it.explain) stage.appendChild(ex);
    }

    function choose(btn, idx, box, it) {
      [...box.children].forEach((b) => (b.disabled = true));
      if (idx === it.answer) {
        btn.classList.add("correct");
        correct++;
      } else {
        btn.classList.add("wrong");
        // 高亮正确项
        [...box.children].forEach((b) => {
          if (b.textContent === it.options[it.answer]) b.classList.add("correct");
        });
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

    show();
  }

  /* ================= 语法 ================= */
  function initGrammar() {
    runQuiz($("#grammar-quiz"), shuffle(D.grammar).slice(0, 8), {
      text: (it) => it.q,
      restart: initGrammar,
    });
  }

  /* ================= 听力 ================= */
  function initListening() {
    runQuiz($("#listening-quiz"), shuffle(D.listening), {
      text: () => "你听到的是哪一句？",
      header: (it) => {
        const wrap = el("div");
        wrap.style.textAlign = "center";
        const btn = el("button", "play-big", "🔊");
        btn.title = "点击播放";
        btn.onclick = () => speak(it.sentence);
        wrap.appendChild(btn);
        const hint = el("div", "section-sub", "点击喇叭听句子，可重复播放");
        hint.style.textAlign = "center";
        wrap.appendChild(hint);
        setTimeout(() => speak(it.sentence), 300); // 进入自动播一次
        return wrap;
      },
      restart: initListening,
    });
  }

  /* ================= 阅读 ================= */
  const Reading = { idx: 0 };
  function initReading() {
    const r = D.reading[Reading.idx];
    const box = $("#reading-content");
    box.innerHTML = `
      <h3>${r.title} <button class="small-audio" data-speak="${r.passage.replace(/"/g, "&quot;")}">🔊 朗读全文</button></h3>
      <div class="passage">${r.passage}</div>
      <div id="reading-quiz"></div>`;
    runQuiz($("#reading-quiz", box), r.questions, {
      text: (it) => it.q,
      restart: () => {
        Reading.idx = (Reading.idx + 1) % D.reading.length; // 完成后换下一篇
        initReading();
      },
    });
  }

  /* ================= 导航 ================= */
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
    if (name === "grammar") initGrammar();
    if (name === "listening") initListening();
    if (name === "reading") initReading();
    if (name === "vocab") Vocab.init();
    if (name === "spell") Spell.init();
    if (name === "home") renderStats();
  }

  /* ================= 启动 ================= */
  document.addEventListener("DOMContentLoaded", () => {
    // 预加载语音列表（部分浏览器异步）
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();

    document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => switchTab(t.dataset.tab)));

    // 全局：点击带 data-speak 的元素朗读
    document.body.addEventListener("click", (e) => {
      const s = e.target.closest("[data-speak]");
      if (s) {
        e.stopPropagation();
        speak(s.getAttribute("data-speak"));
      }
    });

    // 单词卡片交互
    $("#flash").addEventListener("click", (e) => Vocab.flip(e));
    $("#vocab-next").onclick = () => Vocab.next();
    $("#vocab-prev").onclick = () => Vocab.prev();

    renderStats();
    switchTab("home");
  });
})();
