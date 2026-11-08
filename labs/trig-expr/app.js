// Страница тренажёра «Тригонометрические выражения»: подтемы, вкладки «Теория / Разборы / Тренировка»
// и модель на единичной окружности. Математика — в te.js и topics/*.js.
(function () {
  const { urlState, MINUS, fmt, frac } = Lab;
  const T = TE, $ = id => document.getElementById(id);
  const { html, FUNCS, ROMAN } = T;
  const PI = Math.PI, { rad, bounded } = T;
  const TOPICS = T.topics, horse = TOPICS.find(t => t.id === "reduction").horse;
  const TABS = ["theory", "examples", "practice"];

  // ---------- Модель: три вида ----------
  const DEFAULTS = {
    double: { deg: 30, unit: "deg" },
    reduction: { f: "sin", k: 1, s: 1, deg: 30 },
    find: { gf: "sin", v: "3/5", q: 2 },
    angle: { deg: 30, unit: "deg" },
  };
  const VALUES = {
    bounded: ["1/2", "3/5", "4/5", "5/13", "12/13", "1/3", "2/3"],
    free: ["1/2", "3/4", "4/3", "5/12", "1", "√3", "2", "3"],
  };
  // Углы модели двойного угла — только табличные: у α и 2α все значения точные
  const TABLE_DEG = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
  const nearest = (list, d) => list.reduce((best, x) => (Math.abs(x - d) < Math.abs(best - d) ? x : best));
  // Модель «угол»: табличные углы от −4 до 4 оборотов (кратные 30° или 45°)
  const ANGLES = [];
  for (let d = -1440; d <= 1440; d += 15) if (d % 30 === 0 || d % 45 === 0) ANGLES.push(d);
  // Значения из сцены или адреса — в допустимые пределы
  function clean(model, m) {
    const d = DEFAULTS[model], out = { ...d };
    if (model === "double") {
      if (Number.isFinite(+m.deg)) out.deg = nearest(TABLE_DEG, +m.deg);
      if (m.unit === "rad") out.unit = "rad";
    }
    if (model === "angle") {
      if (Number.isFinite(+m.deg)) out.deg = nearest(ANGLES, +m.deg);
      if (m.unit === "rad") out.unit = "rad";
    }
    if (model === "reduction") {
      if (FUNCS.includes(m.f)) out.f = m.f;
      if ([1, 2, 3, 4].includes(+m.k)) out.k = +m.k;
      if ([1, -1].includes(+m.s)) out.s = +m.s;
      if (Number.isFinite(+m.deg)) out.deg = Math.max(1, Math.min(89, Math.round(+m.deg)));
    }
    if (model === "find") {
      if (FUNCS.includes(m.gf)) out.gf = m.gf;
      if ([1, 2, 3, 4].includes(+m.q)) out.q = +m.q;
      let v = null;
      try { v = T.parseNum(m.v); } catch (e) { /* оставим значение по умолчанию */ }
      const ok = v && v.n > 0 && (!bounded(out.gf) || T.val(v) < 1);
      out.v = ok ? T.text(v) : bounded(out.gf) ? "3/5" : "2";
    }
    return out;
  }

  // Сцена подтемы по умолчанию: из первого раздела теории (у «Смешанных» теории нет — своя сцена)
  const firstScene = t => (t.theory.find(s => s.scene) || t).scene || { model: t.model };
  const hasTheory = t => t.theory.length > 0;
  const state = {
    topic: TOPICS.find(t => t.id === urlState.get("t", "")) || TOPICS[0],
    tab: TABS.includes(urlState.get("tab", "")) ? urlState.get("tab", "") : "theory",
    sec: 0, ex: 0, step: 0,
    model: "double", m: { ...DEFAULTS }, hide: false,
    filter: "all", taskKey: urlState.get("task", null), task: null, score: { right: 0, total: 0 },
  };
  state.ex = Math.max(0, Math.min(state.topic.examples.length - 1, urlState.getNum("ex", 0)));
  // настройка модели из адреса (?mdl=reduction&f=cos&k=3&s=-1&a=30)
  const urlModel = urlState.get("mdl", null);
  if (DEFAULTS[urlModel]) {
    state.model = urlModel;
    state.m[urlModel] = clean(urlModel, { deg: urlState.get("a"), unit: urlState.get("u"), f: urlState.get("f"), k: urlState.get("k"), s: urlState.get("s"),
      gf: urlState.get("g"), v: urlState.get("v"), q: urlState.get("q") });
    state.hide = urlState.get("h", "0") === "1";
  } else applyScene(firstScene(state.topic), false);

  function applyScene(sc, redraw = true) {
    if (!sc) return;
    const model = sc.model || state.topic.model;
    state.model = model;
    state.m[model] = clean(model, { ...DEFAULTS[model], unit: state.m[model].unit, ...sc });
    state.hide = !!sc.hide;
    if (redraw) { syncControls(); update(); }
  }

  // ---------- Управление моделью ----------
  function chips(box, items, onPick) {
    $(box).innerHTML = "";
    for (const [value, label] of items) {
      const b = document.createElement("button");
      b.className = "chip"; b.dataset.v = value; b.innerHTML = label;
      b.addEventListener("click", () => { onPick(value); update(); });
      $(box).appendChild(b);
    }
  }
  const press = (box, value) => $(box).querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === String(value)));

  // ползунок перебирает номера табличных углов; подпись пишем сами — в градусах или радианах
  const sD = Lab.slider($("dSlider"), { label: "угол α", min: 0, max: TABLE_DEG.length - 1, step: 1, value: 1,
    onInput: i => { state.m.double.deg = TABLE_DEG[i]; update(); } });
  const sDOut = sD.el.querySelector("output");
  const UNITS = [["deg", "градусы"], ["rad", "радианы"]];
  chips("dU", UNITS, u => (state.m.double.unit = u));
  const sA = Lab.slider($("aSlider"), { label: "угол x", min: 0, max: ANGLES.length - 1, step: 1, value: ANGLES.indexOf(30),
    onInput: i => { state.m.angle.deg = ANGLES[i]; update(); } });
  const sAOut = sA.el.querySelector("output");
  chips("aU", UNITS, u => (state.m.angle.unit = u));
  // шаг 1°: разборы ставят и нетабличные углы (17°, 49°) — ползунок должен показывать ровно их
  const sR = Lab.slider($("rSlider"), { label: "острый угол α, °", min: 1, max: 89, step: 1, value: 30,
    onInput: v => { state.m.reduction.deg = v; update(); } });
  chips("rF", FUNCS.map(f => [f, f]), f => (state.m.reduction.f = f));
  chips("rK", [1, 2, 3, 4].map(k => [k, T.radHTML(90 * k)]), k => (state.m.reduction.k = +k));
  chips("rS", [[1, "K + α"], [-1, `K ${MINUS} α`]], s => (state.m.reduction.s = +s));
  chips("fF", FUNCS.map(f => [f, f]), f => { state.m.find = clean("find", { ...state.m.find, gf: f }); syncControls(); });
  chips("fQ", [1, 2, 3, 4].map(q => [q, ROMAN[q - 1]]), q => (state.m.find.q = +q));
  function syncControls() {
    sD.set(TABLE_DEG.indexOf(state.m.double.deg));
    sA.set(ANGLES.indexOf(state.m.angle.deg));
    sR.set(state.m.reduction.deg);
    chips("fV", VALUES[bounded(state.m.find.gf) ? "bounded" : "free"].map(v => [T.text(T.parseNum(v)), html(T.parseNum(v))]),
      v => (state.m.find.v = v));
    $("tHide").checked = state.hide;
  }
  $("tHide").addEventListener("change", e => { state.hide = e.target.checked; update(); });
  $("reset").addEventListener("click", () => {
    const sc = state.tab === "practice" && state.task ? state.task.scene : firstScene(state.topic);
    applyScene({ ...sc, hide: false, unit: "deg" });
  });
  Lab.copyLink($("copy"));

  // ---------- Рисование ----------
  const NS = "http://www.w3.org/2000/svg", svg = $("plot"), R = 150;
  const X = x => x * R, Y = y => -y * R;
  let C;   // цвета темы
  function el(tag, attrs, parent = svg) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }
  function label(x, y, str, attrs = {}) {
    const t = el("text", { x, y, "font-size": 16, fill: C("--ink"), stroke: C("--panel"), "stroke-width": 4,
      "paint-order": "stroke", "stroke-linejoin": "round", "text-anchor": "middle", ...attrs });
    t.textContent = str;
    return t;
  }
  const pt = (t, r = 1) => [X(r * Math.cos(t)), Y(r * Math.sin(t))];
  // Дуга от угла t1 до t2 на радиусе r (растущем, если угол больше оборота)
  function arcPath(t1, t2, r, grow = 0) {
    const n = Math.max(12, Math.ceil(Math.abs(t2 - t1) / 0.05));
    let d = "";
    for (let i = 0; i <= n; i++) {
      const th = t1 + (t2 - t1) * i / n, rr = r + grow * Math.abs(th - t1) / (2 * PI);
      const [x, y] = pt(th, rr);
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d;
  }
  function marker(id, color) {
    const m = el("marker", { id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, svg.querySelector("defs"));
    el("path", { d: "M0 0 L10 5 L0 10 z", fill: color }, m);
  }
  function base(E) {
    svg.setAttribute("viewBox", `${-E * R} ${-E * R} ${2 * E * R} ${2 * E * R}`);
    const A = E - 0.06, ax = { stroke: C("--axis"), "stroke-width": 1.5 };
    el("line", { x1: X(-A), y1: 0, x2: X(A), y2: 0, ...ax, "marker-end": "url(#arAx)" });
    el("line", { x1: 0, y1: Y(-A), x2: 0, y2: Y(A), ...ax, "marker-end": "url(#arAx)" });
    const tick = { "font-size": 13, fill: C("--muted") };
    // подписи 1 и −1 — внутри круга, чтобы не спорить с подписями точек снаружи
    label(X(1) - 8, 18, "1", tick); label(X(-1) + 12, 18, MINUS + "1", tick);
    label(8, Y(1) + 18, "1", { ...tick, "text-anchor": "start" }); label(8, Y(-1) - 8, MINUS + "1", { ...tick, "text-anchor": "start" });
    label(X(A) - 4, 20, "x", { ...tick, "font-style": "italic" }); label(14, Y(A) + 10, "y", { ...tick, "font-style": "italic" });
    el("circle", { cx: 0, cy: 0, r: R, fill: "none", stroke: C("--ink"), "stroke-width": 2 });
  }
  function sector(q, color, opacity) {
    const t1 = (q - 1) * PI / 2, t2 = q * PI / 2;
    el("path", { d: "M0 0 " + arcPath(t1, t2, 1).replace("M", "L") + " Z", fill: color, opacity });
  }
  const dot = (t, color, r = 8) => { const [x, y] = pt(t); el("circle", { cx: x, cy: y, r, fill: color, stroke: C("--panel"), "stroke-width": 3 }); };
  const ray = (t, color, w = 2.5, dash) => { const [x, y] = pt(t); el("line", { x1: 0, y1: 0, x2: x, y2: y, stroke: color, "stroke-width": w, ...(dash ? { "stroke-dasharray": dash } : {}) }); };
  // Подпись снаружи окружности в направлении угла t
  function outside(t, str, attrs = {}, gap = 22) {
    const c = Math.cos(t), s = Math.sin(t);
    const [x, y] = pt(t);
    return label(x + c * gap, y - s * gap + 6, str, { "text-anchor": Math.abs(c) < 0.4 ? "middle" : c > 0 ? "start" : "end", ...attrs });
  }
  // Число: точно, если табличное, иначе с тремя знаками
  const numHTML = x => { const e = T.exact(x); return e ? html(e) : fmt(x, 3); };

  function drawDouble() {
    const { deg } = state.m.double, a = rad(deg), b = 2 * a, acc = C("--accent"), warm = C("--warm");
    base(1.5);
    const [bx, by] = pt(b);
    const dash = { stroke: warm, "stroke-width": 1.5, "stroke-dasharray": "5 5" };
    el("line", { x1: bx, y1: by, x2: bx, y2: 0, ...dash });
    el("line", { x1: bx, y1: by, x2: 0, y2: by, ...dash });
    if (!state.hide) {
      el("circle", { cx: bx, cy: 0, r: 4.5, fill: warm });
      el("circle", { cx: 0, cy: by, r: 4.5, fill: warm });
    }
    if (deg > 0) {
      el("path", { d: arcPath(0, a, 0.22), fill: "none", stroke: acc, "stroke-width": 2.5, "marker-end": "url(#arA)" });
      el("path", { d: arcPath(0, b, 0.36, 0.08), fill: "none", stroke: warm, "stroke-width": 2.5, "marker-end": "url(#arB)" });
    }
    ray(a, acc); ray(b, warm);
    dot(a, acc); dot(b, warm);
    const lbl = { "font-weight": 700, "font-size": 19, "font-style": "italic" };
    if (Math.cos(b - a) > 0.999) outside(a, "α = 2α", { ...lbl, fill: warm });   // точки совпали (α = 0°, 360°)
    else { outside(a, "α", { ...lbl, fill: acc }); outside(b, "2α", { ...lbl, fill: warm }); }
  }

  function drawReduction() {
    const { f, k, s, deg } = state.m.reduction, r = T.reduce(f, k, s), K = k * PI / 2, t = K + s * rad(deg);
    const acc = C("--accent"), warm = C("--warm"), good = C("--good");
    sector(r.q, acc, state.hide ? 0 : 0.13);
    base(1.55);
    if (!state.hide) {
      // знаки исходной функции по четвертям; нужная четверть — ярко
      for (let q = 1; q <= 4; q++) {
        const [x, y] = pt((q - 0.5) * PI / 2, 0.62);
        label(x, y + 11, T.signIn(f, q) > 0 ? "+" : MINUS, { "font-size": 32, "font-weight": 700, fill: q === r.q ? acc : C("--axis"), stroke: "none", opacity: q === r.q ? 1 : 0.6 });
      }
      const [x1, y1, x2, y2] = r.vertical ? [0, Y(-1.38), 0, Y(1.38)] : [X(-1.38), 0, X(1.38), 0];
      el("line", { x1, y1, x2, y2, stroke: r.vertical ? good : warm, "stroke-width": 7, opacity: 0.45, "stroke-linecap": "round" });
      label(r.vertical ? 12 : X(1.4), r.vertical ? Y(-1.36) : -12, r.vertical ? "«да» — меняем" : "«нет» — та же",
        { "font-size": 14, fill: r.vertical ? good : warm, "font-weight": 700, "text-anchor": r.vertical ? "start" : "end" });
    }
    // K — кольцо, α — серая точка, K ± α — синяя, дуга от K к K ± α — оранжевая
    const [kx, ky] = pt(K);
    ray(rad(deg), C("--muted"), 1.5, "5 5");
    el("circle", { cx: pt(rad(deg))[0], cy: pt(rad(deg))[1], r: 5, fill: C("--muted") });
    outside(rad(deg), "α", { fill: C("--muted"), "font-style": "italic", "font-size": 16 }, 12);
    el("path", { d: arcPath(K, t, 1.1), fill: "none", stroke: warm, "stroke-width": 3, "marker-end": "url(#arB)" });
    el("circle", { cx: kx, cy: ky, r: 9, fill: C("--panel"), stroke: C("--ink"), "stroke-width": 3 });
    if (deg >= 25) outside(K, T.radText(90 * k), { "font-weight": 700, "font-size": 16 }, Math.abs(Math.cos(K)) < 0.5 ? 18 : 16);
    else label(kx - Math.cos(K) * 30, ky + Math.sin(K) * 30 + 6, T.radText(90 * k), { "font-weight": 700, "font-size": 16 });   // α мал — подпись K внутрь, чтобы не слиться с K ± α
    ray(t, acc); dot(t, acc);
    outside(t, `${T.radText(90 * k)} ${s > 0 ? "+" : MINUS} α`, { fill: acc, "font-weight": 700, "font-size": 16 }, 30);
  }

  function findVals() {
    const { gf, v, q } = state.m.find;
    const given = T.times(T.signIn(gf, q), T.parseNum(v));
    return { given, ...T.solveFrom(gf, given, q) };
  }
  function drawFind() {
    const { gf, q } = state.m.find, { vals } = findVals(), c = T.val(vals.cos), s = T.val(vals.sin), t = Math.atan2(s, c);
    const acc = C("--accent"), warm = C("--warm");
    sector(q, acc, 0.1);
    base(1.5);
    const hid = h => state.hide && h !== gf;   // скрыто всё, кроме данного
    const [px, py] = pt(t);
    el("line", { x1: 0, y1: 0, x2: px, y2: 0, stroke: acc, "stroke-width": 5, "stroke-linecap": "round" });
    el("line", { x1: px, y1: 0, x2: px, y2: py, stroke: warm, "stroke-width": 5, "stroke-linecap": "round" });
    const sx = c > 0 ? -1 : 1, sy = s > 0 ? -1 : 1, m = 12;   // уголок прямого угла — внутрь треугольника
    el("path", { d: `M${px + sx * m} 0 L${px + sx * m} ${sy * m} L${px} ${sy * m}`, fill: "none", stroke: C("--ink"), "stroke-width": 1.5 });
    ray(t, C("--ink"), 2.5);
    el("path", { d: arcPath(0, t < 0 ? t + 2 * PI : t, 0.13), fill: "none", stroke: C("--muted"), "stroke-width": 2, "marker-end": "url(#arM)" });
    dot(t, acc);
    const absT = h => (hid(h) ? "?" : T.text(T.abs(vals[h])));
    label(px / 2, s > 0 ? 22 : -10, `|cos α| = ${absT("cos")}`, { fill: acc, "font-weight": 700, "font-size": 15 });
    label(px + (c > 0 ? 10 : -10), py / 2 + 5, `|sin α| = ${absT("sin")}`, { fill: warm, "font-weight": 700, "font-size": 15, "text-anchor": c > 0 ? "start" : "end" });
    // «1» у гипотенузы — с той стороны, где нет третьей вершины треугольника
    const side = c * s > 0 ? 1 : -1, nx = -s * side, ny = c * side;
    label(X(c / 2 + 0.11 * nx), Y(s / 2 + 0.11 * ny) + 6, "1", { "font-size": 16, "font-weight": 700 });
    outside(t, "α", { fill: acc, "font-style": "italic", "font-weight": 700, "font-size": 18 }, 16);
  }

  // Угол любой величины: спираль поворота, точка, проекции (cos — синяя, sin — оранжевая)
  function drawAngle() {
    const { deg, unit } = state.m.angle, t = rad(deg), acc = C("--accent"), warm = C("--warm");
    base(1.5);
    const [px, py] = pt(t);
    if (!state.hide) {
      const dash = { stroke: C("--muted"), "stroke-width": 1.5, "stroke-dasharray": "5 5" };
      el("line", { x1: px, y1: py, x2: px, y2: 0, ...dash });
      el("line", { x1: px, y1: py, x2: 0, y2: py, ...dash });
      el("line", { x1: 0, y1: 0, x2: px, y2: 0, stroke: acc, "stroke-width": 5, "stroke-linecap": "round" });
      el("line", { x1: 0, y1: 0, x2: 0, y2: py, stroke: warm, "stroke-width": 5, "stroke-linecap": "round" });
    }
    if (deg !== 0) el("path", { d: arcPath(0, t, 0.16, 0.07), fill: "none", stroke: C("--muted"), "stroke-width": 2, "marker-end": "url(#arM)" });
    ray(t, C("--ink")); dot(t, acc);
    outside(t, unit === "rad" ? T.radText(deg) : T.degText(deg), { fill: acc, "font-weight": 700, "font-size": 17 });
  }

  function draw() {
    svg.innerHTML = "";
    const css = getComputedStyle(document.documentElement);
    C = n => css.getPropertyValue(n).trim();
    el("defs", {});
    marker("arAx", C("--axis")); marker("arA", C("--accent")); marker("arB", C("--warm")); marker("arM", C("--muted"));
    ({ double: drawDouble, reduction: drawReduction, find: drawFind, angle: drawAngle })[state.model]();
  }

  // ---------- Тексты модели ----------
  const Q = (s, hide) => (hide ? "?" : s);
  function doubleTexts() {
    const { deg, unit } = state.m.double, a = rad(deg), h = state.hide, A = x => T.angHTML(x, unit);
    sDOut.innerHTML = A(deg);
    $("formula").innerHTML = `α = ${A(deg)},&ensp;<span class="c-b">2α = ${A(2 * deg)}</span>`;
    // углы табличные — считаем точно: подставляем числа в формулы, отрицательные — в скобках
    const { par, mul, sq, sub, div, times, ONE } = T;
    const s = T.exact(Math.sin(a)), c = T.exact(Math.cos(a)), tg = T.exact(T.FN.tg(a));
    const s2 = times(2, mul(s, c)), c2 = sub(sq(c), sq(s));
    const tgLine = T.isZero(c2) ? "tg 2α не существует (cos 2α = 0)"
      : !tg   // α = 90°, 270°: tg α не существует
        ? `tg 2α = ${frac("sin 2α", "cos 2α")} = ${Q(html(div(s2, c2)), h)} <span class="note">(tg α не существует — формула через tg α не годится)</span>`
        : `tg 2α = ${frac("2 tg α", `1 ${MINUS} tg²α`)} = ${frac(`2 · ${par(tg)}`, `1 ${MINUS} ${html(sq(tg))}`)} = ${Q(html(div(times(2, tg), sub(ONE, sq(tg)))), h)}`;
    const two = times(2, s), same = T.same(two, s2);
    const rows = [
      `<span class="c-b">sin 2α</span> = 2 sin α cos α = 2 · ${par(s)} · ${par(c)} = ${Q(html(s2), h)}`,
      `<span class="c-b">cos 2α</span> = cos²α ${MINUS} sin²α = ${html(sq(c))} ${MINUS} ${html(sq(s))} = ${Q(html(c2), h)}`,
      tgLine,
      `<span class="trap">для сравнения: 2 sin α = ${html(two)}${same ? "" : " — это не sin 2α"}</span>`,
    ];
    $("vals").innerHTML = rows.map(r => `<div>${r}</div>`).join("");
  }
  function reductionTexts() {
    const { f, k, s, deg } = state.m.reduction, h = horse(f, k, s, "rad"), r = h.r;
    $("formula").innerHTML = state.hide ? `${f}(${T.argHTML(k, s, "rad")}) = ?` : h.result;
    const t = rad(90 * k + s * deg), x = T.degText(90 * k + s * deg);
    const rows = [];
    if (!state.hide) rows.push(`<ol class="rule">${h.lines.map(l => `<li>${l}</li>`).join("")}</ol>`);
    rows.push(`<div class="note">проверка при α = ${deg}°:</div>`,
      `<div>${f} ${x} = ${Q(numHTML(T.FN[f](t)), state.hide)};&ensp;${T.termHTML(r.sign, r.g, T.degText(deg))} = ${Q(numHTML(r.sign * T.FN[r.g](rad(deg))), state.hide)}</div>`);
    $("vals").innerHTML = rows.join("");
  }
  function findTexts() {
    const { gf, q } = state.m.find, { given, vals } = findVals(), h = state.hide;
    $("formula").innerHTML = `${gf} α = ${html(given)},&ensp;α ∈ ${T.quarterHTML(q, "rad")}`;
    const rows = [`<div class="row">${FUNCS.filter(f => f !== gf).map(f => `<span>${f} α = ${Q(html(vals[f]), h)}</span>`).join("")}</div>`];
    rows.unshift(`<div class="note">${ROMAN[q - 1]} четверть: sin ${T.signIn("sin", q) > 0 ? "+" : MINUS}, cos ${T.signIn("cos", q) > 0 ? "+" : MINUS}, tg и ctg ${T.signIn("tg", q) > 0 ? "+" : MINUS}</div>`);
    if (state.topic.id === "double") {
      const D = T.doubles(vals);
      rows.push(`<div class="row c-b"><span>sin 2α = ${Q(html(D.sin), h)}</span><span>cos 2α = ${Q(html(D.cos), h)}</span>${D.tg ? `<span>tg 2α = ${Q(html(D.tg), h)}</span>` : ""}</div>`);
    }
    $("vals").innerHTML = rows.join("");
  }

  function angleTexts() {
    const { deg, unit } = state.m.angle, A = x => T.angHTML(x, unit), h = state.hide, t = rad(deg);
    sAOut.innerHTML = A(deg);
    $("formula").innerHTML = `x = ${A(deg)}`;
    // ближайшее целое число оборотов: −750° = −720° − 30°, 31π/4 = 8π − π/4
    const n = Math.round(deg / 360), r = deg - 360 * n, q = T.quarterOf(deg);
    const rows = [];
    if (n !== 0) rows.push(`<div class="note">${A(deg)} = ${A(360 * n)}${r ? ` ${r < 0 ? MINUS : "+"} ${A(Math.abs(r))}` : ""} — ` +
      `${Math.abs(n)} ${Math.abs(n) === 1 ? "оборот" : "оборота"}${r ? `, та же точка, что ${A(r)}` : ", та же точка, что 0"}</div>`);
    rows.push(`<div class="note">${q ? ROMAN[q - 1] + " четверть" : "точка на оси"}</div>`);
    rows.push(`<div class="row">${FUNCS.map(f => {
      const v = T.FN[f](t), cls = { sin: ' class="c-b"', cos: ' class="c-a"' }[f] || "";
      return `<span${cls}>${f} x ${Number.isNaN(v) ? "не существует" : "= " + Q(html(T.exact(v)), h)}</span>`;
    }).join("")}</div>`);
    $("vals").innerHTML = rows.join("");
  }

  // ---------- Обновление модели ----------
  function update() {
    const md = state.model;
    document.querySelectorAll("[data-model]").forEach(c => (c.hidden = c.dataset.model !== md));
    const m = state.m[md];
    if (md === "double") press("dU", m.unit);
    if (md === "angle") press("aU", m.unit);
    if (md === "reduction") { press("rF", m.f); press("rK", m.k); press("rS", m.s); }
    if (md === "find") { press("fF", m.gf); press("fV", m.v); press("fQ", m.q); }
    $("tHide").checked = state.hide;
    ({ double: doubleTexts, reduction: reductionTexts, find: findTexts, angle: angleTexts })[md]();
    const inPractice = state.tab === "practice";
    urlState.set({
      t: state.topic.id, tab: state.tab === "theory" ? null : state.tab,
      ex: state.tab === "examples" ? state.ex : null, task: inPractice ? state.taskKey : null,
      mdl: inPractice ? null : md,
      a: !inPractice && md !== "find" ? m.deg : null,
      u: !inPractice && m.unit === "rad" ? "rad" : null,
      f: !inPractice && md === "reduction" ? m.f : null, k: !inPractice && md === "reduction" ? m.k : null,
      s: !inPractice && md === "reduction" ? m.s : null,
      g: !inPractice && md === "find" ? m.gf : null, v: !inPractice && md === "find" ? m.v : null,
      q: !inPractice && md === "find" ? m.q : null, h: !inPractice && state.hide ? 1 : null,
    });
    draw();
  }

  // ---------- Навигация и текст ----------
  function renderNav() {
    $("topics").innerHTML = "";
    for (const t of TOPICS) {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = t.title;
      b.setAttribute("aria-pressed", t === state.topic);
      b.addEventListener("click", () => {
        Object.assign(state, { topic: t, ex: 0, step: 0, sec: 0, taskKey: null, task: null, filter: "all" });
        applyScene(firstScene(t), false);
        render();
      });
      $("topics").appendChild(b);
    }
    $("tabs").querySelectorAll(".chip").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.tab === state.tab);
      b.hidden = b.dataset.tab === "theory" && !hasTheory(state.topic);   // «Смешанные задания» — без теории
    });
  }
  $("tabs").querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
    state.tab = b.dataset.tab;
    if (state.tab !== "practice") applyScene(state.tab === "examples" ? sceneAt(state.topic.examples[state.ex], state.step) : firstScene(state.topic), false);
    render();
  }));
  function render() {
    if (state.tab === "theory" && !hasTheory(state.topic)) state.tab = "examples";
    document.querySelector(".te").dataset.tab = state.tab;
    renderNav();
    showStage(true);
    $("text").innerHTML = "";
    ({ theory: renderTheory, examples: renderExamples, practice: renderPractice })[state.tab]();
    syncControls();
    update();
  }
  function showStage(on) { $("stageCard").hidden = !on; $("stageHidden").hidden = on; }
  const narrow = () => window.matchMedia("(max-width: 860px)").matches;
  // «Показать на модели»: на телефоне модель над текстом — прокручиваем к ней
  function showScene(sc) {
    applyScene(sc);
    if (narrow()) $("stageCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function card(cls, inner) {
    const c = document.createElement("div");
    c.className = "card " + cls; c.innerHTML = inner;
    $("text").appendChild(c);
    return c;
  }
  function button(parent, text, onClick, cls = "btn") {
    const b = document.createElement("button");
    b.className = cls; b.textContent = text;
    b.addEventListener("click", onClick);
    parent.appendChild(b);
    return b;
  }

  // ---------- Теория + «Задания» ----------
  function renderTheory() {
    const t = state.topic;
    t.theory.forEach((sec, i) => {
      const c = card("sec" + (i === state.sec ? " active" : ""), `<h3>${sec.title}</h3>${sec.html}`);
      if (sec.scene) button(c, "Показать на модели", () => { state.sec = i; markSec(); showScene(sec.scene); });
    });
    const c = card("tasks", `<h2>Задания</h2><ol>${t.tasks.map((k, i) => `<li>${k.html}` +
      (k.scene ? `<div><button class="btn" data-i="${i}">Проверить на модели</button></div>` : "") +
      (k.answer ? `<details><summary>Ответ</summary>${k.answer}</details>` : "") + "</li>").join("")}</ol>`);
    c.querySelectorAll("button[data-i]").forEach(b => b.addEventListener("click", () => {
      state.sec = -1; markSec(); showScene(t.tasks[+b.dataset.i].scene);
    }));
  }
  function markSec() { [...$("text").querySelectorAll(".sec")].forEach((c, i) => c.classList.toggle("active", i === state.sec)); }

  // ---------- Разборы ----------
  // Сцена шага — последняя заданная на этом шаге или раньше
  function sceneAt(ex, i) {
    for (let j = i; j >= 0; j--) if (ex.steps[j].scene) return ex.steps[j].scene;
    return firstScene(state.topic);
  }
  function renderExamples() {
    const nav = document.createElement("div");
    nav.className = "chips";
    state.topic.examples.forEach((e, i) => {
      const b = button(nav, `Разбор ${i + 1}. ${e.title}`, () => { state.ex = i; state.step = 0; applyScene(sceneAt(e, 0), false); render(); }, "chip");
      b.setAttribute("aria-pressed", i === state.ex);
    });
    $("text").appendChild(nav);
    const ex = state.topic.examples[state.ex];
    const c = card("ex", `<h3>${ex.title}</h3><p>${ex.text}</p><ol class="steps" id="steps"></ol>
      <div class="btn-row"><button class="btn" id="prev">← Назад</button><button class="btn primary" id="next">Дальше →</button>
      <button class="btn" id="restart">Сначала</button></div>`);
    c.querySelector("#prev").addEventListener("click", () => goStep(state.step - 1));
    c.querySelector("#next").addEventListener("click", () => goStep(state.step + 1));
    c.querySelector("#restart").addEventListener("click", () => goStep(0));
    goStep(state.step, false);
  }
  function goStep(i, redraw = true) {
    const ex = state.topic.examples[state.ex];
    state.step = Math.max(0, Math.min(ex.steps.length - 1, i));
    $("steps").innerHTML = ex.steps.slice(0, state.step + 1).map((s, k) => `<li class="${k === state.step ? "cur" : ""}">${s.html}</li>`).join("");
    $("prev").disabled = state.step === 0;
    $("next").disabled = state.step === ex.steps.length - 1;
    applyScene(sceneAt(ex, state.step), redraw);
  }

  // ---------- Тренировка ----------
  function randomKey() {
    const gens = state.topic.generators.filter(g => state.filter === "all" || g.id === state.filter);
    let key;
    do key = `${T.pick(Math.random, gens).id}.${Math.floor(Math.random() * 1e6)}`; while (key === state.taskKey);
    return key;
  }
  function taskFromKey(key) {
    const [id, seed] = String(key || "").split(".");
    const g = state.topic.generators.find(x => x.id === id);
    return g && Number.isFinite(+seed) ? { ...g.make(T.rng(+seed)), source: g.title, key } : null;
  }
  function renderPractice() {
    if (!state.task || state.task.key !== state.taskKey) {
      state.task = taskFromKey(state.taskKey);
      if (!state.task) { state.taskKey = randomKey(); state.task = taskFromKey(state.taskKey); }
      state.task.done = false;
    }
    const t = state.task;
    const nav = document.createElement("div");
    nav.className = "chips";
    for (const [id, title] of [["all", "Все задачи"], ...state.topic.generators.map(g => [g.id, g.title])]) {
      const b = button(nav, title, () => { state.filter = id; nextTask(); }, "chip");
      b.setAttribute("aria-pressed", state.filter === id);
    }
    $("text").appendChild(nav);

    const c = card("", `<div class="src-note">Тренировка: ${t.source.toLowerCase()}</div><div class="task-q">${t.text}</div>
      <div id="answerBox"></div><div class="status" id="status"></div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn" id="giveup">Показать ответ</button><button class="btn" id="another">Другая задача</button>
      </div><p class="score" id="score"></p>`);
    const box = c.querySelector("#answerBox");
    if (t.kind === "input") {
      box.innerHTML = `<div class="ans-row"><input id="ans" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
          aria-label="Ответ" placeholder="например, −2√6/5"><button class="btn primary" id="check">Проверить</button></div>
        <div class="keys" id="keys"></div>`;
      const inp = box.querySelector("#ans");
      for (const k of ["√", "/", "−", "(", ")", "⌫"]) {
        button(box.querySelector("#keys"), k, () => {
          const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? s;
          if (k === "⌫") { if (s !== e) inp.setRangeText("", s, e, "end"); else if (s > 0) inp.setRangeText("", s - 1, s, "end"); }
          else inp.setRangeText(k, s, e, "end");
          inp.focus();
        });
      }
      box.querySelector("#check").addEventListener("click", checkInput);
      inp.addEventListener("keydown", e => { if (e.key === "Enter") (t.done ? nextTask() : checkInput()); });
    } else {
      box.innerHTML = `<div class="opts" id="opts"></div>`;
      t.options.forEach((o, i) => button(box.querySelector("#opts"), "", () => choose(i), "btn opt").innerHTML = o.html);
    }
    c.querySelector("#giveup").addEventListener("click", () => finish(null));
    c.querySelector("#another").addEventListener("click", nextTask);
    const sol = card("", "");
    sol.id = "solution"; sol.hidden = true;
    showStage(false);
    showScore();
  }
  function nextTask() {
    state.taskKey = randomKey();
    state.task = null;
    render();
  }
  function status(kind, text) { $("status").className = "status " + kind; $("status").innerHTML = text; }
  function showScore() { $("score").textContent = state.score.total ? `Верно с первой попытки: ${state.score.right} из ${state.score.total}` : ""; }
  function checkInput() {
    const t = state.task;
    if (t.done) return;
    const r = T.checkInput($("ans").value, t.answer);
    if (r.error) return status("miss", r.error);
    finish(r.ok, r.approx);
  }
  function choose(i) {
    const t = state.task;
    if (t.done) return;
    t.chosen = i;
    finish(i === t.correct);
  }
  // ok: true / false — ответ ученика, null — «Показать ответ»
  function finish(ok, approx) {
    const t = state.task;
    t.done = true;
    state.score.total++;
    if (ok) state.score.right++;
    const right = t.kind === "input" ? html(t.answer) : t.options[t.correct].html;
    status(ok ? "win" : "miss", ok ? "Верно!" : `${ok === null ? "Ответ" : "Неверно. Правильный ответ"}: <span class="math">${right}</span>` +
      (approx ? "<br>Число похоже, но ответ нужен точный — через √ и дробь." : ""));
    if (t.kind === "options") {
      document.querySelectorAll("#opts .opt").forEach((b, i) => {
        b.disabled = true;
        if (i === t.correct) b.classList.add("right");
        else if (i === t.chosen) b.classList.add("wrong");
      });
    }
    const sol = $("solution");
    sol.hidden = false;
    sol.innerHTML = `<h2>Решение</h2><ol class="steps">${t.steps.map(s => `<li class="cur">${s}</li>`).join("")}</ol>`;
    showScore();
    showStage(true);
    applyScene({ ...t.scene, hide: false });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", draw);
  window.TEPage = { task: () => state.task };   // для автопроверки тренировки
  render();
})();
