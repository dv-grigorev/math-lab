// Численный подсчёт решений системы при данном a, карта ответа и проверка задач.
//
// Сцена/задача:
//   plane: "xy" | "xa"
//   eq: [часть1, часть2] — каждая часть: строка или массив строк (объединение кривых).
//       В плоскости "xa" вторая часть не нужна: это прямая a = const.
//       Кривая: «y = ...», «x = ...» или любое «F(x, y) = G(x, y)», можно с «при <условие>».
//   ask: "=2" | ">=1" | "inf" | "=2 при x > 1" | массив таких условий (все должны выполняться)
//   aRange: [a0, a1] — диапазон ползунка, если нужен именно такой (иначе подбирается сам); box: половина стороны квадрата поиска решений
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
    // Неявная, но квадратная по y (окружность, гипербола xy = 3) — две явные ветви y = …;
    // считать по ним быстрее и точнее, чем по сетке на плоскости. Иначе пробуем по x.
    if (!curve.yOf && !curve.xOf) curve.branches = quadBranches(curve, "y") || quadBranches(curve, "x");
    return curve;
  }

  // F(x, y) = A·y² + B·y + C при каждом x (коэффициенты — по значениям F в y = 0, ±1)?
  // Если да — ветви y = (−B ± √(B² − 4AC)) / 2A (или y = −C/B, когда A = 0).
  function quadBranches(curve, v) {
    const F = v === "y" ? curve.F : (y, x, p) => curve.F(x, y, p);
    const coef = (u, p) => {
      const c = F(u, 0, p), f1 = F(u, 1, p), fm = F(u, -1, p);
      return [(f1 + fm) / 2 - c, (f1 - fm) / 2, c];
    };
    // проверка на нескольких точках: F(u, t) должно совпадать с квадратным трёхчленом
    let good = 0;
    for (const u of [-3.7, -1.3, 0.6, 2.9, 5.3, 8.1]) for (const p of [-2.2, 0.7, 3.1]) {
      const [A, B, C] = coef(u, p);
      if (![A, B, C].every(Number.isFinite)) continue;
      for (const t of [2, -2.5, 3.5]) {
        const f = F(u, t, p);
        if (!Number.isFinite(f)) continue;
        if (Math.abs(f - (A * t * t + B * t + C)) > 1e-7 * (1 + Math.abs(f))) return null;
        good++;
      }
    }
    if (good < 8) return null;
    const branch = (sg) => (u, p) => {
      const [A, B, C] = coef(u, p);
      if (Math.abs(A) < 1e-12) return Math.abs(B) < 1e-12 ? NaN : -C / B;
      const D = B * B - 4 * A * C;
      if (D < -1e-12) return NaN;
      return (-B + sg * Math.sqrt(Math.max(D, 0))) / (2 * A);
    };
    return [1, -1].map(sg => {
      const g = branch(sg);
      return { ...curve, branches: null, ...(v === "y" ? { yOf: (x, _, p) => g(x, p) } : { xOf: (_, y, p) => g(y, p) }) };
    });
  }
  // Пары кривых для подсчёта: если обе неявные, одну заменяем её явными ветвями
  function pairs(ct) {
    const out = [];
    for (const P of ct.parts[0]) for (const Q of ct.parts[1]) {
      const exp = (c) => c.yOf || c.xOf;
      if (!exp(P) && !exp(Q) && P.branches) for (const b of P.branches) out.push([b, Q]);
      else if (!exp(P) && !exp(Q) && Q.branches) for (const b of Q.branches) out.push([b, P]);
      else out.push([P, Q]);
    }
    return out;
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
      box: task.box || 30,        // квадрат поиска для двух неявных кривых
      box1D: task.box || 1e7,     // если одна кривая явная — ищем намного дальше (точки, уходящие на бесконечность)
      // aRange — диапазон, заданный вручную (иначе подбирается сам, см. fitRange);
      // search — где ищем особые значения a
      aRange: task.aRange ? [...task.aRange] : null,
      search: task.aRange ? [Math.min(-50, task.aRange[0]), Math.max(50, task.aRange[1])] : [-50, 50],
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
  // Точки сетки: t = sinh(u), u — равномерно. Около нуля шаг ~0,001, к краям растёт,
  // так что ищем решения хоть до |t| = 10⁷ и не теряем далёкие точки пересечения.
  function roots1D(h, valid, t0, t1, N) {
    const u0 = Math.asinh(t0), du = (Math.asinh(t1) - u0) / N;
    const ts = [], hs = [], edge = []; // edge[i] — точка у выколотой границы: сама корнем не бывает
    let prevOk = null, tPrev = t0;
    const push = (t, v, e = false) => { ts.push(t); hs.push(v); edge.push(e); };
    for (let i = 0; i <= N; i++) {
      const t = Math.sinh(u0 + i * du), dt = t - tPrev;
      tPrev = t;
      const v = h(t);
      const ok = Number.isFinite(v) && valid(t);
      if (prevOk !== null && ok !== prevOk) {
        // граница области определения — уточняем и добавляем её как точку
        let lo = t - dt, hi = t;
        for (let k = 0; k < 50; k++) {
          const m = (lo + hi) / 2;
          const mOk = Number.isFinite(h(m)) && valid(m);
          if (mOk === prevOk) lo = m; else hi = m;
        }
        let tb = ok ? hi : lo, vb = h(tb), punct = false;
        // Граница — точное число (x = −3, x = √3). Если в нём самом выражение не определено
        // (0/0 у дроби с √(x + 3)), то это выколотая точка — корнем её не считаем.
        const ex = PL.sets.snap(tb, 1e-9);
        if (ex) {
          const vn = h(ex.v);
          if (Number.isFinite(vn) && valid(ex.v)) { tb = ex.v; vb = vn; } else punct = true;
        }
        // Точку у границы всё равно ставим: между ней и соседней точкой сетки может быть
        // корень (смена знака). У выколотой границы она помечена — сама корнем не считается.
        if (Number.isFinite(vb)) {
          if (!ok) push(tb, vb, punct);
          push(NaN, NaN);
          if (ok) push(tb, vb, punct);
        } else push(NaN, NaN);
      }
      push(t, ok ? v : NaN);
      prevOk = ok;
    }
    const roots = [];
    let zeroRun = 0;
    for (let i = 0; i < ts.length; i++) {
      const v = hs[i];
      if (Number.isNaN(v)) { zeroRun = 0; continue; }
      if (Math.abs(v) < TOL && !edge[i]) {
        zeroRun++;
        if (zeroRun > 20) return { inf: true, roots: [] };
        roots.push(ts[i]);
      } else zeroRun = 0;
      const pv = hs[i - 1];
      if (i > 0 && !Number.isNaN(pv) && (Math.abs(pv) >= TOL || edge[i - 1]) && (Math.abs(v) >= TOL || edge[i]) && Math.sign(pv) !== Math.sign(v) && pv !== 0 && v !== 0) {
        let lo = ts[i - 1], hi = ts[i], flo = pv;
        for (let k = 0; k < 60; k++) {
          const m = (lo + hi) / 2, fm = h(m);
          if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
        }
        roots.push((lo + hi) / 2);
      }
      // касание: локальный минимум |h| без смены знака
      const nv = hs[i + 1];
      if (i > 0 && !edge[i] && !Number.isNaN(pv) && !Number.isNaN(nv) && Math.abs(v) >= TOL &&
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
  // Если одна из кривых явная (y = g(x) или x = g(y)), пересечение сводится к корням h(t) = 0.
  function explicitH(P, Q, p) {
    if (Q.yOf || Q.xOf) { if (!(P.yOf || P.xOf) || P.sweep) [P, Q] = [Q, P]; }
    const okP = (x, y) => !P.dom || P.dom(x, y, p);
    const okQ = (x, y) => !Q.dom || Q.dom(x, y, p);
    if (P.yOf) {
      const xy = (t) => [t, P.yOf(t, 0, p)];
      return { xy, h: (t) => Q.F(t, P.yOf(t, 0, p), p), valid: (t) => { const [x, y] = xy(t); return Number.isFinite(y) && okP(x, y) && okQ(x, y); } };
    }
    if (P.xOf) {
      const xy = (t) => [P.xOf(0, t, p), t];
      return { xy, h: (t) => Q.F(P.xOf(0, t, p), t, p), valid: (t) => { const [x, y] = xy(t); return Number.isFinite(x) && okP(x, y) && okQ(x, y); } };
    }
    return null;
  }
  function intersect(P, Q, p, box, N, n2d, box1D = 1e7) {
    const e = explicitH(P, Q, p);
    if (!e) return intersect2D(P, Q, p, box, n2d);
    const r = roots1D(e.h, e.valid, -box1D, box1D, N);
    return { inf: r.inf, pts: r.roots.map(e.xy) };
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
      // кривые совпадают на целом куске — решений бесконечно много
      if (Math.abs(gA) < TOL && Math.abs(gB) < TOL) { if (ok(...A)) zeroCells++; continue; }
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
      // Q лежит на P целым куском (кривые совпадают) — это не касание, а бесконечно много решений
      if (phi(-d / 2) < TOL && phi(0) < TOL && phi(d / 2) < TOL) {
        const [x, y] = proj(mx, my);
        if (ok(x, y)) zeroCells++;
        continue;
      }
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
    for (const [P, Q] of pairs(ct)) {
      const r = intersect(P, Q, p, ct.box, N, n2d, ct.box1D);
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
  function holds(ct, p, N, n2d) {
    const sol = solutions(ct, p, N, n2d);
    return ct.asks.every(a => askHolds(a, countWhere(sol, a.where, p)));
  }

  // ---------- Карта ответа ----------
  // Делим диапазон a на куски с одинаковым числом решений.
  function map(ct, range, opts = {}) {
    const [a0, a1] = range;
    const M = opts.samples || 400, N = opts.N || 6000;
    const where = ct.asks.length === 1 ? ct.asks[0].where : null;
    const cnt = (p) => countWhere(solutions(ct, p, N, opts.n2d || 160), where, p);
    const segs = [];
    for (let i = 0; i <= M; i++) {
      const p = a0 + (a1 - a0) * i / M, n = cnt(p), L = segs[segs.length - 1];
      if (L && L.n === n) L.hi = p; else segs.push({ lo: p, hi: p, n });
    }
    // Кусок из одной точки сетки (сетка попала ровно в касание) — это отдельная точка, а не промежуток.
    const special = [];
    for (let i = segs.length - 2; i > 0; i--) {
      const S = segs[i];
      if (S.lo === S.hi && segs[i - 1].n !== S.n && segs[i + 1].n !== S.n) {
        special.push({ p: S.lo, n: countWhere(solutions(ct, S.lo), where, S.lo) });
        segs.splice(i, 1);
        if (segs[i - 1].n === segs[i].n) { segs[i - 1].hi = segs[i].hi; segs.splice(i, 1); }
      }
    }
    // Границу между кусками уточняем делением пополам. Если два решения рождаются/исчезают
    // сразу — ищем точное a касания; если ровно там решений другое число — отдельная точка.
    for (let i = 0; i < segs.length - 1; i++) {
      const sl = segs[i].hi, sr = segs[i + 1].lo;
      let lo = sl, hi = sr;
      for (let k = 0; k < 45; k++) { const m = (lo + hi) / 2; if (cnt(m) === segs[i].n) lo = m; else hi = m; }
      let b = (lo + hi) / 2;
      const nl = segs[i].n, nr = segs[i + 1].n, jump = Math.abs(nr - nl);
      let touch = null;
      if (Number.isFinite(jump) && jump % 2 === 0) {
        touch = nr > nl ? touchValue(ct, sr, sl, N) : touchValue(ct, sl, sr, N);
        // обе кривые неявные (две окружности) — уточняем границу точным подсчётом
        if (touch === null) {
          const exact = (m) => countWhere(solutions(ct, m), where, m);
          let u = sl, w = sr;
          for (let k = 0; k < 36; k++) { const m = (u + w) / 2; if (exact(m) === nl) u = m; else w = m; }
          touch = (u + w) / 2;
        }
      }
      // Уточнение касания принимаем, только если оно там же, где граница по подсчёту:
      // при a = 0 прямая может пройти через оба конца дуги сразу — это не касание.
      if (touch !== null && Math.abs(touch - b) <= 1e-4 * (a1 - a0)) b = touch;
      // Границы в школьных задачах — точные числа (−1, 4/9, 2√2): приближение заменяем точным,
      // и уже в нём считаем решения. Если там их число другое, чем по обе стороны, — отдельная точка.
      const ex = PL.sets.snap(b);
      if (ex) b = ex.v;
      segs[i].hi = segs[i + 1].lo = b;
      segs[i].hiLabel = ex ? ex.s : null;
      const nb = countWhere(solutions(ct, b), where, b);
      segs[i].hiN = nb; // сколько решений ровно на границе
      if (nb !== nl && nb !== nr) special.push({ p: b, n: nb, label: ex ? ex.s : undefined });
    }
    return { segs, special: mergeSpecial(special, specialAt(ct, opts.special || [], range)) };
  }
  // Точное значение a, при котором две близкие точки пересечения сливаются (касание).
  // aIn — точки ещё есть, aOut — уже нет. Ищем ноль «высоты» экстремума h между этими точками.
  function touchValue(ct, aIn, aOut, N) {
    for (const [P, Q] of pairs(ct)) {
      const eIn = explicitH(P, Q, aIn);
      if (!eIn) continue;
      const r = roots1D(eIn.h, eIn.valid, -ct.box1D, ct.box1D, N * 3).roots.sort((u, w) => u - w);
      // самая близкая пара соседних корней
      let best = null;
      for (let k = 0; k + 1 < r.length; k++) if (!best || r[k + 1] - r[k] < best[1] - best[0]) best = [r[k], r[k + 1]];
      if (!best || best[1] - best[0] > 3) continue;
      const tm = (best[0] + best[1]) / 2, w = Math.max(1.5 * (best[1] - best[0]), 0.05);
      const s = -Math.sign(eIn.h(tm));
      if (!s) continue;
      // φ(a) = min s·h(t) около tm: при aIn < 0, при aOut > 0
      const phi = (a) => {
        const e = explicitH(P, Q, a);
        // вне области определения (край полуокружности) считаем значение «очень большим»
        const f = (t) => { const v = s * e.h(t); return Number.isFinite(v) && e.valid(t) ? v : Infinity; };
        let lo = tm - w, hi = tm + w;
        for (let k = 0; k < 90; k++) {
          const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
          if (f(m1) < f(m2)) hi = m2; else lo = m1;
        }
        return f((lo + hi) / 2);
      };
      if (!(phi(aIn) < 0 && phi(aOut) > 0)) continue;
      let u = aIn, v = aOut;
      for (let k = 0; k < 60; k++) { const m = (u + v) / 2; if (phi(m) < 0) u = m; else v = m; }
      return (u + v) / 2;
    }
    return null;
  }

  // Число решений точно в заданных значениях a (концы ответа). Элемент: число или {v, s} — значение и запись.
  function specialAt(ct, list, [a0, a1]) {
    const where = ct.asks.length === 1 ? ct.asks[0].where : null;
    const seen = [];
    return list.map(x => (typeof x === "number" ? { v: x } : x)).filter(x => x.v > a0 && x.v < a1)
      .filter(x => !seen.some(v => Math.abs(v - x.v) < 1e-9) && seen.push(x.v)) // у точки {0} оба конца — 0
      .map(x => ({ p: x.v, label: x.s, n: countWhere(solutions(ct, x.v), where, x.v) }));
  }
  function mergeSpecial(found, given) {
    const out = [...given];
    for (const f of found) if (!out.some(g => Math.abs(g.p - f.p) < 1e-6)) out.push(f);
    return out.sort((u, w) => u.p - w.p);
  }

  // ---------- Проверка ответа задачи ----------
  // Сравниваем ответ с численным подсчётом: в концах промежутков ответа,
  // в серединах между ними и на частой сетке. Возвращает список расхождений.
  function verify(task, answerSet) {
    const ct = compileTask(task);
    const bs = PL.sets.boundaries(answerSet).map(b => b.v).filter(Number.isFinite);
    const [r0, r1] = ct.aRange || [-20, 20];
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
    // Отдельные значения a (касания), которых нет в ответе, сетка не заметит — находим их картой.
    // Так ловится ответ, где забыто, например, касание при a = 3 + √65.
    try { for (const s of map(ct, [lo, hi], { samples: 300 }).special) probes.add(s.p); } catch (e) { /* без карты */ }
    const bad = [];
    for (const p of probes) {
      const want = PL.sets.contains(answerSet, p);
      const got = holds(ct, p);
      if (want !== got) bad.push({ a: p, want, got });
    }
    bad.sort((u, w) => u.a - w.a);
    return bad.filter((x, i) => i === 0 || Math.abs(x.a - bad[i - 1].a) > 1e-6);
  }

  // Ответ «по карте»: где выполняется условие (одно условие на число решений).
  // Возвращает множество с точными концами там, где их удалось узнать, или null.
  function answerFromMap(ct, m, range) {
    if (ct.asks.length !== 1) return null;
    const ok = (n) => askHolds(ct.asks[0], n);
    const S = PL.sets, lab = (v, s) => ({ v, s: S.exact(v, s) || v.toPrecision(6) });
    const parts = [];
    m.segs.forEach((sg, i) => {
      if (!ok(sg.n)) return;
      const lo = i === 0 ? S.NINF : lab(sg.lo, m.segs[i - 1].hiLabel);
      const hi = i === m.segs.length - 1 ? S.INF : lab(sg.hi, sg.hiLabel);
      parts.push(S.iv(lo, hi, i > 0 && ok(m.segs[i - 1].hiN), i < m.segs.length - 1 && ok(sg.hiN)));
    });
    for (let i = 0; i < m.segs.length - 1; i++) if (ok(m.segs[i].hiN)) parts.push(S.point(lab(m.segs[i].hi, m.segs[i].hiLabel)));
    for (const sp of m.special) if (ok(sp.n)) parts.push(S.point(lab(sp.p, sp.label)));
    return S.normalize(parts);
  }

  // ---------- Удобный диапазон a ----------
  // Грубо считаем решения на широком отрезке, берём все места, где их число меняется
  // (и концы ответа), и обрамляем их с запасом. Границы — «круглые» числа.
  function fitRange(ct, extra = []) {
    const [s0, s1] = ct.search, M = 800;
    const where = ct.asks.length === 1 ? ct.asks[0].where : null;
    const pts = extra.filter(Number.isFinite);
    let prev = null;
    for (let i = 0; i <= M; i++) {
      const p = s0 + (s1 - s0) * i / M, n = countWhere(solutions(ct, p, 3000, 90), where, p);
      if (prev !== null && n !== prev.n) pts.push((prev.p + p) / 2);
      prev = { p, n };
    }
    if (!pts.length) return [-10, 10];
    const lo = Math.min(...pts), hi = Math.max(...pts), w = hi - lo;
    const pad = Math.max(w * 0.4, 1);
    let r0 = lo - pad, r1 = hi + pad;
    const raw = (r1 - r0) / 10, k = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / k;
    const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * k / 2;
    r0 = Math.floor(r0 / step) * step; r1 = Math.ceil(r1 / step) * step;
    return [+r0.toPrecision(10), +r1.toPrecision(10)];
  }

  return { compileTask, compileCurve, compileCond, solutions, countWhere, askHolds, holds, map, specialAt, mergeSpecial, verify, fitRange, answerFromMap };
})();
