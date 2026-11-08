// Подтема «Формулы приведения»: формулы сложения и «правило лошади».
(function () {
  const T = TE, { MINUS, frac } = Lab;
  const { html, pick, reduce, argHTML, termHTML, ROMAN, signWord, CO, FN } = T;
  const PI = Math.PI, { rad, sgnTxt } = T;
  const KS = [1, 2, 3, 4];   // K = k·π/2

  // Рассуждение по правилу лошади для f(K ± α) — общий текст для разборов, задач и модели
  function horse(f, k, s, unit) {
    const r = reduce(f, k, s), K = T.angHTML(90 * k, unit);
    return {
      r,
      lines: [
        r.vertical
          ? `${K} — на <b>вертикальной</b> оси: лошадь кивает «да» — функция меняется: ${f} → ${r.g}.`
          : `${K} — на <b>горизонтальной</b> оси: лошадь мотает головой «нет» — функция остаётся ${f}.`,
        `Считаем α острым: угол ${argHTML(k, s, unit)} в ${ROMAN[r.q - 1]} четверти. Там исходная функция ${f} ${signWord(r.sign)}, поэтому знак «${sgnTxt(r.sign)}».`,
      ],
      result: `${f}(${argHTML(k, s, unit)}) = ${termHTML(r.sign, r.g)}`,
    };
  }

  // ---------- Генератор «Упростите f(K ± α)» ----------
  function simplifyTask(R) {
    const f = pick(R, T.FUNCS), k = pick(R, KS), s = T.randSign(R), unit = T.randUnit(R, 0.35);
    const h = horse(f, k, s, unit);
    const make = (sign, g) => ({ html: termHTML(sign, g), fn: a => sign * FN[g](a) });
    const correct = make(h.r.sign, h.r.g);
    const pool = [make(-h.r.sign, h.r.g), make(h.r.sign, CO[h.r.g]), make(-h.r.sign, CO[h.r.g])];
    return {
      kind: "options",
      text: `Упростите: <span class="math">${f}(${argHTML(k, s, unit)})</span>`,
      ...T.options(R, correct, pool),
      fn: a => FN[f](k * PI / 2 + s * a),
      steps: [...h.lines, `<span class="math">${h.result}</span>.`],
      scene: { model: "reduction", f, k, s, deg: 30 },
    };
  }

  // ---------- Генератор «Вычислите f(угол)» ----------
  // Угол d → K ± β с K на горизонтальной оси (180°, 360°), β ∈ {30°, 45°, 60°}
  function calcTask(R) {
    const f = pick(R, T.FUNCS), beta = pick(R, [30, 45, 60]);
    const [K, s] = pick(R, [[180, -1], [180, 1], [360, -1]]);
    let d = K + s * beta;
    if (R() < 0.25) d += 360; else if (R() < 0.33) d = -d;   // иногда — лишний оборот или минус
    const unit = T.randUnit(R), V = T.valueOf(f, d, unit);
    return {
      kind: "input",
      text: `Вычислите: <span class="math">${T.fx(f, d, unit)}</span>`,
      answer: V.v,
      steps: V.steps,
      check: () => FN[f](rad(d)),
      scene: { model: "reduction", f, k: K / 90, s, deg: beta },
    };
  }

  // ---------- Генератор «Упростите выражение» из двух слагаемых ----------
  // Результат — сумма c₁·g₁(α) + c₂·g₂(α) по паре функций (sin, cos) или (tg, ctg)
  function comboHTML(fam, c) {
    const terms = fam.map((g, i) => [c[i], g]).filter(([ci]) => ci !== 0).sort((a, b) => b[0] - a[0]);
    if (!terms.length) return "0";
    return terms.map(([ci, g], j) => {
      const m = Math.abs(ci) === 1 ? "" : Math.abs(ci) + " ";
      return (j === 0 ? (ci < 0 ? MINUS : "") : ci < 0 ? ` ${MINUS} ` : " + ") + m + g + " α";
    }).join("");
  }
  function sumTask(R) {
    const fam = pick(R, [["sin", "cos"], ["sin", "cos"], ["tg", "ctg"]]);
    const parts = [0, 1].map(() => ({ f: pick(R, fam), k: pick(R, KS), s: T.randSign(R) }));
    const op = T.randSign(R), unit = T.randUnit(R, 0.3);
    const c = [0, 0];
    parts.forEach((p, i) => { p.h = horse(p.f, p.k, p.s, unit); c[fam.indexOf(p.h.r.g)] += (i ? op : 1) * p.h.r.sign; });
    const fnOf = cc => a => cc[0] * FN[fam[0]](a) + cc[1] * FN[fam[1]](a);
    const make = cc => ({ html: comboHTML(fam, cc), fn: fnOf(cc) });
    const correct = make(c);
    const pool = [];
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) if (Math.abs(x) + Math.abs(y) <= 2) pool.push(make([x, y]));
    const expr = `${parts[0].f}(${argHTML(parts[0].k, parts[0].s, unit)}) ${op > 0 ? "+" : MINUS} ${parts[1].f}(${argHTML(parts[1].k, parts[1].s, unit)})`;
    // «sin α − cos α», «−sin α − (−cos α)»: второе слагаемое со знаком операции
    const t = p => termHTML(p.h.r.sign, p.h.r.g), t2 = t(parts[1]), neg2 = parts[1].h.r.sign < 0;
    const sumHTML = t(parts[0]) + (op > 0 ? (neg2 ? ` ${MINUS} ${t2.slice(1)}` : ` + ${t2}`) : neg2 ? ` ${MINUS} (${t2})` : ` ${MINUS} ${t2}`);
    return {
      kind: "options",
      text: `Упростите: <span class="math">${expr}</span>`,
      ...T.options(R, correct, pool),
      fn: a => FN[parts[0].f](parts[0].k * PI / 2 + parts[0].s * a) + op * FN[parts[1].f](parts[1].k * PI / 2 + parts[1].s * a),
      steps: [
        ...parts.map(p => `<span class="math">${p.h.result}</span>: ${p.h.r.vertical ? "вертикаль — меняем функцию" : "горизонталь — функция та же"}, ${ROMAN[p.h.r.q - 1]} четверть, ${p.f} ${signWord(p.h.r.sign)}.`),
        `Собираем: <span class="math">${sumHTML} = ${correct.html}</span>.`,
      ],
      scene: { model: "reduction", f: parts[0].f, k: parts[0].k, s: parts[0].s, deg: 30 },
    };
  }

  // Таблица всех формул приведения (строится по правилу; автопроверка сверяет правило с численным счётом)
  function tableHTML() {
    const rows = [];
    for (const k of KS) for (const s of [-1, 1]) {
      if (k === 4 && s > 0) continue;   // 2π + α — это просто полный оборот
      rows.push(`<tr><th>${argHTML(k, s, "rad")}</th>${T.FUNCS.map(f => { const r = reduce(f, k, s); return `<td>${termHTML(r.sign, r.g)}</td>`; }).join("")}</tr>`);
    }
    return `<div class="tbl-wrap"><table class="tbl math"><tr><th>аргумент</th>${T.FUNCS.map(f => `<th>${f}</th>`).join("")}</tr>${rows.join("")}</table></div>`;
  }
  const SIGN_TABLE = `<div class="tbl-wrap"><table class="tbl math"><tr><th></th><th>I</th><th>II</th><th>III</th><th>IV</th></tr>
    <tr><th>sin</th><td>+</td><td>+</td><td>${MINUS}</td><td>${MINUS}</td></tr>
    <tr><th>cos</th><td>+</td><td>${MINUS}</td><td>${MINUS}</td><td>+</td></tr>
    <tr><th>tg, ctg</th><td>+</td><td>${MINUS}</td><td>+</td><td>${MINUS}</td></tr></table></div>`;
  const P2 = frac("π", 2), P32 = frac("3π", 2);

  T.topics.push({
    id: "reduction",
    title: "Формулы приведения",
    model: "reduction",
    theory: [
      {
        title: "Зачем нужны формулы приведения",
        html: `<p>Они сводят функцию от угла ${P2} ± α, π ± α, ${P32} ± α, 2π ± α к функции от самого α.
          Так любой угол сводится к острому, а значение — к таблице: cos 150° = ${MINUS}cos 30°.</p>`,
        scene: { model: "reduction", f: "cos", k: 2, s: -1, deg: 30 },
      },
      {
        title: "Способ 1. Формулы сложения",
        html: `<div class="fbox">
            <p>sin(α ± β) = sin α cos β ± cos α sin β</p>
            <p>cos(α ± β) = cos α cos β ∓ sin α sin β</p>
            <p>tg(α ± β) = ${frac("tg α ± tg β", "1 ∓ tg α tg β")}</p>
          </div>
          <p>Подставляем «большой» угол и табличные значения (sin ${P2} = 1, cos ${P2} = 0, sin π = 0, cos π = ${MINUS}1, …):</p>
          <p class="fline">sin(${P2} + α) = sin ${P2} cos α + cos ${P2} sin α = 1 · cos α + 0 · sin α = cos α</p>
          <p class="fline">cos(π ${MINUS} α) = cos π cos α + sin π sin α = ${MINUS}cos α</p>
          <p class="fline">sin(${P32} ${MINUS} α) = sin ${P32} cos α ${MINUS} cos ${P32} sin α = ${MINUS}cos α</p>
          <p>Для тангенса формулу сложения с ${P2} применить нельзя (tg ${P2} не существует), поэтому делим синус на косинус:</p>
          <p class="fline">tg(${P2} + α) = ${frac(`sin(${P2} + α)`, `cos(${P2} + α)`)} = ${frac("cos α", `${MINUS}sin α`)} = ${MINUS}ctg α</p>`,
        scene: { model: "reduction", f: "sin", k: 1, s: 1, deg: 30 },
      },
      {
        title: "Способ 2. Правило лошади",
        html: `<p>Формулы сложения надёжны, но долго. Ответ всегда имеет вид «± та же или соседняя функция от α», и его можно получить за два вопроса.</p>
          <ol>
            <li><b>Меняется ли функция?</b> Смотрим, где на окружности лежит «большой» угол.
              <ul>
                <li>${P2} или ${P32} (90°, 270°) — на <b>вертикальной</b> оси. Лошадь кивает головой вверх-вниз: «да» — <b>меняем</b> функцию на «соседнюю»: sin ↔ cos, tg ↔ ctg.</li>
                <li>π или 2π (180°, 360°) — на <b>горизонтальной</b> оси. Лошадь мотает головой влево-вправо: «нет» — функция <b>остаётся</b> той же.</li>
              </ul></li>
            <li><b>Какой знак?</b> Считаем α острым углом (0 &lt; α &lt; ${P2}), находим четверть угла K ± α и смотрим, какой знак
              в этой четверти у <b>исходной</b> функции — той, что стояла до преобразования. Этот знак ставим перед ответом.</li>
          </ol>
          <p>На модели: толстая ось — та, на которой лежит K; синяя точка — угол K ± α; закрашена его четверть со знаком исходной функции.</p>`,
        scene: { model: "reduction", f: "cos", k: 3, s: 1, deg: 30 },
      },
      {
        title: "Правило на примерах",
        html: `<ul>
            <li><span class="math">cos(${P32} + α)</span>: ${P32} на вертикали → sin; угол в IV четверти, cos там &gt; 0 → <span class="math">sin α</span>.</li>
            <li><span class="math">sin(π + α)</span>: π на горизонтали → sin; угол в III четверти, sin там &lt; 0 → <span class="math">${MINUS}sin α</span>.</li>
            <li><span class="math">tg(${P32} ${MINUS} α)</span>: вертикаль → ctg; III четверть, tg там &gt; 0 → <span class="math">ctg α</span>.</li>
            <li><span class="math">ctg(2π ${MINUS} α)</span>: горизонталь → ctg; IV четверть, ctg там &lt; 0 → <span class="math">${MINUS}ctg α</span>.</li>
          </ul>`,
        scene: { model: "reduction", f: "tg", k: 3, s: -1, deg: 30 },
      },
      {
        title: "Знаки по четвертям",
        html: `${SIGN_TABLE}
          <p>sin — ордината точки: «+» сверху (I, II). cos — абсцисса: «+» справа (I, IV). tg и ctg — «+», где sin и cos одного знака (I, III).</p>
          <p><b>Частая ошибка</b> — смотреть на знак новой функции или на знак в I четверти (где лежит сам α). Знак берём у <b>исходной</b> функции
          в четверти угла K ± α: sin(π + α) = ${MINUS}sin α, потому что sin в III четверти отрицателен.</p>
          <p>Правило верно для любого α, а не только острого. Острый α — лишь способ быстро определить четверть.</p>`,
        scene: { model: "reduction", f: "sin", k: 2, s: 1, deg: 30 },
      },
      {
        title: "Вычисляем значения",
        html: `<p>Угол раскладываем как K ± β с острым β из таблицы. Удобнее K = 180° или 360° — тогда функция не меняется:</p>
          <p class="fline">cos 150° = cos(180° ${MINUS} 30°) = ${MINUS}cos 30° = ${MINUS}${frac("√3", 2)}</p>
          <p class="fline">sin 240° = sin(180° + 60°) = ${MINUS}sin 60° = ${MINUS}${frac("√3", 2)}</p>
          <p>Через вертикаль получится то же: cos 150° = cos(90° + 60°) = ${MINUS}sin 60° = ${MINUS}${frac("√3", 2)}.</p>
          <p>Большой угол — сначала убираем полные обороты: sin 750° = sin(720° + 30°) = sin 30°.
          Отрицательный — по чётности: sin(${MINUS}α) = ${MINUS}sin α, cos(${MINUS}α) = cos α, tg(${MINUS}α) = ${MINUS}tg α, ctg(${MINUS}α) = ${MINUS}ctg α.</p>`,
        scene: { model: "reduction", f: "cos", k: 2, s: -1, deg: 30 },
      },
      {
        title: "Все формулы приведения",
        html: `<p>Таблицу не нужно учить — каждая строка получается правилом лошади за несколько секунд.</p>${tableHTML()}`,
      },
    ],
    tasks: [
      { html: `Скройте результат. Предскажите по правилу лошади, чему равно sin(${P2} + α). Проверьте на модели.`,
        answer: `cos α: ${P2} на вертикали — меняем на cos; угол во II четверти, sin там &gt; 0.`, scene: { model: "reduction", f: "sin", k: 1, s: 1, deg: 30, hide: true } },
      { html: "cos(π + α): меняется ли функция? Какой знак? Предскажите и проверьте.",
        answer: `${MINUS}cos α: π на горизонтали — функция та же; III четверть, cos там &lt; 0.`, scene: { model: "reduction", f: "cos", k: 2, s: 1, deg: 30, hide: true } },
      { html: `tg(${P32} ${MINUS} α) — предскажите ответ.`,
        answer: `ctg α: вертикаль — tg → ctg; угол в III четверти, tg там &gt; 0.`, scene: { model: "reduction", f: "tg", k: 3, s: -1, deg: 30, hide: true } },
      { html: "Для sin(π − α) подвигайте α от 5° до 85°. Почему точки α и π − α всегда на одной высоте? Что это значит для синуса?",
        answer: "Точки симметричны относительно оси Oy, у них одна ордината, поэтому sin(π − α) = sin α.", scene: { model: "reduction", f: "sin", k: 2, s: -1, deg: 20 } },
      { html: "Почему для cos(π/2 + α) знак берут у косинуса во II четверти, а не у синуса, который получается в ответе? Проверьте на модели: какой знак у cos(π/2 + α) и у sin α?",
        answer: `cos(${P2} + α) — косинус угла II четверти, он отрицателен. sin α при остром α положителен. Значит, перед sin α нужен минус: cos(${P2} + α) = ${MINUS}sin α.`,
        scene: { model: "reduction", f: "cos", k: 1, s: 1, deg: 40 } },
      { html: "Решите 5 тренировочных задач подряд без ошибок (вкладка «Тренировка»)." },
    ],
    examples: [
      {
        title: "sin(3π/2 − α) двумя способами",
        text: `Упростите: <span class="math">sin(${P32} ${MINUS} α)</span>.`,
        steps: [
          { html: `<b>Формула синуса разности:</b> sin(${P32} ${MINUS} α) = sin ${P32} cos α ${MINUS} cos ${P32} sin α.`, scene: { model: "reduction", f: "sin", k: 3, s: -1, deg: 30, hide: true } },
          { html: `sin ${P32} = ${MINUS}1, cos ${P32} = 0: получаем ${MINUS}1 · cos α ${MINUS} 0 · sin α = ${MINUS}cos α.` },
          { html: `<b>Правило лошади.</b> ${P32} — на вертикальной оси: функция меняется, sin → cos.` },
          { html: `${P32} ${MINUS} α при остром α — III четверть; синус там отрицателен, значит, знак «${MINUS}».`, scene: { model: "reduction", f: "sin", k: 3, s: -1, deg: 30 } },
          { html: `Ответ: <span class="math">sin(${P32} ${MINUS} α) = ${MINUS}cos α</span> — способы дали одно и то же.` },
        ],
        checks: [[() => Math.sin(3 * PI / 2 - 0.4), -Math.cos(0.4)]],
      },
      {
        title: "cos(π/2 + α)",
        text: `Упростите: <span class="math">cos(${P2} + α)</span>.`,
        steps: [
          { html: `${P2} — на вертикали: cos → sin.`, scene: { model: "reduction", f: "cos", k: 1, s: 1, deg: 30, hide: true } },
          { html: `${P2} + α — II четверть. Смотрим знак <b>исходной</b> функции, косинуса: во II четверти cos &lt; 0.` },
          { html: `Ответ: <span class="math">cos(${P2} + α) = ${MINUS}sin α</span>.`, scene: { model: "reduction", f: "cos", k: 1, s: 1, deg: 30 } },
        ],
        checks: [[() => Math.cos(PI / 2 + 0.4), -Math.sin(0.4)]],
      },
      {
        title: "cos 210°",
        text: "Вычислите: <span class=\"math\">cos 210°</span>.",
        steps: [
          { html: "210° = 180° + 30°. 180° — на горизонтали: функция остаётся cos.", scene: { model: "reduction", f: "cos", k: 2, s: 1, deg: 30, hide: true } },
          { html: "210° — III четверть, cos там &lt; 0: cos 210° = −cos 30°." },
          { html: `cos 30° = ${frac("√3", 2)}, ответ: <span class="math">${MINUS}${frac("√3", 2)}</span>.`, scene: { model: "reduction", f: "cos", k: 2, s: 1, deg: 30 } },
          { html: `Проверим через вертикаль: 210° = 270° ${MINUS} 60°, cos → sin, III четверть, знак «${MINUS}»: ${MINUS}sin 60° = ${MINUS}${frac("√3", 2)}. То же.` },
        ],
        checks: [[() => Math.cos(rad(210)), -Math.sqrt(3) / 2]],
      },
      {
        title: "tg(5π/3)",
        text: `Вычислите: <span class="math">tg ${frac("5π", 3)}</span>.`,
        steps: [
          { html: `${frac("5π", 3)} = 2π ${MINUS} ${frac("π", 3)}. 2π — на горизонтали: остаётся tg.`, scene: { model: "reduction", f: "tg", k: 4, s: -1, deg: 60, hide: true } },
          { html: `Угол в IV четверти, tg там &lt; 0: tg ${frac("5π", 3)} = ${MINUS}tg ${frac("π", 3)}.` },
          { html: `tg ${frac("π", 3)} = √3, ответ: <span class="math">${MINUS}√3</span>.`, scene: { model: "reduction", f: "tg", k: 4, s: -1, deg: 60 } },
        ],
        checks: [[() => Math.tan(5 * PI / 3), -Math.sqrt(3)]],
      },
      {
        title: "tg(π + α) · tg(π/2 + α)",
        text: `Упростите: <span class="math">tg(π + α) · tg(${P2} + α)</span>.`,
        steps: [
          { html: `tg(π + α): горизонталь — tg; III четверть, tg &gt; 0 → tg α.`, scene: { model: "reduction", f: "tg", k: 2, s: 1, deg: 30 } },
          { html: `tg(${P2} + α): вертикаль — ctg; II четверть, tg &lt; 0 → ${MINUS}ctg α.`, scene: { model: "reduction", f: "tg", k: 1, s: 1, deg: 30 } },
          { html: `Произведение: tg α · (${MINUS}ctg α) = ${MINUS}1, потому что tg α · ctg α = 1.` },
        ],
        checks: [[() => Math.tan(PI + 0.4) * Math.tan(PI / 2 + 0.4), -1]],
      },
    ],
    generators: [
      { id: "simp", title: "Упростите f(K ± α)", make: simplifyTask },
      { id: "calc", title: "Вычислите значение", make: calcTask },
      { id: "sum", title: "Упростите выражение", make: sumTask },
    ],
    horse,
  });
})();
