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
    if (!sameTask || !scene.map) { scene.map = V.map(ct, ct.aRange, { special: scene.special }); scene.found = scene.map.special; }
    else scene.map.special = V.mergeSpecial(scene.found, V.specialAt(ct, scene.special, ct.aRange));
    buildSlider(ct.aRange);
    const a = opts.a !== undefined ? num(opts.a) : task.a !== undefined ? num(task.a) : (ct.aRange[0] + ct.aRange[1]) / 2;
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

  function buildSlider([a0, a1]) {
    const box = $("aSlider");
    box.innerHTML = "";
    const span = a1 - a0, step = span <= 4 ? 0.005 : span <= 40 ? 0.01 : 0.05;
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
    const [a0, a1] = scene.ct.aRange, tol = (a1 - a0) * 0.015;
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
    amap.render(ct.aRange, scene.map, a, scene.rows, scene.diff);
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
  $("play").addEventListener("click", () => {
    if (playing) return stopPlay();
    const [a0, a1] = scene.ct.aRange, t0 = performance.now(), dur = 6000;
    $("play").textContent = "■ Стоп";
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setA(a0 + (a1 - a0) * k, false);
      if (k < 1) playing = requestAnimationFrame(tick); else stopPlay();
    };
    playing = requestAnimationFrame(tick);
  });

  return { s: scene, set: setScene, setA, draw, stop: stopPlay };
};
