/* ============================================================
 * 杭州小学数学辅导网站 —— 交互逻辑
 * 包含:导航渲染、知识点展示、练习题生成与自动判分
 * 依赖:curriculum.js (全局变量 CURRICULUM)
 * ============================================================ */

/* ----------------------- 工具函数 ----------------------- */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// 把答案统一成字符串便于比较;数字保留必要小数
function fmt(n) {
  if (typeof n === "number") {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  }
  return String(n).trim();
}

/* -----------------------------------------------------------
 * 题目生成器集合
 * 每个生成器返回 { q: 题面字符串, a: 正确答案(字符串), hint?: 提示 }
 * --------------------------------------------------------- */
const GENERATORS = {
  /* ---------- 一年级 ---------- */
  add_sub_5() {
    if (rand(0, 1)) {
      const a = rand(1, 4), b = rand(1, 5 - a);
      return { q: `${a} + ${b} = ?`, a: a + b };
    }
    const a = rand(2, 5), b = rand(1, a);
    return { q: `${a} - ${b} = ?`, a: a - b };
  },
  add_sub_10() {
    if (rand(0, 1)) {
      const a = rand(1, 9), b = rand(0, 10 - a);
      return { q: `${a} + ${b} = ?`, a: a + b };
    }
    const a = rand(2, 10), b = rand(0, a);
    return { q: `${a} - ${b} = ?`, a: a - b };
  },
  shape3d() {
    const items = [
      { q: "篮球是什么立体图形?(球 / 正方体 / 圆柱)", a: "球" },
      { q: "魔方是什么立体图形?(球 / 正方体 / 圆柱)", a: "正方体" },
      { q: "易拉罐是什么立体图形?(球 / 正方体 / 圆柱)", a: "圆柱" },
      { q: "牙膏盒(长长方方)是什么立体图形?(长方体 / 球)", a: "长方体" },
    ];
    return pick(items);
  },
  place_value_20() {
    const t = rand(1, 1), o = rand(0, 9), n = 10 * t + o;
    return { q: `${n} 是由 ${t} 个十和几个一组成的?`, a: o, hint: "看个位上的数。" };
  },
  add_carry_20() {
    const a = rand(5, 9), b = rand(10 - a + 1, 9);
    return { q: `${a} + ${b} = ?`, a: a + b, hint: "用凑十法:先把一个数凑成 10。" };
  },

  /* ---------- 二年级 ---------- */
  sub_borrow_20() {
    const a = rand(11, 18), b = rand(a - 9, 9);
    return { q: `${a} - ${b} = ?`, a: a - b, hint: "用破十法或想加算减。" };
  },
  compare_100() {
    const a = rand(10, 99), b = rand(10, 99);
    const sym = a > b ? ">" : a < b ? "<" : "=";
    return { q: `比较大小,填 > < =:${a} ___ ${b}`, a: sym };
  },
  money() {
    const yuan = rand(1, 9), jiao = rand(1, 9);
    return { q: `${yuan} 元 ${jiao} 角 = 多少角?`, a: yuan * 10 + jiao, hint: "1 元 = 10 角。" };
  },
  add_sub_100_simple() {
    if (rand(0, 1)) {
      const a = rand(1, 8) * 10, b = rand(1, 9 - a / 10) * 10;
      return { q: `${a} + ${b} = ?`, a: a + b };
    }
    const a = rand(20, 99), b = rand(1, a % 10);
    return { q: `${a} - ${b} = ?`, a: a - b };
  },
  length_unit() {
    const m = rand(1, 9);
    return { q: `${m} 米 = 多少厘米?`, a: m * 100, hint: "1 米 = 100 厘米。" };
  },
  add_sub_100() {
    if (rand(0, 1)) {
      const a = rand(11, 89), b = rand(11, 99 - a < 11 ? 11 : 99 - a);
      return { q: `${a} + ${b} = ?`, a: a + b, hint: "列竖式,相同数位对齐。" };
    }
    const a = rand(30, 99), b = rand(11, a);
    return { q: `${a} - ${b} = ?`, a: a - b, hint: "列竖式,不够减时向前一位借 1。" };
  },
  mul_table() {
    const a = rand(2, 9), b = rand(2, 9);
    return { q: `${a} × ${b} = ?`, a: a * b, hint: `背口诀:${a}×${b}。` };
  },
  time() {
    const h = rand(1, 12), m = pick([0, 15, 30, 45]);
    return { q: `${h} 时 ${m} 分,一共是多少分?(${h}时 = ${h * 60}分)`, a: h * 60 + m, hint: "1 时 = 60 分。" };
  },
  div_table() {
    const b = rand(2, 9), c = rand(2, 9), a = b * c;
    return { q: `${a} ÷ ${b} = ?`, a: c, hint: `想口诀:${b}×几=${a}。` };
  },
  mixed_simple() {
    const a = rand(2, 9), b = rand(2, 9), c = rand(1, 9);
    return { q: `${c} + ${a} × ${b} = ?`, a: c + a * b, hint: "先乘除,后加减。" };
  },
  div_remainder() {
    const b = rand(3, 9);
    const c = rand(2, 8), r = rand(1, b - 1);
    const a = b * c + r;
    return { q: `${a} ÷ ${b} = ?……?(请填 商……余数,如 3……2)`, a: `${c}……${r}`, hint: "余数一定比除数小。" };
  },
  compare_10000() {
    const a = rand(1000, 9999), b = rand(1000, 9999);
    const sym = a > b ? ">" : a < b ? "<" : "=";
    return { q: `比较大小,填 > < =:${a} ___ ${b}`, a: sym };
  },

  /* ---------- 三年级 ---------- */
  time_unit() {
    const m = rand(1, 9);
    return { q: `${m} 分 = 多少秒?`, a: m * 60, hint: "1 分 = 60 秒。" };
  },
  add_sub_1000() {
    if (rand(0, 1)) {
      const a = rand(100, 600), b = rand(100, 399);
      return { q: `${a} + ${b} = ?`, a: a + b };
    }
    const a = rand(300, 999), b = rand(100, a);
    return { q: `${a} - ${b} = ?`, a: a - b };
  },
  mul_one_digit() {
    const a = rand(12, 99), b = rand(2, 9);
    return { q: `${a} × ${b} = ?`, a: a * b, hint: "列竖式,注意进位。" };
  },
  fraction_simple() {
    const d = rand(3, 9), a = rand(1, d - 2), b = rand(1, d - a - 1);
    return { q: `${a}/${d} + ${b}/${d} = ?(写成 几/几)`, a: `${a + b}/${d}`, hint: "同分母分数相加,分母不变,分子相加。" };
  },
  div_one_digit() {
    const b = rand(2, 9), c = rand(11, 99), a = b * c;
    return { q: `${a} ÷ ${b} = ?`, a: c, hint: "从高位除起。" };
  },
  mul_two_digit() {
    const a = rand(11, 99), b = rand(11, 99);
    return { q: `${a} × ${b} = ?`, a: a * b, hint: "拆成整十和个位分别相乘再相加。" };
  },
  rect_area() {
    const l = rand(2, 20), w = rand(2, 20);
    return { q: `一个长方形,长 ${l} 厘米,宽 ${w} 厘米,面积是多少平方厘米?`, a: l * w, hint: "面积 = 长 × 宽。" };
  },
  decimal_simple() {
    const a = (rand(1, 9) + rand(1, 9) / 10);
    const b = (rand(1, 9) + rand(0, 9) / 10);
    const sum = Math.round((a + b) * 10) / 10;
    return { q: `${a.toFixed(1)} + ${b.toFixed(1)} = ?`, a: sum, hint: "小数点对齐再相加。" };
  },

  /* ---------- 四年级 ---------- */
  big_number() {
    const n = rand(1, 99) * 10000;
    return { q: `${n} 改写成用“万”作单位的数(如 50000=5万):填几万?`, a: n / 10000, hint: "去掉末尾 4 个 0。" };
  },
  mul_three_two() {
    const a = rand(100, 999), b = rand(11, 99);
    return { q: `${a} × ${b} = ?`, a: a * b };
  },
  div_two_digit() {
    const b = rand(11, 40), c = rand(3, 30), a = b * c;
    return { q: `${a} ÷ ${b} = ?`, a: c, hint: "用四舍五入法试商。" };
  },
  mixed_four() {
    const a = rand(2, 12), b = rand(2, 12), c = rand(2, 9), d = rand(2, 9);
    return { q: `(${a} + ${b}) × ${c} - ${d} = ?`, a: (a + b) * c - d, hint: "先算括号,再乘除,最后加减。" };
  },
  law_calc() {
    const variants = [
      () => { const a = rand(2, 25); return { q: `用简便方法:25 × 4 × ${a} = ?`, a: 100 * a, hint: "25×4=100。" }; },
      () => { const a = rand(2, 12); return { q: `用乘法分配律:${a} × 99 + ${a} = ?`, a: a * 100, hint: `${a}×99+${a}×1=${a}×100。` }; },
      () => { const a = rand(2, 8); return { q: `用简便方法:125 × 8 × ${a} = ?`, a: 1000 * a, hint: "125×8=1000。" }; },
    ];
    return pick(variants)();
  },
  decimal_add_sub() {
    const a = rand(10, 99) / 10, b = rand(10, 90) / 10;
    if (rand(0, 1)) {
      return { q: `${a.toFixed(1)} + ${b.toFixed(1)} = ?`, a: Math.round((a + b) * 10) / 10 };
    }
    const big = Math.max(a, b), small = Math.min(a, b);
    return { q: `${big.toFixed(1)} - ${small.toFixed(1)} = ?`, a: Math.round((big - small) * 10) / 10 };
  },
  triangle_angle() {
    const a = rand(30, 80), b = rand(30, 120 - a);
    return { q: `三角形两个内角分别是 ${a}° 和 ${b}°,第三个角是多少度?`, a: 180 - a - b, hint: "三角形内角和 = 180°。" };
  },

  /* ---------- 五年级 ---------- */
  decimal_mul() {
    const a = rand(11, 99) / 10, b = rand(2, 9) / 10;
    return { q: `${a.toFixed(1)} × ${b.toFixed(1)} = ?`, a: Math.round(a * b * 100) / 100, hint: "先按整数乘,再数小数位数点小数点。" };
  },
  decimal_div() {
    const c = rand(2, 9) / 10, b = rand(2, 9), a = Math.round(c * b * 10) / 10;
    return { q: `${a.toFixed(1)} ÷ ${b} = ?`, a: Math.round((a / b) * 100) / 100, hint: "商的小数点要和被除数对齐。" };
  },
  equation() {
    const a = rand(2, 9), x = rand(2, 12), b = rand(1, 20);
    return { q: `解方程:${a}x + ${b} = ${a * x + b},x = ?`, a: x, hint: `先两边减 ${b},再除以 ${a}。` };
  },
  polygon_area() {
    const variants = [
      () => { const b = rand(3, 20), h = rand(3, 20); return { q: `平行四边形,底 ${b}、高 ${h},面积是多少?`, a: b * h, hint: "底 × 高。" }; },
      () => { const b = rand(4, 20), h = rand(2, 20); return { q: `三角形,底 ${b}、高 ${h},面积是多少?`, a: Math.round(b * h / 2 * 100) / 100, hint: "底 × 高 ÷ 2。" }; },
      () => { const t = rand(2, 10), d = rand(t + 1, 20), h = rand(2, 10); return { q: `梯形,上底 ${t}、下底 ${d}、高 ${h},面积是多少?`, a: Math.round((t + d) * h / 2 * 100) / 100, hint: "(上底+下底)×高÷2。" }; },
    ];
    return pick(variants)();
  },
  factor_multiple() {
    const variants = [
      () => { const n = rand(10, 99); return { q: `${n} 是 2 的倍数吗?(是 / 不是)`, a: n % 2 === 0 ? "是" : "不是", hint: "个位是 0、2、4、6、8 就是 2 的倍数。" }; },
      () => { const n = rand(10, 99); return { q: `${n} 是 3 的倍数吗?(是 / 不是)`, a: n % 3 === 0 ? "是" : "不是", hint: "各位数字之和是 3 的倍数即可。" }; },
      () => { const n = rand(10, 99); return { q: `${n} 是 5 的倍数吗?(是 / 不是)`, a: n % 5 === 0 ? "是" : "不是", hint: "个位是 0 或 5。" }; },
    ];
    return pick(variants)();
  },
  cuboid_volume() {
    const l = rand(2, 12), w = rand(2, 12), h = rand(2, 12);
    return { q: `长方体,长 ${l}、宽 ${w}、高 ${h},体积是多少?`, a: l * w * h, hint: "体积 = 长 × 宽 × 高。" };
  },
  fraction_add_sub() {
    let d1 = rand(2, 6), d2 = rand(2, 6);
    while (d1 === d2) d2 = rand(2, 6);
    const n1 = rand(1, d1 - 1), n2 = rand(1, d2 - 1);
    const denom = d1 * d2 / gcd(d1, d2);
    let num = n1 * (denom / d1) + n2 * (denom / d2);
    const g = gcd(num, denom);
    return { q: `${n1}/${d1} + ${n2}/${d2} = ?(化成最简分数 几/几)`, a: `${num / g}/${denom / g}`, hint: "先通分,再相加,最后约分。" };
  },

  /* ---------- 六年级 ---------- */
  fraction_mul() {
    const n1 = rand(1, 5), d1 = rand(n1 + 1, 8), n2 = rand(1, 5), d2 = rand(n2 + 1, 8);
    let num = n1 * n2, den = d1 * d2;
    const g = gcd(num, den);
    return { q: `${n1}/${d1} × ${n2}/${d2} = ?(最简分数)`, a: `${num / g}/${den / g}`, hint: "分子相乘,分母相乘,再约分。" };
  },
  fraction_div() {
    const n1 = rand(1, 5), d1 = rand(n1 + 1, 8), n2 = rand(1, 5), d2 = rand(n2 + 1, 8);
    let num = n1 * d2, den = d1 * n2;
    const g = gcd(num, den);
    return { q: `${n1}/${d1} ÷ ${n2}/${d2} = ?(最简分数,可为假分数)`, a: `${num / g}/${den / g}`, hint: "除以一个数等于乘它的倒数。" };
  },
  ratio() {
    const k = rand(2, 9), a = rand(2, 6) * k, b = rand(2, 6) * k;
    const g = gcd(a, b);
    return { q: `化简比:${a} : ${b} = ?(写成 几:几)`, a: `${a / g}:${b / g}`, hint: "同时除以最大公因数。" };
  },
  circle() {
    const variants = [
      () => { const r = rand(1, 10); return { q: `圆的半径是 ${r},周长是多少?(π取3.14)`, a: Math.round(2 * 3.14 * r * 100) / 100, hint: "C = 2πr。" }; },
      () => { const r = rand(1, 10); return { q: `圆的半径是 ${r},面积是多少?(π取3.14)`, a: Math.round(3.14 * r * r * 100) / 100, hint: "S = πr²。" }; },
    ];
    return pick(variants)();
  },
  percent() {
    const variants = [
      () => { const n = rand(1, 9) / 10; return { q: `把小数 ${n} 化成百分数:填几%?`, a: n * 100, hint: "小数点向右移两位。" }; },
      () => { const p = rand(1, 9) * 10; return { q: `${p}% 化成小数是多少?`, a: p / 100, hint: "去掉%,小数点向左移两位。" }; },
    ];
    return pick(variants)();
  },
  negative() {
    const a = rand(-9, -1), b = rand(1, 9);
    const sym = a > b ? ">" : "<";
    return { q: `比较大小,填 > 或 <:${a} ___ ${b}`, a: sym, hint: "负数都比正数小。" };
  },
  cylinder() {
    const variants = [
      () => { const s = rand(5, 30), h = rand(2, 10); return { q: `圆柱底面积 ${s},高 ${h},体积是多少?`, a: s * h, hint: "V = 底面积 × 高。" }; },
      () => { const s = rand(6, 30), h = rand(2, 12); return { q: `圆锥底面积 ${s},高 ${h},体积是多少?`, a: Math.round(s * h / 3 * 100) / 100, hint: "V = ⅓ × 底面积 × 高。" }; },
    ];
    return pick(variants)();
  },
  proportion() {
    const k = rand(2, 6), a = rand(2, 9), b = a * k, c = rand(2, 9), d = c * k;
    // a : b = c : x  =>  x = d
    return { q: `比例 ${a} : ${b} = ${c} : x,x = ?`, a: d, hint: "内项积 = 外项积。" };
  },
  percent_apply() {
    const price = rand(2, 20) * 10, discount = pick([5, 6, 7, 8, 9]);
    return { q: `一件商品原价 ${price} 元,打 ${discount} 折出售,现价多少元?`, a: Math.round(price * discount / 10 * 100) / 100, hint: `打 ${discount} 折 = 按原价的 ${discount * 10}% 出售。` };
  },
};

/* ----------------------- 状态 ----------------------- */
let STATE = {
  grade: null,
  unit: null,      // 当前单元对象
  current: null,   // 当前题目 {q,a,hint}
  correct: 0,
  total: 0,
};

/* ----------------------- 渲染:首页年级卡片 ----------------------- */
function renderHome() {
  const wrap = document.getElementById("grade-grid");
  wrap.innerHTML = "";
  Object.keys(CURRICULUM).forEach((g) => {
    const data = CURRICULUM[g];
    const card = document.createElement("button");
    card.className = "grade-card";
    card.style.setProperty("--card-color", data.color);
    card.innerHTML = `
      <div class="grade-icon">${data.icon}</div>
      <div class="grade-name">${data.title}</div>
      <div class="grade-desc">${data.desc}</div>
    `;
    card.onclick = () => openGrade(g);
    wrap.appendChild(card);
  });
}

/* ----------------------- 渲染:某年级单元列表 ----------------------- */
function openGrade(g) {
  STATE.grade = g;
  const data = CURRICULUM[g];
  document.documentElement.style.setProperty("--theme", data.color);

  document.getElementById("view-home").classList.add("hidden");
  document.getElementById("view-grade").classList.remove("hidden");
  document.getElementById("view-practice").classList.add("hidden");
  window.scrollTo(0, 0);

  document.getElementById("grade-title").textContent = `${data.icon} ${data.title} · 人教版`;

  const container = document.getElementById("unit-list");
  container.innerHTML = "";
  data.volumes.forEach((vol) => {
    const sec = document.createElement("section");
    sec.className = "volume";
    const h = document.createElement("h3");
    h.className = "volume-title";
    h.textContent = vol.volume;
    sec.appendChild(h);

    vol.units.forEach((unit) => {
      const card = document.createElement("div");
      card.className = "unit-card";
      const pts = unit.points.map((p) => `<li>${p}</li>`).join("");
      const canPractice = GENERATORS[unit.skill];
      card.innerHTML = `
        <h4>${unit.title}</h4>
        <ul class="points">${pts}</ul>
        ${canPractice ? `<button class="btn-practice">开始练习 ✏️</button>` : `<span class="no-practice">知识讲解</span>`}
      `;
      if (canPractice) {
        card.querySelector(".btn-practice").onclick = () => openPractice(unit);
      }
      sec.appendChild(card);
    });
    container.appendChild(sec);
  });
}

/* ----------------------- 渲染:练习页 ----------------------- */
function openPractice(unit) {
  STATE.unit = unit;
  STATE.correct = 0;
  STATE.total = 0;

  document.getElementById("view-grade").classList.add("hidden");
  document.getElementById("view-practice").classList.remove("hidden");
  window.scrollTo(0, 0);

  document.getElementById("practice-title").textContent = unit.title;
  updateScore();
  nextQuestion();
}

function nextQuestion() {
  const gen = GENERATORS[STATE.unit.skill];
  STATE.current = gen();
  document.getElementById("question").textContent = STATE.current.q;
  const input = document.getElementById("answer");
  input.value = "";
  input.disabled = false;
  input.focus();
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").className = "feedback";
  document.getElementById("btn-check").classList.remove("hidden");
  document.getElementById("btn-next").classList.add("hidden");
  // 提示按钮
  const hintBtn = document.getElementById("btn-hint");
  const hintBox = document.getElementById("hint-box");
  hintBox.textContent = "";
  hintBox.classList.add("hidden");
  hintBtn.style.display = STATE.current.hint ? "inline-block" : "none";
}

function checkAnswer() {
  const input = document.getElementById("answer");
  const user = fmt(input.value);
  if (user === "") {
    input.focus();
    return;
  }
  const correct = fmt(STATE.current.a);
  const fb = document.getElementById("feedback");
  STATE.total++;

  // 允许分数/比的等价写法(去空格);数值容差
  const isRight =
    user === correct ||
    user.replace(/\s/g, "") === correct.replace(/\s/g, "") ||
    (!isNaN(parseFloat(user)) && !isNaN(parseFloat(correct)) &&
      Math.abs(parseFloat(user) - parseFloat(correct)) < 0.01);

  if (isRight) {
    STATE.correct++;
    fb.textContent = "✅ 答对了,真棒!";
    fb.className = "feedback ok";
  } else {
    fb.textContent = `❌ 答案是 ${correct}。再接再厉!`;
    fb.className = "feedback no";
  }
  input.disabled = true;
  document.getElementById("btn-check").classList.add("hidden");
  document.getElementById("btn-next").classList.remove("hidden");
  updateScore();
}

function updateScore() {
  document.getElementById("score").textContent = `答对 ${STATE.correct} / ${STATE.total} 题`;
}

/* ----------------------- 导航返回 ----------------------- */
function backToHome() {
  document.getElementById("view-home").classList.remove("hidden");
  document.getElementById("view-grade").classList.add("hidden");
  document.getElementById("view-practice").classList.add("hidden");
  window.scrollTo(0, 0);
}
function backToGrade() {
  openGrade(STATE.grade);
}

/* ----------------------- 初始化 ----------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderHome();

  document.getElementById("btn-check").onclick = checkAnswer;
  document.getElementById("btn-next").onclick = nextQuestion;
  document.getElementById("nav-home").onclick = backToHome;
  document.getElementById("back-grade").onclick = backToGrade;
  document.getElementById("back-home").onclick = backToHome;

  document.getElementById("btn-hint").onclick = () => {
    const box = document.getElementById("hint-box");
    box.textContent = "💡 " + (STATE.current.hint || "");
    box.classList.remove("hidden");
  };

  // 回车提交
  document.getElementById("answer").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (!document.getElementById("btn-check").classList.contains("hidden")) {
        checkAnswer();
      } else {
        nextQuestion();
      }
    }
  });
});
