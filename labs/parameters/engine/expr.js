// Формулы «по-школьному»: разбор, вычисление и красивый вывод.
// Понимает: 2x, a(x+1), x^2, x², √x, √(x+1), sqrt(x), |x - 2|, 2√2, π,
// sin, cos, tg, ln, lg, log2. Переменные: x, y, a.
window.PL = window.PL || {};
PL.topics = PL.topics || [];  // подтемы: topics/*.js
PL.bank = PL.bank || [];      // задачи учителя: bank/teacher.js
PL.expr = (function () {
  const MINUS = "−";
  const FUNCS = {
    sqrt: "Math.sqrt", abs: "Math.abs", sin: "Math.sin", cos: "Math.cos",
    tg: "Math.tan", tan: "Math.tan", ln: "Math.log", lg: "Math.log10",
    log2: "Math.log2", log3: "((t)=>Math.log(t)/Math.log(3))", log5: "((t)=>Math.log(t)/Math.log(5))",
    exp: "Math.exp",
  };
  const VARS = ["x", "y", "a"]; // в вычислениях; для показа годится любая латинская буква

  // ---------- Лексер ----------
  function tokenize(src) {
    const s = src
      .replace(/[−–—]/g, "-").replace(/[·×]/g, "*").replace(/:/g, "/")
      .replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/≠/g, "!=")
      .replace(/π/g, " pi ").replace(/√/g, " √ ");
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1]))) {
        let j = i;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
        if ((s[j] === "." || s[j] === ",") && /[0-9]/.test(s[j + 1])) {
          j++;
          while (j < s.length && /[0-9]/.test(s[j])) j++;
        }
        out.push({ t: "num", v: parseFloat(s.slice(i, j).replace(",", ".")) });
        i = j; continue;
      }
      if (/[a-zA-Zа-яА-Я_]/.test(c)) {
        let j = i;
        while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
        let word = s.slice(i, j);
        if (/^log_\d$/.test(word)) word = "log" + word[4];
        splitWord(word, out);
        i = j; continue;
      }
      const two = s.slice(i, i + 2);
      if (["<=", ">=", "!="].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
      if (c === "±") { out.push({ t: "op", v: "±" }); i++; continue; }
      if ("+-*/^()|=<>√".includes(c)) { out.push({ t: c === "√" ? "sqrt" : "op", v: c }); i++; continue; }
      throw new Error(`Непонятный символ «${c}»`);
    }
    return out;
  }

  // «ax» → a·x, «sqrt» → функция, «pi» → π
  function splitWord(word, out) {
    let k = 0;
    while (k < word.length) {
      const rest = word.slice(k);
      const fn = Object.keys(FUNCS).sort((p, q) => q.length - p.length).find(f => rest.startsWith(f));
      if (fn) { out.push({ t: "fn", v: fn }); k += fn.length; continue; }
      if (rest.startsWith("pi")) { out.push({ t: "num", v: Math.PI, pi: true }); k += 2; continue; }
      const ch = word[k];
      if (/[a-zA-Z]/.test(ch)) {
        // x_0 — переменная с индексом (только для показа)
        const sub = word.slice(k + 1).match(/^_(\d+)/);
        out.push({ t: "var", v: sub ? ch + "_" + sub[1] : ch });
        k += sub ? 1 + sub[0].length : 1; continue;
      }
      if (/[0-9]/.test(ch)) {
        let j = k; while (j < word.length && /[0-9]/.test(word[j])) j++;
        out.push({ t: "num", v: +word.slice(k, j) }); k = j; continue;
      }
      throw new Error(`Непонятное обозначение «${word}». Переменные: x, y, a`);
    }
  }

  // ---------- Парсер ----------
  function parse(src) {
    const toks = tokenize(src);
    let pos = 0, absDepth = 0;
    const peek = () => toks[pos];
    const isOp = (v) => peek() && peek().t === "op" && peek().v === v;
    const eat = (v) => {
      if (!isOp(v)) throw new Error(v === ")" ? "Не хватает закрывающей скобки «)»" : `Ожидалось «${v}»`);
      pos++;
    };

    function expr() {
      let l = term();
      while (isOp("+") || isOp("-")) {
        const op = toks[pos++].v;
        l = { t: "bin", op, l, r: term() };
      }
      return l;
    }
    function startsOperand() {
      const k = peek();
      if (!k) return false;
      if (k.t === "num" || k.t === "var" || k.t === "fn" || k.t === "sqrt") return true;
      if (k.t === "op" && k.v === "(") return true;
      if (k.t === "op" && k.v === "|" && absDepth === 0) return true;
      return false;
    }
    function term() {
      let l = unary();
      for (;;) {
        if (isOp("*") || isOp("/")) {
          const op = toks[pos++].v;
          l = { t: "bin", op, l, r: unary() };
        } else if (startsOperand()) {
          l = { t: "bin", op: "*", l, r: power(), implicit: true };
        } else break;
      }
      return l;
    }
    function unary() {
      if (isOp("-")) { pos++; return { t: "neg", a: unary() }; }
      if (isOp("+")) { pos++; return unary(); }
      if (isOp("±")) { pos++; return { t: "pm", a: unary() }; }
      return power();
    }
    function power() {
      const base = primary();
      if (isOp("^")) { pos++; return { t: "bin", op: "^", l: base, r: unary() }; }
      return base;
    }
    function primary() {
      const k = peek();
      if (!k) throw new Error("Формула оборвалась");
      if (k.t === "num") { pos++; return k.pi ? { t: "num", v: k.v, pi: true } : { t: "num", v: k.v }; }
      if (k.t === "var") { pos++; return { t: "var", n: k.v }; }
      if (k.t === "sqrt") { pos++; return { t: "fn", f: "sqrt", a: primary() }; }
      if (k.t === "fn") {
        pos++;
        if (isOp("(")) { pos++; const a = expr(); eat(")"); return { t: "fn", f: k.v, a }; }
        return { t: "fn", f: k.v, a: power() };
      }
      if (k.t === "op" && k.v === "(") { pos++; const a = expr(); eat(")"); return { t: "par", a }; }
      if (k.t === "op" && k.v === "|") {
        pos++; absDepth++;
        const a = expr();
        absDepth--;
        if (!isOp("|")) throw new Error("Не хватает закрывающего модуля «|»");
        pos++;
        return { t: "fn", f: "abs", a };
      }
      throw new Error(`Неожиданное «${k.v}»`);
    }

    const ast = expr();
    if (pos < toks.length) throw new Error(`Лишнее «${toks[pos].v}»`);
    return strip(ast);
  }
  // Скобки нужны только парсеру — убираем их из дерева.
  function strip(n) {
    if (n.t === "par") return strip(n.a);
    if (n.t === "bin") return { ...n, l: strip(n.l), r: strip(n.r) };
    if (n.t === "neg" || n.t === "fn" || n.t === "pm") return { ...n, a: strip(n.a) };
    return n;
  }

  function uses(n, v) {
    if (n.t === "var") return n.n === v;
    if (n.t === "bin") return uses(n.l, v) || uses(n.r, v);
    if (n.t === "neg" || n.t === "fn") return uses(n.a, v);
    return false;
  }

  // ---------- Компиляция в JS ----------
  // map: {x:"x", y:"y", a:"p"} — как называются переменные в функции (x, y, p)
  function js(n, map) {
    switch (n.t) {
      case "num": return "(" + n.v + ")";
      case "var":
        if (!(n.n in map)) throw new Error(`Неизвестная переменная «${n.n}». Можно: x, y, a`);
        return map[n.n];
      case "pm": throw new Error("Знак ± — только для записи, не для вычислений");
      case "neg": return "(-" + js(n.a, map) + ")";
      case "fn": return FUNCS[n.f] + "(" + js(n.a, map) + ")";
      case "bin":
        if (n.op === "^") return "Math.pow(" + js(n.l, map) + "," + js(n.r, map) + ")";
        return "(" + js(n.l, map) + n.op + js(n.r, map) + ")";
    }
  }
  function compile(ast, map = { x: "x", y: "y", a: "p" }) {
    return new Function("x", "y", "p", "return " + js(ast, map) + ";");
  }
  // Число из записи вроде «2√2», «-1/3», «(1+√5)/2»
  function value(src) {
    const ast = parse(src);
    for (const v of VARS) if (uses(ast, v)) throw new Error(`Здесь нужно число, а не «${v}»`);
    return compile(ast)(0, 0, 0);
  }

  // ---------- Упрощение (для показа формул с подставленным a) ----------
  // val — число или готовое дерево формулы (например, «2√2»)
  function subst(n, name, val) {
    if (n.t === "var" && n.n === name) return typeof val === "number" ? { t: "num", v: val } : val;
    if (n.t === "bin") return { ...n, l: subst(n.l, name, val), r: subst(n.r, name, val) };
    if (n.t === "neg" || n.t === "fn") return { ...n, a: subst(n.a, name, val) };
    return n;
  }
  const isNum = (n, v) => n.t === "num" && !n.pi && (v === undefined || Math.abs(n.v - v) < 1e-12);
  function simplify(n) {
    if (n.t === "neg") {
      const a = simplify(n.a);
      if (isNum(a)) return { t: "num", v: -a.v };
      if (a.t === "neg") return a.a;
      return { t: "neg", a };
    }
    if (n.t === "fn") return { ...n, a: simplify(n.a) };
    if (n.t !== "bin") return n;
    const l = simplify(n.l), r = simplify(n.r);
    if (isNum(l) && isNum(r) && n.op !== "/") {
      const v = n.op === "+" ? l.v + r.v : n.op === "-" ? l.v - r.v : n.op === "*" ? l.v * r.v : Math.pow(l.v, r.v);
      if (Number.isFinite(v)) return { t: "num", v };
    }
    switch (n.op) {
      case "+":
        if (isNum(l, 0)) return r;
        if (isNum(r, 0)) return l;
        if (isNum(r) && r.v < 0) return { t: "bin", op: "-", l, r: { t: "num", v: -r.v } };
        if (r.t === "neg") return { t: "bin", op: "-", l, r: r.a };
        break;
      case "-":
        if (isNum(r, 0)) return l;
        if (isNum(l, 0)) return simplify({ t: "neg", a: r });
        if (isNum(r) && r.v < 0) return { t: "bin", op: "+", l, r: { t: "num", v: -r.v } };
        break;
      case "*":
        if (isNum(l, 0) || isNum(r, 0)) return { t: "num", v: 0 };
        if (isNum(l, 1)) return r;
        if (isNum(r, 1)) return l;
        if (isNum(l, -1)) return simplify({ t: "neg", a: r });
        if (isNum(l) && l.v < 0) return { t: "neg", a: { ...n, l: { t: "num", v: -l.v }, r } };
        break;
      case "/":
        if (isNum(r, 1)) return l;
        if (isNum(l, 0)) return { t: "num", v: 0 };
        break;
      case "^":
        if (isNum(r, 1)) return l;
        break;
    }
    return { ...n, l, r };
  }

  // ---------- Красивый вывод в HTML ----------
  function fmtNum(v) {
    if (Math.abs(v) < 1e-12) v = 0;
    let s = (+v.toFixed(3)).toString().replace(".", ",");
    return s.replace("-", MINUS);
  }
  const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 4 };
  function prec(n) {
    if (n.t === "bin") return PREC[n.op];
    if (n.t === "neg") return 1.5;
    if (n.t === "num" && n.v < 0) return 1.5;
    return 5;
  }
  function wrap(s) { return "(" + s + ")"; }
  function leadsWithNumber(n) {
    if (n.t === "num") return !n.pi;
    if (n.t === "bin") return n.op === "/" ? false : leadsWithNumber(n.l);
    return false;
  }
  function html(n) {
    switch (n.t) {
      case "num": return n.pi ? "π" : fmtNum(n.v);
      case "var": {
        const [v, sub] = n.n.split("_");
        return `<i>${v}</i>` + (sub ? `<sub>${sub}</sub>` : "");
      }
      case "pm": return "±" + side(n.a, 1.5);
      case "neg": {
        const s = html(n.a);
        return MINUS + (prec(n.a) <= 1.5 ? wrap(s) : s);
      }
      case "fn": {
        if (n.f === "abs") return "|" + html(n.a) + "|";
        if (n.f === "sqrt") return `<span class="sqrt">√<span>${html(n.a)}</span></span>`;
        const name = { log2: "log<sub>2</sub>", log3: "log<sub>3</sub>", log5: "log<sub>5</sub>", tan: "tg" }[n.f] || n.f;
        return name + wrap(html(n.a));
      }
      case "bin": {
        const L = html(n.l), R = html(n.r);
        if (n.op === "+") {
          if (n.r.t === "neg") return L + " " + MINUS + " " + side(n.r.a, 1.5);
          if (n.r.t === "num" && n.r.v < 0) return L + " " + MINUS + " " + fmtNum(-n.r.v);
          return L + " + " + R;
        }
        if (n.op === "-") return L + " " + MINUS + " " + side(n.r, 1.5);
        if (n.op === "/") return `<span class="frac"><span>${L}</span><span>${R}</span></span>`;
        if (n.op === "^") {
          const b = prec(n.l) < 5 || (n.l.t === "num" && n.l.v < 0) ? wrap(L) : L;
          return b + "<sup>" + R + "</sup>";
        }
        // умножение; «−2√2», а не «(−2)√2»
        if (n.l.t === "neg") return MINUS + html({ ...n, l: n.l.a });
        if (n.l.t === "num" && n.l.v < 0) return MINUS + html({ ...n, l: { t: "num", v: -n.l.v } });
        const l = side(n.l, 2), r = side(n.r, 2.5);
        const rootLeft = n.l.t === "fn" && n.l.f === "sqrt" || (n.l.t === "bin" && n.l.op === "*" && n.l.r.t === "fn" && n.l.r.f === "sqrt");
        return l + (leadsWithNumber(n.r) || rootLeft ? "·" : "") + r;
      }
    }
  }
  function side(n, need) { const s = html(n); return prec(n) < need ? wrap(s) : s; }

  // Формула с подставленным a: «y = 0,5x + 2»
  // exact — точная запись a («2√2», «log2(3)»): подставляем её, а не десятичную дробь
  function htmlWith(ast, aValue, exact) {
    if (exact) { try { return html(simplify(subst(ast, "a", parse(exact)))); } catch (e) { /* ниже — числом */ } }
    return html(aValue === undefined ? ast : simplify(subst(ast, "a", aValue)));
  }

  // Текст с формулами в $…$ → HTML. Внутри $…$ можно «=», «<», «;», «,».
  function richText(text) {
    return text.replace(/\$([^$]+)\$/g, (_, f) => '<span class="f">' + formulaHTML(f) + "</span>");
  }
  // Формула целиком: части между знаками сравнения/«;» печатаются красиво.
  function formulaHTML(src) {
    // «a ∈ (1; 2] ∪ {3}» — справа множество
    const inSet = src.match(/^(.*?)\s*∈\s*(.+)$/);
    if (inSet && PL.sets) {
      const r = PL.sets.tryParse(inSet[2]);
      if (!r.error) return formulaHTML(inSet[1]) + " ∈ " + PL.sets.formatHTML(r.set);
    }
    const parts = src.split(/(<=|>=|!=|=|<|>|≤|≥|;|,(?!\d)| при | и )/);
    return parts.map(p => {
      const sym = { "<=": "≤", ">=": "≥", "!=": "≠", "=": "=", "<": "&lt;", ">": "&gt;", "≤": "≤", "≥": "≥", ";": ";", ",": "," }[p];
      if (sym) return ` ${sym} `;
      if (p === " при " || p === " и ") return p;
      if (!p.trim()) return p;
      try { return html(parse(p)); } catch (e) { return p.replace(/-/g, MINUS).replace(/\b([a-z])(?:_(\d+))?\b/g, (m, v, sub) => `<i>${v}</i>` + (sub ? `<sub>${sub}</sub>` : "")); }
    }).join("").replace(/ ([;,]) /g, "$1 ").replace(/\s+/g, " ").trim();
  }

  return { parse, compile, value, uses, simplify, subst, html, htmlWith, richText, formulaHTML, fmtNum, MINUS };
})();
