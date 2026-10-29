// Сцена тренажёра: график, формулы, ползунок a, «Прокрутить», «Сбросить», карта ответа.
// Элементы на странице: #eqs, #plot, #count, #aSlider, #play, #reset, #map, #legend.
// opts0: { onA(a) — a изменил пользователь, view() — окно графика по умолчанию }
PL.stage = function (opts0 = {}) {
  const E = PL.expr, S = PL.sets, V = PL.solve;
  const $ = (id) => document.getElementById(id);
  const num = (v) => (typeof v === "string" ? E.value(v) : v);

  const plot = PL.plot.scene($("plot"));
  const amap = PL.plot.answerMap($("map"), (t) => setA(snap(t), true));
  const scene = { ct: null, view: null, a: 0, extras: [], highlight: undefined, map: null, special: [], rows: [], diff: null };
  let slider = null;

  function setScene(task, opts = {}) {
    stopPlay();
    let ct;
    try { ct = V.compileTask(task); } catch (e) {
      scene.ct = null; scene.task = null; $("plot").innerHTML = ""; $("map").innerHTML = ""; $("eqs").innerHTML = "";
      $("count").textContent = "Ошибка в задаче: " + e.message;
      return e.message;
    }
    const sameTask = scene.ct && scene.task === task && !opts.fresh;
    scene.task = task;
    scene.ct = ct;
    // новая задача — исходный вид; шаги той же задачи сохраняют приближение
    scene.baseView = task.view || (opts0.view && opts0.view()) || { x: [-6, 6], y: [-6, 6] };
    if (!sameTask || !scene.view) scene.view = { x: [...scene.baseView.x], y: [...scene.baseView.y] };
    scene.extras = opts.extras || task.extras || [];
    scene.highlight = opts.highlight;
    const answer = opts.answer ? S.parse(opts.answer).set : null;
    scene.special = answer ? S.boundaries(answer).filter(b => Number.isFinite(b.v)) : [];
    scene.rows = opts.rows || [];
    scene.diff = opts.diff || null;
    if (!sameTask || !scene.map) {
      // диапазон a: заданный в задаче или подобранный по особым точкам
      scene.fit = ct.aRange || V.fitRange(ct, scene.special.map(b => b.v));
      setRange(scene.fit);
    } else scene.map.special = V.mergeSpecial(scene.found, V.specialAt(ct, scene.special, scene.range));
    const r = scene.range;
    let a = opts.a !== undefined ? num(opts.a) : task.a !== undefined ? num(task.a) : NaN;
    if (!Number.isFinite(a)) {
      // по умолчанию — внутри самого «интересного» куска (где решения есть), иначе середина
      const good = scene.map.segs.find(sg => sg.n !== 0 && sg.hi - sg.lo > (r[1] - r[0]) * 0.02);
      a = good ? +((good.lo + good.hi) / 2).toFixed(2) : (r[0] + r[1]) / 2;
    }
    // если нужное a за краем диапазона — расширяем
    if (a < r[0] || a > r[1]) setRange([Math.min(r[0], Math.floor(a) - 1), Math.max(r[1], Math.ceil(a) + 1)]);
    scene.a0 = a;
    setA(a, false);
    return null;
  }
  $("reset").addEventListener("click", () => { stopPlay(); setA(scene.a0, true); });

  // ---------- Приближение и сдвиг графика ----------
  // Кнопки «+ / − / исходный вид», колёсико мыши, перетаскивание, щипок двумя пальцами.
  const svg = $("plot");
  const zoomRow = document.createElement("div");
  zoomRow.className = "zoom-row";
  zoomRow.innerHTML = `<button class="btn" data-z="in" title="Приблизить" aria-label="Приблизить">＋</button>
    <button class="btn" data-z="out" title="Отдалить" aria-label="Отдалить">−</button>
    <button class="btn" data-z="home" title="Вернуть исходный масштаб">Исходный вид</button>
    <span class="zoom-hint">колёсико или два пальца — масштаб, перетаскивание — сдвиг</span>`;
  svg.parentNode.insertBefore(zoomRow, svg);
  zoomRow.addEventListener("click", (e) => {
    const z = e.target.closest("button") && e.target.closest("button").dataset.z;
    if (!z || !scene.view) return;
    if (z === "home") scene.view = { x: [...scene.baseView.x], y: [...scene.baseView.y] };
    else zoom(z === "in" ? 0.6 : 1 / 0.6);
    draw();
  });
  function center() { return [(scene.view.x[0] + scene.view.x[1]) / 2, (scene.view.y[0] + scene.view.y[1]) / 2]; }
  function zoom(f, cx, cy) {
    const v = scene.view, span = v.x[1] - v.x[0];
    f = Math.min(Math.max(f, 0.5 / span), 1000 / span); // не мельче 0,5 и не крупнее 1000 по ширине
    if (cx === undefined) [cx, cy] = center();
    v.x = [cx + (v.x[0] - cx) * f, cx + (v.x[1] - cx) * f];
    v.y = [cy + (v.y[0] - cy) * f, cy + (v.y[1] - cy) * f];
  }
  const world = (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return plot.toWorld(q.x, q.y);
  };
  svg.addEventListener("wheel", (e) => {
    if (!scene.ct) return;
    e.preventDefault();
    const [x, y] = world(e);
    zoom(Math.exp(e.deltaY * 0.0015), x, y);
    draw();
  }, { passive: false });
  // для каждого пальца: экранные координаты и точка графика под ним в начале движения
  const ptrs = new Map();
  let pinchDist = 0;
  const screenDist = () => { const [p, q] = [...ptrs.values()]; return Math.hypot(p.cx - q.cx, p.cy - q.cy); };
  svg.addEventListener("pointerdown", (e) => {
    if (!scene.ct) return;
    svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { cx: e.clientX, cy: e.clientY, w: world(e) });
    if (ptrs.size === 2) pinchDist = screenDist();
  });
  svg.addEventListener("pointermove", (e) => {
    const P = ptrs.get(e.pointerId);
    if (!P) return;
    P.cx = e.clientX; P.cy = e.clientY;
    if (ptrs.size === 1) {
      // сдвигаем окно так, чтобы точка под пальцем осталась под ним
      const now = world(e), dx = P.w[0] - now[0], dy = P.w[1] - now[1];
      scene.view.x = scene.view.x.map(v => v + dx);
      scene.view.y = scene.view.y.map(v => v + dy);
      draw();
    } else if (ptrs.size === 2) {
      const d = screenDist();
      if (d > 0 && pinchDist > 0) {
        const [p, q] = [...ptrs.values()];
        const [mx, my] = world({ clientX: (p.cx + q.cx) / 2, clientY: (p.cy + q.cy) / 2 });
        zoom(pinchDist / d, mx, my);
        draw();
      }
      pinchDist = d;
    }
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    // остался один палец — продолжаем сдвиг от его текущего положения
    for (const [id, P] of ptrs) P.w = world({ clientX: P.cx, clientY: P.cy });
  };
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);

  // Новый диапазон a: пересчитываем карту и ползунок
  function setRange(range) {
    scene.range = range;
    scene.map = V.map(scene.ct, range, { special: scene.special });
    scene.found = scene.map.special;
    buildSlider(range);
  }
  // «Шире / Уже / Подобрать» для оси a
  const rangeRow = document.createElement("div");
  rangeRow.className = "zoom-row range-row";
  rangeRow.innerHTML = `<span class="zoom-hint">Диапазон <i>a</i>:</span>
    <button class="btn" data-r="wide" title="Показать больше значений a">Шире</button>
    <button class="btn" data-r="narrow" title="Показать меньше значений a">Уже</button>
    <button class="btn" data-r="fit" title="Подобрать по особым точкам">Подобрать</button>`;
  $("legend").parentNode.insertBefore(rangeRow, $("legend"));
  rangeRow.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !scene.ct) return;
    const [r0, r1] = scene.range, c = (r0 + r1) / 2, h = (r1 - r0) / 2;
    const k = { wide: 2, narrow: 0.5 }[b.dataset.r];
    let r = b.dataset.r === "fit" ? scene.fit : [c - h * k, c + h * k];
    if (r[1] - r[0] < 0.2) return;
    r = r.map(v => +v.toPrecision(10));
    stopPlay();
    setRange(r);
    setA(Math.max(r[0], Math.min(r[1], scene.a)), false);
  });

  function buildSlider([a0, a1]) {
    const box = $("aSlider");
    box.innerHTML = "";
    const span = a1 - a0, step = +Math.max(1e-4, Math.pow(10, Math.floor(Math.log10(span)) - 3)).toPrecision(1);
    // рядом с отдельной точкой (касанием) ползунок «прилипает» к ней — иначе в неё не попасть
    const stick = (v) => { const sp = marks().find(m => Math.abs(m.p - v) <= 2 * step); return sp ? sp.p : v; };
    slider = Lab.slider(box, { label: "Параметр <b><i>a</i></b>", min: a0, max: a1, step, value: a0, onInput: (v) => setA(stick(v), true) });
  }
  // Особые значения a: отдельные точки (касания) и границы промежутков на оси
  function marks() {
    const m = scene.map.special.map(s => ({ p: s.p, label: s.label }));
    for (let i = 0; i < scene.map.segs.length - 1; i++) {
      const p = scene.map.segs[i].hi;
      if (!m.some(x => Math.abs(x.p - p) < 1e-6)) m.push({ p });
    }
    return m;
  }
  // клик по оси рядом с особой точкой — встаём точно в неё
  function snap(t) {
    const [a0, a1] = scene.range, tol = (a1 - a0) * 0.015;
    const sp = marks().find(m => Math.abs(m.p - t) < tol);
    return sp ? sp.p : t;
  }

  function setA(a, fromUser) {
    scene.a = a;
    if (slider) {
      slider.set(a);
      // в особой точке пишем точное значение: «2√2», а не «2,828»
      const mk = scene.map ? marks().find(m => Math.abs(m.p - a) < 1e-9) : null;
      slider.el.querySelector("output").textContent = mk ? PL.sets.label(mk.p, mk.label) : E.fmtNum(a);
    }
    draw();
    if (fromUser && opts0.onA) opts0.onA(a);
  }

  function draw() {
    const { ct, a } = scene;
    if (!ct) return;
    const sol = V.solutions(ct, a);
    plot.render(ct, scene.view, a, { extras: scene.extras, highlight: scene.highlight, solutions: sol });
    // формулы с подставленным a
    // в особой точке подставляем точное a: «y = x + 2√2», а не «y = x + 2,828»
    const mk = scene.map ? marks().find(m => Math.abs(m.p - a) < 1e-9) : null;
    const exact = mk ? S.exact(mk.p, mk.label) : null;
    $("eqs").innerHTML = ct.parts.map((part, pi) => part.filter(c => !c.sweep).map(c => `<span class="p${pi} f">${curveHTML(c.src, ct.plane, a, exact)}</span>`).join("")).join("");
    const where = ct.asks.length === 1 ? ct.asks[0].where : null;
    const n = V.countWhere(sol, where, a);
    const ok = ct.asks.every(q => ({ "=": n === q.k, ">=": n >= q.k, "<=": n <= q.k, ">": n > q.k, "<": n < q.k, "!=": n !== q.k })[q.op]);
    const what = ct.plane === "xa" ? "Корней" : "Решений";
    $("count").innerHTML = `${what}${where ? " (с условием)" : ""}: <b>${n === Infinity ? "бесконечно много" : n}</b>` +
      (ok ? ` <span style="color:var(--good)">— подходит под условие</span>` : "");
    amap.render(scene.range, scene.map, a, scene.rows, scene.diff);
    renderLegend();
  }
  function curveHTML(src, plane, a, exact) {
    const [body, cond] = src.split(/\s+при\s+/);
    const sides = body.split(/(?<![<>!])=(?!=)/).map(s => {
      try {
        const ast = E.parse(s);
        return plane === "xa" ? E.html(ast) : E.uses(ast, "a") ? E.htmlWith(ast, a, exact) : E.html(ast);
      } catch (e) { return s; }
    });
    return sides.join(" = ") + (cond ? ", " + E.formulaHTML(cond) : "");
  }
  function renderLegend() {
    const ns = [...new Set([...scene.map.segs, ...scene.map.special].map(s => s.n))].sort((p, q) => p - q);
    const word = (n) => n === Infinity ? "∞" : n;
    let h = "<span>число решений:</span>" + ns.map(n => `<span><i style="background:${PL.plot.countColor(n)}"></i>${word(n)}</span>`).join("");
    if (scene.map.special.length) h += `<span>● — отдельное значение <em>a</em>, нажмите на него</span>`;
    $("legend").innerHTML = h;
  }

  // ---------- «Прокрутить» ----------
  let playing = null;
  function stopPlay() { if (playing) cancelAnimationFrame(playing); playing = null; $("play").textContent = "▶ Прокрутить"; }
  // Насколько сдвигаются подвижные линии на экране при переходе a → a + δ (в долях окна).
  // Для явных линий сравниваем их точки в окне; для неявных — по сетке, через |ΔF| / |∇F|.
  function shift(aFrom, aTo) {
    const v = scene.view, W = v.x[1] - v.x[0], H = v.y[1] - v.y[0];
    const clip = (y, lo, hi) => Math.max(lo - 0.05 * H, Math.min(hi + 0.05 * H, y));
    let sum = 0, cnt = 0;
    for (const part of scene.ct.parts) for (const c of part) {
      if (!c.moving) continue; // неподвижные линии не учитываем
      if (c.sweep) { sum += Math.abs(clip(aTo, v.y[0], v.y[1]) - clip(aFrom, v.y[0], v.y[1])) / H; cnt++; continue; }
      if (c.yOf || c.xOf) {
        for (let i = 0; i <= 40; i++) {
          const t = c.yOf ? v.x[0] + W * i / 40 : v.y[0] + H * i / 40;
          const f = c.yOf ? (p) => c.yOf(t, 0, p) : (p) => c.xOf(0, t, p);
          const u = f(aFrom), w = f(aTo);
          if (!Number.isFinite(u) || !Number.isFinite(w)) continue;
          // сдвиг поперёк линии: вертикальный сдвиг, делённый на √(1 + наклон²)
          const slope = c.yOf ? (c.yOf(t + 1e-4, 0, aFrom) - u) / 1e-4 : (c.xOf(0, t + 1e-4, aFrom) - u) / 1e-4;
          const [lo, hi, span] = c.yOf ? [v.y[0], v.y[1], H] : [v.x[0], v.x[1], W];
          const d = Math.abs(clip(w, lo, hi) - clip(u, lo, hi)) / Math.sqrt(1 + (Number.isFinite(slope) ? slope * slope : 0));
          sum += d / span; cnt++;
        }
      } else {
        for (let i = 0; i <= 24; i++) for (let j = 0; j <= 24; j++) {
          const x = v.x[0] + W * i / 24, y = v.y[0] + H * j / 24, F = c.F(x, y, aFrom);
          const gx = (c.F(x + 1e-4, y, aFrom) - F) / 1e-4, gy = (c.F(x, y + 1e-4, aFrom) - F) / 1e-4, g = Math.hypot(gx, gy);
          if (!g || Math.abs(F) / g > W / 24) continue; // берём только точки рядом с линией
          const dF = c.F(x, y, aTo) - F;
          if (Number.isFinite(dF)) { sum += Math.min(Math.abs(dF) / g, W) / W; cnt++; }
        }
      }
    }
    return cnt ? sum / cnt : 0;
  }
  $("play").addEventListener("click", () => {
    if (playing) return stopPlay();
    const [a0, a1] = scene.range, dur = 8000, K = 400;
    // Время на кусок [a_i; a_i+1] пропорционально тому, насколько сдвигаются линии на экране,
    // но: 1) сдвиг сглажен по соседним кускам — скорость меняется плавно, без рывков;
    // 2) самый быстрый кусок не быстрее самого медленного больше чем в 3 раза —
    //    там, где линия за краем окна, a бежит быстрее, но не «перескакивает».
    const as = [];
    for (let i = 0; i <= K; i++) as.push(a0 + (a1 - a0) * i / K);
    const m = [];
    for (let i = 0; i < K; i++) m.push(shift(as[i], as[i + 1]));
    const h = Math.max(3, Math.round(K / 25)), sm = [];
    for (let i = 0; i < K; i++) {
      let s = 0, c = 0;
      for (let j = Math.max(0, i - h); j <= Math.min(K - 1, i + h); j++) { const wgt = h + 1 - Math.abs(i - j); s += m[j] * wgt; c += wgt; }
      sm.push(s / c);
    }
    const top = Math.max(...sm) || 1, cum = [0];
    for (let i = 0; i < K; i++) cum.push(cum[i] + Math.max(sm[i], top / 3));
    const total = cum[K], t0 = performance.now();
    $("play").textContent = "■ Стоп";
    const tick = (t) => {
      const target = Math.min(1, (t - t0) / dur) * total;
      let i = 0;
      while (i < K - 1 && cum[i + 1] < target) i++;
      const f = (target - cum[i]) / (cum[i + 1] - cum[i] || 1);
      setA(t - t0 >= dur ? a1 : as[i] + (as[i + 1] - as[i]) * Math.min(1, f), false);
      if (t - t0 < dur) playing = requestAnimationFrame(tick); else stopPlay();
    };
    playing = requestAnimationFrame(tick);
  });

  return { s: scene, set: setScene, setA, draw, stop: stopPlay, setRange };
};
