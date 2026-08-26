// Regelwerk Art. 4.4: mind. 50 Min zwischen Ende des Versuchs auf einer Route und
// Start auf der anderen Route (pro Athlet:in). Fixer Wert, wird automatisch geprüft -
// keine manuelle Eingabe nötig.
const LEAD_MIN_ROUTE_GAP_MIN = 50;

// Lead mit 2 Routen (Quali): Feld wird in zwei Hälften geteilt, die auf
// unterschiedlichen Routen starten und nach der halben Feldgröße die Route wechseln
// (Art. 2.1/4.4: Versatz um halbe Starterzahl, Route A/B parallel geklettert).
// Dadurch klettert jede Route insgesamt "starters" Durchgänge, beide Wände laufen
// durchgängig parallel -> Rundendauer = starters * climbTimeMin.
function calcLead(params) {
  const { starters, numRoutes, climbTimeMin } = params;

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
    const durationMin = starters * climbTimeMin;
    return { durationMin, slots, info: `1 Route, ${starters} Starter:innen sequentiell` };
  }

  const half = Math.floor(starters / 2);
  const routeGapMin = (half - 1) * climbTimeMin;
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

  const durationMin = starters * climbTimeMin;
  const gapOk = routeGapMin >= LEAD_MIN_ROUTE_GAP_MIN;
  return {
    durationMin,
    slots,
    routeGapMin,
    gapWarning: gapOk ? null : `Pause zwischen den Routen beträgt bei dieser Starterzahl/Kletterzeit nur ${Math.round(routeGapMin)} Min (Regelwerk: mind. ${LEAD_MIN_ROUTE_GAP_MIN} Min). Mehr Starter:innen oder längere Kletterzeit würden das beheben.`,
    info: `2 Routen parallel, Versatz ${half} Athlet:innen, Pause zwischen Routen: ${Math.round(routeGapMin)} Min`
  };
}
