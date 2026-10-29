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
    scene.view = task.view || (opts0.view && opts0.view()) || { x: [-6, 6], y: [-6, 6] };
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

  function buildSlider([a0, a1]) {
    const box = $("aSlider");
    box.innerHTML = "";
    const span = a1 - a0, step = span <= 4 ? 0.005 : span <= 40 ? 0.01 : 0.05;
    // рядом с отдельной точкой (касанием) ползунок «прилипает» к ней — иначе в неё не попасть
    const stick = (v) => { const sp = scene.map.special.find(s => Math.abs(s.p - v) <= 2 * step); return sp ? sp.p : v; };
    slider = Lab.slider(box, { label: "Параметр <b><i>a</i></b>", min: a0, max: a1, step, value: a0, onInput: (v) => setA(stick(v), true) });
  }
  // клик по оси рядом с особой точкой — встаём точно в неё
  function snap(t) {
    const [a0, a1] = scene.ct.aRange, tol = (a1 - a0) * 0.015;
    const sp = scene.map.special.map(s => s.p).find(p => Math.abs(p - t) < tol);
    return sp !== undefined ? sp : t;
  }

  function setA(a, fromUser) {
    scene.a = a;
    if (slider) {
      slider.set(a);
      slider.el.querySelector("output").textContent = E.fmtNum(a);
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
    $("eqs").innerHTML = ct.parts.map((part, pi) => part.filter(c => !c.sweep).map(c => `<span class="p${pi} f">${curveHTML(c.src, ct.plane, a)}</span>`).join("")).join("");
    const where = ct.asks.length === 1 ? ct.asks[0].where : null;
    const n = V.countWhere(sol, where, a);
    const ok = ct.asks.every(q => ({ "=": n === q.k, ">=": n >= q.k, "<=": n <= q.k, ">": n > q.k, "<": n < q.k, "!=": n !== q.k })[q.op]);
    const what = ct.plane === "xa" ? "Корней" : "Решений";
    $("count").innerHTML = `${what}${where ? " (с условием)" : ""}: <b>${n === Infinity ? "бесконечно много" : n}</b>` +
      (ok ? ` <span style="color:var(--good)">— подходит под условие</span>` : "");
    amap.render(ct.aRange, scene.map, a, scene.rows, scene.diff);
    renderLegend();
  }
  function curveHTML(src, plane, a) {
    const [body, cond] = src.split(/\s+при\s+/);
    const sides = body.split(/(?<![<>!])=(?!=)/).map(s => {
      try {
        const ast = E.parse(s);
        return plane === "xa" ? E.html(ast) : E.htmlWith(ast, E.uses(ast, "a") ? a : undefined);
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
