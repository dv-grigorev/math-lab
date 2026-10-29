// Конструктор задач для учителя: правка банка bank/teacher.js с живым графиком и проверкой ответа.
(function () {
  const E = PL.expr, S = PL.sets, V = PL.solve;
  const $ = (id) => document.getElementById(id);
  const rich = (t) => E.richText(t || "");
  const DRAFT = "pl-editor-draft-v1";
  const PREFIX = { "circle-line": "cl" };
  const ASK_CHIPS = ["=1", "=2", ">=1", "=0", "inf", "=2 при x > 0"];
  const HEADER = `// Банк задач учителя. Удобнее всего править через «Конструктор задач» (editor.html):
// он проверяет ответ и сохраняет этот файл целиком.
//
// Формат одной задачи:
// {
//   id: "cl-1",                       // уникальный номер
//   topic: "circle-line",             // подтема
//   text: "При каких значениях параметра $a$ система имеет ровно два решения?",
//   system: ["x^2 + y^2 = 4", "y = x + a"],   // показать как систему (необязательно)
//   eq: ["x^2 + y^2 = 4", "y = x + a"],       // как считать: две части
//   ask: "=2",                        // сколько решений нужно
//   answer: "(-2√2; 2√2)",
//   aRange: [-10, 10],                // диапазон a (необязательно: без него подбирается сам)
//   steps: [{ html: "Пояснение", a: 1 }],     // решение по шагам (необязательно)
// }
`;

  const fromFile = JSON.parse(JSON.stringify(PL.bank));
  let tasks = fromFile, cur = 0;
  const status = {}; // id → "ok" | "bad" | "err"

  // ---------- Черновик в браузере ----------
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) || "null");
      if (d && Array.isArray(d.tasks) && JSON.stringify(d.tasks) !== JSON.stringify(fromFile)) return d;
    } catch (e) { /* хранилище недоступно — работаем без черновика */ }
    return null;
  }
  function saveDraft() {
    try { localStorage.setItem(DRAFT, JSON.stringify({ tasks, saved: Date.now() })); } catch (e) { /* без черновика */ }
  }
  function dropDraft() { try { localStorage.removeItem(DRAFT); } catch (e) { /* ничего */ } }

  const draft = loadDraft();
  if (draft) {
    tasks = draft.tasks;
    const when = new Date(draft.saved).toLocaleString("ru-RU");
    $("banner").innerHTML = `<div class="banner">Открыт черновик от ${when} — в нём есть изменения, которых нет в файле банка.
      <button class="btn" id="drop">Вернуться к файлу</button></div>`;
    $("drop").addEventListener("click", () => {
      if (!confirm("Удалить черновик и открыть задачи из файла teacher.js?")) return;
      dropDraft(); location.reload();
    });
  }

  // ---------- Новая задача ----------
  function nextId(topic) {
    const p = PREFIX[topic] || topic;
    let n = 1;
    while (tasks.some(t => t.id === `${p}-${n}`)) n++;
    return `${p}-${n}`;
  }
  function blank() {
    const topic = (tasks[cur] && tasks[cur].topic) || PL.topics[0].id;
    return {
      id: nextId(topic), topic,
      text: "При каких значениях параметра $a$ система имеет ровно два решения?",
      system: ["x^2 + y^2 = 4", "y = x + a"],
      eq: ["x^2 + y^2 = 4", "y = x + a"], ask: "=2", answer: "",
      steps: [],
    };
  }

  // ---------- Список ----------
  function renderList() {
    const ul = $("list");
    ul.innerHTML = tasks.length ? "" : '<li style="cursor:default;color:var(--muted)">Банк пуст — нажмите «Новая задача».</li>';
    tasks.forEach((t, i) => {
      const li = document.createElement("li");
      li.className = i === cur ? "cur" : "";
      const st = { ok: "✓", bad: "✗", err: "⚠" }[status[t.id]] || "…";
      const color = { ok: "var(--good)", bad: "#d4483b", err: "#d4483b" }[status[t.id]] || "var(--muted)";
      li.innerHTML = `<span class="st" style="color:${color}" title="${{ ok: "ответ сходится", bad: "ответ не сходится", err: "ошибка в записи" }[status[t.id]] || "проверяется"}">${st}</span>
        <span class="tid"></span><span class="ttxt"></span>`;
      li.querySelector(".tid").textContent = t.id;
      li.querySelector(".ttxt").textContent = (t.text || "").replace(/\$/g, "");
      li.addEventListener("click", () => { cur = i; fill(); });
      ul.appendChild(li);
    });
    $("dup").disabled = $("del").disabled = !tasks.length;
    $("form").hidden = !tasks.length;
  }
  $("new").addEventListener("click", () => { tasks.push(blank()); cur = tasks.length - 1; changed(); fill(); });
  $("dup").addEventListener("click", () => {
    const c = JSON.parse(JSON.stringify(tasks[cur]));
    c.id = nextId(c.topic);
    tasks.splice(cur + 1, 0, c); cur++; changed(); fill();
  });
  $("del").addEventListener("click", () => {
    if (!confirm(`Удалить задачу «${tasks[cur].id}» из банка?`)) return;
    tasks.splice(cur, 1); cur = Math.max(0, cur - 1); changed(); fill();
  });

  // ---------- Форма ----------
  for (const t of PL.topics) $("f-topic").insertAdjacentHTML("beforeend", `<option value="${t.id}">${t.title}</option>`);
  for (const a of ASK_CHIPS) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = a;
    b.addEventListener("click", () => { $("f-ask").value = a; readForm(); });
    $("ask-chips").appendChild(b);
  }
  for (const k of ["(", ")", "[", "]", "{", "}", ";", "∪", "∞", "√"]) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = k;
    b.addEventListener("click", () => {
      const inp = $("f-answer"), s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? s;
      inp.value = inp.value.slice(0, s) + k + inp.value.slice(e);
      inp.focus(); inp.setSelectionRange(s + k.length, s + k.length);
      readForm();
    });
    $("kbd").appendChild(b);
  }

  const lines = (s) => s.split("\n").map(l => l.trim()).filter(Boolean);
  const numOr = (v, d) => (v === "" || !Number.isFinite(+v) ? d : +v);

  function fill() {
    renderList();
    const t = tasks[cur];
    if (!t) { $("pv-text").innerHTML = ""; $("check").innerHTML = ""; return; }
    $("f-topic").value = t.topic;
    $("f-id").value = t.id;
    $("f-text").value = t.text || "";
    $("f-system").value = (t.system || []).join("\n");
    const plane = t.plane || "xy";
    document.querySelector(`input[name=plane][value=${plane}]`).checked = true;
    $("f-p1").value = [].concat(t.eq[0] || []).join("\n");
    $("f-p2").value = plane === "xa" ? "" : [].concat(t.eq[1] || []).join("\n");
    $("f-ask").value = [].concat(t.ask || "").join("; ");
    $("f-answer").value = t.answer || "";
    const [a0, a1] = t.aRange || ["", ""];
    $("f-a0").value = a0; $("f-a1").value = a1;
    const v = t.view || {};
    $("f-x0").value = v.x ? v.x[0] : ""; $("f-x1").value = v.x ? v.x[1] : "";
    $("f-y0").value = v.y ? v.y[0] : ""; $("f-y1").value = v.y ? v.y[1] : "";
    renderSteps();
    planeUI();
    preview(true);
  }

  function planeUI() {
    const xa = document.querySelector("input[name=plane]:checked").value === "xa";
    $("wrap-p2").hidden = xa;
    $("lbl-p1").textContent = xa ? "Линии в плоскости (x; a)" : "Первая часть (синяя)";
    $("hint-p1").innerHTML = xa
      ? "Выразите a через x: <code>a = |x^2 - 4|</code>, <code>a = x^2 - 2x при x &gt;= 0</code>. Прямая a = const нарисуется сама."
      : "По одной линии в строке: <code>x^2 + y^2 = 4</code>, <code>y = sqrt(4 - x^2)</code>, <code>y = 2 - |x| при |x| &lt;= 2</code>. Несколько строк — объединение линий. Может зависеть от a.";
  }

  function readForm() {
    const t = tasks[cur];
    if (!t) return;
    const oldId = t.id;
    t.topic = $("f-topic").value;
    t.id = $("f-id").value.trim() || oldId;
    t.text = $("f-text").value.trim();
    const sys = lines($("f-system").value);
    if (sys.length) t.system = sys; else delete t.system;
    const plane = document.querySelector("input[name=plane]:checked").value;
    if (plane === "xa") t.plane = "xa"; else delete t.plane;
    const p1 = lines($("f-p1").value), p2 = lines($("f-p2").value);
    const one = (arr) => (arr.length === 1 ? arr[0] : arr);
    t.eq = plane === "xa" ? [one(p1)] : [one(p1), one(p2)];
    const asks = $("f-ask").value.split(";").map(s => s.trim()).filter(Boolean);
    t.ask = asks.length > 1 ? asks : asks[0] || ">=1";
    t.answer = $("f-answer").value.trim();
    // диапазон a: оба поля пустые — подбирается сам
    const ra0 = $("f-a0").value, ra1 = $("f-a1").value;
    if (ra0 !== "" && ra1 !== "" && +ra0 < +ra1) t.aRange = [+ra0, +ra1]; else delete t.aRange;
    const x0 = $("f-x0").value, x1 = $("f-x1").value, y0 = $("f-y0").value, y1 = $("f-y1").value;
    if (x0 !== "" && x1 !== "" && y0 !== "" && y1 !== "") t.view = { x: [+x0, +x1], y: [+y0, +y1] }; else delete t.view;
    if (oldId !== t.id) delete status[oldId];
    planeUI();
    changed();
    preview(false);
  }
  for (const id of ["f-topic", "f-id", "f-text", "f-system", "f-p1", "f-p2", "f-ask", "f-answer", "f-a0", "f-a1", "f-x0", "f-x1", "f-y0", "f-y1"]) {
    $(id).addEventListener("input", readForm);
  }
  document.querySelectorAll("input[name=plane]").forEach(r => r.addEventListener("change", readForm));

  // ---------- Шаги решения ----------
  function renderSteps() {
    const t = tasks[cur], box = $("steps");
    box.innerHTML = "";
    (t.steps || []).forEach((st, i) => {
      const row = document.createElement("div");
      row.className = "step-row";
      row.innerHTML = `<textarea class="prose" rows="2" placeholder="Что происходит на этом шаге"></textarea>
        <div class="opts"><input type="text" placeholder="a = …" title="Значение a на графике">
          <label><input type="checkbox"> ответ на оси</label></div>
        <button class="btn" title="Удалить шаг">✕</button>`;
      const [ta, ia, cb, del] = [row.querySelector("textarea"), row.querySelector("input[type=text]"), row.querySelector("input[type=checkbox]"), row.querySelector("button")];
      ta.value = st.html || ""; ia.value = st.a === undefined ? "" : st.a; cb.checked = !!st.showAnswer;
      const upd = () => {
        st.html = ta.value;
        const av = ia.value.trim();
        if (av === "") delete st.a; else st.a = /^-?\d+(\.\d+)?$/.test(av) ? +av : av;
        if (cb.checked) st.showAnswer = true; else delete st.showAnswer;
        changed(); preview(false);
      };
      ta.addEventListener("input", upd); ia.addEventListener("input", upd); cb.addEventListener("change", upd);
      del.addEventListener("click", () => { t.steps.splice(i, 1); if (!t.steps.length) delete t.steps; changed(); renderSteps(); preview(false); });
      box.appendChild(row);
    });
  }
  $("add-step").addEventListener("click", () => {
    const t = tasks[cur];
    (t.steps = t.steps || []).push({ html: "" });
    changed(); renderSteps(); preview(false);
  });

  function changed() { saveDraft(); renderList(); }

  // ---------- Превью ----------
  const stage = PL.stage({ view: () => ({ x: [-6, 6], y: [-6, 6] }) });
  let timer = null, checkToken = 0;

  function preview(now) {
    clearTimeout(timer);
    timer = setTimeout(doPreview, now ? 0 : 450);
  }
  const systemHTML = E.systemHTML;
  function doPreview() {
    const t = tasks[cur];
    if (!t) return;
    $("pv-text").innerHTML = `<p>${rich(t.text)}</p>${systemHTML(t.system)}`;
    // ответ
    const ap = t.answer ? S.tryParse(t.answer) : { error: "Введите ответ" };
    $("ans-preview").classList.toggle("err", !!ap.error);
    $("ans-preview").innerHTML = ap.error ? ap.error : `Ответ: <span class="f">a ∈ ${S.formatHTML(ap.set)}</span>`;
    // шаги
    $("pv-steps").innerHTML = (t.steps || []).map((s, i) => `<li data-i="${i}" style="cursor:pointer">${rich(s.html) || "<i>пустой шаг</i>"}</li>`).join("");
    $("pv-steps").querySelectorAll("li").forEach(li => li.addEventListener("click", () => {
      $("pv-steps").querySelectorAll("li").forEach(x => x.classList.toggle("cur", x === li));
      const st = t.steps[+li.dataset.i];
      let a;
      try { a = st.a === undefined ? undefined : typeof st.a === "number" ? st.a : E.value(st.a); } catch (e) { a = undefined; }
      stage.set(t, { a, answer: ap.error ? null : t.answer, rows: st.showAnswer && !ap.error ? [{ label: "ответ", set: ap.set, color: "--good" }] : [] });
    }));
    // график
    const err = stage.set(t, { fresh: true, answer: ap.error ? null : t.answer, rows: ap.error ? [] : [{ label: "ответ", set: ap.set, color: "--good" }] });
    if (err) { setStatus(t, "err"); $("check").innerHTML = `<div class="check-box bad"><b>Ошибка в записи:</b> ${err}</div>`; return; }
    if (ap.error) { $("check").innerHTML = `<div class="check-box wait">Когда введёте ответ, программа сверит его с графиком.</div>`; }
    else $("check").innerHTML = `<div class="check-box wait">Проверяю ответ…</div>`;
    const token = ++checkToken;
    setTimeout(() => { if (token === checkToken) runCheck(t, ap); }, 30);
  }

  // Сверка с численным подсчётом + приближённый ответ «по графику»
  function runCheck(t, ap) {
    let ct;
    try { ct = V.compileTask(t); } catch (e) { return; }
    const R = stage.s.range;
    const approx = V.approx(ct, R);
    const approxTxt = approx.length
      ? approx.map(I => I.hi - I.lo < (R[1] - R[0]) / 500 ? `{≈ ${E.fmtNum((I.lo + I.hi) / 2)}}`
          : `(${I.loInf ? "…" : "≈ " + E.fmtNum(I.lo)}; ${I.hiInf ? "…" : "≈ " + E.fmtNum(I.hi)})`).join(" ∪ ")
      : "таких значений нет";
    const hint = `<p>По графику, приближённо, для a от ${E.fmtNum(R[0])} до ${E.fmtNum(R[1])}: ${approxTxt}
      («…» — промежуток идёт до края диапазона). Отдельные значения (касания) так не видны — их проверяем по концам вашего ответа.</p>`;
    if (ap.error) { $("check").innerHTML = `<div class="check-box wait">Ответ ещё не введён.${hint}</div>`; return; }
    const bad = V.verify(t, ap.set);
    if (!bad.length) {
      setStatus(t, "ok");
      $("check").innerHTML = `<div class="check-box ok"><b>✓ Ответ сходится с подсчётом.</b>
        <p>Проверены концы промежутков ответа, точки между ними и частая сетка значений a.</p>${hint}</div>`;
    } else {
      setStatus(t, "bad");
      const items = bad.slice(0, 5).map(b => `<li>при a = ${S.label(b.a)}: по вашему ответу ${b.want ? "подходит" : "не подходит"}, а по графику — ${b.got ? "подходит" : "не подходит"}</li>`).join("");
      $("check").innerHTML = `<div class="check-box bad"><b>✗ Ответ не сходится с подсчётом.</b><ul>${items}</ul>
        ${bad.length > 5 ? `<p>…и ещё ${bad.length - 5} таких значений.</p>` : ""}
        <p>Проверьте ответ и запись уравнений. Нажмите на ось a под графиком, чтобы посмотреть картинку при этих значениях.</p>${hint}</div>`;
      if (bad[0].a < R[0] || bad[0].a > R[1]) stage.setRange([Math.min(R[0], Math.floor(bad[0].a) - 1), Math.max(R[1], Math.ceil(bad[0].a) + 1)]);
      stage.setA(bad[0].a, false);
    }
  }
  function setStatus(t, s) { if (status[t.id] !== s) { status[t.id] = s; renderList(); } }

  // фоновая проверка всего банка — значки в списке
  function checkAll(i = 0) {
    if (i >= tasks.length) return;
    const t = tasks[i];
    if (!status[t.id]) {
      try {
        if (!t.answer) throw new Error("нет ответа");
        const ap = S.parse(t.answer);
        status[t.id] = V.verify(t, ap.set).length ? "bad" : "ok";
      } catch (e) { status[t.id] = "err"; }
      renderList();
    }
    setTimeout(() => checkAll(i + 1), 20);
  }

  // ---------- Сохранение ----------
  function clean(t) {
    const o = { id: t.id, topic: t.topic, text: t.text };
    if (t.system) o.system = t.system;
    if (t.plane) o.plane = t.plane;
    Object.assign(o, { eq: t.eq, ask: t.ask, answer: t.answer });
    if (t.aRange) o.aRange = t.aRange;
    if (t.view) o.view = t.view;
    if (t.steps && t.steps.length) o.steps = t.steps.filter(s => s.html && s.html.trim());
    return o;
  }
  function fileText() {
    const body = tasks.map(t => JSON.stringify(clean(t), null, 2).replace(/^/gm, "  ")).join(",\n");
    return HEADER + "PL.bank.push(\n" + body + (tasks.length ? ",\n" : "") + ");\n";
  }
  $("download").addEventListener("click", () => {
    const problems = tasks.filter(t => status[t.id] && status[t.id] !== "ok").map(t => t.id);
    const ids = tasks.map(t => t.id), dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dupes.length) return alert("Номера задач повторяются: " + [...new Set(dupes)].join(", ") + ". Исправьте, чтобы номера были разными.");
    if (problems.length && !confirm(`В задачах ${problems.join(", ")} ответ не сходится или есть ошибка. Автопроверка на GitHub не пропустит такой банк на сайт. Всё равно скачать?`)) return;
    const blob = new Blob([fileText()], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "teacher.js";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("copy").addEventListener("click", async () => {
    const t = tasks[cur];
    if (!t) return;
    const txt = JSON.stringify(clean(t), null, 2) + ",";
    try { await navigator.clipboard.writeText(txt); $("copy").textContent = "Скопировано ✓"; }
    catch (e) { $("copy").textContent = "Не удалось скопировать"; }
    setTimeout(() => ($("copy").textContent = "Скопировать текущую задачу"), 1800);
  });

  if (!tasks.length) { tasks.push(blank()); cur = 0; }
  fill();
  setTimeout(() => checkAll(), 300);
})();
