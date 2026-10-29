"""Автопроверки лаборатории. Сайт публикуется, только если все они проходят.

Запуск: python -m pytest tests -v
"""
import functools
import http.server
import re
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
WIDTHS = [375, 1280]


def catalog_slugs():
    text = (ROOT / "catalog.js").read_text(encoding="utf-8")
    return re.findall(r'slug:\s*"([^"]+)"', text)


def lab_dirs():
    return sorted(p.name for p in (ROOT / "labs").iterdir() if p.is_dir())


SLUGS = catalog_slugs()


@pytest.fixture(scope="session")
def base_url():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a: None
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


def open_page(browser, url, width):
    """Открывает страницу и собирает все ошибки: JS, консоль, не найденные файлы."""
    page = browser.new_page(viewport={"width": width, "height": 800})
    errors = []
    page.on("pageerror", lambda e: errors.append(f"JS-ошибка: {e}"))
    page.on("console", lambda m: m.type == "error" and errors.append(f"Консоль: {m.text}"))
    page.on("response", lambda r: r.status >= 400 and errors.append(f"HTTP {r.status}: {r.url}"))
    page.goto(url, wait_until="networkidle")
    return page, errors


def assert_no_horizontal_scroll(page):
    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    assert overflow <= 1, f"Страница шире экрана на {overflow}px (горизонтальная прокрутка)"


# ---------- Каталог ----------

def test_catalog_not_empty():
    assert SLUGS, "В catalog.js нет ни одного тренажёра"


def test_catalog_slugs_unique():
    dupes = {s for s in SLUGS if SLUGS.count(s) > 1}
    assert not dupes, f"Повторяющиеся slug в catalog.js: {dupes}"


def test_every_catalog_entry_has_page():
    missing = [s for s in SLUGS if not (ROOT / "labs" / s / "index.html").exists()]
    assert not missing, f"В catalog.js есть записи без labs/<slug>/index.html: {missing}"


def test_every_lab_is_in_catalog():
    orphan = [d for d in lab_dirs() if d not in SLUGS]
    assert not orphan, f"Папки в labs/ без записи в catalog.js: {orphan}"


@pytest.mark.parametrize("width", WIDTHS)
def test_catalog_page(browser, base_url, width):
    page, errors = open_page(browser, f"{base_url}/index.html", width)
    cards = page.locator("a.lab-card")
    assert cards.count() == len(SLUGS), "На главной не все тренажёры из catalog.js"
    assert_no_horizontal_scroll(page)
    for i in range(cards.count()):
        href = cards.nth(i).get_attribute("href")
        assert (ROOT / href).exists(), f"Карточка ведёт на несуществующий файл: {href}"
    assert not errors, "\n".join(errors)
    page.close()


# ---------- Каждый тренажёр ----------

@pytest.mark.parametrize("width", WIDTHS)
@pytest.mark.parametrize("slug", SLUGS)
def test_lab(browser, base_url, slug, width):
    page, errors = open_page(browser, f"{base_url}/labs/{slug}/index.html", width)

    assert page.locator("a.back", has_text="Все тренажёры").count() == 1, "Нет ссылки «← Все тренажёры»"
    assert page.get_by_role("button", name="Сбросить").count() >= 1, "Нет кнопки «Сбросить»"
    assert page.locator("h2", has_text="Задания").count() >= 1, "Нет блока «Задания»"
    assert_no_horizontal_scroll(page)

    # Все ползунки — в крайние положения.
    sliders = page.locator('input[type="range"]')
    for i in range(sliders.count()):
        s = sliders.nth(i)
        for edge in ("min", "max"):
            s.evaluate(
                f"el => {{ el.value = el.{edge}; el.dispatchEvent(new Event('input', {{bubbles: true}})); }}"
            )

    # Все видимые кнопки и переключатели — по разу.
    controls = page.locator('button:visible, input[type="checkbox"]:visible')
    for i in range(controls.count()):
        c = controls.nth(i)
        if c.is_visible() and c.is_enabled():
            c.click()

    page.get_by_role("button", name="Сбросить").first.click()
    page.wait_for_timeout(100)
    assert_no_horizontal_scroll(page)
    assert not errors, "\n".join(errors)
    page.close()
