// Lead mit 2 Routen (Quali): Feld wird in zwei Hälften geteilt, die auf
// unterschiedlichen Routen starten und nach der halben Feldgröße die Route wechseln
// (Art. 2.1/4.4: Versatz um halbe Starterzahl, Route A/B parallel geklettert).
// Dadurch klettert jede Route insgesamt "starters" Durchgänge, beide Wände laufen
// durchgängig parallel -> Rundendauer = starters * climbTimeMin (Regelwerk-Minimum 50 Min).
function calcLead(params) {
  const { starters, numRoutes, climbTimeMin, minGapMin } = params;

  if (numRoutes <= 1) {
    const slots = [];
    for (let i = 0; i < starters; i++) {
      slots.push({
        label: `Athlet ${i + 1} – Route`,
        group: "Route",
        startOffsetMin: i * climbTimeMin,
        endOffsetMin: (i + 1) * climbTimeMin
      });
    }
    const durationMin = Math.max(starters * climbTimeMin, minGapMin || 0);
    return { durationMin, slots, info: `1 Route, ${starters} Starter:innen sequentiell` };
  }

  const half = Math.floor(starters / 2);
  const slots = [];

  for (let i = 0; i < half; i++) {
    slots.push({
      label: `Athlet ${i + 1} – Route A`,
      group: "Route A",
      startOffsetMin: i * climbTimeMin,
      endOffsetMin: (i + 1) * climbTimeMin
    });
    slots.push({
      label: `Athlet ${i + 1} – Route B`,
      group: "Route B",
      startOffsetMin: (i + half) * climbTimeMin,
      endOffsetMin: (i + half + 1) * climbTimeMin
    });
  }
  for (let i = half; i < starters; i++) {
    const j = i - half;
    slots.push({
      label: `Athlet ${i + 1} – Route B`,
      group: "Route B",
      startOffsetMin: j * climbTimeMin,
      endOffsetMin: (j + 1) * climbTimeMin
    });
    slots.push({
      label: `Athlet ${i + 1} – Route A`,
      group: "Route A",
      startOffsetMin: (j + half) * climbTimeMin,
      endOffsetMin: (j + half + 1) * climbTimeMin
    });
  }

  const durationMin = Math.max(starters * climbTimeMin, minGapMin || 0);
  return {
    durationMin,
    slots,
    info: `2 Routen parallel, Versatz ${half} Athlet:innen, jede Route ${starters} Durchgänge`
  };
}
