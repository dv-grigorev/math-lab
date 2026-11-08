// Подтема «Смешанные задания»: без теории — разборы и тренировка. Нужно узнать, какую формулу
// применить: приведения, двойного угла, чётность, период.
(function () {
  const T = TE, { MINUS, frac, fmt } = Lab;
  const { html, pick, num, times, reduce, ROMAN, signWord, CO, FN, termHTML } = T;
  const PI = Math.PI, { rad, sgnTxt, int, randSign: sgn } = T;
  // множитель перед выражением: 1 не пишем, −1 — только минус
  const coefHTML = c => (c === 1 ? "" : c === -1 ? MINUS : fmt(c) + " ");
  // нетабличный острый угол в градусах: 17°, 23°, 49° …
  const oddAngle = R => { let x; do x = int(R, 11, 79); while (x % 15 === 0); return x; };

  // ---------- c · tg x · tg(90° + x) и подобные: произведение tg и ctg одного угла ----------
  function pairTask(R) {
    const f1 = pick(R, ["tg", "ctg"]), x = oddAngle(R), c = int(R, 2, 9) * sgn(R);
    // вторая функция после приведения должна стать «соседней» к первой
    const [f2, k] = R() < 0.5 ? [f1, pick(R, [1, 3])] : [CO[f1], pick(R, [2, 4])];
    const s = k === 4 ? -1 : sgn(R), x2 = 90 * k + s * x, r = reduce(f2, k, s);
    const answer = num(c * r.sign);
    return {
      kind: "input",
      text: `Найдите значение выражения <span class="math">${coefHTML(c)}${f1} ${x}° · ${f2} ${x2}°</span>.`,
      answer,
      steps: [
        `${x2}° = ${90 * k}° ${sgnTxt(s)} ${x}°. ${r.vertical ? `${90 * k}° — на вертикали: ${f2} → ${r.g}` : `${90 * k}° — на горизонтали: функция та же`}; ` +
          `угол ${x2}° в ${ROMAN[r.q - 1]} четверти, ${f2} там ${signWord(r.sign)}: ${f2} ${x2}° = ${termHTML(r.sign, r.g, x + "°")}.`,
        `${f1} ${x}° · ${r.g} ${x}° = 1, поэтому выражение равно ${fmt(c)} · ${r.sign > 0 ? "1" : `(${MINUS}1)`} = ${html(answer)}.`,
      ],
      check: () => c * FN[f1](rad(x)) * FN[f2](rad(x2)),
      scene: { model: "reduction", f: f2, k, s, deg: x },
    };
  }

  // ---------- c · sin 2x / (sin x · cos x) в разных записях ----------
  function sinTask(R) {
    let x; do x = oddAngle(R); while (x === 45);
    const c = int(R, 2, 9) * sgn(R), y = 2 * x;
    const top = pick(R, [
      [`sin ${y}°`, `это и есть sin ${y}°`],
      [`sin ${180 - y}°`, `sin ${180 - y}° = sin(180° ${MINUS} ${y}°) = sin ${y}°`],
      y < 90 ? [`cos ${90 - y}°`, `cos ${90 - y}° = cos(90° ${MINUS} ${y}°) = sin ${y}°`] : [`cos ${y - 90}°`, `cos ${y - 90}° = cos(${y}° ${MINUS} 90°) = cos(90° ${MINUS} ${y}°) = sin ${y}°`],
    ]);
    const bottom = pick(R, [
      [`sin ${x}° · cos ${x}°`, ""],
      [`sin ${x}° · sin ${90 - x}°`, `sin ${90 - x}° = sin(90° ${MINUS} ${x}°) = cos ${x}°`],
      [`cos ${x}° · cos ${90 - x}°`, `cos ${90 - x}° = cos(90° ${MINUS} ${x}°) = sin ${x}°`],
    ]);
    const answer = num(2 * c);
    return {
      kind: "input",
      text: `Найдите значение выражения <span class="math">${frac(coefHTML(c) + top[0], bottom[0])}</span>.`,
      answer,
      steps: [
        `Числитель: ${top[1]}.`,
        `Знаменатель: ${bottom[1] ? bottom[1] + ", значит, он равен " : ""}sin ${x}° cos ${x}° = ${frac(1, 2)} sin ${y}° (синус двойного угла).`,
        `${frac(`${fmt(c)} sin ${y}°`, `${frac(1, 2)} sin ${y}°`)} = ${fmt(c)} · 2 = ${html(answer)}.`,
      ],
      check: () => {
        const v = { [`sin ${y}°`]: Math.sin(rad(y)), [`sin ${180 - y}°`]: Math.sin(rad(180 - y)), [`cos ${90 - y}°`]: Math.cos(rad(90 - y)), [`cos ${y - 90}°`]: Math.cos(rad(y - 90)) }[top[0]];
        const w = { [`sin ${x}° · cos ${x}°`]: Math.sin(rad(x)) * Math.cos(rad(x)), [`sin ${x}° · sin ${90 - x}°`]: Math.sin(rad(x)) * Math.sin(rad(90 - x)),
          [`cos ${x}° · cos ${90 - x}°`]: Math.cos(rad(x)) * Math.cos(rad(90 - x)) }[bottom[0]];
        return c * v / w;
      },
      scene: { model: "reduction", f: "sin", k: 1, s: -1, deg: x },
    };
  }

  // ---------- a · f(Kπ ± α) + b · f(±α), если известно f α ----------
  const GIVEN = { tg: [2, 3, 4, 5, 6, 7, 8, 9], sin: ["1/3", "2/5", "3/5", "1/4", "2/7"] };
  function givenTask(R) {
    const f = pick(R, T.FUNCS), v = T.parseNum(String(pick(R, GIVEN[T.bounded(f) ? "sin" : "tg"]))), V = times(sgn(R), v);
    let a, b, k, s, F1, s2, total;
    do {
      a = int(R, 2, 7) * sgn(R); b = int(R, 1, 4) * sgn(R); s = sgn(R); s2 = sgn(R);
      [F1, k] = R() < 0.5 ? [f, 2 * int(R, 1, 3)] : [CO[f], 2 * int(R, 0, 3) + 1];   // f с «горизонтальным» K или кофункция с «вертикальным»
      total = a * reduce(F1, k, s).sign + b * (s2 < 0 && f !== "cos" ? -1 : 1);
    } while (total === 0);
    const r = reduce(F1, k, s), K = T.radHTML(90 * k), kr = ((k - 1) % 4) + 1;
    const bTerm = `${b < 0 ? ` ${MINUS} ` : " + "}${Math.abs(b) === 1 ? "" : Math.abs(b) + " "}${s2 < 0 ? `${f}(${MINUS}α)` : `${f} α`}`;
    const answer = times(total, V);
    const steps = [];
    if (k > 4) steps.push(`Отбрасываем полные обороты: ${F1}(${K} ${sgnTxt(s)} α) = ${F1}(${T.radHTML(90 * kr)} ${sgnTxt(s)} α).`);
    steps.push(`${F1}(${T.argHTML(kr, s, "rad")}): ${r.vertical ? `${T.radHTML(90 * kr)} на вертикали — ${F1} → ${r.g}` : `${T.radHTML(90 * kr)} на горизонтали — функция та же`}; ` +
      `${ROMAN[r.q - 1]} четверть, ${F1} там ${signWord(r.sign)}: ${F1}(${K} ${sgnTxt(s)} α) = ${termHTML(r.sign, f)}.`);
    if (s2 < 0) steps.push(f === "cos" ? `cos(${MINUS}α) = cos α — чётность.` : `${f}(${MINUS}α) = ${MINUS}${f} α — нечётность.`);
    const tm = sg => (sg > 0 ? `${f} α` : `(${MINUS}${f} α)`);
    steps.push(`Собираем: ${fmt(a)} · ${tm(r.sign)} ${b < 0 ? MINUS : "+"} ${Math.abs(b)} · ${tm(s2 < 0 && f !== "cos" ? -1 : 1)} = ${fmt(total)} ${f} α = ${fmt(total)} · ${T.par(V)} = ${html(answer)}.`);
    const alpha = { tg: Math.atan(T.val(V)), ctg: Math.atan(1 / T.val(V)), sin: Math.asin(T.val(V)), cos: Math.acos(T.val(V)) }[f];
    return {
      kind: "input",
      text: `Найдите значение выражения <span class="math">${coefHTML(a)}${F1}(${K} ${sgnTxt(s)} α)${bTerm}</span>, если <span class="math">${f} α = ${html(V)}</span>.`,
      answer, steps,
      check: () => a * FN[F1](k * PI / 2 + s * alpha) + b * FN[f](s2 * alpha),
      scene: { model: "reduction", f: F1, k: kr, s, deg: 30 },
    };
  }

  // ---------- (sin x ± cos x)² = 1 ± sin 2x ----------
  function squareTask(R) {
    const x = pick(R, [15, 75, 105, 165]), sg = sgn(R), unit = T.randUnit(R), X = T.angHTML(x, unit), X2 = T.angHTML(2 * x, unit);
    const s2 = T.exact(Math.sin(rad(2 * x))), answer = T.add(T.ONE, times(sg, s2));
    return {
      kind: "input",
      text: `Найдите значение выражения <span class="math">(sin ${X} ${sgnTxt(sg)} cos ${X})²</span>.`,
      answer,
      steps: [
        `Раскрываем квадрат: sin²${X} + cos²${X} ${sgnTxt(sg)} 2 sin ${X} cos ${X} = 1 ${sgnTxt(sg)} sin ${X2}.`,
        `sin ${X2} = ${html(s2)}, ответ: 1 ${sgnTxt(sg)} ${T.par(s2)} = ${html(answer)}.`,
      ],
      check: () => (Math.sin(rad(x)) + sg * Math.cos(rad(x))) ** 2,
      scene: { model: "angle", deg: 2 * x, unit },
    };
  }

  T.topics.push({
    id: "mixed",
    title: "Смешанные задания",
    model: "angle",
    scene: { model: "angle", deg: 30 },
    theory: [],   // без теории: вкладка скрыта, сразу разборы
    examples: [
      {
        title: "5 tg 17° · tg 107°",
        text: "Найдите значение выражения <span class=\"math\">5 tg 17° · tg 107°</span>.",
        steps: [
          { html: "Углы 17° и 107° не табличные, но 107° = 90° + 17° — работает формула приведения.", scene: { model: "reduction", f: "tg", k: 1, s: 1, deg: 17, hide: true } },
          { html: `90° — на вертикали: tg → ctg. 107° — во II четверти, тангенс там отрицателен: tg 107° = ${MINUS}ctg 17°.`, scene: { model: "reduction", f: "tg", k: 1, s: 1, deg: 17 } },
          { html: `5 tg 17° · (${MINUS}ctg 17°) = ${MINUS}5 · (tg 17° · ctg 17°) = ${MINUS}5 · 1 = ${MINUS}5. Ответ: ${MINUS}5.` },
        ],
        checks: [[() => 5 * Math.tan(rad(17)) * Math.tan(rad(107)), -5]],
      },
      {
        title: "5 sin 98° / (sin 49° · sin 41°)",
        text: `Найдите значение выражения <span class="math">${frac("5 sin 98°", "sin 49° · sin 41°")}</span>.`,
        steps: [
          { html: "Замечаем: 98° = 2 · 49°, а 41° = 90° − 49°.", scene: { model: "reduction", f: "sin", k: 1, s: -1, deg: 49, hide: true } },
          { html: `Формула приведения: sin 41° = sin(90° ${MINUS} 49°) = cos 49° (вертикаль — sin → cos, I четверть — знак «+»).`, scene: { model: "reduction", f: "sin", k: 1, s: -1, deg: 49 } },
          { html: `Знаменатель: sin 49° · cos 49° = ${frac(1, 2)} · 2 sin 49° cos 49° = ${frac(1, 2)} sin 98° (синус двойного угла).` },
          { html: `${frac("5 sin 98°", `${frac(1, 2)} sin 98°`)} = 5 · 2 = 10. Ответ: 10.` },
        ],
        checks: [[() => 5 * Math.sin(rad(98)) / (Math.sin(rad(49)) * Math.sin(rad(41))), 10]],
      },
      {
        title: "5 tg(5π − γ) − tg(−γ), tg γ = 7",
        text: `Найдите значение выражения <span class="math">5 tg(5π ${MINUS} γ) ${MINUS} tg(${MINUS}γ)</span>, если <span class="math">tg γ = 7</span>.`,
        steps: [
          { html: `Период тангенса — π: tg(5π ${MINUS} γ) = tg(${MINUS}γ) (отбросили 5π). Можно и по-другому: tg(5π ${MINUS} γ) = tg(π ${MINUS} γ) — отбросили 4π.`,
            scene: { model: "reduction", f: "tg", k: 2, s: -1, deg: 30, hide: true } },
          { html: `tg(π ${MINUS} γ): π на горизонтали — функция та же; II четверть, tg &lt; 0 → ${MINUS}tg γ.`, scene: { model: "reduction", f: "tg", k: 2, s: -1, deg: 30 } },
          { html: `Тангенс нечётный: tg(${MINUS}γ) = ${MINUS}tg γ.` },
          { html: `Выражение: 5 · (${MINUS}tg γ) ${MINUS} (${MINUS}tg γ) = ${MINUS}5 tg γ + tg γ = ${MINUS}4 tg γ = ${MINUS}4 · 7 = ${MINUS}28. Ответ: ${MINUS}28.` },
        ],
        checks: [[() => { const g = Math.atan(7); return 5 * Math.tan(5 * PI - g) - Math.tan(-g); }, -28]],
      },
      {
        title: "(sin 75° + cos 75°)²",
        text: "Найдите значение выражения <span class=\"math\">(sin 75° + cos 75°)²</span>.",
        steps: [
          { html: "Раскрываем квадрат суммы: sin²75° + 2 sin 75° cos 75° + cos²75°." },
          { html: "sin²75° + cos²75° = 1 (основное тождество), 2 sin 75° cos 75° = sin 150° (синус двойного угла)." },
          { html: `sin 150° = sin(180° ${MINUS} 30°) = sin 30° = ${frac(1, 2)} (формула приведения).`, scene: { model: "angle", deg: 150 } },
          { html: `1 + ${frac(1, 2)} = ${frac(3, 2)} = 1,5. Ответ: 1,5.` },
        ],
        checks: [[() => (Math.sin(rad(75)) + Math.cos(rad(75))) ** 2, 1.5]],
      },
      {
        title: "√2 cos²(15π/8) − √2 sin²(15π/8)",
        text: `Найдите значение выражения <span class="math">√2 cos²${frac("15π", 8)} ${MINUS} √2 sin²${frac("15π", 8)}</span>.`,
        steps: [
          { html: `Выносим √2: √2 (cos²${frac("15π", 8)} ${MINUS} sin²${frac("15π", 8)}) = √2 cos ${frac("15π", 4)} (косинус двойного угла).` },
          { html: `${frac("15π", 4)} = 2π + ${frac("7π", 4)} — отбрасываем период: cos ${frac("15π", 4)} = cos ${frac("7π", 4)}.`, scene: { model: "angle", deg: 675, unit: "rad" } },
          { html: `cos ${frac("7π", 4)} = cos(2π ${MINUS} ${frac("π", 4)}) = cos ${frac("π", 4)} = ${frac("√2", 2)} (IV четверть, косинус положителен).`, scene: { model: "angle", deg: 315, unit: "rad" } },
          { html: `√2 · ${frac("√2", 2)} = 1. Ответ: 1.` },
        ],
        checks: [[() => Math.SQRT2 * (Math.cos(15 * PI / 8) ** 2 - Math.sin(15 * PI / 8) ** 2), 1]],
      },
    ],
    generators: [
      { id: "pair", title: "tg · tg, ctg · tg", make: pairTask },
      { id: "sin", title: "Дробь с синусами", make: sinTask },
      { id: "given", title: "Если известно tg α (sin α …)", make: givenTask },
      { id: "sq", title: "Квадрат суммы", make: squareTask },
    ],
  });
})();
