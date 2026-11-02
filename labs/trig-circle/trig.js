// Математика тренажёра «Тригонометрическая окружность» — без DOM, чтобы её проверяли автотесты
// (tests/test_trig_circle.py). Угол-дробь [n, d] означает nπ/d. Табличные числа — ключи:
// "1/2", "-s3/2" (−√3/2), "s3/3" (√3/3) и т. д.
window.TC = (function () {
  const { fmt, MINUS } = Lab;
  const PI = Math.PI;

  // ---------- Дроби с π ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
  function rat(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return [n / g || 0, d / g]; }
  const rAdd = (a, b) => rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
  const rNeg = a => rat(-a[0], a[1]);
  const rSub = (a, b) => rAdd(a, rNeg(b));
  const rEq = (a, b) => a[0] === b[0] && a[1] === b[1];
  const HALF = [1, 2], ONE = [1, 1];

  const fracHTML = (top, bottom) => `<span class="frac"><span>${top}</span><span>${bottom}</span></span>`;
  function piParts(r) { const n = Math.abs(r[0]); return { sign: r[0] < 0 ? MINUS : "", top: n === 1 ? "π" : n + "π", d: r[1] }; }
  function piText(r) { if (r[0] === 0) return "0"; const p = piParts(r); return p.sign + p.top + (p.d === 1 ? "" : "/" + p.d); }
  function piHTML(r) { if (r[0] === 0) return "0"; const p = piParts(r); return p.sign + (p.d === 1 ? p.top : fracHTML(p.top, p.d)); }
  const degText = d => String(d).replace("-", MINUS) + "°";

  // ---------- Табличные значения ----------
  // ключ → [число, числитель, знаменатель]; «-ключ» — то же со знаком минус
  const BASE = {
    "0": [0, "0", 1], "1/2": [0.5, "1", 2], "s2/2": [Math.SQRT2 / 2, "√2", 2], "s3/2": [Math.sqrt(3) / 2, "√3", 2],
    "1": [1, "1", 1], "s3/3": [Math.sqrt(3) / 3, "√3", 3], "s3": [Math.sqrt(3), "√3", 1],
    "s2": [Math.SQRT2, "√2", 1], "2": [2, "2", 1],
  };
  const TOKS = {};
  for (const [k, [v, top, d]] of Object.entries(BASE)) {
    for (const neg of k === "0" ? [false] : [false, true]) {
      const s = neg ? MINUS : "", key = (neg ? "-" : "") + k;
      TOKS[key] = { key, v: neg ? -v : v, text: s + top + (d === 1 ? "" : "/" + d), html: s + (d === 1 ? top : fracHTML(top, d)) };
    }
  }
  const tok = key => TOKS[key] || null;
  const recognize = x => Object.keys(TOKS).find(k => Math.abs(TOKS[k].v - x) < 1e-9) || null;
  // Число a: табличное (ключ) или десятичное ("0.3")
  const aInfo = key => tok(key) || { key: null, v: +key, text: fmt(+key), html: fmt(+key) };
  // Значение функции: точное, если табличное, иначе приближённое
  function valueHTML(x) { const k = recognize(x); return k ? TOKS[k].html : "≈ " + fmt(x, 3); }

  // Главные значения arcsin / arctg для табличных чисел (в долях π); arccos = π/2 − arcsin, arcctg = π/2 − arctg
  const ASIN = { "0": [0, 1], "1/2": [1, 6], "s2/2": [1, 4], "s3/2": [1, 3], "1": [1, 2] };
  const ATG = { "0": [0, 1], "s3/3": [1, 6], "1": [1, 4], "s3": [1, 3] };
  function arcRat(table, key) {
    if (!key) return null;
    const neg = key.startsWith("-"), r = table[neg ? key.slice(1) : key];
    return r ? (neg ? rNeg(r) : r) : null;
  }
  function mainRat(f, key) {
    const r = arcRat(f === "sin" || f === "cos" ? ASIN : ATG, key);
    return r && (f === "sin" || f === "tg" ? r : rSub(HALF, r));
  }
  const ARC = { sin: "arcsin", cos: "arccos", tg: "arctg", ctg: "arcctg" };
  const bounded = f => f === "sin" || f === "cos";   // |f| ≤ 1
  const FN = {
    sin: Math.sin, cos: Math.cos,
    tg: t => (Math.abs(Math.cos(t)) < 1e-9 ? NaN : Math.tan(t)),
    ctg: t => (Math.abs(Math.sin(t)) < 1e-9 ? NaN : Math.cos(t) / Math.sin(t)),
  };

  // ---------- Ответы простейших уравнений (табличное a) ----------
  // "two" — x = v + 2πn или x = π − v + 2πn; "pm" — x = ±v + 2πn; "one" — x = v + Pπn; "none" — нет решений
  const two = v => ({ kind: "two", v }), pm = v => ({ kind: "pm", v }), one = (v, P) => ({ kind: "one", v, P });
  const NONE = { kind: "none" };
  function correctAnswer(f, key) {
    const v = tok(key).v, m = mainRat(f, key);
    if (bounded(f) && Math.abs(v) > 1) return NONE;
    if (!bounded(f)) return one(m, 1);
    if (v === 0) return one(m, 1);          // sin: πn; cos: π/2 + πn
    if (Math.abs(v) === 1) return one(m, 2);
    return f === "sin" ? two(m) : pm(m);
  }
  // Корни ответа на [−4π; 4π] (в долях π) — чтобы сравнивать разные записи
  function solSet(F) {
    const out = [], v = F.v ? F.v[0] / F.v[1] : 0;
    const add = x => { if (Math.abs(x) <= 4 + 1e-9) out.push(Math.round(x * 1e6) / 1e6 || 0); };
    for (let n = -12; n <= 12; n++) {
      if (F.kind === "two") { add(v + 2 * n); add(1 - v + 2 * n); }
      if (F.kind === "pm") { add(v + 2 * n); add(-v + 2 * n); }
      if (F.kind === "one") add(v + F.P * n);
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }
  function sameSet(A, B) {
    const a = solSet(A), b = solSet(B);
    return a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
  }
  const OR = "&ensp;или&ensp;";
  function answerHTML(F) {
    if (F.kind === "none") return "нет решений";
    const r = F.v, start = r[0] === 0 ? "" : piHTML(r) + " + ";
    let s;
    if (F.kind === "two") s = `${start}2πn${OR}x = ${piHTML(rSub(ONE, r))} + 2πn`;
    if (F.kind === "pm") s = r[0] === 0 ? "2πn" : `±${piHTML([Math.abs(r[0]), r[1]])} + 2πn`;
    if (F.kind === "one") s = start + (F.P === 2 ? "2πn" : "πn");
    return `x = ${s}, n ∈ ℤ`;
  }
  // Запись, которую ученик не напишет даже по ошибке: «±π + 2πn», «π + πn», вторая серия совпала с первой
  function odd(F) {
    if (!F.v) return false;
    const x = Math.abs(F.v[0] / F.v[1]);
    return F.kind === "two" ? x >= 0.5 : (F.kind === "pm" || F.P === 1) && x >= 1;
  }
  // Три неверных варианта — типичные ошибки: знак, период, перепутанные arcsin/arccos, потерянная серия
  function distractors(f, key, correct) {
    const m = mainRat(f, key), co = r => rSub(HALF, r);
    let c;
    if (correct === NONE) {   // |a| > 1: ответы «как будто» для √2/2, √3/2, 1/2
      const fake = arcRat(ASIN, key.replace(/^(-?)(s[23])$/, "$1$2/2")) || (tok(key).v > 0 ? [1, 6] : [-1, 6]);
      c = [two(fake), pm(fake), one(fake, 2), pm(co(fake))];
    } else {
      c = {
        sin: [two(rNeg(m)), pm(m), two(co(m)), one(m, 2), one(m, 1), one(rNeg(m), 2), one(co(m), 1), one(co(m), 2)],
        cos: [two(m), pm(co(m)), pm(rSub(ONE, m)), one(m, 2), one(m, 1)],
        tg: [one(rNeg(m), 1), one(m, 2), one(co(m), 1), pm(m)],
        ctg: [one(co(m), 1), one(rNeg(m), 1), one(m, 2), pm(m)],
      }[f].concat(NONE);
    }
    const picked = [];
    for (const F of shuffle(c)) {
      if (picked.length < 3 && !odd(F) && !sameSet(F, correct) && !picked.some(P => sameSet(P, F))) picked.push(F);
    }
    return picked;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- Любое a (в т. ч. не табличное) — режим «Уравнения» ----------
  function eqAnswerHTML(f, a) {
    if (mainRat(f, a.key)) return answerHTML(correctAnswer(f, a.key));
    if (bounded(f) && Math.abs(a.v) > 1) return "нет решений";
    const A = `${ARC[f]} ${a.html.replace(MINUS, "")}`, neg = a.v < 0, s = neg ? MINUS : "";
    const body = {
      sin: `${s}${A} + 2πn${OR}x = π ${neg ? "+" : MINUS} ${A} + 2πn`,
      cos: neg ? `±(π ${MINUS} ${A}) + 2πn` : `±${A} + 2πn`,
      tg: `${s}${A} + πn`,
      ctg: `${neg ? `π ${MINUS} ` : ""}${A} + πn`,
    }[f];
    return `x = ${body}, n ∈ ℤ`;
  }
  // Точки-решения на окружности: [{t (рад), label}]
  function eqPoints(f, a) {
    const v = a.v, m = mainRat(f, a.key), neg = v < 0;
    if (bounded(f) && Math.abs(v) > 1) return [];
    const A = `${ARC[f]} ${a.text.replace(MINUS, "")}`;
    let pts;
    if (f === "sin") {
      const t = Math.asin(v);
      pts = [[t, m ? piText(m) : (neg ? MINUS : "") + A], [PI - t, m ? piText(rSub(ONE, m)) : `π ${neg ? "+" : MINUS} ${A}`]];
    } else if (f === "cos") {
      const t = Math.acos(v);
      pts = [[t, m ? piText(m) : neg ? `π ${MINUS} ${A}` : A], [-t, m ? piText(rNeg(m)) : neg ? `${MINUS}(π ${MINUS} ${A})` : MINUS + A]];
    } else {
      const t = f === "tg" ? Math.atan(v) : PI / 2 - Math.atan(v);
      const first = m ? piText(m) : f === "tg" ? (neg ? MINUS : "") + A : (neg ? `π ${MINUS} ` : "") + A;
      const second = m ? piText(rAdd(m, ONE)) : f === "tg" ? (neg ? `π ${MINUS} ${A}` : `${A} + π`) : (neg ? `2π ${MINUS} ${A}` : `${A} + π`);
      pts = [[t, first], [t + PI, second]];
    }
    if (Math.abs(Math.cos(pts[0][0] - pts[1][0]) - 1) < 1e-9) pts.pop();   // sin x = ±1, cos x = ±1: одна точка
    return pts.map(([t, label]) => ({ t, label }));
  }

  // ---------- Разбор ответа ученика ----------
  function parseRad(s) {   // «5π/6», «5pi/6», «-π», «5/6π», «0» → [n, d] или null
    s = s.toLowerCase().replace(/\s+/g, "").replace(/[−–—]/g, "-").replace(/пи|pi|п/g, "π").replace(/[*·()]/g, "");
    if (/^-?0$/.test(s)) return [0, 1];
    let m = s.match(/^(-?)(\d*)π(?:\/(\d+))?$/);
    if (m && m[3] !== "0") return rat((m[1] ? -1 : 1) * (m[2] ? +m[2] : 1), m[3] ? +m[3] : 1);
    m = s.match(/^(-?)(\d+)\/(\d+)π$/);
    if (m && m[3] !== "0") return rat((m[1] ? -1 : 1) * +m[2], +m[3]);
    return null;
  }
  function parseDeg(s) {   // «150», «150°», «−30 градусов» → число или null
    s = s.replace(/\s+/g, "").replace(/[−–—]/g, "-").replace(/°|градус\S*/g, "").replace(",", ".");
    return /^-?\d+(\.\d+)?$/.test(s) ? +s : null;
  }

  return {
    rat, rEq, piText, piHTML, degText, tok, recognize, aInfo, valueHTML, mainRat, ARC, FN, bounded,
    correctAnswer, solSet, sameSet, answerHTML, distractors, shuffle, eqAnswerHTML, eqPoints, parseRad, parseDeg,
  };
})();
