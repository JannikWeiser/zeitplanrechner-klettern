// Regelwerk Art. 4.4: mind. 50 Min zwischen Ende des Versuchs auf einer Route und
// Start auf der anderen Route (pro Athlet:in). Fixer Wert, wird automatisch geprüft.
// Reicht die natürliche Rotation nicht aus, wird die fehlende Zeit als echte Pause in
// den Zeitplan eingerechnet (nicht nur als Warnung angezeigt) - alle Wände pausieren
// dafür synchron zwischen den Routen-Durchgängen, damit jede:r Athlet:in mindestens
// 50 Min Pause bekommt.
const LEAD_MIN_ROUTE_GAP_MIN = 50;

function routeLetter(r) {
  return String.fromCharCode(65 + r);
}

// N Routen, parallel: Athlet i (0-indiziert) startet in Gruppe g=i%N (Round-Robin) auf
// Route g und durchläuft danach reihum alle weiteren Routen. Für einen festen "Zyklus-
// Schritt" s belegen alle N Gruppen gleichzeitig N verschiedene Routen (zyklisches
// Lateinquadrat) - dadurch sind alle Wände durchgehend parallel ausgelastet. Die
// natürliche Pause zwischen zwei eigenen Routenversuchen ist konstant (block-1)*climbTimeMin;
// reicht das nicht für die 50-Min-Regel, wird zwischen jedem Zyklus-Schritt eine
// synchrone Pufferpause ergänzt.
function calcLeadParallel(starters, numRoutes, climbTimeMin) {
  const N = numRoutes;
  const block = Math.ceil(starters / N);
  const naturalGapMin = (block - 1) * climbTimeMin;
  const extraPauseMin = Math.max(0, LEAD_MIN_ROUTE_GAP_MIN - naturalGapMin);

  const slots = [];
  for (let i = 0; i < starters; i++) {
    const g = i % N;
    const p = Math.floor(i / N);
    for (let s = 0; s < N; s++) {
      const route = (g + s) % N;
      const startOffsetMin = (s * block + p) * climbTimeMin + s * extraPauseMin;
      slots.push({
        label: `Athlet ${i + 1} – Route ${routeLetter(route)}`,
        group: `Route ${routeLetter(route)}`,
        startOffsetMin,
        endOffsetMin: startOffsetMin + climbTimeMin
      });
    }
  }

  if (extraPauseMin > 0) {
    for (let s = 0; s < N - 1; s++) {
      const pauseStart = (s + 1) * block * climbTimeMin + s * extraPauseMin;
      slots.push({
        label: `Pause (Puffer für 50-Min-Regel)`,
        group: "Pause",
        startOffsetMin: pauseStart,
        endOffsetMin: pauseStart + extraPauseMin
      });
    }
  }

  return { slots, routeGapMin: naturalGapMin + extraPauseMin, extraPauseMin };
}

// N Routen, sequentiell: Route 1 wird vom gesamten Feld komplett geklettert, dann erst
// startet Route 2 usw. Die natürliche Pause zwischen zwei eigenen Routenversuchen ist für
// alle Athlet:innen konstant (starters-1)*climbTimeMin (der/die letzte Kletternde einer
// Route hat sonst die kürzeste Pause); reicht das nicht, wird zwischen den Routen-
// Durchgängen eine Pufferpause ergänzt.
function calcLeadSequential(starters, numRoutes, climbTimeMin) {
  const naturalGapMin = (starters - 1) * climbTimeMin;
  const extraPauseMin = Math.max(0, LEAD_MIN_ROUTE_GAP_MIN - naturalGapMin);

  const slots = [];
  for (let r = 0; r < numRoutes; r++) {
    for (let i = 0; i < starters; i++) {
      const startOffsetMin = (r * starters + i) * climbTimeMin + r * extraPauseMin;
      slots.push({
        label: `Athlet ${i + 1} – Route ${routeLetter(r)}`,
        group: `Route ${routeLetter(r)}`,
        startOffsetMin,
        endOffsetMin: startOffsetMin + climbTimeMin
      });
    }
  }

  if (extraPauseMin > 0) {
    for (let r = 0; r < numRoutes - 1; r++) {
      const pauseStart = (r + 1) * starters * climbTimeMin + r * extraPauseMin;
      slots.push({
        label: `Pause (Puffer für 50-Min-Regel)`,
        group: "Pause",
        startOffsetMin: pauseStart,
        endOffsetMin: pauseStart + extraPauseMin
      });
    }
  }

  return { slots, routeGapMin: naturalGapMin + extraPauseMin, extraPauseMin };
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

  const { slots, routeGapMin, extraPauseMin } = parallel
    ? calcLeadParallel(starters, N, climbTimeMin)
    : calcLeadSequential(starters, N, climbTimeMin);

  const durationMin = Math.max(...slots.map(s => s.endOffsetMin));
  return {
    durationMin,
    slots,
    routeGapMin,
    info: extraPauseMin > 0
      ? `${N} Routen ${parallel ? "parallel" : "sequentiell"}, natürliche Pause reichte nicht für die 50-Min-Regel - ${Math.round(extraPauseMin)} Min Pufferpause automatisch eingerechnet`
      : `${N} Routen ${parallel ? "parallel" : "sequentiell"}, Pause zwischen Routen: ${Math.round(routeGapMin)} Min`
  };
}
