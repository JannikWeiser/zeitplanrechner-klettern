// Regelwerk Art. 4.4: mind. 50 Min zwischen Ende des Versuchs auf einer Route und
// Start auf der anderen Route (pro Athlet:in). Fixer Wert, wird automatisch geprüft -
// keine manuelle Eingabe nötig.
const LEAD_MIN_ROUTE_GAP_MIN = 50;

function routeLetter(r) {
  return String.fromCharCode(65 + r);
}

// N Routen, parallel: Athlet i (0-indiziert) startet in Gruppe g=i%N (Round-Robin) auf
// Route g und durchläuft danach reihum alle weiteren Routen. Für einen festen "Zyklus-
// Schritt" s belegen alle N Gruppen gleichzeitig N verschiedene Routen (zyklisches
// Lateinquadrat) - dadurch sind alle Wände durchgehend parallel ausgelastet, Pause
// zwischen zwei eigenen Routenversuchen ist konstant (block-1)*climbTimeMin.
function calcLeadParallel(starters, numRoutes, climbTimeMin) {
  const N = numRoutes;
  const block = Math.ceil(starters / N);
  const slots = [];
  for (let i = 0; i < starters; i++) {
    const g = i % N;
    const p = Math.floor(i / N);
    for (let s = 0; s < N; s++) {
      const route = (g + s) % N;
      const slotIdx = s * block + p;
      slots.push({
        label: `Athlet ${i + 1} – Route ${routeLetter(route)}`,
        group: `Route ${routeLetter(route)}`,
        startOffsetMin: slotIdx * climbTimeMin,
        endOffsetMin: (slotIdx + 1) * climbTimeMin
      });
    }
  }
  return { slots, routeGapMin: (block - 1) * climbTimeMin };
}

// N Routen, sequentiell: Route 1 wird vom gesamten Feld komplett geklettert, dann erst
// startet Route 2 usw. Pause zwischen zwei eigenen Routenversuchen ist für alle
// Athlet:innen konstant (starters-1)*climbTimeMin (der/die letzte Kletternde einer Route
// hat die kürzeste Pause, da die nächste Route direkt danach beginnt).
function calcLeadSequential(starters, numRoutes, climbTimeMin) {
  const slots = [];
  for (let r = 0; r < numRoutes; r++) {
    for (let i = 0; i < starters; i++) {
      const slotIdx = r * starters + i;
      slots.push({
        label: `Athlet ${i + 1} – Route ${routeLetter(r)}`,
        group: `Route ${routeLetter(r)}`,
        startOffsetMin: slotIdx * climbTimeMin,
        endOffsetMin: (slotIdx + 1) * climbTimeMin
      });
    }
  }
  return { slots, routeGapMin: (starters - 1) * climbTimeMin };
}

function calcLead(params) {
  const { starters, numRoutes, climbTimeMin, parallel } = params;
  const N = Math.max(1, numRoutes || 1);

  if (N === 1) {
    const slots = [];
    for (let i = 0; i < starters; i++) {
      slots.push({
        label: `Athlet ${i + 1} – Route`,
        group: "Route",
        startOffsetMin: i * climbTimeMin,
        endOffsetMin: (i + 1) * climbTimeMin
      });
    }
    return { durationMin: starters * climbTimeMin, slots, info: `1 Route, ${starters} Starter:innen sequentiell` };
  }

  const { slots, routeGapMin } = parallel
    ? calcLeadParallel(starters, N, climbTimeMin)
    : calcLeadSequential(starters, N, climbTimeMin);

  const durationMin = Math.max(...slots.map(s => s.endOffsetMin));
  const gapOk = routeGapMin >= LEAD_MIN_ROUTE_GAP_MIN;
  return {
    durationMin,
    slots,
    routeGapMin,
    warning: gapOk ? null : `Pause zwischen den Routen beträgt bei dieser Konfiguration nur ${Math.round(routeGapMin)} Min (Regelwerk: mind. ${LEAD_MIN_ROUTE_GAP_MIN} Min). Mehr Starter:innen, längere Kletterzeit oder sequentiell statt parallel würden das beheben.`,
    info: `${N} Routen ${parallel ? "parallel" : "sequentiell"}, Pause zwischen Routen: ${Math.round(routeGapMin)} Min`
  };
}
