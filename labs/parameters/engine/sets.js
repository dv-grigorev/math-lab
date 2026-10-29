// Ответы задач с параметром — множества значений a.
// Множество = отсортированный список промежутков {lo, hi, loC, hiC, loS, hiS}:
// lo/hi — числа (±Infinity), loC/hiC — входит ли конец, loS/hiS — как конец записан.
// Точка {3} — промежуток с lo = hi и обоими концами.
PL.sets = (function () {
  const { value, MINUS } = PL.expr;
  const EPS = 1e-7;

  // ---------- Точные числа (p + q√d) / n — для ответов генераторов ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
  function surd(p, q = 0, d = 1, n = 1) {
    // выносим квадраты из-под корня
    if (q !== 0 && d > 1) {
      for (let k = Math.floor(Math.sqrt(d)); k > 1; k--) {
        if (d % (k * k) === 0) { q *= k; d /= k * k; break; }
      }
    }
    if (d === 1) { p += q; q = 0; }
    if (q === 0) d = 1;
    if (d === 0) { q = 0; d = 1; }
    if (n < 0) { p = -p; q = -q; n = -n; }
    const g = gcd(gcd(p, q), n) || 1;
    p /= g; q /= g; n /= g;
    return { p, q, d, n, v: (p + q * Math.sqrt(d)) / n };
  }
  // Запись в той же форме, в какой вводит ученик: «-1 - 2√3», «(3 + √5)/2», «-√2/2»
  function surdStr(s) {
    const rad = (q) => (Math.abs(q) === 1 ? "" : Math.abs(q)) + "√" + s.d;
    let top;
    if (s.q === 0) top = String(s.p);
    else if (s.p === 0) top = (s.q < 0 ? "-" : "") + rad(s.q);
    else top = s.p + (s.q < 0 ? " - " : " + ") + rad(s.q);
    if (s.n === 1) return top;
    if (s.q === 0 || s.p === 0) return top + "/" + s.n;
    return "(" + top + ")/" + s.n;
  }
  const num = (s) => ({ v: s.v, s: surdStr(s) });

  // Корни A·t² + B·t + C = 0 (целые коэффициенты), по возрастанию.
  function quadRoots(A, B, C) {
    if (A === 0) return B === 0 ? [] : [surd(-C, 0, 1, B)];
    const D = B * B - 4 * A * C;
    if (D < 0) return [];
    if (D === 0) return [surd(-B, 0, 1, 2 * A)];
    const r = [surd(-B, -1, D, 2 * A), surd(-B, 1, D, 2 * A)];
    return r.sort((u, w) => u.v - w.v);
  }

  // Узнать точное число по приближённому: 2.8284271 → «2√2», 0.8944272 → «2√5/5», 1.3333 → «4/3».
  // Ищем (p + q√d)/n с небольшими n, q, d; не нашли — null.
  const SQUAREFREE = [1, 2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30, 31, 33, 34, 35, 37, 38, 39, 41, 42, 43, 46, 47];
  function recognize(v) {
    if (!Number.isFinite(v)) return null;
    let best = null;
    const take = (score, str) => { if (!best || score < best.score) best = { score, str }; };
    // (p + q√d)/n
    for (let n = 1; n <= 12; n++) {
      for (const d of SQUAREFREE) {
        const qs = d === 1 ? [0] : [];
        if (d > 1) for (let q = 1; q <= 12; q++) qs.push(q, -q);
        for (const q of qs) {
          const p = Math.round(v * n - q * Math.sqrt(d));
          if (Math.abs(p) > 200 || Math.abs(v * n - p - q * Math.sqrt(d)) > 1e-7 * n) continue;
          const sd = surd(p, q, d, n);
          take(sd.n + Math.abs(sd.q) + (sd.q ? sd.d / 4 : 0) + Math.abs(sd.p) / 8, surdStr(sd));
        }
      }
      if (best && best.score <= n) return best.str;
    }
    if (best && best.score <= 6) return best.str;
    // (m/n)·log_b(k): log2(3), lg(5), ln(2), 2log3(5)/3
    for (const [b, name] of [[2, "log2"], [3, "log3"], [5, "log5"], [10, "lg"], [Math.E, "ln"]]) {
      for (let k = 2; k <= 100; k++) {
        const L = Math.log(k) / Math.log(b);
        if (Math.abs(L - Math.round(L)) < 1e-9) continue; // log2(8) = 3 — это просто число
        for (let n = 1; n <= 6; n++) for (let m = 1; m <= 6; m++) {
          if (gcd(m, n) !== 1) continue;
          for (const sg of [1, -1]) {
            if (Math.abs(v - sg * m * L / n) > 1e-8) continue;
            take(3 + m + n + k / 10, (sg < 0 ? "-" : "") + (m === 1 ? "" : m) + `${name}(${k})` + (n === 1 ? "" : "/" + n));
          }
        }
      }
    }
    // p·π/n
    for (let n = 1; n <= 12; n++) for (let p = -24; p <= 24; p++) {
      if (!p || gcd(p, n) !== 1 || Math.abs(v - p * Math.PI / n) > 1e-8) continue;
      take(2 + Math.abs(p) + n, (p < 0 ? "-" : "") + (Math.abs(p) === 1 ? "" : Math.abs(p)) + "pi" + (n === 1 ? "" : "/" + n));
    }
    return best ? best.str : null;
  }
  // Запись для простого текста (ось, ползунок): «log₂3», «√8», «2π/3», минус — «−».
  function plain(s) {
    const sub = { 2: "₂", 3: "₃", 5: "₅" };
    return s.replace(/log(\d)\(([^()]+)\)/g, (_, b, k) => "log" + sub[b] + k)
      .replace(/\b(lg|ln)\(([^()]+)\)/g, "$1$2")
      .replace(/sqrt\(([^()]+)\)/g, "√$1")
      .replace(/pi/g, "π").replace(/-/g, "−");
  }
  // Точная запись числа (её можно разобрать формулой) или null
  function exact(v, given) {
    if (given) { try { if (Math.abs(PL.expr.value(given) - v) < 1e-9) return given; } catch (e) { /* не формула */ } }
    return recognize(v);
  }
  // Подпись числа: точная запись, если узнали, иначе «≈ 2,83».
  function label(v, given) {
    const s = exact(v, given);
    return s ? plain(s) : "≈ " + PL.expr.fmtNum(v);
  }

  // ---------- Конструкторы множеств ----------
  const INF = { v: Infinity, s: "+∞" }, NINF = { v: -Infinity, s: "-∞" };
  function iv(lo, hi, loC, hiC) {
    return { lo: lo.v, hi: hi.v, loC: !!loC && Number.isFinite(lo.v), hiC: !!hiC && Number.isFinite(hi.v), loS: lo.s, hiS: hi.s };
  }
  const point = (x) => iv(x, x, true, true);
  const all = () => [iv(NINF, INF)];

  // Решение A·a² + B·a + C (op) 0 с точными концами. op: "<", "<=", ">", ">=", "=", "!="
  function quadIneq(A, B, C, op) {
    const roots = quadRoots(A, B, C).map(num);
    const f = (t) => A * t * t + B * t + C;
    const ok = (val) => ({ "<": val < 0, "<=": val <= 0, ">": val > 0, ">=": val >= 0, "=": val === 0, "!=": val !== 0 })[op];
    if (A === 0 && B === 0) return ok(C) ? all() : [];
    return fromBoundaries(roots, (t) => ok(Math.abs(f(t)) < 1e-12 ? 0 : f(t)));
  }

  // Собрать множество по точкам-границам и проверке «входит ли t».
  function fromBoundaries(bounds, has) {
    const bs = dedupe(bounds.filter(b => Number.isFinite(b.v)).sort((p, q) => p.v - q.v));
    const pts = [NINF, ...bs, INF];
    const out = [];
    let cur = null; // {lo, loC} — открытый сейчас промежуток
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const mid = !Number.isFinite(a.v) ? (Number.isFinite(b.v) ? b.v - 1 : 0) : !Number.isFinite(b.v) ? a.v + 1 : (a.v + b.v) / 2;
      // промежуток (a; b)
      if (has(mid)) { if (!cur) cur = { lo: a, loC: false }; }
      else if (cur) { out.push(iv(cur.lo, a, cur.loC, true)); cur = null; }
      // точка b
      if (!Number.isFinite(b.v)) break;
      const pb = has(b.v);
      if (cur && !pb) { out.push(iv(cur.lo, b, cur.loC, false)); cur = null; }
      else if (!cur && pb) cur = { lo: b, loC: true };
    }
    if (cur) out.push(iv(cur.lo, INF, cur.loC, false));
    return normalize(out);
  }
  function dedupe(list) {
    const out = [];
    for (const b of list) if (!out.length || Math.abs(out[out.length - 1].v - b.v) > EPS) out.push(b);
    return out;
  }

  function contains(set, t) {
    for (const I of set) {
      if (t > I.lo + EPS && t < I.hi - EPS) return true;
      if (Math.abs(t - I.lo) <= EPS && I.loC) return true;
      if (Math.abs(t - I.hi) <= EPS && I.hiC) return true;
    }
    return false;
  }
  function boundaries(set) {
    const b = [];
    for (const I of set) { b.push({ v: I.lo, s: I.loS }); b.push({ v: I.hi, s: I.hiS }); }
    return b;
  }
  // Склеиваем пересекающиеся и соприкасающиеся промежутки.
  function normalize(set) {
    const s = set.filter(I => I.lo < I.hi - EPS || (Math.abs(I.hi - I.lo) <= EPS && I.loC && I.hiC))
      .sort((p, q) => p.lo - q.lo || (q.loC - p.loC));
    const out = [];
    for (const I of s) {
      const L = out[out.length - 1];
      if (L && (I.lo < L.hi - EPS || (Math.abs(I.lo - L.hi) <= EPS && (L.hiC || I.loC)))) {
        if (I.hi > L.hi + EPS) { L.hi = I.hi; L.hiC = I.hiC; L.hiS = I.hiS; }
        else if (Math.abs(I.hi - L.hi) <= EPS) L.hiC = L.hiC || I.hiC;
        if (Math.abs(I.lo - L.lo) <= EPS) L.loC = L.loC || I.loC;
      } else out.push({ ...I });
    }
    return out;
  }
  function combine(A, B, fn) {
    return fromBoundaries([...boundaries(A), ...boundaries(B)], t => fn(contains(A, t), contains(B, t)));
  }
  const union = (A, B) => combine(A, B, (p, q) => p || q);
  const intersect = (A, B) => combine(A, B, (p, q) => p && q);
  const minus = (A, B) => combine(A, B, (p, q) => p && !q);

  function equal(A, B) {
    const bs = [...boundaries(A), ...boundaries(B)].map(b => b.v).filter(Number.isFinite).sort((p, q) => p - q);
    const probe = [...bs];
    for (let i = 0; i < bs.length - 1; i++) probe.push((bs[i] + bs[i + 1]) / 2);
    probe.push(bs.length ? bs[0] - 1 : 0, bs.length ? bs[bs.length - 1] + 1 : 0);
    return probe.every(t => contains(A, t) === contains(B, t));
  }

  // ---------- Разбор ответа ученика ----------
  function parse(src) {
    let s = src.trim()
      .replace(/[−–—]/g, "-").replace(/\s+/g, " ")
      .replace(/^a\s*(∈|=|:)?\s*/i, "")
      .replace(/∞|inf(inity)?|беск\w*/gi, "∞")
      .replace(/\bU\b|∪|\bu\b|или/g, "∪");
    if (!s || /^(∅|нет|ни при каких|пусто)/i.test(s)) return { set: [] };
    if (/^(ℝ|R|любое|любые|все)$/i.test(s)) return { set: all() };
    const parts = s.split("∪").map(p => p.trim());
    const out = [];
    for (const p of parts) {
      if (!p) throw new Error("Пустой кусок между знаками ∪");
      if (p[0] === "{") {
        if (p[p.length - 1] !== "}") throw new Error(`Не закрыта фигурная скобка: «${p}»`);
        for (const x of splitList(p.slice(1, -1))) out.push(point(endpoint(x)));
      } else if (p[0] === "(" || p[0] === "[") {
        const last = p[p.length - 1];
        if (last !== ")" && last !== "]") throw new Error(`Промежуток должен заканчиваться «)» или «]»: «${p}»`);
        const inner = splitList(p.slice(1, -1));
        if (inner.length !== 2) throw new Error(`В промежутке нужно два конца через «;»: «${p}»`);
        const lo = endpoint(inner[0]), hi = endpoint(inner[1]);
        if (p[0] === "[" && !Number.isFinite(lo.v)) throw new Error("У бесконечности скобка всегда круглая: (−∞");
        if (last === "]" && !Number.isFinite(hi.v)) throw new Error("У бесконечности скобка всегда круглая: +∞)");
        if (lo.v > hi.v + EPS) throw new Error(`Левый конец больше правого: «${p}»`);
        if (Math.abs(lo.v - hi.v) <= EPS && !(p[0] === "[" && last === "]")) throw new Error(`Пустой промежуток: «${p}»`);
        out.push(iv(lo, hi, p[0] === "[", last === "]"));
      } else {
        for (const x of splitList(p)) out.push(point(endpoint(x)));
      }
    }
    return { set: normalize(out) };
  }
  // «1; 2» или «1,5; 2» — разделитель «;». Если «;» нет — допускаем «, » с пробелом.
  function splitList(s) {
    if (s.includes(";")) return s.split(";").map(t => t.trim());
    if (/,\s/.test(s)) return s.split(/,\s/).map(t => t.trim());
    return [s.trim()];
  }
  function endpoint(t) {
    if (!t) throw new Error("Пропущено число");
    const m = t.replace(/\s/g, "");
    if (m === "∞" || m === "+∞") return { v: Infinity, s: "+∞" };
    if (m === "-∞") return { v: -Infinity, s: "-∞" };
    try {
      const v = value(t);
      if (!Number.isFinite(v)) throw new Error();
      return { v, s: t.trim() };
    } catch (e) {
      throw new Error(`Не понимаю число «${t}»` + (e.message ? `: ${e.message}` : ""));
    }
  }
  function tryParse(src) {
    try { return parse(src); } catch (e) { return { error: e.message }; }
  }

  // ---------- Запись множества ----------
  function format(set) {
    if (!set.length) return "∅";
    const parts = [];
    let points = [];
    const flush = () => { if (points.length) { parts.push("{" + points.join("; ") + "}"); points = []; } };
    for (const I of set) {
      if (Math.abs(I.hi - I.lo) <= EPS) { points.push(I.loS); continue; }
      flush();
      parts.push((I.loC ? "[" : "(") + I.loS + "; " + I.hiS + (I.hiC ? "]" : ")"));
    }
    flush();
    return parts.join(" ∪ ");
  }
  // Для показа: школьный минус, красивые корни и дроби.
  function formatHTML(set) {
    return format(set).replace(/[^\s;{}()[\]∪]+(?:\s[+-]\s[^\s;{}()[\]∪]+)*/g, (tok) => {
      if (/^[+-]?∞$/.test(tok) || tok === "∅") return tok.replace("-", MINUS);
      try { return PL.expr.html(PL.expr.parse(tok)); } catch (e) { return tok; }
    });
  }

  return { surd, surdStr, recognize, exact, plain, label, quadRoots, quadIneq, iv, point, all, num, INF, NINF, fromBoundaries,
    contains, normalize, union, intersect, minus, equal, parse, tryParse, format, formatHTML, boundaries, EPS };
})();
