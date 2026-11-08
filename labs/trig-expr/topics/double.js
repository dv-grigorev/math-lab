// Подтема «Формулы двойного угла»: теория, разборы, задания и генераторы тренировочных задач.
(function () {
  const T = TE, { MINUS, frac } = Lab;
  const { num, html, par, pick } = T;
  const S = Math.sin, C = Math.cos, TG = Math.tan, PI = Math.PI, { rad } = T;

  // ---------- Генератор «Вычислите» — формула, прочитанная справа налево ----------
  // θ так подобран, что 2θ — табличный угол; c — множитель перед выражением
  const THETAS = [15, 22.5, 67.5, 75, 105, 112.5, 157.5, 165];
  const FORMS = [
    { lhs: (c, x) => `${c === 1 ? "" : c} sin ${x} cos ${x}`, fn: (c, t) => c * S(t) * C(t), f: "sin", k: c => num(c, 2),
      how: (c, x) => `${c === 2 ? "" : `${c === 1 ? "" : c} sin ${x} cos ${x} = ${html(num(c, 2))} · 2 sin ${x} cos ${x}, а `}2 sin ${x} cos ${x} = sin(2 · ${x})`, cs: [1, 2, 4] },
    { lhs: (c, x) => `cos²${x} ${MINUS} sin²${x}`, fn: (c, t) => C(t) ** 2 - S(t) ** 2, f: "cos", k: () => num(1),
      how: (c, x) => `cos²${x} ${MINUS} sin²${x} = cos(2 · ${x})`, cs: [1] },
    { lhs: (c, x) => `sin²${x} ${MINUS} cos²${x}`, fn: (c, t) => S(t) ** 2 - C(t) ** 2, f: "cos", k: () => num(-1),
      how: (c, x) => `sin²${x} ${MINUS} cos²${x} = ${MINUS}(cos²${x} ${MINUS} sin²${x}) = ${MINUS}cos(2 · ${x})`, cs: [1] },
    { lhs: (c, x) => `2 cos²${x} ${MINUS} 1`, fn: (c, t) => 2 * C(t) ** 2 - 1, f: "cos", k: () => num(1),
      how: (c, x) => `2 cos²${x} ${MINUS} 1 = cos(2 · ${x})`, cs: [1] },
    { lhs: (c, x) => `1 ${MINUS} 2 sin²${x}`, fn: (c, t) => 1 - 2 * S(t) ** 2, f: "cos", k: () => num(1),
      how: (c, x) => `1 ${MINUS} 2 sin²${x} = cos(2 · ${x})`, cs: [1] },
    { lhs: (c, x) => `(cos ${x} ${MINUS} sin ${x})(cos ${x} + sin ${x})`, fn: (c, t) => (C(t) - S(t)) * (C(t) + S(t)), f: "cos", k: () => num(1),
      how: (c, x) => `(cos ${x} ${MINUS} sin ${x})(cos ${x} + sin ${x}) = cos²${x} ${MINUS} sin²${x} = cos(2 · ${x})`, cs: [1] },
    { lhs: (c, x) => frac(`2 tg ${x}`, `1 ${MINUS} tg²${x}`), fn: (c, t) => 2 * TG(t) / (1 - TG(t) ** 2), f: "tg", k: () => num(1),
      how: (c, x) => `${frac(`2 tg ${x}`, `1 ${MINUS} tg²${x}`)} = tg(2 · ${x})`, cs: [1] },
  ];
  function calcTask(R) {
    const F = pick(R, FORMS), c = pick(R, F.cs), th = pick(R, THETAS), unit = T.randUnit(R);
    const x = T.angHTML(th, unit), x2 = T.angHTML(2 * th, unit);
    const v2 = T.exact(T.FN[F.f](rad(2 * th)));   // табличное значение функции от 2θ
    const answer = T.mul(F.k(c), v2);   // множитель перед формулой × табличное значение
    const how = F.how(c, x).replace(`(2 · ${x})`, ` ${x2}`), k = F.k(c);
    const last = T.same(k, T.ONE) ? "." : `, значит, ответ: <span class="math">${
      T.same(k, num(-1)) ? MINUS + par(v2) : html(k) + " · " + par(v2)} = ${html(answer)}</span>.`;
    return {
      kind: "input",
      text: `Вычислите: <span class="math">${F.lhs(c, x)}</span>`,
      answer,
      steps: [
        `Узнаём формулу двойного угла, прочитанную справа налево: <span class="math">${how}</span>.`,
        `<span class="math">${F.f} ${x2} = ${html(v2)}</span> (табличное значение)${last}`,
      ],
      check: () => F.fn(c, rad(th)),
    };
  }

  // ---------- Генератор «sin 2α, cos 2α, tg 2α по одной функции» ----------
  function givenTask(R, pool) {
    const g = T.given(R, pool), { f, v, q, unit } = g, sol = T.solveFrom(f, v, q), V = sol.vals, D = T.doubles(V);
    const want = pick(R, D.tg ? ["sin", "cos", "tg"] : ["sin", "cos"]);
    let steps;
    if (want === "sin") {
      // недостающие sin α, cos α: по sin — cos, по cos — sin; по tg — шаги к sin (в них есть и cos), по ctg — к cos
      steps = [...sol.steps[{ sin: "cos", cos: "sin", tg: "sin", ctg: "cos" }[f]],
        `sin 2α = 2 sin α cos α = 2 · ${par(V.sin)} · ${par(V.cos)} = ${html(D.sin)}.`];
    } else if (want === "cos") {
      const viaSin = f === "sin" || f === "ctg";
      steps = [...(f === "tg" ? sol.steps.cos : f === "ctg" ? sol.steps.sin : []),
        viaSin ? `cos 2α = 1 ${MINUS} 2 sin²α = 1 ${MINUS} 2 · ${html(T.sq(V.sin))} = ${html(D.cos)}.`
               : `cos 2α = 2 cos²α ${MINUS} 1 = 2 · ${html(T.sq(V.cos))} ${MINUS} 1 = ${html(D.cos)}.`];
      if (f === "sin" || f === "cos") steps.push("Четверть здесь не понадобилась: в формулу входит только квадрат.");
    } else {
      steps = [...(f === "tg" ? [] : sol.steps.tg),
        `tg 2α = ${frac("2 tg α", `1 ${MINUS} tg²α`)} = ${frac(`2 · ${par(V.tg)}`, `1 ${MINUS} ${html(T.sq(V.tg))}`)} = ${html(D.tg)}.`];
    }
    return {
      kind: "input",
      text: `Найдите <span class="math">${want} 2α</span>, если <span class="math">${f} α = ${html(v)}</span> и <span class="math">α ∈ ${T.quarterHTML(q, unit)}</span>.`,
      answer: D[want],
      steps,
      data: { f, v: T.val(v), q, target: want + "2" },
      scene: { model: "find", gf: f, v: T.text(T.abs(v)), q },
    };
  }

  // ---------- Генератор «Упростите» — выбор из вариантов ----------
  const R_ = {   // результаты (и неверные варианты)
    sin2: ["sin 2α", a => S(2 * a)], cos2: ["cos 2α", a => C(2 * a)], tg2: ["tg 2α", a => TG(2 * a)],
    mcos2: [`${MINUS}cos 2α`, a => -C(2 * a)], ctg2: ["ctg 2α", a => 1 / TG(2 * a)],
    sin: ["sin α", S], cos: ["cos α", C], tg: ["tg α", TG], ctg: ["ctg α", a => 1 / TG(a)],
    one: ["1", () => 1], zero: ["0", () => 0], sin2x2: ["2 sin α", a => 2 * S(a)], cos2x2: ["2 cos α", a => 2 * C(a)],
    tgx2: ["2 tg α", a => 2 * TG(a)], htg2: [`${frac(1, 2)} tg 2α`, a => TG(2 * a) / 2],
    cmins: [`cos α ${MINUS} sin α`, a => C(a) - S(a)], cpluss: ["cos α + sin α", a => C(a) + S(a)],
    sq_c: ["cos²α", a => C(a) ** 2], sq_s: ["sin²α", a => S(a) ** 2], ms2: [`1 ${MINUS} sin 2α`, a => 1 - S(2 * a)],
    ps2: ["1 + sin 2α", a => 1 + S(2 * a)],
  };
  const SIMPLIFY = [
    [`(sin α + cos α)² ${MINUS} 1`, a => (S(a) + C(a)) ** 2 - 1, "sin2",
      [`(sin α + cos α)² = sin²α + 2 sin α cos α + cos²α = 1 + 2 sin α cos α`, `Вычитаем 1: остаётся 2 sin α cos α = sin 2α.`]],
    [`(sin α ${MINUS} cos α)²`, a => (S(a) - C(a)) ** 2, "ms2",
      [`(sin α ${MINUS} cos α)² = sin²α + cos²α ${MINUS} 2 sin α cos α`, `= 1 ${MINUS} sin 2α.`]],
    [`cos⁴α ${MINUS} sin⁴α`, a => C(a) ** 4 - S(a) ** 4, "cos2",
      [`Разность квадратов: (cos²α ${MINUS} sin²α)(cos²α + sin²α)`, `Вторая скобка равна 1, первая — cos 2α.`]],
    [frac("2 sin α cos α", `cos²α ${MINUS} sin²α`), a => 2 * S(a) * C(a) / (C(a) ** 2 - S(a) ** 2), "tg2",
      [`Числитель — sin 2α, знаменатель — cos 2α.`, `${frac("sin 2α", "cos 2α")} = tg 2α.`]],
    [frac(`1 ${MINUS} cos 2α`, "sin 2α"), a => (1 - C(2 * a)) / S(2 * a), "tg",
      [`1 ${MINUS} cos 2α = 2 sin²α, sin 2α = 2 sin α cos α.`, `${frac("2 sin²α", "2 sin α cos α")} = ${frac("sin α", "cos α")} = tg α.`]],
    [frac("sin 2α", `1 ${MINUS} cos 2α`), a => S(2 * a) / (1 - C(2 * a)), "ctg",
      [`sin 2α = 2 sin α cos α, 1 ${MINUS} cos 2α = 2 sin²α.`, `${frac("2 sin α cos α", "2 sin²α")} = ${frac("cos α", "sin α")} = ctg α.`]],
    [frac("sin 2α", "2 sin α"), a => S(2 * a) / (2 * S(a)), "cos",
      [`sin 2α = 2 sin α cos α.`, `Сокращаем на 2 sin α: остаётся cos α.`]],
    [frac("cos 2α", "cos α + sin α"), a => C(2 * a) / (C(a) + S(a)), "cmins",
      [`cos 2α = cos²α ${MINUS} sin²α = (cos α ${MINUS} sin α)(cos α + sin α).`, `Сокращаем на (cos α + sin α): остаётся cos α ${MINUS} sin α.`]],
    [frac("1 + cos 2α", "2"), a => (1 + C(2 * a)) / 2, "sq_c",
      [`1 + cos 2α = 1 + 2 cos²α ${MINUS} 1 = 2 cos²α.`, `Делим на 2: cos²α (формула понижения степени).`]],
    [`2 cos²α ${MINUS} cos 2α`, a => 2 * C(a) ** 2 - C(2 * a), "one",
      [`cos 2α = 2 cos²α ${MINUS} 1.`, `2 cos²α ${MINUS} (2 cos²α ${MINUS} 1) = 1.`]],
    [`cos 2α + 2 sin²α`, a => C(2 * a) + 2 * S(a) ** 2, "one",
      [`cos 2α = 1 ${MINUS} 2 sin²α.`, `1 ${MINUS} 2 sin²α + 2 sin²α = 1.`]],
    [frac("sin 2α", "cos²α"), a => S(2 * a) / C(a) ** 2, "tgx2",
      [`sin 2α = 2 sin α cos α.`, `${frac("2 sin α cos α", "cos²α")} = ${frac("2 sin α", "cos α")} = 2 tg α.`]],
    [frac("sin α cos α", "cos 2α"), a => S(a) * C(a) / C(2 * a), "htg2",
      [`sin α cos α = ${frac(1, 2)} sin 2α.`, `${frac(`${frac(1, 2)} sin 2α`, "cos 2α")} = ${frac(1, 2)} tg 2α.`]],
    [`(cos α ${MINUS} sin α)² + sin 2α`, a => (C(a) - S(a)) ** 2 + S(2 * a), "one",
      [`(cos α ${MINUS} sin α)² = 1 ${MINUS} 2 sin α cos α = 1 ${MINUS} sin 2α.`, `1 ${MINUS} sin 2α + sin 2α = 1.`]],
  ];
  const opt = key => ({ html: R_[key][0], fn: R_[key][1] });
  function simplifyTask(R) {
    const [q, fn, ans, steps] = pick(R, SIMPLIFY);
    const correct = opt(ans);
    const pool = Object.keys(R_).filter(k => k !== ans).map(opt);
    return {
      kind: "options",
      text: `Упростите выражение: <span class="math">${q}</span>`,
      ...T.options(R, correct, pool),
      fn,
      steps: steps.map(s => `<span class="math">${s}</span>`),
      scene: { model: "double", deg: 30 },
    };
  }

  T.topics.push({
    id: "double",
    title: "Формулы двойного угла",
    model: "double",
    theory: [
      {
        title: "Откуда берутся формулы",
        html: `<p>Возьмём формулы синуса и косинуса суммы и подставим β = α:</p>
          <p class="fline">sin(α + α) = sin α cos α + cos α sin α = 2 sin α cos α</p>
          <p class="fline">cos(α + α) = cos α cos α ${MINUS} sin α sin α = cos²α ${MINUS} sin²α</p>
          <p>Так что формулы двойного угла не нужно зубрить отдельно — это частный случай формул сложения.</p>`,
        scene: { model: "double", deg: 30 },
      },
      {
        title: "Формулы двойного угла",
        html: `<div class="fbox">
            <p>sin 2α = 2 sin α cos α</p>
            <p>cos 2α = cos²α ${MINUS} sin²α = 2 cos²α ${MINUS} 1 = 1 ${MINUS} 2 sin²α</p>
            <p>tg 2α = ${frac("2 tg α", `1 ${MINUS} tg²α`)}</p>
          </div>
          <p>Три записи косинуса получаются друг из друга заменой sin²α = 1 ${MINUS} cos²α или cos²α = 1 ${MINUS} sin²α.
          Выбирайте ту, где стоит известная функция: известен sin α — берите 1 ${MINUS} 2 sin²α, известен cos α — 2 cos²α ${MINUS} 1.</p>
          <p>На модели: синяя точка — угол α, оранжевая — угол 2α. Ползунок перебирает табличные углы — все значения точные.
          Углы можно смотреть в градусах или в радианах.</p>`,
        scene: { model: "double", deg: 60 },
      },
      {
        title: "Читаем справа налево",
        html: `<p>Формулу можно применять в обе стороны. Узнали «2 sin · cos одного угла» — сворачиваем в синус двойного:</p>
          <p class="fline">2 sin 15° cos 15° = sin 30° = ${frac(1, 2)}</p>
          <p class="fline">cos²${frac("π", 8)} ${MINUS} sin²${frac("π", 8)} = cos ${frac("π", 4)} = ${frac("√2", 2)}</p>
          <p class="fline">sin α cos α = ${frac(1, 2)} sin 2α</p>`,
      },
      {
        title: "Понижение степени",
        html: `<p>Из cos 2α = 2 cos²α ${MINUS} 1 и cos 2α = 1 ${MINUS} 2 sin²α выражаем квадраты:</p>
          <div class="fbox">
            <p>cos²α = ${frac("1 + cos 2α", 2)}&emsp;&emsp;sin²α = ${frac(`1 ${MINUS} cos 2α`, 2)}</p>
            <p>1 + cos 2α = 2 cos²α&emsp;&emsp;1 ${MINUS} cos 2α = 2 sin²α</p>
          </div>
          <p>Пример: cos²15° = ${frac("1 + cos 30°", 2)} = ${frac("2 + √3", 4)}.</p>`,
      },
      {
        title: "«Двойной» — это любой угол вдвое больше",
        html: `<p>В формуле важно только, что один угол вдвое больше другого:</p>
          <p class="fline">sin α = 2 sin ${frac("α", 2)} cos ${frac("α", 2)}&emsp;&emsp;cos 4x = cos²2x ${MINUS} sin²2x&emsp;&emsp;sin 6x = 2 sin 3x cos 3x</p>`,
      },
      {
        title: "Типичные ошибки",
        html: `<ul>
            <li><b>sin 2α ≠ 2 sin α.</b> При α = 30°: sin 60° = ${frac("√3", 2)} ≈ 0,87, а 2 sin 30° = 1. Двойку нельзя «вынести» из-под синуса.</li>
            <li><b>cos 2α ≠ 2 cos α</b> — по той же причине.</li>
            <li><b>(sin α + cos α)² ≠ 1</b>: это 1 + 2 sin α cos α = 1 + sin 2α.</li>
            <li>Знак sin 2α зависит от четверти угла 2α, а не α: при α = 120° угол 2α = 240° — III четверть, sin 2α &lt; 0.</li>
          </ul>`,
        scene: { model: "double", deg: 120 },
      },
    ],
    tasks: [
      { html: "Поставьте α = 30° и скройте результат. Предскажите sin 2α и 2 sin α. Совпадут ли они? Проверьте.",
        answer: `Нет: sin 2α = sin 60° = ${frac("√3", 2)} ≈ 0,87, а 2 sin α = 2 · ${frac(1, 2)} = 1.`, scene: { model: "double", deg: 30, hide: true } },
      { html: "При каких α из отрезка [0°; 180°] sin 2α = 0? Предскажите, потом подвигайте α.",
        answer: "α = 0°, 90°, 180°: тогда точка 2α (0°, 180°, 360°) лежит на горизонтальной оси.", scene: { model: "double", deg: 60, hide: true } },
      { html: "При каких α из (0°; 90°) cos 2α &lt; 0?",
        answer: "При α ∈ (45°; 90°): угол 2α попадает во II четверть, где косинус отрицателен.", scene: { model: "double", deg: 30, hide: true } },
      { html: "α = 120°. В какой четверти угол 2α? Какой знак у sin 2α? Посчитайте sin 2α по формуле и проверьте.",
        answer: `2α = 240° — III четверть, sin 2α &lt; 0. sin 2α = 2 · ${frac("√3", 2)} · (${MINUS}${frac(1, 2)}) = ${MINUS}${frac("√3", 2)}.`,
        scene: { model: "double", deg: 120, hide: true } },
      { html: "Решите 5 тренировочных задач подряд без ошибок (вкладка «Тренировка»)." },
    ],
    examples: [
      {
        title: "2 sin 15° cos 15°",
        text: "Вычислите без калькулятора: <span class=\"math\">2 sin 15° cos 15°</span>.",
        steps: [
          { html: "Таблицы для 15° нет, но выражение похоже на правую часть формулы sin 2α = 2 sin α cos α при α = 15°." },
          { html: "Сворачиваем: <span class=\"math\">2 sin 15° cos 15° = sin 30°</span>." },
          { html: `<span class="math">sin 30° = ${frac(1, 2)}</span>. Ответ: ${frac(1, 2)}.` },
        ],
        checks: [[() => 2 * S(rad(15)) * C(rad(15)), 0.5]],
      },
      {
        title: "sin 2α, cos 2α, tg 2α по синусу",
        text: `Найдите sin 2α, cos 2α и tg 2α, если <span class="math">sin α = ${frac(3, 5)}</span>, <span class="math">α ∈ (${frac("π", 2)}; π)</span>.`,
        steps: [
          { html: `Для sin 2α нужен ещё cos α. cos²α = 1 ${MINUS} ${frac(9, 25)} = ${frac(16, 25)}; во II четверти cos α &lt; 0, так что cos α = ${MINUS}${frac(4, 5)}.`,
            scene: { model: "find", gf: "sin", v: "3/5", q: 2 } },
          { html: `sin 2α = 2 sin α cos α = 2 · ${frac(3, 5)} · (${MINUS}${frac(4, 5)}) = ${MINUS}${frac(24, 25)}.` },
          { html: `cos 2α = 1 ${MINUS} 2 sin²α = 1 ${MINUS} 2 · ${frac(9, 25)} = ${frac(7, 25)} (здесь знак cos α не нужен).` },
          { html: `tg 2α = ${frac("sin 2α", "cos 2α")} = (${MINUS}${frac(24, 25)}) : ${frac(7, 25)} = ${MINUS}${frac(24, 7)}.` },
          { html: `Проверка по смыслу: α ≈ 143°, тогда 2α ≈ 286° — IV четверть, где sin &lt; 0, а cos &gt; 0. Знаки совпали.` },
        ],
        checks: (() => { const a = PI - Math.asin(0.6); return [[() => S(2 * a), -24 / 25], [() => C(2 * a), 7 / 25], [() => TG(2 * a), -24 / 7]]; })(),
      },
      {
        title: "tg 2α по тангенсу",
        text: "Найдите tg 2α, если <span class=\"math\">tg α = 2</span>.",
        steps: [
          { html: `Формула: tg 2α = ${frac("2 tg α", `1 ${MINUS} tg²α`)}. Четверть не нужна — в формулу входит только tg α.`, scene: { model: "find", gf: "tg", v: "2", q: 1 } },
          { html: `tg 2α = ${frac("2 · 2", `1 ${MINUS} 4`)} = ${frac(4, `${MINUS}3`)} = ${MINUS}${frac(4, 3)}.` },
        ],
        checks: [[() => TG(2 * Math.atan(2)), -4 / 3]],
      },
      {
        title: "Упростить (sin α + cos α)² − 1",
        text: `Упростите: <span class="math">(sin α + cos α)² ${MINUS} 1</span>.`,
        steps: [
          { html: `Раскрываем квадрат суммы: sin²α + 2 sin α cos α + cos²α.`, scene: { model: "double", deg: 30 } },
          { html: `sin²α + cos²α = 1, поэтому выражение равно 1 + 2 sin α cos α ${MINUS} 1 = 2 sin α cos α.` },
          { html: `2 sin α cos α = sin 2α. Ответ: sin 2α.` },
        ],
        checks: [[() => (S(0.7) + C(0.7)) ** 2 - 1, S(1.4)]],
      },
      {
        title: "cos² 15° через понижение степени",
        text: "Вычислите <span class=\"math\">cos²15°</span>.",
        steps: [
          { html: `cos²α = ${frac("1 + cos 2α", 2)}, где α = 15°, 2α = 30°.` },
          { html: `cos²15° = ${frac(`1 + ${frac("√3", 2)}`, 2)} = ${frac("2 + √3", 4)}.` },
        ],
        checks: [[() => C(rad(15)) ** 2, (2 + Math.sqrt(3)) / 4]],
      },
    ],
    generators: [
      { id: "calc", title: "Вычислите (формула справа налево)", make: calcTask },
      { id: "given", title: "sin 2α, cos 2α, tg 2α по одной функции", make: R => givenTask(R, R() < 0.6 ? "triples" : "roots") },
      { id: "simp", title: "Упростите выражение", make: simplifyTask },
    ],
  });
})();
