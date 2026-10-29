// Рисование: сцена (кривые, решения, вспомогательные построения) и карта ответа.
PL.plot = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const { fmtNum } = PL.expr;
  const css = () => getComputedStyle(document.documentElement);
  const C = (n) => css().getPropertyValue(n).trim();
  const COUNT_COLORS = ["--ghost", "--accent", "--good", "--warm", "--target"];
  const countColor = (n) => (n === Infinity ? C("--ink") : C(COUNT_COLORS[Math.min(n, 4)]));

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // Шаг сетки: 1, 2, 5 × 10^k — чтобы линий было около дюжины при любом масштабе
  function niceStep(span) {
    const raw = span / 12, k = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / k;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * k;
  }
  // Кратные шага в отрезке [lo; hi] без накопления ошибки
  function ticks(lo, hi, step) {
    const out = [];
    for (let i = Math.ceil(lo / step - 1e-9); i * step <= hi + 1e-9; i++) out.push(+(i * step).toPrecision(12));
    return out;
  }

  // ---------- Сцена ----------
  // view: {x: [x0, x1], y: [y0, y1]}; extras: [{type: "point"|"segment"|"curve", ...}]
  function scene(svg) {
    let geom = null;

    function render(ct, view, a, opts = {}) {
      const [X0, X1] = view.x, [Y0, Y1] = view.y;
      const W = 600, H = Math.round(600 * (Y1 - Y0) / (X1 - X0)), PAD = 18;
      const k = (W - 2 * PAD) / (X1 - X0);
      const sx = (x) => PAD + (x - X0) * k, sy = (y) => H - PAD - (y - Y0) * k;
      geom = { sx, sy, k, PAD, X0, Y0, W, H };
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = "";
      const defs = el("defs", {}, svg);
      const clipId = "clip" + Math.random().toString(36).slice(2, 7);
      el("rect", { x: PAD, y: PAD, width: W - 2 * PAD, height: H - 2 * PAD }, el("clipPath", { id: clipId }, defs));

      // сетка и оси
      const step = niceStep(Math.max(X1 - X0, Y1 - Y0));
      const g = el("g", {}, svg);
      for (const x of ticks(X0, X1, step)) el("line", { x1: sx(x), y1: sy(Y0), x2: sx(x), y2: sy(Y1), stroke: C("--grid") }, g);
      for (const y of ticks(Y0, Y1, step)) el("line", { x1: sx(X0), y1: sy(y), x2: sx(X1), y2: sy(y), stroke: C("--grid") }, g);
      const ax = { stroke: C("--axis"), "stroke-width": 1.5 };
      if (Y0 < 0 && Y1 > 0) el("line", { x1: sx(X0), y1: sy(0), x2: sx(X1), y2: sy(0), ...ax }, svg);
      if (X0 < 0 && X1 > 0) el("line", { x1: sx(0), y1: sy(Y0), x2: sx(0), y2: sy(Y1), ...ax }, svg);
      const lab = { "font-size": 14, fill: C("--muted"), stroke: C("--panel"), "stroke-width": 3, "paint-order": "stroke" };
      // подписи — на оси, а если ось за краем — у края окна
      const y0 = Math.min(Math.max(0, Y0 + 1.2 / k * 14), Y1), x0 = Math.min(Math.max(0, X0 + 36 / k), X1);
      const lstep = (X1 - X0) / step > 14 ? 2 * step : step;
      for (const x of ticks(X0, X1, lstep)) {
        if (Math.abs(x) < 1e-12 || x <= X0 || x >= X1) continue;
        el("text", { x: sx(x), y: sy(y0) + 16, "text-anchor": "middle", ...lab }, svg).textContent = fmtNum(x);
      }
      for (const y of ticks(Y0, Y1, lstep)) {
        if (Math.abs(y) < 1e-12 || y <= Y0 || y >= Y1) continue;
        el("text", { x: sx(x0) - 6, y: sy(y) + 5, "text-anchor": "end", ...lab }, svg).textContent = fmtNum(y);
      }
      el("text", { x: sx(X1) - 4, y: sy(y0) - 8, "text-anchor": "end", "font-style": "italic", ...lab }, svg).textContent = "x";
      el("text", { x: sx(x0) + 8, y: sy(Y1) + 14, "font-style": "italic", ...lab }, svg).textContent = ct.plane === "xa" ? "a" : "y";

      const plot = el("g", { "clip-path": `url(#${clipId})` }, svg);
      const colors = [C("--accent"), C("--warm")];
      ct.parts.forEach((part, pi) => part.forEach((cv, ci) => {
        const hl = opts.highlight === undefined || opts.highlight === pi;
        const d = curvePath(cv, a, view, sx, sy);
        el("path", { d, fill: "none", stroke: colors[pi], "stroke-width": cv.sweep ? 2.5 : 3.5,
          "stroke-dasharray": cv.sweep ? "8 6" : "none", "stroke-linejoin": "round", "stroke-linecap": "round",
          opacity: hl ? 1 : 0.35 }, plot);
      }));
      if (ct.plane === "xa") {
        el("text", { x: sx(X1) - 6, y: sy(a) - 8, "text-anchor": "end", "font-size": 15, "font-weight": 700, fill: C("--warm"),
          stroke: C("--panel"), "stroke-width": 4, "paint-order": "stroke" }, svg).textContent = "a = " + fmtNum(a);
      }

      for (const ex of opts.extras || []) drawExtra(ex, a, plot, sx, sy);

      if (opts.solutions) {
        for (const [x, y] of opts.solutions.pts) {
          if (x < X0 || x > X1 || y < Y0 || y > Y1) continue;
          el("circle", { cx: sx(x), cy: sy(y), r: 6.5, fill: C("--good"), stroke: C("--panel"), "stroke-width": 2.5 }, svg);
        }
      }
    }

    function drawExtra(ex, a, parent, sx, sy) {
      const v = (s) => (typeof s === "number" ? s : PL.expr.compile(PL.expr.parse(String(s)), { x: "x", y: "y", a: "p" })(0, 0, a));
      const color = C(ex.color || "--target");
      if (ex.type === "point") {
        const x = v(ex.x), y = v(ex.y);
        el("circle", { cx: sx(x), cy: sy(y), r: 5, fill: color, stroke: C("--panel"), "stroke-width": 2 }, parent);
        if (ex.label) label(ex.label, sx(x), sy(y), color, parent, ex.anchor);
      } else if (ex.type === "segment") {
        const x1 = v(ex.x1), y1 = v(ex.y1), x2 = v(ex.x2), y2 = v(ex.y2);
        el("line", { x1: sx(x1), y1: sy(y1), x2: sx(x2), y2: sy(y2), stroke: color, "stroke-width": 2.5,
          "stroke-dasharray": ex.dashed === false ? "none" : "6 5" }, parent);
        if (ex.label) label(ex.label, (sx(x1) + sx(x2)) / 2, (sy(y1) + sy(y2)) / 2, color, parent, ex.anchor);
      } else if (ex.type === "curve") {
        const cv = PL.solve.compileCurve(ex.eq, "xy");
        el("path", { d: curvePath(cv, a, geomView(), sx, sy), fill: "none", stroke: color, "stroke-width": 2.5,
          "stroke-dasharray": ex.dashed ? "6 5" : "none" }, parent);
      } else if (ex.type === "label") {
        label(ex.text, sx(v(ex.x)), sy(v(ex.y)), color, parent, ex.anchor || "middle");
      }
    }
    function label(text, x, y, color, parent, anchor) {
      el("text", { x: x + (anchor === "middle" ? 0 : anchor === "end" ? -10 : 10), y: y - 10, "text-anchor": anchor || "start",
        "font-size": 15, "font-weight": 700, fill: color, stroke: C("--panel"), "stroke-width": 4, "paint-order": "stroke" }, parent)
        .textContent = text;
    }
    function geomView() {
      const { k, PAD, X0, Y0, W, H } = geom;
      return { x: [X0, X0 + (W - 2 * PAD) / k], y: [Y0, Y0 + (H - 2 * PAD) / k] };
    }
    // экранная точка → координаты (для перетаскивания)
    function toWorld(px, py) {
      const { k, PAD, X0, Y0, H } = geom;
      return [X0 + (px - PAD) / k, Y0 + (H - PAD - py) / k];
    }
    return { render, toWorld };
  }

  // Путь кривой в окне view при параметре a.
  function curvePath(cv, a, view, sx, sy) {
    const [X0, X1] = view.x, [Y0, Y1] = view.y;
    const span = Math.max(X1 - X0, Y1 - Y0);
    const ok = (x, y) => Number.isFinite(x) && Number.isFinite(y) && (!cv.dom || cv.dom(x, y, a));
    const far = (u, lo, hi) => u < lo - 3 * span || u > hi + 3 * span;
    if (cv.yOf || cv.xOf) {
      const N = 900;
      const [t0, t1] = cv.yOf ? [X0 - 1, X1 + 1] : [Y0 - 1, Y1 + 1];
      let d = "", pen = false, prev = null;
      const pts = [];
      for (let i = 0; i <= N; i++) pts.push(t0 + (t1 - t0) * i / N);
      // уточняем края области определения, чтобы полуокружности и корни доходили до конца
      const valid = (t) => { const [x, y] = xy(t); return ok(x, y); };
      for (let i = 0; i < N; i++) {
        if (valid(pts[i]) !== valid(pts[i + 1])) {
          let lo = pts[i], hi = pts[i + 1];
          const vlo = valid(lo);
          for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (valid(m) === vlo) lo = m; else hi = m; }
          pts.push(vlo ? lo : hi);
        }
      }
      pts.sort((u, w) => u - w);
      function xy(t) { return cv.yOf ? [t, cv.yOf(t, 0, a)] : [cv.xOf(0, t, a), t]; }
      for (const t of pts) {
        const [x, y] = xy(t);
        const good = ok(x, y) && !far(y, Y0, Y1) && !far(x, X0, X1);
        const jump = prev && Math.abs((cv.yOf ? y - prev[1] : x - prev[0])) > 2 * span;
        if (!good || jump) pen = false;
        if (good) { d += (pen ? "L" : "M") + sx(x).toFixed(1) + " " + sy(y).toFixed(1); pen = true; prev = [x, y]; }
      }
      return d;
    }
    // неявная кривая: марширующие квадраты
    const n = 260, dx = (X1 - X0) / n, dy = (Y1 - Y0) / n;
    const f = (x, y) => (cv.dom && !cv.dom(x, y, a) ? NaN : cv.F(x, y, a));
    let d = "";
    const row = [], next = [];
    for (let i = 0; i <= n; i++) row[i] = f(X0 + i * dx, Y0);
    for (let j = 0; j < n; j++) {
      const y0 = Y0 + j * dy, y1 = y0 + dy;
      for (let i = 0; i <= n; i++) next[i] = f(X0 + i * dx, y1);
      for (let i = 0; i < n; i++) {
        const x0 = X0 + i * dx, x1 = x0 + dx;
        const c = [[x0, y0, row[i]], [x1, y0, row[i + 1]], [x1, y1, next[i + 1]], [x0, y1, next[i]]];
        const cr = [];
        for (let k = 0; k < 4; k++) {
          const [ax, ay, fa] = c[k], [bx, by, fb] = c[(k + 1) % 4];
          if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;
          if ((fa <= 0 && fb > 0) || (fa > 0 && fb <= 0)) {
            const s = fa / (fa - fb);
            // большой скачок функции — это разрыв, а не кривая
            if (Math.abs(fa - fb) > 1e6) continue;
            cr.push([ax + s * (bx - ax), ay + s * (by - ay)]);
          }
        }
        for (let k = 0; k + 1 < cr.length; k += 2) {
          d += "M" + sx(cr[k][0]).toFixed(1) + " " + sy(cr[k][1]).toFixed(1) + "L" + sx(cr[k + 1][0]).toFixed(1) + " " + sy(cr[k + 1][1]).toFixed(1);
        }
      }
      for (let i = 0; i <= n; i++) row[i] = next[i];
    }
    return d;
  }

  // ---------- Карта ответа: ось a ----------
  // data: {segs, special} из PL.solve.map; rows: [{label, set, color}] — ответы под осью
  function answerMap(svg, onPick) {
    let st = null;
    const W = 600, PAD = 22;
    function render(range, data, a, rows = [], diff = null) {
      const [A0, A1] = range;
      const H = 86 + rows.length * 30;
      const sx = (t) => PAD + (t - A0) / (A1 - A0) * (W - 2 * PAD);
      st = { sx, A0, A1 };
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = "";
      const Y = 46;
      if (diff) for (const [u, w] of diff) {
        const x1 = sx(Math.max(u, A0)), x2 = sx(Math.min(w, A1));
        el("rect", { x: Math.min(x1, x2) - 3, y: 8, width: Math.max(6, Math.abs(x2 - x1) + 6), height: H - 12, rx: 4, fill: "#e5484d", opacity: 0.18 }, svg);
      }
      if (data) for (const s of data.segs) {
        el("line", { x1: sx(s.lo), y1: Y, x2: sx(s.hi), y2: Y, stroke: countColor(s.n), "stroke-width": 12 }, svg);
      }
      el("line", { x1: PAD, y1: Y + 14, x2: W - PAD, y2: Y + 14, stroke: C("--axis"), "stroke-width": 1.5 }, svg);
      const step = niceStep(A1 - A0);
      for (const t of ticks(A0, A1, step)) {
        el("line", { x1: sx(t), y1: Y + 10, x2: sx(t), y2: Y + 18, stroke: C("--axis") }, svg);
        el("text", { x: sx(t), y: Y + 32, "text-anchor": "middle", "font-size": 13, fill: C("--muted") }, svg).textContent = fmtNum(t);
      }
      el("text", { x: W - 4, y: Y + 4, "text-anchor": "end", "font-size": 14, "font-style": "italic", fill: C("--muted") }, svg).textContent = "a";
      // текущее a (рисуем до подписей, чтобы он их не закрывал)
      if (a !== null && a >= A0 && a <= A1) {
        el("path", { d: `M${sx(a)} ${Y - 9} l-7 -10 h14 z`, fill: C("--ink") }, svg);
      }
      if (data) {
        // Подписи: сначала отдельные точки (касания), потом границы промежутков; налезающие пропускаем.
        // два ряда подписей: если в нижнем ряду тесно — поднимаем выше
        const taken = [[], []];
        const free = (x) => taken.some(row => row.every(t => Math.abs(t - x) > 46));
        const text = (x, txt, color) => {
          const r = taken[0].every(t => Math.abs(t - x) > 46) ? 0 : 1;
          el("text", { x, y: Y - 13 - 14 * r, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: color,
            stroke: C("--panel"), "stroke-width": 3, "paint-order": "stroke" }, svg).textContent = txt;
          taken[r].push(x);
        };
        for (const s of data.special) {
          el("circle", { cx: sx(s.p), cy: Y, r: 5, fill: countColor(s.n), stroke: C("--ink"), "stroke-width": 1.5 }, svg);
          if (free(sx(s.p))) text(sx(s.p), PL.sets.label(s.p, s.label), countColor(s.n));
        }
        for (let i = 0; i < data.segs.length - 1; i++) {
          const b = data.segs[i].hi;
          if (data.special.some(s => Math.abs(s.p - b) < 1e-6)) continue;
          el("line", { x1: sx(b), y1: Y - 8, x2: sx(b), y2: Y + 8, stroke: C("--ink"), "stroke-width": 2 }, svg);
          if (free(sx(b))) text(sx(b), PL.sets.label(b), C("--ink"));
        }
      }
      rows.forEach((r, i) => drawSet(r, 106 + i * 30, sx, A0, A1));
    }
    function drawSet(r, y, sx, A0, A1) {
      const color = C(r.color);
      for (const I of r.set) {
        const lo = Math.max(I.lo, A0 - 0.5), hi = Math.min(I.hi, A1 + 0.5);
        if (hi < A0 - 0.5 || lo > A1 + 0.5) continue;
        if (Math.abs(I.hi - I.lo) > 1e-9) el("line", { x1: sx(lo), y1: y, x2: sx(hi), y2: y, stroke: color, "stroke-width": 5, "stroke-linecap": "butt" }, svg);
        for (const [t, closed] of [[I.lo, I.loC], [I.hi, I.hiC]]) {
          if (!Number.isFinite(t) || t < A0 - 0.5 || t > A1 + 0.5) continue;
          el("circle", { cx: sx(t), cy: y, r: 5.5, fill: closed ? color : C("--panel"), stroke: color, "stroke-width": 2.5 }, svg);
        }
      }
      el("text", { x: PAD, y: y - 8, "font-size": 11, fill: color, stroke: C("--panel"), "stroke-width": 3, "paint-order": "stroke" }, svg).textContent = r.label;
    }
    // клик/перетаскивание по оси меняет a
    let drag = false;
    const pick = (evt) => {
      if (!st) return;
      const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const t = st.A0 + (p.x - PAD) / (W - 2 * PAD) * (st.A1 - st.A0);
      onPick && onPick(Math.max(st.A0, Math.min(st.A1, t)));
    };
    svg.addEventListener("pointerdown", (e) => { drag = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); pick(e); });
    svg.addEventListener("pointermove", (e) => drag && pick(e));
    svg.addEventListener("pointerup", () => (drag = false));
    svg.addEventListener("pointercancel", () => (drag = false));
    return { render };
  }

  return { scene, answerMap, countColor, curvePath };
})();
