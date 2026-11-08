// Подтема «Значения по одной функции и четверти»: основное тождество и знаки по четвертям.
(function () {
  const T = TE, { MINUS, frac } = Lab;
  const { html, pick } = T;
  const PI = Math.PI;
  const P2 = frac("π", 2), P32 = frac("3π", 2);

  // ---------- Генератор: дана одна функция и четверть — найти другую ----------
  function findTask(R, pool) {
    const g = T.given(R, pool), { f, v, q, unit } = g, sol = T.solveFrom(f, v, q);
    const want = pick(R, T.FUNCS.filter(h => h !== f));
    return {
      kind: "input",
      text: `Найдите <span class="math">${want} α</span>, если <span class="math">${f} α = ${html(v)}</span> и <span class="math">α ∈ ${T.quarterHTML(q, unit)}</span>.`,
      answer: sol.vals[want],
      steps: sol.steps[want],
      data: { f, v: T.val(v), q, target: want },
      scene: { model: "find", gf: f, v: T.text(T.abs(v)), q },
    };
  }

  // ---------- Генератор: знак выражения ----------
  // «Какой знак у sin α · cos α при α ∈ (π; 3π/2)?» — выбор «> 0» или «< 0»
  const SIGN_EXPR = [
    ["sin α · cos α", a => Math.sin(a) * Math.cos(a)],
    ["sin α · tg α", a => Math.sin(a) * Math.tan(a)],
    ["cos α · ctg α", a => Math.cos(a) / Math.tan(a)],
    [`${frac("sin α", "tg α")}`, a => Math.sin(a) / Math.tan(a)],
    ["tg α · ctg α", () => 1],
    [`sin α ${MINUS} cos α`, a => Math.sin(a) - Math.cos(a)],
  ];
  function signTask(R) {
    // sin α − cos α во II и IV четвертях имеет постоянный знак; в I и III — нет, их не берём
    let e, q;
    do { e = pick(R, SIGN_EXPR); q = 1 + Math.floor(R() * 4); } while (e[0].includes(MINUS) && (q === 1 || q === 3));
    const unit = T.randUnit(R, 0.4), mid = (q - 0.5) * PI / 2, positive = e[1](mid) > 0;
    const sg = h => (T.signIn(h, q) > 0 ? "+" : MINUS);
    const opt = p => ({ html: p ? "больше нуля" : "меньше нуля", fn: () => (p ? 1 : -1) });
    const correct = opt(positive);
    return {
      kind: "options",
      text: `Какой знак у выражения <span class="math">${e[0]}</span>, если <span class="math">α ∈ ${T.quarterHTML(q, unit)}</span>?`,
      ...T.options(R, correct, [opt(!positive)], 2),
      fn: a => Math.sign(e[1](a)), interval: [(q - 1) * PI / 2, q * PI / 2],
      steps: [
        `α — угол ${T.ROMAN[q - 1]} четверти: sin α ${sg("sin")}, cos α ${sg("cos")}, tg α и ctg α ${sg("tg")}.`,
        `Подставляем знаки в выражение: оно ${positive ? "положительно" : "отрицательно"}.`,
      ],
      scene: { model: "find", gf: "sin", v: "3/5", q },
    };
  }

  T.topics.push({
    id: "find",
    title: "Значения по одной функции и четверти",
    model: "find",
    theory: [
      {
        title: "Основное тригонометрическое тождество",
        html: `<div class="fbox"><p>sin²α + cos²α = 1</p></div>
          <p>Точка угла α на единичной окружности — (cos α; sin α). Катеты прямоугольного треугольника на модели — |cos α| и |sin α|,
          гипотенуза — радиус 1. Это теорема Пифагора.</p>`,
        scene: { model: "find", gf: "sin", v: "3/5", q: 1 },
      },
      {
        title: "Остальные формулы",
        html: `<div class="fbox">
            <p>tg α = ${frac("sin α", "cos α")}&emsp;&emsp;ctg α = ${frac("cos α", "sin α")}&emsp;&emsp;tg α · ctg α = 1</p>
            <p>1 + tg²α = ${frac("1", "cos²α")}&emsp;&emsp;1 + ctg²α = ${frac("1", "sin²α")}</p>
          </div>
          <p>Две последние получаются делением тождества sin²α + cos²α = 1 на cos²α или на sin²α.</p>`,
        scene: { model: "find", gf: "tg", v: "2", q: 1 },
      },
      {
        title: "Формула даёт модуль, четверть — знак",
        html: `<p>Из формул получается <b>квадрат</b> искомой функции, а у квадрата два корня: «+» и «${MINUS}». Выбрать нужный помогает четверть.</p>
          <ol>
            <li>Из подходящей формулы находим квадрат: cos²α = 1 ${MINUS} sin²α.</li>
            <li>Извлекаем корень — получаем модуль: |cos α| = √(1 ${MINUS} sin²α).</li>
            <li>По четверти ставим знак.</li>
            <li>tg и ctg — делением: tg α = sin α : cos α, ctg α = 1 : tg α.</li>
          </ol>
          <p>Пример: sin α = ${frac(3, 5)}, α ∈ (${P2}; π). cos²α = 1 ${MINUS} ${frac(9, 25)} = ${frac(16, 25)}, |cos α| = ${frac(4, 5)}.
          Во II четверти косинус отрицателен: cos α = ${MINUS}${frac(4, 5)}. Тогда tg α = ${MINUS}${frac(3, 4)}, ctg α = ${MINUS}${frac(4, 3)}.</p>
          <p>Переключайте четверти на модели: модули значений не меняются, меняются только знаки.</p>`,
        scene: { model: "find", gf: "sin", v: "3/5", q: 2 },
      },
      {
        title: "Знаки по четвертям",
        html: `<div class="tbl-wrap"><table class="tbl math"><tr><th></th><th>I<br>(0; ${P2})</th><th>II<br>(${P2}; π)</th><th>III<br>(π; ${P32})</th><th>IV<br>(${P32}; 2π)</th></tr>
            <tr><th>sin</th><td>+</td><td>+</td><td>${MINUS}</td><td>${MINUS}</td></tr>
            <tr><th>cos</th><td>+</td><td>${MINUS}</td><td>${MINUS}</td><td>+</td></tr>
            <tr><th>tg, ctg</th><td>+</td><td>${MINUS}</td><td>+</td><td>${MINUS}</td></tr></table></div>
          <p>sin — ордината: «+» сверху. cos — абсцисса: «+» справа. tg и ctg положительны, где sin и cos одного знака.</p>`,
        scene: { model: "find", gf: "cos", v: "4/5", q: 3 },
      },
      {
        title: "Если дан тангенс или котангенс",
        html: `<p>Сначала косинус (или синус) через 1 + tg²α = ${frac("1", "cos²α")}, потом остальное:</p>
          <p>tg α = 2, α ∈ (π; ${P32}). cos²α = ${frac("1", "1 + 4")} = ${frac(1, 5)}; в III четверти cos α &lt; 0, cos α = ${MINUS}${frac("1", "√5")} = ${MINUS}${frac("√5", 5)}.
          sin α = tg α · cos α = ${MINUS}${frac("2√5", 5)}, ctg α = ${frac(1, 2)}.</p>`,
        scene: { model: "find", gf: "tg", v: "2", q: 3 },
      },
      {
        title: "Типичные ошибки",
        html: `<ul>
            <li><b>Забыли знак:</b> cos α = ${frac(4, 5)} вместо ${MINUS}${frac(4, 5)} во II четверти. Всегда спрашивайте себя, в какой четверти угол.</li>
            <li><b>√(1 ${MINUS} sin²α) ≠ 1 ${MINUS} sin α:</b> корень из разности не равен разности корней. √(1 ${MINUS} ${frac(9, 25)}) = ${frac(4, 5)}, а не ${frac(2, 5)}.</li>
            <li><b>Невозможные данные:</b> sin α = ${frac(3, 5)} при α из III четверти не бывает — там синус отрицателен.</li>
            <li>Ответ ${frac("1", "√5")} и ${frac("√5", 5)} — одно и то же число; тренажёр примет оба.</li>
          </ul>`,
      },
    ],
    tasks: [
      { html: `sin α = ${frac(3, 5)}, α ∈ (${P2}; π). Скройте результат и предскажите знаки cos α, tg α и ctg α. Проверьте.`,
        answer: `Все три отрицательны: cos α = ${MINUS}${frac(4, 5)}, tg α = ${MINUS}${frac(3, 4)}, ctg α = ${MINUS}${frac(4, 3)}.`, scene: { model: "find", gf: "sin", v: "3/5", q: 2, hide: true } },
      { html: `Как изменятся значения, если ту же величину |sin α| = ${frac(3, 5)} взять в I, III, IV четверти? Предскажите, потом переключайте четверти.`,
        answer: "Модули не меняются (катеты треугольника те же), меняются только знаки — по таблице знаков.", scene: { model: "find", gf: "sin", v: "3/5", q: 1, hide: true } },
      { html: `cos α = ${frac(5, 13)}, α ∈ (${P32}; 2π). Найдите sin α в уме, потом проверьте.`,
        answer: `sin α = ${MINUS}${frac(12, 13)} (тройка 5, 12, 13; IV четверть — синус отрицателен).`, scene: { model: "find", gf: "cos", v: "5/13", q: 4, hide: true } },
      { html: `tg α = 2, α ∈ (π; ${P32}). Найдите cos α.`,
        answer: `cos α = ${MINUS}${frac("√5", 5)}.`, scene: { model: "find", gf: "tg", v: "2", q: 3, hide: true } },
      { html: "При каких четвертях tg α и sin α одного знака? Проверьте, переключая четверти.",
        answer: "В I и IV: в I оба положительны, в IV оба отрицательны.", scene: { model: "find", gf: "tg", v: "3/4", q: 1 } },
      { html: "Решите 5 тренировочных задач подряд без ошибок (вкладка «Тренировка»)." },
    ],
    examples: [
      {
        title: "Дан cos, II четверть",
        text: `Найдите sin α, tg α и ctg α, если <span class="math">cos α = ${MINUS}${frac(4, 5)}</span>, <span class="math">α ∈ (${P2}; π)</span>.`,
        steps: [
          { html: `sin²α = 1 ${MINUS} cos²α = 1 ${MINUS} ${frac(16, 25)} = ${frac(9, 25)}, значит, |sin α| = ${frac(3, 5)}.`, scene: { model: "find", gf: "cos", v: "4/5", q: 2, hide: true } },
          { html: `Во II четверти синус положителен: sin α = ${frac(3, 5)}.` },
          { html: `tg α = sin α : cos α = ${frac(3, 5)} : (${MINUS}${frac(4, 5)}) = ${MINUS}${frac(3, 4)}.` },
          { html: `ctg α = 1 : tg α = ${MINUS}${frac(4, 3)}.`, scene: { model: "find", gf: "cos", v: "4/5", q: 2 } },
        ],
        checks: (() => { const a = Math.acos(-0.8); return [[() => Math.sin(a), 0.6], [() => Math.tan(a), -0.75], [() => 1 / Math.tan(a), -4 / 3]]; })(),
      },
      {
        title: "Дан sin, III четверть",
        text: `Найдите cos α и tg α, если <span class="math">sin α = ${MINUS}${frac(5, 13)}</span>, <span class="math">α ∈ (π; ${P32})</span>.`,
        steps: [
          { html: `cos²α = 1 ${MINUS} ${frac(25, 169)} = ${frac(144, 169)}, |cos α| = ${frac(12, 13)}.`, scene: { model: "find", gf: "sin", v: "5/13", q: 3, hide: true } },
          { html: `В III четверти косинус отрицателен: cos α = ${MINUS}${frac(12, 13)}.` },
          { html: `tg α = (${MINUS}${frac(5, 13)}) : (${MINUS}${frac(12, 13)}) = ${frac(5, 12)} — в III четверти тангенс положителен, сходится.`, scene: { model: "find", gf: "sin", v: "5/13", q: 3 } },
        ],
        checks: (() => { const a = PI + Math.asin(5 / 13); return [[() => Math.cos(a), -12 / 13], [() => Math.tan(a), 5 / 12]]; })(),
      },
      {
        title: "Дан tg, III четверть",
        text: `Найдите cos α, sin α и ctg α, если <span class="math">tg α = 2</span>, <span class="math">α ∈ (π; ${P32})</span>.`,
        steps: [
          { html: `1 + tg²α = ${frac("1", "cos²α")}: cos²α = ${frac("1", "1 + 4")} = ${frac(1, 5)}, |cos α| = ${frac("1", "√5")} = ${frac("√5", 5)}.`, scene: { model: "find", gf: "tg", v: "2", q: 3, hide: true } },
          { html: `III четверть: cos α = ${MINUS}${frac("√5", 5)}.` },
          { html: `sin α = tg α · cos α = 2 · (${MINUS}${frac("√5", 5)}) = ${MINUS}${frac("2√5", 5)}.` },
          { html: `ctg α = 1 : tg α = ${frac(1, 2)}.`, scene: { model: "find", gf: "tg", v: "2", q: 3 } },
        ],
        checks: (() => { const a = PI + Math.atan(2); return [[() => Math.cos(a), -Math.sqrt(5) / 5], [() => Math.sin(a), -2 * Math.sqrt(5) / 5]]; })(),
      },
      {
        title: "Ответ с корнем",
        text: `Найдите cos α и tg α, если <span class="math">sin α = ${frac(1, 3)}</span>, <span class="math">α ∈ (${P2}; π)</span>.`,
        steps: [
          { html: `cos²α = 1 ${MINUS} ${frac(1, 9)} = ${frac(8, 9)}, |cos α| = ${frac("√8", 3)} = ${frac("2√2", 3)} (√8 = √(4 · 2) = 2√2).`, scene: { model: "find", gf: "sin", v: "1/3", q: 2, hide: true } },
          { html: `II четверть: cos α = ${MINUS}${frac("2√2", 3)}.` },
          { html: `tg α = ${frac(1, 3)} : (${MINUS}${frac("2√2", 3)}) = ${MINUS}${frac("1", "2√2")} = ${MINUS}${frac("√2", 4)} (умножили числитель и знаменатель на √2).`, scene: { model: "find", gf: "sin", v: "1/3", q: 2 } },
        ],
        checks: (() => { const a = PI - Math.asin(1 / 3); return [[() => Math.cos(a), -2 * Math.SQRT2 / 3], [() => Math.tan(a), -Math.SQRT2 / 4]]; })(),
      },
    ],
    generators: [
      { id: "tri", title: "Без корней (3/5, 5/13, …)", make: R => findTask(R, "triples") },
      { id: "root", title: "С корнями в ответе", make: R => findTask(R, "roots") },
      { id: "sign", title: "Знак выражения", make: signTask },
    ],
  });
})();
