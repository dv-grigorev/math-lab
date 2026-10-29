"""Проверка банка «Задачи с параметром»: каждый записанный ответ сверяется
с численным подсчётом числа решений. Неверный ответ — сайт не публикуется.
"""
import pytest

SEEDS = 30

CHECK_ALL = """
(seeds) => {
  const out = [];
  const rng = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
  const check = (where, task) => {
    try {
      const parsed = PL.sets.parse(task.answer);
      const bad = PL.solve.verify(task, parsed.set);
      if (bad.length) out.push(`${where}: ответ «${task.answer}» не сходится при a = ` +
        bad.slice(0, 3).map(b => `${b.a.toFixed(4)} (по ответу ${b.want ? "да" : "нет"}, по счёту ${b.got ? "да" : "нет"})`).join(", "));
      for (const st of task.steps || []) if (typeof st.a === "string") PL.expr.value(st.a);
    } catch (e) { out.push(`${where}: ${e.message}`); }
  };
  for (const t of PL.topics) {
    t.memo.forEach((m, i) => { if (m.scene) try { PL.solve.compileTask(m.scene); } catch (e) { out.push(`${t.id} памятка ${i + 1}: ${e.message}`); } });
    t.examples.forEach((ex, i) => check(`${t.id} разбор ${i + 1}`, { ...ex.task, answer: ex.answer, steps: ex.steps }));
    for (const g of t.generators) for (let s = 1; s <= seeds; s++) check(`${t.id} генератор ${g.id}, seed ${s}`, g.make(rng(s)));
  }
  const ids = new Set();
  for (const task of PL.bank) {
    if (ids.has(task.id)) out.push(`банк: повторяется id «${task.id}»`);
    ids.add(task.id);
    if (!PL.topics.some(t => t.id === task.topic)) out.push(`банк ${task.id}: нет подтемы «${task.topic}»`);
    check(`банк ${task.id}`, task);
  }
  return out;
}
"""


def test_parameters_bank(browser, base_url):
    page = browser.new_page()
    page.goto(f"{base_url}/labs/parameters/index.html", wait_until="networkidle")
    problems = page.evaluate(CHECK_ALL, SEEDS)
    page.close()
    assert not problems, "\n".join(problems)


@pytest.mark.parametrize("tab", ["memo", "examples", "practice"])
def test_parameters_tabs(browser, base_url, tab):
    """Каждая вкладка каждой подтемы открывается без ошибок."""
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{base_url}/labs/parameters/index.html?tab={tab}", wait_until="networkidle")
    topics = page.locator("#topics .chip")
    for i in range(topics.count()):
        topics.nth(i).click()
        page.locator(f'#tabs .chip[data-tab="{tab}"]').click()
        if tab == "examples":
            for _ in range(10):
                if page.locator("#next").is_disabled():
                    break
                page.locator("#next").click()
        if tab == "practice":
            page.locator("#ans").fill("(-1; 2] ∪ {3}")
            page.locator("#check").click()
            assert page.locator(".verdict-box").count() == 1
    page.close()
    assert not errors, "\n".join(errors)


def test_editor_roundtrip(browser, base_url):
    """Конструктор: задача в плоскости (x; a) проверяется, скачанный teacher.js читается обратно."""
    page = browser.new_page(accept_downloads=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())  # «в банке есть задача без ответа — всё равно скачать?»
    page.goto(f"{base_url}/labs/parameters/editor.html", wait_until="networkidle")
    page.locator("#new").click()
    page.locator("#f-text").fill("При каких $a$ уравнение $|x^2 - 4| = a$ имеет ровно четыре корня?")
    page.locator("#f-system").fill("")
    page.locator('input[name=plane][value="xa"]').check()
    page.locator("#f-p1").fill("a = |x^2 - 4|")
    page.locator("#f-ask").fill("=4")
    page.locator("#f-a0").fill("-2")
    page.locator("#f-a1").fill("8")
    page.locator("#f-answer").fill("(0; 5)")
    page.locator(".check-box.bad").wait_for(timeout=20000)   # неверный ответ пойман
    page.locator("#f-answer").fill("(0; 4)")
    page.locator(".check-box.ok").wait_for(timeout=20000)
    with page.expect_download() as dl:
        page.locator("#download").click()
    text = open(dl.value.path(), encoding="utf-8").read()
    page.close()
    assert not errors, "\n".join(errors)

    check = browser.new_page()
    check.set_content("<p>")
    check.add_script_tag(content="window.PL = { bank: [] };")
    check.add_script_tag(content=text)
    bank = check.evaluate("PL.bank")
    check.close()
    task = bank[-1]
    assert task["plane"] == "xa" and task["answer"] == "(0; 4)" and task["eq"] == ["a = |x^2 - 4|"]
