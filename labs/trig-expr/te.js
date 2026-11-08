// Математика тренажёра «Тригонометрические выражения» — без DOM, её проверяет tests/test_trig_expr.py.
// Точные числа — вида n/d·√r (r без квадратов): в них остаются произведения, частные и квадраты
// синусов и косинусов, поэтому все ответы задач считаются точно, без десятичных приближений.
window.TE = (function () {
  const { MINUS, frac, fmt } = Lab;
  const PI = Math.PI;

  // ---------- Точные числа n/d·√r ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
  function num(n, d = 1, r = 1) {
    if (d < 0) { n = -n; d = -d; }
    if (n === 0 || r === 0) return { n: 0, d: 1, r: 1 };
    for (let k = Math.floor(Math.sqrt(r)); k > 1; k--) {   // самый большой квадрат k², делящий r, — за корень
      if (r % (k * k) === 0) { n *= k; r /= k * k; break; }
    }
    const g = gcd(n, d);
    return { n: n / g, d: d / g, r };
  }
  const ONE = num(1);
  const mul = (a, b) => num(a.n * b.n, a.d * b.d, a.r * b.r);
  const div = (a, b) => num(a.n * b.d, a.d * b.n * b.r, a.r * b.r);   // √(a.r / b.r) = √(a.r·b.r) / b.r
  const neg = a => num(-a.n, a.d, a.r);
  const sq = a => mul(a, a);
  function add(a, b) {
    if (a.n === 0) return b;
    if (b.n === 0) return a;
    if (a.r !== b.r) throw new Error("сумма чисел с разными корнями");
    return num(a.n * b.d + b.n * a.d, a.d * b.d, a.r);
  }
  const sub = (a, b) => add(a, neg(b));
  const root = q => num(1, q.d, q.n * q.d);   // √(n/d) = √(n·d)/d — для неотрицательного рационального q
  const abs = a => num(Math.abs(a.n), a.d, a.r);
  const times = (k, a) => mul(num(k), a);
  const val = a => a.n / a.d * Math.sqrt(a.r);
  const isZero = a => a.n === 0;
  const same = (a, b) => a.n === b.n && a.d === b.d && a.r === b.r;

  // «3/5», «−2√6/5», «√3» → число
  function parseNum(s) {
    const m = String(s).replace(/[−–]/g, "-").match(/^(-?)(\d*)(?:√(\d+))?(?:\/(\d+))?$/);
    if (!m || (!m[2] && !m[3])) throw new Error("не число: " + s);
    return num((m[1] ? -1 : 1) * (m[2] ? +m[2] : 1), m[4] ? +m[4] : 1, m[3] ? +m[3] : 1);
  }
  function parts(a) {
    const top = (Math.abs(a.n) === 1 && a.r > 1 ? "" : Math.abs(a.n)) + (a.r > 1 ? "√" + a.r : "");
    return { sign: a.n < 0 ? MINUS : "", top, d: a.d };
  }
  function text(a) { const p = parts(a); return p.sign + p.top + (p.d > 1 ? "/" + p.d : ""); }
  function html(a) { const p = parts(a); return p.sign + (p.d > 1 ? frac(p.top, p.d) : p.top); }
  // в середине выкладки отрицательное число — в скобках: 2·(−4/5)
  const par = a => (a.n < 0 ? `(${html(a)})` : html(a));

  // ---------- Ответ ученика ----------
  // «−2√6/5», «2*sqrt(6)/5», «-0,8», «1/√5», «(√3)/3» → число; ошибка — понятным текстом
  function evalInput(src) {
    const s = String(src).toLowerCase().replace(/\s+/g, "").replace(/[−–—]/g, "-").replace(/,/g, ".")
      .replace(/sqrt|корень/g, "√").replace(/[·×*]/g, "*").replace(/:/g, "/");
    if (!s) throw new Error("Введите ответ.");
    let i = 0;
    const peek = () => s[i];
    function primary() {
      const c = peek();
      if (c === "(") { i++; const v = expr(); if (peek() !== ")") throw new Error("Не хватает закрывающей скобки."); i++; return v; }
      if (c === "√") { i++; const v = primary(); if (v < 0) throw new Error("Под корнем отрицательное число."); return Math.sqrt(v); }
      const m = s.slice(i).match(/^\d+(\.\d+)?/);
      if (!m) throw new Error(c ? `Непонятный символ «${c}».` : "Ответ оборвался.");
      i += m[0].length;
      return +m[0];
    }
    function unary() {
      if (peek() === "-") { i++; return -unary(); }
      if (peek() === "+") { i++; return unary(); }
      return primary();
    }
    function term() {
      let v = unary();
      for (;;) {
        const c = peek();
        if (c === "*") { i++; v *= unary(); }
        else if (c === "/") { i++; const w = unary(); if (w === 0) throw new Error("Деление на ноль."); v /= w; }
        else if (c === "√" || c === "(" || /\d/.test(c || "")) v *= primary();   // 2√6 — это 2·√6
        else return v;
      }
    }
    function expr() {
      let v = term();
      while (peek() === "+" || peek() === "-") v = s[i++] === "+" ? v + term() : v - term();
      return v;
    }
    const v = expr();
    if (i < s.length) throw new Error(`Непонятный символ «${s[i]}».`);
    return v;
  }
  // Сравнение ответа с точным числом. Десятичная дробь вместо корня — подсказываем записать точно.
  function checkInput(src, answer) {
    let v;
    try { v = evalInput(src); } catch (e) { return { ok: false, error: e.message }; }
    const want = val(answer);
    if (Math.abs(v - want) < 1e-9 * Math.max(1, Math.abs(want))) return { ok: true };
    const approx = /\./.test(String(src).replace(/,/g, ".")) && answer.r > 1 && Math.abs(v - want) < 0.01;
    return { ok: false, approx };
  }

  // ---------- Тригонометрия ----------
  const FUNCS = ["sin", "cos", "tg", "ctg"];
  const bounded = f => f === "sin" || f === "cos";   // |f| ≤ 1, период 2π; у tg и ctg — период π
  const rad = deg => deg * PI / 180;
  const sgnTxt = s => (s > 0 ? "+" : MINUS);
  const CO = { sin: "cos", cos: "sin", tg: "ctg", ctg: "tg" };   // кофункция
  const FN = {
    sin: Math.sin, cos: Math.cos,
    tg: t => (Math.abs(Math.cos(t)) < 1e-12 ? NaN : Math.tan(t)),
    ctg: t => (Math.abs(Math.sin(t)) < 1e-12 ? NaN : Math.cos(t) / Math.sin(t)),
  };
  // Знак функции в четверти q = 1…4
  const SIGNS = { sin: [1, 1, -1, -1], cos: [1, -1, -1, 1], tg: [1, -1, 1, -1], ctg: [1, -1, 1, -1] };
  const signIn = (f, q) => SIGNS[f][q - 1];
  const ROMAN = ["I", "II", "III", "IV"];
  const signWord = s => (s > 0 ? "&gt; 0" : "&lt; 0");

  // Табличные значения (числом) → точное число
  const TABLE = ["0", "1/2", "√2/2", "√3/2", "1", "√3", "√3/3"].flatMap(k => (k === "0" ? [k] : [k, "-" + k])).map(parseNum);
  const exact = x => TABLE.find(a => Math.abs(val(a) - x) < 1e-9) || null;

  // Углы: в градусах (числом) → «150°», «22,5°» или в радианах «5π/6»
  function rat(n, d) { const g = gcd(n, d); return [n / g, d / g]; }
  function piParts(deg) {   // deg·π/180 = (n/d)π; deg может быть дробным с шагом 0,5
    const [n, d] = rat(Math.round(deg * 2), 360);
    const a = Math.abs(n);
    return { sign: n < 0 ? MINUS : "", top: a === 0 ? "0" : a === 1 ? "π" : a + "π", d };
  }
  const radText = deg => { const p = piParts(deg); return p.sign + p.top + (p.d > 1 ? "/" + p.d : ""); };
  const radHTML = deg => { const p = piParts(deg); return p.sign + (p.d > 1 ? frac(p.top, p.d) : p.top); };
  const degText = deg => fmt(deg, 1) + "°";
  const angHTML = (deg, unit) => (unit === "deg" ? degText(deg) : radHTML(deg));
  // Промежуток четверти: (π/2; π) или (90°; 180°)
  const quarterHTML = (q, unit) => `(${angHTML(90 * (q - 1), unit)}; ${angHTML(90 * q, unit)})`;
  const quarterOf = deg => { const d = ((deg % 360) + 360) % 360; return d % 90 === 0 ? 0 : Math.floor(d / 90) + 1; };

  // ---------- Формулы приведения ----------
  // f(k·π/2 + s·α), s = ±1, α — острый: функция меняется, если k·π/2 на вертикальной оси (k нечётное);
  // знак — как у исходной f в четверти угла k·π/2 + s·α.
  function reduce(f, k, s) {
    const q = s > 0 ? (k % 4) + 1 : ((k - 1) % 4) + 1;
    const vertical = k % 2 === 1;
    return { g: vertical ? CO[f] : f, sign: signIn(f, q), q, vertical };
  }
  // Аргумент «π/2 + α», «270° − α»
  const argHTML = (k, s, unit) => `${angHTML(90 * k, unit)} ${sgnTxt(s)} α`;
  const termHTML = (sign, g, x = "α") => `${sign < 0 ? MINUS : ""}${g} ${x}`;

  // ---------- Значение функции табличного угла любой величины ----------
  // f(x), x в градусах (кратен 30° или 45°, может быть отрицательным и больше оборота).
  // Шаги, как решает ученик: чётность → лишние периоды → приведение к острому углу → таблица.
  // Возвращает { v, steps } или null, если значения нет (tg 90°, ctg 180° …).
  const period = f => (bounded(f) ? 360 : 180);
  function valueOf(f, deg, unit) {
    if (!Number.isFinite(FN[f](rad(deg)))) return null;
    const A = d => angHTML(d, unit), steps = [];
    let sign = 1, x = deg;
    if (x < 0) {
      const odd = f !== "cos";
      steps.push(odd
        ? `${f} — нечётная функция: ${f}(${A(x)}) = ${MINUS}${f} ${A(-x)}.`
        : `cos — чётная функция: cos(${A(x)}) = cos ${A(-x)}.`);
      if (odd) sign = -1;
      x = -x;
    }
    const P = period(f);
    if (x >= P) {
      const n = Math.floor(x / P), r = x - n * P;
      steps.push(`Отбрасываем лишние периоды (период ${f} — ${A(P)}): ${A(x)} = ${A(n * P)} + ${A(r)}, поэтому ${f} ${A(x)} = ${f} ${A(r)}.`);
      x = r;
    }
    let v;
    if (x < 90 || x % 90 === 0) {
      v = exact(FN[f](rad(x)));
      steps.push(`${f} ${A(x)} = ${html(v)} (табличное значение).`);
    } else {   // x = K ± β, K = 180° или 360° — на горизонтали, функция не меняется
      const [K, s] = x < 180 ? [180, -1] : x < 270 ? [180, 1] : [360, -1];
      const beta = s > 0 ? x - K : K - x, r = reduce(f, K / 90, s);
      v = times(r.sign, exact(FN[f](rad(beta))));
      steps.push(`${A(x)} = ${A(K)} ${sgnTxt(s)} ${A(beta)}: ${A(K)} на горизонтальной оси — функция та же; ` +
        `угол в ${ROMAN[r.q - 1]} четверти, там ${f} ${signWord(r.sign)}: ${f} ${A(x)} = ${termHTML(r.sign, f, A(beta))} = ${html(v)}.`);
    }
    if (sign < 0) steps.push(`С минусом от нечётности: ${f}(${A(deg)}) = ${html(times(-1, v))}.`);
    return { v: times(sign, v), steps };
  }
  // «f(x)» для записи выражений: аргумент всегда в скобках, как в задачниках ЕГЭ
  const fx = (f, deg, unit, pow = "") => `${f}${pow}(${angHTML(deg, unit)})`;

  // ---------- Значения по одной функции и четверти ----------
  // f — известная функция, v — её значение (точное), q — четверть. Возвращает все четыре значения
  // и шаги решения для каждой искомой функции.
  function solveFrom(f, v, q) {
    const out = { [f]: v }, steps = {};
    const S = signIn("sin", q), Cs = signIn("cos", q);
    if (bounded(f)) {
      const g = CO[f], g2 = sub(ONE, sq(v)), mag = root(g2), sg = f === "sin" ? Cs : S;
      out[g] = sg > 0 ? mag : neg(mag);
      steps[g] = [
        `Основное тождество: ${g}²α = 1 ${MINUS} ${f}²α = 1 ${MINUS} ${html(sq(v))} = ${html(g2)}.`,
        `Значит, |${g} α| = ${html(mag)}. В ${ROMAN[q - 1]} четверти ${g} α ${signWord(sg)}, поэтому ${g} α = ${html(out[g])}.`,
      ];
      out.tg = div(out.sin, out.cos); out.ctg = div(out.cos, out.sin);
      steps.tg = [...steps[g], `tg α = sin α : cos α = ${par(out.sin)} : ${par(out.cos)} = ${html(out.tg)}.`];
      steps.ctg = [...steps[g], `ctg α = cos α : sin α = ${par(out.cos)} : ${par(out.sin)} = ${html(out.ctg)}.`];
    } else {
      const g = CO[f];   // tg ↔ ctg: 1 + tg²α = 1/cos²α, 1 + ctg²α = 1/sin²α
      out[g] = div(ONE, v);
      steps[g] = [`${g} α = 1 : ${f} α = 1 : ${par(v)} = ${html(out[g])}.`];
      const h = f === "tg" ? "cos" : "sin", other = CO[h];
      const h2 = div(ONE, add(ONE, sq(v))), mag = root(h2), sg = signIn(h, q);
      out[h] = sg > 0 ? mag : neg(mag);
      steps[h] = [
        `Формула 1 + ${f}²α = ${frac("1", h + "²α")}, отсюда ${h}²α = ${frac("1", "1 + " + f + "²α")} = ${frac("1", "1 + " + html(sq(v)))} = ${html(h2)}.`,
        `Значит, |${h} α| = ${html(mag)}. В ${ROMAN[q - 1]} четверти ${h} α ${signWord(sg)}, поэтому ${h} α = ${html(out[h])}.`,
      ];
      // sin = tg·cos, cos = ctg·sin
      out[other] = mul(v, out[h]);
      steps[other] = [...steps[h], f === "tg"
        ? `sin α = tg α · cos α = ${par(v)} · ${par(out.cos)} = ${html(out.sin)}.`
        : `cos α = ctg α · sin α = ${par(v)} · ${par(out.sin)} = ${html(out.cos)}.`];
    }
    return { vals: out, steps };
  }
  // Угол, заданный одной функцией и четвертью. sin²α = a/c: «тройки» — без корней в ответах (3/5, 4/5),
  // «корни» — с корнями (sin α = 1/3, cos α = 2√2/3). sin²α ≠ 1/2, чтобы tg 2α существовал.
  const SIN2 = {
    triples: [[9, 25], [16, 25], [25, 169], [144, 169], [64, 289], [225, 289], [49, 625], [576, 625], [400, 841], [441, 841]],
    roots: [[1, 9], [8, 9], [4, 9], [5, 9], [1, 5], [4, 5], [1, 10], [9, 10], [1, 3], [2, 3], [1, 16], [15, 16], [2, 5], [3, 5]],
  };
  function given(R, pool, f = pick(R, FUNCS)) {
    const [a, c] = pick(R, SIN2[pool]), q = 1 + Math.floor(R() * 4);
    const sin = times(signIn("sin", q), root(num(a, c))), cos = times(signIn("cos", q), root(num(c - a, c)));
    const vals = { sin, cos, tg: div(sin, cos), ctg: div(cos, sin) };
    return { f, v: vals[f], q, unit: randUnit(R, 0.3), vals };
  }
  // Двойной угол через уже найденные sin α и cos α
  function doubles(vals) {
    const s2 = times(2, mul(vals.sin, vals.cos)), c2 = sub(sq(vals.cos), sq(vals.sin));
    return { sin: s2, cos: c2, tg: isZero(c2) ? null : div(s2, c2) };
  }

  // ---------- Случайность для задач ----------
  // Задача восстанавливается по номеру (seed) — им можно поделиться ссылкой.
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
  const int = (R, lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
  const randSign = (R, pNeg = 0.5) => (R() < pNeg ? -1 : 1);
  const randUnit = (R, pDeg = 0.5) => (R() < pDeg ? "deg" : "rad");   // углы задачи — в градусах или радианах
  function shuffle(R, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // Выражения-варианты «равны тождественно?» — сравниваем в нескольких точках
  const PROBES = [0.37, 0.81, 1.23, 2.05, 2.9, 3.7, 4.4, 5.6];
  function sameFn(f, g) {
    return PROBES.every(a => { const x = f(a), y = g(a); return !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x - y) < 1e-9; });
  }
  // Готовые варианты ответа: верный + неверные, без повторов по значению
  function options(R, correct, pool, n = 4) {
    const out = [correct];
    for (const o of shuffle(R, pool)) {
      if (out.length >= n) break;
      if (!out.some(p => sameFn(p.fn, o.fn))) out.push(o);
    }
    const opts = shuffle(R, out);
    return { options: opts, correct: opts.indexOf(correct) };
  }

  return {
    num, parseNum, ONE, mul, div, sq, add, sub, root, abs, times, val, isZero, same,
    text, html, par, evalInput, checkInput,
    FUNCS, bounded, rad, sgnTxt, CO, FN, signIn, ROMAN, signWord, exact,
    radText, radHTML, degText, angHTML, quarterHTML, quarterOf,
    reduce, argHTML, termHTML, solveFrom, doubles, given, period, valueOf, fx,
    rng, pick, int, randSign, randUnit, options,
    topics: [],
  };
})();
