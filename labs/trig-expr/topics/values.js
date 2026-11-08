// Подтема «Значения выражений»: найти значения функций табличных углов (с лишними периодами,
// отрицательных) и подставить в выражение.
(function () {
  const T = TE, { MINUS, frac } = Lab;
  const { html, par, pick, num, mul, div, times, sq, valueOf, fx } = T;
  const PI = Math.PI, { rad } = T;

  // Угол с лишними периодами: табличный угол + n·360° (у tg и ctg иногда n·180°), часто со знаком минус
  const BASE = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];
  const AXIS = [0, 90, 180, 270];
  function bigAngle(R, f) {
    let x;
    do {
      const b = R() < 0.88 ? pick(R, BASE) : pick(R, AXIS);
      const step = T.period(f) === 180 && R() < 0.5 ? 180 : 360;
      x = T.randSign(R, 0.45) * (b + step * T.int(R, 1, 3));
    } while (!Number.isFinite(T.FN[f](rad(x))));
    return x;
  }
  // Множитель, после которого корень из ответа уходит: v = …√3 → множитель m√3
  const killRoot = (R, v) => num(pick(R, [1, 2, 3, 4, 6, 8]) * T.randSign(R, 0.4), 1, v.r);
  const coefHTML = c => (T.same(c, T.ONE) ? "" : T.same(c, num(-1)) ? MINUS : html(c) + " ");

  // ---------- c · f(x) или c · f²(x) ----------
  function oneTask(R) {
    let f, x, V;
    do { f = pick(R, T.FUNCS); x = bigAngle(R, f); V = valueOf(f, x, "deg"); } while (T.isZero(V.v));
    const unit = T.randUnit(R), pow = R() < 0.25 ? 2 : 1;
    V = valueOf(f, x, unit);
    const val = pow === 2 ? sq(V.v) : V.v, c = killRoot(R, val), answer = mul(c, val);
    const steps = [...V.steps];
    if (pow === 2) steps.push(`${fx(f, x, unit, "²")} = ${par(V.v)}² = ${html(val)}.`);
    steps.push(`Подставляем: ${coefHTML(c) ? html(c) + " · " : ""}${par(val)} = ${html(answer)}.`);
    return {
      kind: "input",
      text: `Найдите значение выражения <span class="math">${coefHTML(c)}${fx(f, x, unit, pow === 2 ? "²" : "")}</span>.`,
      answer, steps,
      check: () => T.val(c) * T.FN[f](rad(x)) ** pow,
      scene: { model: "angle", deg: x, unit },
    };
  }

  // ---------- c · f₁(x₁) · f₂(x₂) или c / (f₁(x₁) · f₂(x₂)) ----------
  function twoTask(R) {
    let f1, f2, x1, x2, p;
    do {
      f1 = pick(R, T.FUNCS); f2 = pick(R, T.FUNCS);
      x1 = bigAngle(R, f1); x2 = bigAngle(R, f2);
      p = mul(valueOf(f1, x1, "deg").v, valueOf(f2, x2, "deg").v);
    } while (T.isZero(p));
    const unit = T.randUnit(R), V1 = valueOf(f1, x1, unit), V2 = valueOf(f2, x2, unit);
    const prodHTML = `${fx(f1, x1, unit)} · ${fx(f2, x2, unit)}`;
    const quotient = p.r === 1 && R() < 0.6;   // делить удобно, когда произведение без корня
    let c, answer, text, last;
    if (quotient) {
      c = num(pick(R, [1, 2, 3, 4, 6, 8, 12]) * T.randSign(R, 0.4));
      answer = div(c, p);
      text = frac(html(c), prodHTML);
      last = `${frac(html(c), html(p))} = ${html(answer)}`;
    } else {
      c = killRoot(R, p);
      answer = mul(c, p);
      text = coefHTML(c) + prodHTML;
      last = `${coefHTML(c) ? html(c) + " · " : ""}${par(p)} = ${html(answer)}`;
    }
    return {
      kind: "input",
      text: `Найдите значение выражения <span class="math">${text}</span>.`,
      answer,
      steps: [...V1.steps, ...V2.steps,
        `Произведение: ${par(V1.v)} · ${par(V2.v)} = ${html(p)}.`, `Подставляем: ${last}.`],
      check: () => { const q = T.FN[f1](rad(x1)) * T.FN[f2](rad(x2)); return quotient ? T.val(c) / q : T.val(c) * q; },
      scene: { model: "angle", deg: x1, unit },
    };
  }

  const P2 = frac("π", 2);
  T.topics.push({
    id: "values",
    title: "Значения выражений",
    model: "angle",
    theory: [
      {
        title: "Таблица значений",
        html: `<div class="tbl-wrap"><table class="tbl math">
            <tr><th>α</th><th>0</th><th>${frac("π", 6)}<br>30°</th><th>${frac("π", 4)}<br>45°</th><th>${frac("π", 3)}<br>60°</th><th>${P2}<br>90°</th></tr>
            <tr><th>sin α</th><td>0</td><td>${frac(1, 2)}</td><td>${frac("√2", 2)}</td><td>${frac("√3", 2)}</td><td>1</td></tr>
            <tr><th>cos α</th><td>1</td><td>${frac("√3", 2)}</td><td>${frac("√2", 2)}</td><td>${frac(1, 2)}</td><td>0</td></tr>
            <tr><th>tg α</th><td>0</td><td>${frac("√3", 3)}</td><td>1</td><td>√3</td><td>—</td></tr>
            <tr><th>ctg α</th><td>—</td><td>√3</td><td>1</td><td>${frac("√3", 3)}</td><td>0</td></tr></table></div>
          <p>Любой «табличный» угол — 120°, ${frac("7π", 6)}, ${MINUS}750°, ${frac("31π", 4)} — сводится к углу из этой таблицы.
          Как именно — в следующих разделах.</p>`,
        scene: { model: "angle", deg: 30 },
      },
      {
        title: "Чётность и нечётность",
        html: `<div class="fbox">
            <p>cos(${MINUS}x) = cos x&emsp;— косинус чётный</p>
            <p>sin(${MINUS}x) = ${MINUS}sin x,&ensp;tg(${MINUS}x) = ${MINUS}tg x,&ensp;ctg(${MINUS}x) = ${MINUS}ctg x&emsp;— нечётные</p>
          </div>
          <p>Точки x и ${MINUS}x симметричны относительно оси Ox: абсцисса (косинус) у них одна, а ординаты (синусы) противоположны.
          Поэтому минус из-под косинуса просто исчезает, а из-под синуса, тангенса и котангенса — выносится вперёд.</p>
          <p class="fline">cos(${MINUS}${frac("π", 3)}) = cos ${frac("π", 3)} = ${frac(1, 2)}&emsp;&emsp;sin(${MINUS}${frac("π", 3)}) = ${MINUS}sin ${frac("π", 3)} = ${MINUS}${frac("√3", 2)}</p>`,
        scene: { model: "angle", deg: -60 },
      },
      {
        title: "Период: убираем лишние обороты",
        html: `<div class="fbox">
            <p>sin(x + 2πn) = sin x,&ensp;cos(x + 2πn) = cos x&emsp;— период 2π (360°)</p>
            <p>tg(x + πn) = tg x,&ensp;ctg(x + πn) = ctg x&emsp;— период π (180°)</p>
          </div>
          <p>Угол, отличающийся на целое число оборотов, — та же точка окружности, значит, и значения те же.
          Поэтому из большого угла выбрасываем всё, что кратно периоду:</p>
          <p class="fline">cos 750° = cos(720° + 30°) = cos 30°&emsp;&emsp;sin ${frac("27π", 4)} = sin(6π + ${frac("3π", 4)}) = sin ${frac("3π", 4)}</p>
          <p class="fline">tg ${frac("13π", 6)} = tg(2π + ${frac("π", 6)}) = tg ${frac("π", 6)}&emsp;&emsp;tg 225° = tg(180° + 45°) = tg 45°</p>
          <p><b>Как выделить периоды в радианах.</b> ${frac("31π", 4)}: делим 31 на 8 (8 четвертей — это 2π) — получаем 3 и остаток 7:
          ${frac("31π", 4)} = 3 · 2π + ${frac("7π", 4)}. Для tg и ctg можно отбрасывать и нечётное число π.</p>
          <p><b>Осторожно:</b> у синуса и косинуса отбрасывать можно только <b>чётное</b> число π: sin(x + π) = ${MINUS}sin x, а не sin x.</p>
          <p>На модели: ползунок крутит точку на сколько угодно оборотов, а над окружностью видно, какой угол даёт ту же точку.</p>`,
        scene: { model: "angle", deg: 750 },
      },
      {
        title: "Порядок действий",
        html: `<ol>
            <li>Отрицательный угол — убираем минус по чётности.</li>
            <li>Отбрасываем лишние периоды.</li>
            <li>Если угол не острый — формула приведения (правило лошади).</li>
            <li>Берём значение из таблицы, подставляем в выражение и считаем.</li>
          </ol>
          <p class="fline">${MINUS}4√3 cos(${MINUS}750°) = ${MINUS}4√3 cos 750° = ${MINUS}4√3 cos 30° = ${MINUS}4√3 · ${frac("√3", 2)} = ${MINUS}6</p>`,
        scene: { model: "angle", deg: -750 },
      },
      {
        title: "Типичные ошибки",
        html: `<ul>
            <li><b>Минус из-под косинуса:</b> cos(${MINUS}750°) ≠ ${MINUS}cos 750°. Косинус чётный.</li>
            <li><b>Отбросили π у синуса:</b> sin ${frac("7π", 6)} ≠ sin ${frac("π", 6)}. Здесь отбросить можно только 2π, а 7π/6 — угол III четверти: sin ${frac("7π", 6)} = ${MINUS}${frac(1, 2)}.</li>
            <li><b>Неверно выделили периоды:</b> ${frac("31π", 4)} — это не 7π + ${frac("3π", 4)} (для косинуса 7π — нечётное число π!), а 6π + ${frac("7π", 4)}.</li>
            <li><b>Ошибка в знаке после приведения:</b> угол ${frac("7π", 4)} — в IV четверти, где cos &gt; 0, но sin &lt; 0.</li>
          </ul>`,
        scene: { model: "angle", deg: 210 },
      },
    ],
    tasks: [
      { html: "Скройте результат и поставьте угол 750°. С каким углом от 0° до 360° совпадает точка? Чему равен cos 750°? Проверьте.",
        answer: `750° = 2 · 360° + 30°: точка та же, что у 30°; cos 750° = ${frac("√3", 2)}.`, scene: { model: "angle", deg: 750, hide: true } },
      { html: `Поставьте ${MINUS}30°, потом 30°. Что случилось с синусом, а что — с косинусом?`,
        answer: "Синус сменил знак, косинус не изменился: точки симметричны относительно оси Ox.", scene: { model: "angle", deg: -30 } },
      { html: `Предскажите sin(${MINUS}${frac("7π", 6)}). Проверьте на модели (переключите углы в радианы).`,
        answer: `sin(${MINUS}${frac("7π", 6)}) = ${MINUS}sin ${frac("7π", 6)} = ${MINUS}(${MINUS}${frac(1, 2)}) = ${frac(1, 2)}.`, scene: { model: "angle", deg: -210, unit: "rad", hide: true } },
      { html: "Почему tg 225° = tg 45°, а sin 225° ≠ sin 45°? Сравните точки 225° и 45° на модели.",
        answer: "225° = 180° + 45°: точка противоположна точке 45°. Прямая через центр та же, поэтому тангенс тот же (период tg — 180°), а синус и косинус сменили знак.",
        scene: { model: "angle", deg: 225 } },
      { html: `Предскажите cos ${frac("31π", 4)}, потом проверьте.`,
        answer: `${frac("31π", 4)} = 6π + ${frac("7π", 4)}; cos ${frac("7π", 4)} = cos(2π ${MINUS} ${frac("π", 4)}) = ${frac("√2", 2)}.`, scene: { model: "angle", deg: 1395, unit: "rad", hide: true } },
      { html: "Решите 5 тренировочных задач подряд без ошибок (вкладка «Тренировка»)." },
    ],
    examples: [
      {
        title: "−4√3 cos(−750°)",
        text: `Найдите значение выражения <span class="math">${MINUS}4√3 cos(${MINUS}750°)</span>.`,
        steps: [
          { html: `Косинус чётный — минус под косинусом убираем: cos(${MINUS}750°) = cos 750°.`, scene: { model: "angle", deg: -750 } },
          { html: "Отбрасываем периоды: 750° = 2 · 360° + 30°, значит, cos 750° = cos 30°.", scene: { model: "angle", deg: 750 } },
          { html: `cos 30° = ${frac("√3", 2)} — табличное значение.`, scene: { model: "angle", deg: 30 } },
          { html: `${MINUS}4√3 · ${frac("√3", 2)} = ${MINUS}${frac("4 · 3", 2)} = ${MINUS}6. Ответ: ${MINUS}6.` },
        ],
        checks: [[() => -4 * Math.sqrt(3) * Math.cos(rad(-750)), -6]],
      },
      {
        title: "8 / (sin(−27π/4) · cos(31π/4))",
        text: `Найдите значение выражения <span class="math">${frac(8, `sin(${MINUS}${frac("27π", 4)}) · cos(${frac("31π", 4)})`)}</span>.`,
        steps: [
          { html: `Синус нечётный: sin(${MINUS}${frac("27π", 4)}) = ${MINUS}sin ${frac("27π", 4)}.`, scene: { model: "angle", deg: -1215, unit: "rad" } },
          { html: `${frac("27π", 4)} = 6π + ${frac("3π", 4)} (27 = 3 · 8 + 3): sin ${frac("27π", 4)} = sin ${frac("3π", 4)}.`, scene: { model: "angle", deg: 1215, unit: "rad" } },
          { html: `sin ${frac("3π", 4)} = sin(π ${MINUS} ${frac("π", 4)}) = sin ${frac("π", 4)} = ${frac("√2", 2)} (II четверть, синус положителен). Значит, sin(${MINUS}${frac("27π", 4)}) = ${MINUS}${frac("√2", 2)}.`,
            scene: { model: "angle", deg: 135, unit: "rad" } },
          { html: `${frac("31π", 4)} = 6π + ${frac("7π", 4)} (31 = 3 · 8 + 7): cos ${frac("31π", 4)} = cos ${frac("7π", 4)} = cos(2π ${MINUS} ${frac("π", 4)}) = cos ${frac("π", 4)} = ${frac("√2", 2)} (IV четверть, косинус положителен).`,
            scene: { model: "angle", deg: 1395, unit: "rad" } },
          { html: `Знаменатель: (${MINUS}${frac("√2", 2)}) · ${frac("√2", 2)} = ${MINUS}${frac(2, 4)} = ${MINUS}${frac(1, 2)}.` },
          { html: `${frac(8, `${MINUS}${frac(1, 2)}`)} = ${MINUS}16. Ответ: ${MINUS}16.` },
        ],
        checks: [[() => 8 / (Math.sin(-27 * PI / 4) * Math.cos(31 * PI / 4)), -16]],
      },
      {
        title: "√3 tg(−13π/6)",
        text: `Найдите значение выражения <span class="math">√3 tg(${MINUS}${frac("13π", 6)})</span>.`,
        steps: [
          { html: `Тангенс нечётный: tg(${MINUS}${frac("13π", 6)}) = ${MINUS}tg ${frac("13π", 6)}.`, scene: { model: "angle", deg: -390, unit: "rad" } },
          { html: `Период тангенса — π: ${frac("13π", 6)} = 2π + ${frac("π", 6)}, tg ${frac("13π", 6)} = tg ${frac("π", 6)} = ${frac("√3", 3)}.`, scene: { model: "angle", deg: 30, unit: "rad" } },
          { html: `√3 · (${MINUS}${frac("√3", 3)}) = ${MINUS}${frac(3, 3)} = ${MINUS}1. Ответ: ${MINUS}1.` },
        ],
        checks: [[() => Math.sqrt(3) * Math.tan(-13 * PI / 6), -1]],
      },
      {
        title: "sin²-выражение",
        text: `Найдите значение выражения <span class="math">12 sin²(${frac("17π", 3)})</span>.`,
        steps: [
          { html: `${frac("17π", 3)} = 4π + ${frac("5π", 3)} (17 = 2 · 6 + 5): sin ${frac("17π", 3)} = sin ${frac("5π", 3)}.`, scene: { model: "angle", deg: 1020, unit: "rad" } },
          { html: `sin ${frac("5π", 3)} = sin(2π ${MINUS} ${frac("π", 3)}) = ${MINUS}sin ${frac("π", 3)} = ${MINUS}${frac("√3", 2)} (IV четверть).`, scene: { model: "angle", deg: 300, unit: "rad" } },
          { html: `При возведении в квадрат знак не важен: sin² = ${frac(3, 4)}. 12 · ${frac(3, 4)} = 9. Ответ: 9.` },
        ],
        checks: [[() => 12 * Math.sin(17 * PI / 3) ** 2, 9]],
      },
    ],
    generators: [
      { id: "one", title: "Одна функция", make: oneTask },
      { id: "two", title: "Произведение или дробь", make: twoTask },
    ],
  });
})();
