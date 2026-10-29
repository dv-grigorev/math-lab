// Страница тренажёра: подтемы, вкладки «Памятка / Разборы / Практика», сцена с ползунком a.
(function () {
  const { urlState } = Lab;
  const E = PL.expr, S = PL.sets, V = PL.solve;
  const $ = (id) => document.getElementById(id);
  const TOPICS = PL.topics;
  const rich = (t) => E.richText(t || "");
  const num = (v) => (typeof v === "string" ? E.value(v) : v);

  const state = {
    topic: TOPICS.find(t => t.id === urlState.get("t", "")) || TOPICS[0],
    tab: ["memo", "examples", "practice"].includes(urlState.get("tab", "")) ? urlState.get("tab", "") : "memo",
    memo: 0, ex: 0, step: 0,
    filter: "all", taskKey: urlState.get("task", null), task: null,
    checked: false, peek: false, userSet: null,
  };
  state.ex = Math.max(0, Math.min(state.topic.examples.length - 1, urlState.getNum("ex", 0)));

  // ---------- Сцена ----------
  const stage = PL.stage({ onA: (a) => urlState.set({ a: +a.toFixed(4) }), view: () => state.topic.view });
  const scene = stage.s, setScene = stage.set, setA = stage.setA, draw = stage.draw;

  // ---------- Навигация ----------
  function renderNav() {
    $("topics").innerHTML = "";
    for (const t of TOPICS) {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = t.title;
      b.setAttribute("aria-pressed", t === state.topic);
      b.addEventListener("click", () => { state.topic = t; state.ex = 0; state.step = 0; state.memo = 0; state.taskKey = null; render(); });
      $("topics").appendChild(b);
    }
    for (const b of $("tabs").querySelectorAll(".chip")) b.setAttribute("aria-pressed", b.dataset.tab === state.tab);
  }
  for (const b of $("tabs").querySelectorAll(".chip")) {
    b.addEventListener("click", () => { state.tab = b.dataset.tab; render(); });
  }

  function render() {
    document.querySelector(".pl").dataset.tab = state.tab;
    renderNav();
    showStage(true);
    urlState.set({ t: state.topic.id, tab: state.tab, ex: state.tab === "examples" ? state.ex : null, task: state.tab === "practice" ? state.taskKey : null, a: null });
    ({ memo: renderMemo, examples: renderExamples, practice: renderPractice })[state.tab]();
  }
  function showStage(on) {
    $("stageCard").hidden = !on;
    $("stageHidden").hidden = on;
  }

  const systemHTML = E.systemHTML;

  // ---------- Памятка ----------
  function renderMemo() {
    const box = $("text");
    box.innerHTML = "";
    state.topic.memo.forEach((sec, i) => {
      const c = document.createElement("div");
      c.className = "card memo-sec" + (i === state.memo ? " active" : "");
      c.innerHTML = `<h3>${sec.title}</h3>${rich(sec.html)}`;
      if (sec.scene) {
        const b = document.createElement("button");
        b.className = "btn scene-btn"; b.textContent = "Показать на графике";
        b.addEventListener("click", () => { state.memo = i; markMemo(); setScene(sec.scene); });
        c.appendChild(b);
      }
      box.appendChild(c);
    });
    // «Предскажи → проверь»
    if (state.topic.tasks && state.topic.tasks.length) {
      const c = document.createElement("div");
      c.className = "card tasks";
      c.innerHTML = `<h2>Задания</h2><ol>${state.topic.tasks.map((t, i) =>
        `<li>${rich(t.html)}${t.scene ? ` <button class="btn scene-btn" data-i="${i}">Проверить на графике</button>` : ""}` +
        (t.answer ? `<details><summary>Ответ</summary>${rich(t.answer)}</details>` : "") + "</li>").join("")}</ol>`;
      c.querySelectorAll("button[data-i]").forEach(b => b.addEventListener("click", () => {
        state.memo = -1; markMemo(); setScene(state.topic.tasks[+b.dataset.i].scene);
      }));
      box.appendChild(c);
    }
    const first = state.topic.memo[state.memo] && state.topic.memo[state.memo].scene ? state.memo : state.topic.memo.findIndex(s => s.scene);
    state.memo = first;
    markMemo();
    setScene(state.topic.memo[first].scene);
  }
  function markMemo() {
    [...$("text").children].forEach((c, i) => c.classList.toggle("active", i === state.memo));
  }

  // ---------- Разборы ----------
  function renderExamples() {
    const ex = state.topic.examples[state.ex];
    const box = $("text");
    box.innerHTML = "";
    const nav = document.createElement("div");
    nav.className = "chips";
    state.topic.examples.forEach((e, i) => {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = `Разбор ${i + 1}. ${e.title}`;
      b.setAttribute("aria-pressed", i === state.ex);
      b.addEventListener("click", () => { state.ex = i; state.step = 0; render(); });
      nav.appendChild(b);
    });
    box.appendChild(nav);

    const c = document.createElement("div");
    c.className = "card ex";
    c.innerHTML = `<h3>${ex.title}</h3><p>${rich(ex.text)}</p>${systemHTML(ex.system)}<ol class="steps" id="steps"></ol>
      <div class="btn-row"><button class="btn" id="prev">← Назад</button><button class="btn primary" id="next">Дальше →</button>
      <button class="btn" id="restart">Сначала</button></div>`;
    box.appendChild(c);
    $("prev").addEventListener("click", () => goStep(state.step - 1));
    $("next").addEventListener("click", () => goStep(state.step + 1));
    $("restart").addEventListener("click", () => goStep(0));
    goStep(state.step);
  }
  function goStep(i) {
    const ex = state.topic.examples[state.ex];
    state.step = Math.max(0, Math.min(ex.steps.length - 1, i));
    const ol = $("steps");
    ol.innerHTML = ex.steps.slice(0, state.step + 1).map((s, k) => `<li class="${k === state.step ? "cur" : ""}">${rich(s.html)}</li>`).join("");
    $("prev").disabled = state.step === 0;
    $("next").disabled = state.step === ex.steps.length - 1;
    applyStep(ex.task, ex.answer, ex.steps[state.step]);
  }
  function applyStep(task, answer, st) {
    const set = st.showAnswer ? S.parse(answer).set : null;
    setScene(task, {
      a: st.a, extras: st.extras, highlight: st.highlight, answer,
      rows: set ? [{ label: "ответ", set, color: "--good" }] : [],
    });
  }

  // ---------- Практика ----------
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function bankTasks() { return PL.bank.filter(t => t.topic === state.topic.id); }
  function taskFromKey(key) {
    if (!key) return null;
    const [kind, id, seed] = key.split(".");
    if (kind === "g") {
      const g = state.topic.generators.find(g => g.id === id);
      return g ? { ...g.make(rng(+seed)), source: "Тренировочная: " + g.title.toLowerCase() } : null;
    }
    const t = PL.bank.find(t => String(t.id) === id && t.topic === state.topic.id);
    return t ? { ...t, source: "Из банка задач" } : null;
  }
  function randomKey() {
    const gens = state.topic.generators, bank = bankTasks();
    const useBank = state.filter === "bank" || (state.filter === "all" && bank.length && Math.random() < 0.4);
    if (useBank && bank.length) {
      const others = bank.length > 1 ? bank.filter(t => "b." + t.id !== state.taskKey) : bank;
      return "b." + others[Math.floor(Math.random() * others.length)].id;
    }
    const g = gens[Math.floor(Math.random() * gens.length)];
    return `g.${g.id}.${Math.floor(Math.random() * 1e6)}`;
  }

  function renderPractice() {
    if (!state.task || state.task.key !== state.taskKey) {
      const t = taskFromKey(state.taskKey);
      if (!t) { state.taskKey = randomKey(); urlState.set({ task: state.taskKey }); return renderPractice(); }
      state.task = { ...t, key: state.taskKey };
      state.checked = false; state.peek = false; state.userSet = null;
    }
    const t = state.task;
    const box = $("text");
    box.innerHTML = "";

    const bank = bankTasks();
    const nav = document.createElement("div");
    nav.className = "chips";
    const filters = [["all", "Все задачи"], ["gen", "Тренировочные"]];
    if (bank.length) filters.push(["bank", `Из банка (${bank.length})`]);
    for (const [f, label] of filters) {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = label;
      b.setAttribute("aria-pressed", state.filter === f);
      b.addEventListener("click", () => { state.filter = f; nextTask(); });
      nav.appendChild(b);
    }
    box.appendChild(nav);

    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<div class="src-note">${t.source}</div><p>${rich(t.text)}</p>${systemHTML(t.system)}
      <div class="answer-box">
        <label for="ans">Ваш ответ: значения <i>a</i></label>
        <input id="ans" autocomplete="off" spellcheck="false" placeholder="например: (-2√2; 2√2) ∪ {3}">
        <div class="kbd" id="kbd"></div>
        <div class="preview" id="preview"></div>
        <div class="btn-row">
          <button class="btn primary" id="check">Проверить</button>
          <button class="btn" id="giveup">Показать ответ</button>
          <button class="btn" id="another">Другая задача</button>
        </div>
        <div id="verdict"></div>
      </div>`;
    box.appendChild(c);
    const sol = document.createElement("div");
    sol.className = "card"; sol.id = "solution"; sol.hidden = true;
    box.appendChild(sol);

    const inp = $("ans");
    for (const k of ["(", ")", "[", "]", "{", "}", ";", "∪", "∞", "−", "√", "∅"]) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = k; b.title = "Вставить «" + k + "»";
      b.addEventListener("click", () => {
        const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? s;
        const ins = k === "−" ? "-" : k;
        inp.value = inp.value.slice(0, s) + ins + inp.value.slice(e);
        inp.focus(); inp.setSelectionRange(s + ins.length, s + ins.length);
        preview();
      });
      $("kbd").appendChild(b);
    }
    inp.addEventListener("input", preview);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
    $("check").addEventListener("click", check);
    $("giveup").addEventListener("click", () => reveal(null));
    $("another").addEventListener("click", nextTask);

    setScene(t, { answer: t.answer, extras: [] });
    showStage(state.checked || state.peek);
    if (state.checked) reveal(state.userSet);
  }
  $("peek").addEventListener("click", () => { state.peek = true; showStage(true); draw(); });

  function nextTask() {
    state.taskKey = randomKey();
    state.task = null;
    urlState.set({ task: state.taskKey });
    renderPractice();
  }
  function preview() {
    const v = $("ans").value.trim(), p = $("preview");
    if (!v) { p.textContent = ""; p.classList.remove("err"); state.userSet = null; drawUserRow(); return; }
    const r = S.tryParse(v);
    p.classList.toggle("err", !!r.error);
    p.innerHTML = r.error ? r.error : "Вы ввели: <span class=\"f\">" + S.formatHTML(r.set) + "</span>";
    state.userSet = r.error ? null : r.set;
    drawUserRow();
  }
  // пока ученик вводит ответ, показываем его на оси (если график уже открыт)
  function drawUserRow() {
    if (state.checked) return;
    scene.rows = state.userSet ? [{ label: "ваш ответ", set: state.userSet, color: "--accent" }] : [];
    scene.diff = null;
    if (!$("stageCard").hidden) draw();
  }
  function check() {
    const r = S.tryParse($("ans").value);
    if (r.error || !$("ans").value.trim()) {
      $("preview").classList.add("err");
      $("preview").textContent = r.error || "Сначала введите ответ";
      return;
    }
    reveal(r.set);
  }
  function reveal(userSet) {
    const t = state.task, right = S.parse(t.answer).set;
    state.checked = true; state.userSet = userSet;
    const ok = userSet && S.equal(userSet, right);
    $("verdict").innerHTML = userSet
      ? `<div class="verdict-box ${ok ? "ok" : "bad"}">${ok ? "Верно!" : "Пока не так."}
          <span class="right">Верный ответ: <span class="f">a ∈ ${S.formatHTML(right)}</span></span></div>`
      : `<div class="verdict-box bad">Ответ: <span class="right f">a ∈ ${S.formatHTML(right)}</span></div>`;
    const rows = [];
    if (userSet) rows.push({ label: "ваш ответ", set: userSet, color: ok ? "--good" : "--accent" });
    rows.push({ label: "верный ответ", set: right, color: "--good" });
    const diff = userSet && !ok ? diffRanges(userSet, right) : null;
    scene.rows = rows; scene.diff = diff;
    showStage(true);
    if (diff && diff.length) {
      const [u, w] = diff[0];
      setA(Number.isFinite(u) && Number.isFinite(w) ? (u + w) / 2 : Number.isFinite(u) ? u + 0.5 : w - 0.5, false);
    } else draw();
    renderSolution(t, right);
  }
  // где ответы расходятся: [[lo, hi], ...]
  function diffRanges(A, B) {
    const d = S.union(S.minus(A, B), S.minus(B, A));
    return d.map(I => [I.lo, I.hi]);
  }
  function renderSolution(t, right) {
    const box = $("solution");
    if (!t.steps || !t.steps.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<h2>Решение</h2><ol class="steps">${t.steps.map((s, i) => `<li data-i="${i}" style="cursor:pointer">${rich(s.html)}</li>`).join("")}</ol>
      <div class="src-note">Нажмите на шаг — график покажет его.</div>`;
    box.querySelectorAll("li").forEach(li => li.addEventListener("click", () => {
      box.querySelectorAll("li").forEach(x => x.classList.toggle("cur", x === li));
      const st = t.steps[+li.dataset.i];
      setScene(t, { a: st.a, extras: st.extras, highlight: st.highlight, answer: t.answer, rows: scene.rows, diff: scene.diff });
    }));
  }

  const a0 = urlState.getNum("a", NaN); // читаем до render(): он чистит адрес
  render();
  if (Number.isFinite(a0) && scene.ct) {
    // в адресе a округлено — если рядом отдельная точка (касание), встаём точно в неё
    const sp = scene.map.special.find(s => Math.abs(s.p - a0) < 1e-3);
    setA(sp ? sp.p : Math.max(scene.range[0], Math.min(scene.range[1], a0)), false);
  }
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", draw);
})();
