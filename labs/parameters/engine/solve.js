// Численный подсчёт решений системы при данном a, карта ответа и проверка задач.
//
// Сцена/задача:
//   plane: "xy" | "xa"
//   eq: [часть1, часть2] — каждая часть: строка или массив строк (объединение кривых).
//       В плоскости "xa" вторая часть не нужна: это прямая a = const.
//       Кривая: «y = ...», «x = ...» или любое «F(x, y) = G(x, y)», можно с «при <условие>».
//   ask: "=2" | ">=1" | "inf" | "=2 при x > 1" | массив таких условий (все должны выполняться)
//   aRange: [a0, a1] — диапазон ползунка; box: половина стороны квадрата поиска решений
PL.solve = (function () {
  const { parse, compile, uses } = PL.expr;
  const TOL = 1e-7;

  // ---------- Разбор условий «x > 1 и |x| <= 2» ----------
  function compileCond(src, map) {
    const conj = src.split(/\s+и\s+|\s+and\s+|&&/);
    const checks = conj.map(c => {
      const parts = c.split(/(<=|>=|!=|≤|≥|≠|<|>|=)/).map(s => s.trim());
      if (parts.length < 3 || parts.length % 2 === 0) throw new Error(`Не понимаю условие «${c.trim()}»`);
      const fns = [];
      for (let i = 0; i < parts.length; i += 2) fns.push(compile(parse(parts[i]), map));
      const ops = [];
      for (let i = 1; i < parts.length; i += 2) ops.push({ "≤": "<=", "≥": ">=", "≠": "!=" }[parts[i]] || parts[i]);
      return (x, y, p) => {
        for (let k = 0; k < ops.length; k++) {
          const u = fns[k](x, y, p), w = fns[k + 1](x, y, p), e = 1e-9 * (1 + Math.abs(u) + Math.abs(w));
          const ok = { "<": u < w - e, "<=": u <= w + e, ">": u > w + e, ">=": u >= w - e, "=": Math.abs(u - w) <= e, "!=": Math.abs(u - w) > e }[ops[k]];
          if (!ok) return false;
        }
        return true;
      };
    });
    return (x, y, p) => checks.every(f => f(x, y, p));
  }

  // ---------- Кривая ----------
  function compileCurve(src, plane) {
    const [body, cond] = src.split(/\s+при\s+/);
    const sides = body.split(/(?<![<>!])=(?!=)/);
    if (sides.length !== 2) throw new Error(`В уравнении «${body.trim()}» должен быть ровно один знак «=»`);
    // в плоскости (x; a) вертикальная ось — a: внутри зовём её y
    const map = plane === "xa" ? { x: "x", y: "y", a: "y" } : { x: "x", y: "y", a: "p" };
    const L = parse(sides[0]), R = parse(sides[1]);
    if (plane === "xa" && (uses(L, "y") || uses(R, "y"))) throw new Error("В плоскости (x; a) переменной y нет");
    const vert = plane === "xa" ? "a" : "y";
    const isVar = (n, v) => n.t === "var" && n.n === v;
    const curve = {
      src, plane,
      F: compile({ t: "bin", op: "-", l: L, r: R }, map),
      ast: [L, R],
      dom: cond ? compileCond(cond, map) : null,
      moving: plane === "xy" && (uses(L, "a") || uses(R, "a")),
    };
    // явный вид: y = g(x) или x = g(y)
    if (isVar(L, vert) && !uses(R, vert)) curve.yOf = compile(R, map);
    else if (isVar(R, vert) && !uses(L, vert)) curve.yOf = compile(L, map);
    else if (isVar(L, "x") && !uses(R, "x")) curve.xOf = compile(R, map);
    else if (isVar(R, "x") && !uses(L, "x")) curve.xOf = compile(L, map);
    return curve;
  }

  function compileTask(task) {
    const plane = task.plane || "xy";
    const parts = (task.eq || []).map(p => (Array.isArray(p) ? p : [p]).map(s => compileCurve(s, plane)));
    if (plane === "xa") {
      // прямая a = c — «бегунок»
      parts[1] = [{ src: "a = c", plane, F: (x, y, p) => y - p, yOf: (x, y, p) => p, dom: null, moving: true, sweep: true }];
    }
    if (parts.length !== 2 || !parts[0].length) throw new Error("Нужны две части системы");
    const asks = (Array.isArray(task.ask) ? task.ask : [task.ask || ">=1"]).map(a => compileAsk(a, plane));
    return {
      task, plane, parts, asks,
      box: task.box || 30,
      aRange: task.aRange || [-6, 6],
    };
  }

  function compileAsk(src, plane) {
    const [what, cond] = src.split(/\s+при\s+/);
    const m = what.replace(/\s/g, "").match(/^(=|>=|<=|>|<|!=)?(\d+|inf|∞)$/);
    if (!m) throw new Error(`Не понимаю, что спрашивается: «${src}». Пример: «=2», «>=1», «inf», «=1 при x > 0»`);
    const op = m[1] || "=", k = m[2] === "inf" || m[2] === "∞" ? Infinity : +m[2];
    const map = plane === "xa" ? { x: "x", y: "y", a: "y" } : { x: "x", y: "y", a: "p" };
    return { src, op, k, where: cond ? compileCond(cond, map) : null };
  }

  // ---------- Корни функции одной переменной ----------
  function roots1D(h, valid, t0, t1, N) {
    const dt = (t1 - t0) / N;
    const ts = [], hs = [];
    let prevOk = null;
    for (let i = 0; i <= N; i++) {
      const t = t0 + i * dt;
      let v = h(t);
      const ok = Number.isFinite(v) && valid(t);
      if (prevOk !== null && ok !== prevOk) {
        // граница области определения — уточняем и добавляем её как точку
        let lo = t - dt, hi = t;
        for (let k = 0; k < 50; k++) {
          const m = (lo + hi) / 2;
          const mOk = Number.isFinite(h(m)) && valid(m);
          if (mOk === prevOk) lo = m; else hi = m;
        }
        const tb = ok ? hi : lo;
        const vb = h(tb);
        if (Number.isFinite(vb)) {
          if (!ok) { ts.push(tb); hs.push(vb); }
          ts.push(NaN); hs.push(NaN);
          if (ok) { ts.push(tb); hs.push(vb); }
        } else { ts.push(NaN); hs.push(NaN); }
      }
      ts.push(t); hs.push(ok ? v : NaN);
      prevOk = ok;
    }
    const roots = [];
    let zeroRun = 0, validRun = 0;
    for (let i = 0; i < ts.length; i++) {
      const v = hs[i];
      if (Number.isNaN(v)) { zeroRun = 0; validRun = 0; continue; }
      validRun++;
      if (Math.abs(v) < TOL) {
        zeroRun++;
        if (zeroRun > 20) return { inf: true, roots: [] };
        roots.push(ts[i]);
      } else zeroRun = 0;
      const pv = hs[i - 1];
      if (i > 0 && !Number.isNaN(pv) && Math.abs(pv) >= TOL && Math.abs(v) >= TOL && Math.sign(pv) !== Math.sign(v)) {
        let lo = ts[i - 1], hi = ts[i], flo = pv;
        for (let k = 0; k < 60; k++) {
          const m = (lo + hi) / 2, fm = h(m);
          if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
        }
        roots.push((lo + hi) / 2);
      }
      // касание: локальный минимум |h| без смены знака
      const nv = hs[i + 1];
      if (i > 0 && !Number.isNaN(pv) && !Number.isNaN(nv) && Math.abs(v) >= TOL &&
          Math.abs(v) <= Math.abs(pv) && Math.abs(v) <= Math.abs(nv) && Math.sign(pv) === Math.sign(v) && Math.sign(nv) === Math.sign(v)) {
        let lo = ts[i - 1], hi = ts[i + 1];
        for (let k = 0; k < 80; k++) {
          const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
          if (Math.abs(h(m1)) < Math.abs(h(m2))) hi = m2; else lo = m1;
        }
        const tm = (lo + hi) / 2;
        if (Math.abs(h(tm)) < TOL) roots.push(tm);
      }
    }
    return { inf: false, roots };
  }

  // ---------- Пересечение двух кривых ----------
  function intersect(P, Q, p, box, N, n2d) {
    if (Q.yOf || Q.xOf) { if (!(P.yOf || P.xOf) || P.sweep) [P, Q] = [Q, P]; }
    const okP = (x, y) => !P.dom || P.dom(x, y, p);
    const okQ = (x, y) => !Q.dom || Q.dom(x, y, p);
    if (P.yOf) {
      const g = (t) => P.yOf(t, 0, p);
      const r = roots1D(t => Q.F(t, g(t), p), t => { const y = g(t); return Number.isFinite(y) && okP(t, y) && okQ(t, y); }, -box, box, N);
      return { inf: r.inf, pts: r.roots.map(t => [t, g(t)]) };
    }
    if (P.xOf) {
      const g = (t) => P.xOf(0, t, p);
      const r = roots1D(t => Q.F(g(t), t, p), t => { const x = g(t); return Number.isFinite(x) && okP(x, t) && okQ(x, t); }, -box, box, N);
      return { inf: r.inf, pts: r.roots.map(t => [g(t), t]) };
    }
    return intersect2D(P, Q, p, box, n2d);
  }

  // Обе кривые неявные: идём по P (сетка, «марширующие квадраты»), ищем нули Q вдоль неё.
  function intersect2D(P, Q, p, box, n = 500) {
    const d = (2 * box) / n;
    const pts = [], near = [], crossings = [];
    let zeroCells = 0;
    const F = (x, y) => P.F(x, y, p), G = (x, y) => Q.F(x, y, p);
    const ok = (x, y) => (!P.dom || P.dom(x, y, p)) && (!Q.dom || Q.dom(x, y, p));
    let row = new Float64Array(n + 1), next = new Float64Array(n + 1);
    for (let i = 0; i <= n; i++) row[i] = F(-box + i * d, -box);
    for (let j = 0; j < n; j++) {
      const y0 = -box + j * d, y1 = y0 + d;
      for (let i = 0; i <= n; i++) next[i] = F(-box + i * d, y1);
      for (let i = 0; i < n; i++) {
        const x0 = -box + i * d, x1 = x0 + d;
        const c = [[x0, y0, row[i]], [x1, y0, row[i + 1]], [x1, y1, next[i + 1]], [x0, y1, next[i]]];
        const cross = [];
        for (let k = 0; k < 4; k++) {
          const [ax, ay, fa] = c[k], [bx, by, fb] = c[(k + 1) % 4];
          if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;
          if ((fa <= 0 && fb > 0) || (fa > 0 && fb <= 0)) {
            const s = fa / (fa - fb);
            cross.push([ax + s * (bx - ax), ay + s * (by - ay)]);
          }
        }
        if (cross.length < 2) continue;
        for (let k = 0; k + 1 < cross.length; k += 2) {
          const [ax, ay] = cross[k], [bx, by] = cross[k + 1];
          const ga = G(ax, ay), gb = G(bx, by);
          if (Math.abs(ga) < 1e-9 && Math.abs(gb) < 1e-9) { zeroCells++; continue; }
          if (Math.sign(ga) !== Math.sign(gb) || Math.abs(ga) < 1e-9) {
            crossings.push([ax, ay, bx, by]);
          } else {
            // знак G не меняется, но Q проходит совсем рядом — возможно касание
            const mx = (ax + bx) / 2, my = (ay + by) / 2, gm = G(mx, my);
            const gx = (G(mx + 1e-6, my) - gm) / 1e-6, gy = (G(mx, my + 1e-6) - gm) / 1e-6;
            if (Math.abs(gm) / (Math.hypot(gx, gy) || 1e-12) < 1.5 * d) near.push([mx, my, bx - ax, by - ay]);
          }
        }
      }
      [row, next] = [next, row];
    }
    // Касания: идём вдоль P (сдвиг по касательной + возврат на кривую) и ищем, где |G| = 0.
    const proj = (x, y) => {
      for (let k = 0; k < 6; k++) {
        const f = F(x, y), fx = (F(x + 1e-7, y) - f) / 1e-7, fy = (F(x, y + 1e-7) - f) / 1e-7, g2 = fx * fx + fy * fy;
        if (!g2) break;
        x -= f * fx / g2; y -= f * fy / g2;
      }
      return [x, y];
    };
    // Пересечения: проверяем смену знака G уже на самой кривой P (после возврата на неё),
    // иначе погрешность сетки рядом с касанием даёт ложные точки.
    for (const [ax, ay, bx, by] of crossings) {
      let A = proj(ax, ay), B = proj(bx, by), gA = G(...A), gB = G(...B);
      if (Math.abs(gA) < TOL) { if (ok(...A)) pts.push(A); continue; }
      if (Math.sign(gA) === Math.sign(gB)) { near.push([(ax + bx) / 2, (ay + by) / 2, bx - ax, by - ay]); continue; }
      for (let k = 0; k < 50; k++) {
        const M = proj((A[0] + B[0]) / 2, (A[1] + B[1]) / 2), gM = G(...M);
        if (Math.sign(gM) === Math.sign(gA)) { A = M; gA = gM; } else B = M;
      }
      const X = refine(F, G, ...A);
      if (ok(...X)) pts.push(X);
    }
    for (const [mx, my, tx, ty] of near) {
      const tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const phi = (s) => { const [x, y] = proj(mx + s * ux, my + s * uy); return Math.abs(G(x, y)); };
      let lo = -2 * d, hi = 2 * d;
      for (let k = 0; k < 70; k++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (phi(m1) < phi(m2)) hi = m2; else lo = m1;
      }
      const s = (lo + hi) / 2;
      if (phi(s) < TOL && s > -2 * d + 1e-9 && s < 2 * d - 1e-9) {
        const [x, y] = proj(mx + s * ux, my + s * uy);
        if (ok(x, y)) pts.push([x, y]);
      }
    }
    return { inf: zeroCells > 30, pts };
  }
  // Ньютон для системы F = 0, G = 0
  function refine(F, G, x, y) {
    for (let k = 0; k < 8; k++) {
      const h = 1e-7, f = F(x, y), g = G(x, y);
      const fx = (F(x + h, y) - f) / h, fy = (F(x, y + h) - f) / h;
      const gx = (G(x + h, y) - g) / h, gy = (G(x, y + h) - g) / h;
      const det = fx * gy - fy * gx;
      if (!Number.isFinite(det) || Math.abs(det) < 1e-12) break;
      const nx = x - (f * gy - fy * g) / det, ny = y - (fx * g - f * gx) / det;
      if (!Number.isFinite(nx) || !Number.isFinite(ny) || Math.hypot(nx - x, ny - y) > 0.05) break;
      x = nx; y = ny;
    }
    return [x, y];
  }

  // ---------- Все решения при данном a ----------
  function solutions(ct, p, N = 20000, n2d = 500) {
    const pts = [];
    let inf = false;
    for (const P of ct.parts[0]) for (const Q of ct.parts[1]) {
      const r = intersect(P, Q, p, ct.box, N, n2d);
      if (r.inf) inf = true;
      for (const pt of r.pts) {
        if (!pts.some(o => Math.hypot(o[0] - pt[0], o[1] - pt[1]) < 1e-5)) pts.push(pt);
      }
    }
    return { inf, pts };
  }
  // Сколько решений (x, y) удовлетворяют условию where. В плоскости (x; a) решение — это x.
  function countWhere(sol, where, p) {
    if (sol.inf) return Infinity;
    return where ? sol.pts.filter(([x, y]) => where(x, y, p)).length : sol.pts.length;
  }
  function askHolds(ask, n) {
    const k = ask.k;
    switch (ask.op) {
      case "=": return n === k;
      case ">=": return n >= k;
      case "<=": return n <= k;
      case ">": return n > k;
      case "<": return n < k;
      case "!=": return n !== k;
    }
  }
  function holds(ct, p, N) {
    const sol = solutions(ct, p, N);
    return ct.asks.every(a => askHolds(a, countWhere(sol, a.where, p)));
  }

  // ---------- Карта ответа ----------
  // Делим диапазон a на куски с одинаковым числом решений.
  function map(ct, range, opts = {}) {
    const [a0, a1] = range;
    const M = opts.samples || 400, N = opts.N || 6000;
    const where = ct.asks.length === 1 ? ct.asks[0].where : null;
    const cnt = (p) => countWhere(solutions(ct, p, N, opts.n2d || 160), where, p);
    const ys = [];
    for (let i = 0; i <= M; i++) { const p = a0 + (a1 - a0) * i / M; ys.push({ p, n: cnt(p) }); }
    // Отдельные точки (касания) проверяем точно: в особых значениях из opts.special
    const special = (opts.special || []).filter(v => v > a0 && v < a1).map(p => ({ p, n: countWhere(solutions(ct, p), where, p) }));
    const segs = [];
    for (const s of ys) {
      const L = segs[segs.length - 1];
      if (L && L.n === s.n) L.hi = s.p; else segs.push({ lo: s.p, hi: s.p, n: s.n });
    }
    for (let i = 0; i < segs.length - 1; i++) { const m = (segs[i].hi + segs[i + 1].lo) / 2; segs[i].hi = m; segs[i + 1].lo = m; }
    return { segs, special };
  }

  // ---------- Проверка ответа задачи ----------
  // Сравниваем ответ с численным подсчётом: в концах промежутков ответа,
  // в серединах между ними и на частой сетке. Возвращает список расхождений.
  function verify(task, answerSet) {
    const ct = compileTask(task);
    const bs = PL.sets.boundaries(answerSet).map(b => b.v).filter(Number.isFinite);
    const [r0, r1] = ct.aRange;
    const lo = Math.min(r0, ...bs) - 1, hi = Math.max(r1, ...bs) + 1;
    const probes = new Set(bs);
    const sorted = [lo, ...[...new Set(bs)].sort((u, w) => u - w), hi];
    for (let i = 0; i < sorted.length - 1; i++) {
      const u = sorted[i], w = sorted[i + 1];
      for (const f of [0.5, 0.13, 0.87]) probes.add(u + (w - u) * f);
    }
    for (let i = 0; i <= 300; i++) {
      const p = lo + (hi - lo) * i / 300;
      if (bs.every(b => Math.abs(b - p) > 1e-3)) probes.add(p);
    }
    const bad = [];
    for (const p of probes) {
      const want = PL.sets.contains(answerSet, p);
      const got = holds(ct, p);
      if (want !== got) bad.push({ a: p, want, got });
    }
    return bad.sort((u, w) => u.a - w.a);
  }

  return { compileTask, compileCurve, compileCond, solutions, countWhere, holds, map, verify };
})();
