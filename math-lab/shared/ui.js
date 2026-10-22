// Общие функции для всех тренажёров лаборатории.
window.Lab = (function () {
  const MINUS = "−";

  // Число по-школьному: −2,5 вместо -2.5
  function fmt(x, digits = 2) {
    if (Math.abs(x) < 1e-9) x = 0;
    let s = (+x.toFixed(digits)).toString().replace(".", ",");
    return s.replace("-", MINUS);
  }

  // Параметры в адресной строке: ?f=quad&p=2
  const urlState = {
    get(key, fallback) {
      const v = new URLSearchParams(location.search).get(key);
      return v === null ? fallback : v;
    },
    getNum(key, fallback, min = -Infinity, max = Infinity) {
      const n = parseFloat(this.get(key, ""));
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    },
    set(obj) {
      const params = new URLSearchParams(location.search);
      for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) params.delete(k); else params.set(k, v);
      }
      const qs = params.toString();
      try { history.replaceState(null, "", qs ? "?" + qs : location.pathname); } catch (e) {}
    },
  };

  // Ползунок с подписью и значением.
  // Lab.slider(container, {label, min, max, step, value, onInput}) -> {get, set, hint}
  function slider(container, opts) {
    const id = "s" + Math.random().toString(36).slice(2, 8);
    const wrap = document.createElement("div");
    wrap.className = "slider";
    wrap.innerHTML =
      `<div class="slider-top"><label for="${id}"></label><output></output></div>` +
      `<input type="range" id="${id}">` +
      `<div class="hint"></div>`;
    wrap.querySelector("label").innerHTML = opts.label;
    const input = wrap.querySelector("input");
    const out = wrap.querySelector("output");
    const hint = wrap.querySelector(".hint");
    input.min = opts.min; input.max = opts.max; input.step = opts.step;
    input.value = opts.value;
    const show = () => (out.textContent = fmt(+input.value));
    input.addEventListener("input", () => { show(); opts.onInput && opts.onInput(+input.value); });
    show();
    container.appendChild(wrap);
    return {
      get: () => +input.value,
      set(v) { input.value = v; show(); },
      hint: (html) => (hint.innerHTML = html),
      el: wrap,
    };
  }

  return { fmt, urlState, slider, MINUS };
})();
