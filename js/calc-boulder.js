// Bouldern: Athleten werden in numGroups Gruppen aufgeteilt, die versetzt um
// offsetIntervals Intervalle durch alle Boulder rotieren (Reihenfolge Boulder 1..N,
// ohne Zwischenpause innerhalb einer Gruppe). Die Rotationslogik selbst ist laut
// Regelwerk nicht vorgeschrieben - offsetIntervals/numGroups sind frei einstellbar.
function calcBoulder(params) {
  const { starters, numBoulders, climbTimeMin, transitionSec, numGroups, offsetIntervals } = params;
  const intervalMin = climbTimeMin + transitionSec / 60;
  const groupSize = Math.ceil(starters / numGroups);

  const slots = [];
  for (let g = 0; g < numGroups; g++) {
    const groupStartInterval = g * offsetIntervals;
    for (let b = 0; b < numBoulders; b++) {
      const intervalIndex = groupStartInterval + b;
      const startOffsetMin = intervalIndex * intervalMin;
      slots.push({
        label: `Gruppe ${g + 1} – Boulder ${b + 1}`,
        group: `Gruppe ${g + 1}`,
        startOffsetMin,
        endOffsetMin: startOffsetMin + climbTimeMin
      });
    }
  }

  const lastIntervalIndex = (numGroups - 1) * offsetIntervals + numBoulders - 1;
  const durationMin = (lastIntervalIndex + 1) * intervalMin;

  return {
    durationMin,
    slots,
    info: `${numGroups} Gruppen à ca. ${groupSize} Athlet:innen, ${numBoulders} Boulder, Intervall ${intervalMin.toFixed(2)} Min`
  };
}
