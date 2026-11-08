"""Проверка тренажёра «Тригонометрические выражения».

Каждый ответ сверяется с независимым численным подсчётом (Math.sin и т. п.), а не с теми же формулами:
- «вычислите» — значение исходного выражения на калькуляторе;
- «найдите по одной функции и четверти» — угол ищется численно (делением отрезка пополам в своей четверти);
- выбор из вариантов — верный вариант совпадает с выражением в нескольких точках, неверные — нет;
- правило лошади — с численным значением f(K ± α) для всех функций и углов;
- значение любого табличного угла от −1440° до 1440° — с калькулятором.
Неверный ответ — сайт не публикуется.
"""

SEEDS = 30

CHECK_ALL = r"""
(seeds) => {
  const out = [], PI = Math.PI, T = TE;
  const F = { sin: Math.sin, cos: Math.cos, tg: Math.tan, ctg: x => 1 / Math.tan(x) };
  const close = (x, y) => Math.abs(x - y) < 1e-9 * Math.max(1, Math.abs(y));
  // угол из четверти q, где f(α) = v: f монотонна внутри четверти — делим отрезок пополам
  function angle(f, v, q) {
    let lo = (q - 1) * PI / 2 + 1e-12, hi = q * PI / 2 - 1e-12;
    const g = x => F[f](x) - v, up = g(hi) > g(lo);
    if (Math.sign(g(lo)) === Math.sign(g(hi))) return NaN;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; ((g(m) > 0) === up) ? (hi = m) : (lo = m); }
    return (lo + hi) / 2;
  }
  const TARGET = { sin: Math.sin, cos: Math.cos, tg: Math.tan, ctg: x => 1 / Math.tan(x),
    sin2: x => Math.sin(2 * x), cos2: x => Math.cos(2 * x), tg2: x => Math.tan(2 * x) };
  const PROBES = [0.21, 0.55, 0.93, 1.37, 1.9, 2.6, 3.3, 4.1, 4.9, 5.7];

  for (const topic of T.topics) for (const gen of topic.generators) for (let seed = 1; seed <= seeds; seed++) {
    const where = `${topic.id}/${gen.id}#${seed}`;
    let t;
    try { t = gen.make(T.rng(seed)); } catch (e) { out.push(`${where}: ошибка ${e.message}`); continue; }
    const all = [t.text, ...(t.steps || []), ...(t.options || []).map(o => o.html)].join(" ");
    if (/undefined|NaN|null|\[object/.test(all)) out.push(`${where}: в тексте мусор: ${all.slice(0, 200)}`);
    if (t.kind === "input") {
      const got = T.val(t.answer);
      let truth;
      if (t.check) truth = t.check();
      else { const a = angle(t.data.f, t.data.v, t.data.q); truth = TARGET[t.data.target](a); }
      if (!close(got, truth)) out.push(`${where}: ответ ${T.text(t.answer)} = ${got}, а должно быть ${truth}. ${t.text}`);
      if (!T.checkInput(T.text(t.answer), t.answer).ok) out.push(`${where}: свой ответ ${T.text(t.answer)} не принимается`);
    } else {
      const xs = t.interval ? [0.1, 0.3, 0.5, 0.7, 0.9].map(u => t.interval[0] + u * (t.interval[1] - t.interval[0])) : PROBES;
      const okAt = fn => xs.every(x => { const a = t.fn(x), b = fn(x); return !Number.isFinite(a) || !Number.isFinite(b) || close(b, a); });
      if (!okAt(t.options[t.correct].fn)) out.push(`${where}: верный вариант ${t.options[t.correct].html} не равен выражению ${t.text}`);
      t.options.forEach((o, i) => { if (i !== t.correct && okAt(o.fn)) out.push(`${where}: «неверный» вариант ${o.html} тоже верен`); });
      if (t.options.length < 2) out.push(`${where}: вариантов меньше двух`);
    }
  }

  // Правило лошади против численного счёта: f(kπ/2 + sα) = ±g(α)
  for (const f of T.FUNCS) for (const k of [1, 2, 3, 4]) for (const s of [1, -1]) {
    const r = T.reduce(f, k, s);
    for (const a of [0.2, 0.7, 1.3, 2.4, 4.0, 5.5])
      if (!close(r.sign * F[r.g](a), F[f](k * PI / 2 + s * a))) { out.push(`правило: ${f}(${k}π/2 ${s > 0 ? "+" : "−"} α) ≠ ${r.sign > 0 ? "" : "−"}${r.g} α`); break; }
  }

  // Значение любого табличного угла (чётность → периоды → приведение) против калькулятора
  for (const f of T.FUNCS) for (let d = -1440; d <= 1440; d += 15) {
    if (d % 30 && d % 45) continue;
    const V = T.valueOf(f, d, "rad"), x = F[f](d * PI / 180), undef = Math.abs(x) > 1e12 || !Number.isFinite(T.FN[f](d * PI / 180));
    if (undef ? V !== null : !V || !close(T.val(V.v), x)) out.push(`valueOf: ${f}(${d}°) = ${V && T.text(V.v)}, а должно быть ${undef ? "не существует" : x}`);
  }

  // Точные числа против десятичных
  const R = T.rng(7), rnd = () => T.num(Math.floor(R() * 19) - 9 || 1, 1 + Math.floor(R() * 9), 1 + Math.floor(R() * 12));
  for (let i = 0; i < 300; i++) {
    const a = rnd(), b = rnd();
    if (!close(T.val(T.mul(a, b)), T.val(a) * T.val(b))) out.push(`умножение ${T.text(a)} · ${T.text(b)}`);
    if (!close(T.val(T.div(a, b)), T.val(a) / T.val(b))) out.push(`деление ${T.text(a)} : ${T.text(b)}`);
    if (!close(T.val(T.parseNum(T.text(a))), T.val(a))) out.push(`запись ${T.text(a)}`);
    const q = T.sq(a);
    if (!close(T.val(T.root(q)), Math.abs(T.val(a)))) out.push(`корень из ${T.text(q)}`);
  }

  // Разбор ответа ученика
  const inputs = { "-4/5": -0.8, "−4/5": -0.8, "-0,8": -0.8, "2√6/5": 2 * Math.sqrt(6) / 5, "2*sqrt(6)/5": 2 * Math.sqrt(6) / 5,
    "1/√5": 1 / Math.sqrt(5), "-(√3)/3": -Math.sqrt(3) / 3, "√2/4": Math.SQRT2 / 4, "3": 3, "−√3": -Math.sqrt(3), "2√2 / 3": 2 * Math.SQRT2 / 3 };
  for (const [s, want] of Object.entries(inputs)) {
    let v; try { v = T.evalInput(s); } catch (e) { v = e.message; }
    if (!close(v, want)) out.push(`evalInput("${s}") = ${v}, нужно ${want}`);
  }
  for (const bad of ["", "abc", "2/", "(1", "√-4"]) { try { T.evalInput(bad); out.push(`evalInput("${bad}") не дал ошибку`); } catch (e) {} }

  // Разборы: ответы в тексте сверены с калькулятором
  for (const topic of T.topics) topic.examples.forEach((ex, i) => (ex.checks || []).forEach(([fn, want], j) => {
    if (!close(fn(), want)) out.push(`${topic.id}, разбор ${i + 1}, проверка ${j + 1}: ${fn()} ≠ ${want}`);
  }));
  return out;
}
"""


def test_trig_expr_answers(browser, base_url):
    page = browser.new_page()
    page.goto(f"{base_url}/labs/trig-expr/index.html", wait_until="networkidle")
    problems = page.evaluate(CHECK_ALL, SEEDS)
    page.close()
    assert not problems, "\n".join(problems[:40])


def test_trig_expr_training(browser, base_url):
    """Тренировка проходится: верный ответ (введённый или выбранный) засчитывается."""
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    for topic in ("double", "reduction", "values", "find", "mixed"):
        page.goto(f"{base_url}/labs/trig-expr/index.html?t={topic}&tab=practice", wait_until="networkidle")
        for _ in range(6):
            kind = page.evaluate("TEPage.task().kind")
            if kind == "input":
                page.locator("#ans").fill(page.evaluate("TE.text(TEPage.task().answer)"))
                page.locator("#check").click()
            else:
                page.locator("#opts .opt").nth(page.evaluate("TEPage.task().correct")).click()
            status = page.locator("#status").inner_text()
            assert "Верно" in status, f"{topic}: верный ответ не засчитан: {status}"
            assert page.locator("#stageCard").is_visible(), "после ответа не открылась модель"
            page.locator("#another").click()
        assert "6 из 6" in page.locator("#score").inner_text()
    assert not errors, "\n".join(errors)
    page.close()
