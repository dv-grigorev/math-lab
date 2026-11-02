"""Проверка тренажёра «Тригонометрическая окружность»: каждый ответ простейшего уравнения
сверяется с независимым перебором корней, неверные варианты не должны совпадать с верным.
Неверный ответ — сайт не публикуется.
"""

ROUNDS = 30  # варианты ответа выбираются случайно — перебираем много раз

CHECK_ALL = """
(rounds) => {
  const out = [], PI = Math.PI;
  const keys = { sincos: ["0", "1/2", "s2/2", "s3/2", "1", "s2", "s3", "2"], tgctg: ["0", "s3/3", "1", "s3"] };
  for (const f of ["sin", "cos", "tg", "ctg"]) {
    for (const k0 of keys[TC.bounded(f) ? "sincos" : "tgctg"]) for (const key of k0 === "0" ? [k0] : [k0, "-" + k0]) {
      const where = `${f} x = ${TC.tok(key).text}`, a = TC.tok(key).v;
      // независимо от формул: все кратные π/12 на [−4π; 4π], где f(x) = a
      const truth = [];
      for (let j = -48; j <= 48; j++) if (Math.abs(TC.FN[f](j * PI / 12) - a) < 1e-9) truth.push(Math.round(j / 12 * 1e6) / 1e6 || 0);
      const correct = TC.correctAnswer(f, key);
      if (TC.mainRat(f, key) || correct.kind === "none") {
        const got = TC.solSet(correct);
        if (got.join() !== truth.join()) out.push(`${where}: ответ ${TC.answerHTML(correct)} даёт ${got}, а должно быть ${truth}`);
        for (let r = 0; r < rounds; r++) {
          const ds = TC.distractors(f, key, correct);
          if (ds.length !== 3) out.push(`${where}: неверных вариантов ${ds.length}, нужно 3`);
          for (const D of ds) if (TC.sameSet(D, correct)) out.push(`${where}: «неверный» вариант ${TC.answerHTML(D)} на самом деле верен`);
        }
      }
      // точки на окружности: и для табличных, и для нетабличных a
      const pts = TC.eqPoints(f, TC.aInfo(key));
      const need = new Set(truth.map(x => ((x % 2) + 2) % 2)).size;
      if (pts.length !== need || pts.some(p => Math.abs(TC.FN[f](p.t) - a) > 1e-9))
        out.push(`${where}: на окружности ${pts.length} точек (${pts.map(p => p.label)}), нужно ${need}`);
    }
    for (const v of [-1.5, -0.7, -0.3, 0.3, 0.7, 1.5]) {
      const pts = TC.eqPoints(f, TC.aInfo(String(v)));
      const need = TC.bounded(f) && Math.abs(v) > 1 ? 0 : 2;
      if (pts.length !== need || pts.some(p => Math.abs(TC.FN[f](p.t) - v) > 1e-9))
        out.push(`${f} x = ${v}: точки ${pts.map(p => p.label)} не решения`);
    }
  }
  const rad = { "5π/6": [5, 6], "5pi/6": [5, 6], "5п/6": [5, 6], "−π": [-1, 1], "-2π": [-2, 1], "π": [1, 1],
    "5/6π": [5, 6], "10π/12": [5, 6], "0": [0, 1], "2,6": null, "π/0": null };
  for (const [s, want] of Object.entries(rad)) {
    const got = TC.parseRad(s);
    if (JSON.stringify(got) !== JSON.stringify(want)) out.push(`parseRad("${s}") = ${JSON.stringify(got)}, нужно ${JSON.stringify(want)}`);
  }
  const deg = { "150": 150, "150°": 150, "−30 градусов": -30, "abc": null };
  for (const [s, want] of Object.entries(deg)) if (TC.parseDeg(s) !== want) out.push(`parseDeg("${s}") = ${TC.parseDeg(s)}, нужно ${want}`);
  return out;
}
"""


def test_trig_answers(browser, base_url):
    page = browser.new_page()
    page.goto(f"{base_url}/labs/trig-circle/index.html", wait_until="networkidle")
    problems = page.evaluate(CHECK_ALL, ROUNDS)
    page.close()
    assert not problems, "\n".join(problems)


def test_trig_training(browser, base_url):
    """Тренировки проходятся до конца: верный ответ засчитывается."""
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{base_url}/labs/trig-circle/index.html?m=deg&d=d2r", wait_until="networkidle")
    for _ in range(5):
        deg = page.evaluate("+document.getElementById('formula').textContent.match(/−?-?\\d+/)[0].replace('−', '-')")
        n, d = page.evaluate("(x) => TC.rat(x, 180)", deg)
        page.locator("#degIn").fill(f"{n}π/{d}")
        page.locator("#degCheck").click()
        assert "Верно" in page.locator("#degStatus").inner_text(), f"{deg}° = {n}π/{d} не засчитано"
        page.locator("#degNext").click()

    page.goto(f"{base_url}/labs/trig-circle/index.html?m=train", wait_until="networkidle")
    for _ in range(5):
        page.locator("#trCheck").click()   # без точек
        page.locator(".opt").first.wait_for()
        assert page.locator(".opt").count() == 4, "должно быть 4 варианта ответа"
        page.locator(".opt").first.click()
        assert page.locator(".opt.right").count() == 1, "верный вариант не подсвечен"
        page.locator("#trNext").click()
    page.close()
    assert not errors, "\n".join(errors)
