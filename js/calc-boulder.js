// Kontinuierliches Einzel-Rotationsmodell: pro Intervall betritt 1 neue:r Athlet:in
// Boulder 1 (durchgehender Zulauf, kein Gruppen-Batching). Athlet:in Nr. i (Startreihenfolge)
// ist an Boulder b im Intervall i + (b-1)*R, wobei R = restIntervals der Versatz zwischen
// zwei eigenen Boulder-Versuchen ist (R=2 => 1 Kletter-Intervall + 1 Intervall Wechsel/Pause,
// bevor der/die nächste Boulder betreten wird). Reproduziert exakt das vorgegebene Beispiel:
// Athlet 1: Boulder1@1, Boulder2@3, Boulder3@5 ...
//
// Bei "2 Sets" (crossoverVisitIndex gesetzt) braucht der Wechsel von Set A zu Set B
// mindestens BOULDER_MIN_SET_GAP_INTERVALS Intervalle Pause (fixer Mindestwert, analog zur
// 50-Min-Regel bei Lead). Reicht der normale Versatz R dafür nicht, wird die fehlende Zeit
// als echte Pause eingerechnet und als eigener "Pause"-Slot ausgewiesen.
const BOULDER_MIN_SET_GAP_INTERVALS = 3;

function scheduleContinuousGroup(athleteNumbers, boulderOrder, restIntervals, crossoverVisitIndex, intervalMin, climbTimeMin, groupLabel, occupancy) {
  const slots = [];
  let collisions = 0;
  athleteNumbers.forEach((athleteNum, idx) => {
    const entryOrder = idx + 1;
    let interval = entryOrder;
    boulderOrder.forEach((boulderNum, visit) => {
      if (visit > 0) {
        const isCrossover = visit === crossoverVisitIndex;
        const gap = isCrossover ? Math.max(restIntervals, BOULDER_MIN_SET_GAP_INTERVALS) : restIntervals;
        const prevEndOffsetMin = (interval - 1) * intervalMin + climbTimeMin;
        interval += gap;
        if (isCrossover && gap > restIntervals) {
          slots.push({
            label: `Athlet ${athleteNum} – Pause (Set-Wechsel)`,
            group: groupLabel,
            startOffsetMin: prevEndOffsetMin,
            endOffsetMin: (interval - 1) * intervalMin
          });
        }
      }
      const startOffsetMin = (interval - 1) * intervalMin;
      slots.push({
        label: `Athlet ${athleteNum} – Boulder ${boulderNum}`,
        group: groupLabel,
        startOffsetMin,
        endOffsetMin: startOffsetMin + climbTimeMin
      });
      const key = `${boulderNum}:${interval}`;
      if (occupancy.has(key)) collisions++;
      occupancy.set(key, athleteNum);
    });
  });
  return { slots, collisions };
}

// "2 Sets" spiegelt den Fall, dass sich das Feld in zwei physische Zonen aufteilt, die
// gleichzeitig starten (Set A: die ersten Boulder, Set B: die restlichen) und nach dem
// eigenen Set-Durchlauf ins jeweils andere Set wechseln. Bei ungerader Boulderzahl bekommt
// Set A den einen Boulder mehr (z.B. 5 Boulder -> Set A: 1-3, Set B: 4-5). Beide Gruppen
// laufen unabhängig nach obigem Modell; anschließend wird geprüft, ob sich beim Wechsel
// Belegungen überschneiden (zu wenig Versatz für die Feldgröße).
function calcBoulder(params) {
  const { starters, numBoulders, climbTimeMin, transitionSec, restIntervals, numSets } = params;
  const intervalMin = climbTimeMin + transitionSec / 60;
  const R = Math.max(1, restIntervals || 2);
  const useSets = numSets === 2;
  const occupancy = new Map();

  let slots = [];
  let collisions = 0;

  if (!useSets) {
    const boulderOrder = Array.from({ length: numBoulders }, (_, k) => k + 1);
    const athletes = Array.from({ length: starters }, (_, k) => k + 1);
    const res = scheduleContinuousGroup(athletes, boulderOrder, R, null, intervalMin, climbTimeMin, "Athlet:innen", occupancy);
    slots = res.slots;
    collisions = res.collisions;
  } else {
    const half = Math.ceil(starters / 2);
    const setASize = Math.ceil(numBoulders / 2);
    const setBSize = numBoulders - setASize;
    const groupA = Array.from({ length: half }, (_, k) => k + 1);
    const groupB = Array.from({ length: starters - half }, (_, k) => k + 1 + half);
    const orderA = Array.from({ length: numBoulders }, (_, k) => k + 1);
    const orderB = Array.from({ length: numBoulders }, (_, k) => ((k + setASize) % numBoulders) + 1);
    const resA = scheduleContinuousGroup(groupA, orderA, R, setASize, intervalMin, climbTimeMin, "Set A", occupancy);
    const resB = scheduleContinuousGroup(groupB, orderB, R, setBSize, intervalMin, climbTimeMin, "Set B", occupancy);
    slots = resA.slots.concat(resB.slots);
    collisions = resA.collisions + resB.collisions;
  }

  const durationMin = Math.max(...slots.map(s => s.endOffsetMin));
  const warning = collisions > 0
    ? `${collisions} Belegungsüberschneidung(en) beim Set-Wechsel erkannt: Der Versatz (${R} Intervalle) reicht bei dieser Starterzahl/Boulderzahl nicht aus, um Set-A- und Set-B-Athlet:innen kollisionsfrei zu wechseln. Versatz erhöhen oder Gruppengröße anpassen.`
    : null;

  return {
    durationMin,
    slots,
    warning,
    info: `${useSets ? "2 Sets, " : ""}${numBoulders} Boulder, Versatz ${R} Intervalle${collisions ? `, ⚠ ${collisions} Kollision(en)` : ""}`
  };
}
