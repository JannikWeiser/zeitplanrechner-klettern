const SPEED_DUEL_ROUND_NAMES = { 32: "Runde der letzten 32", 16: "Achtelfinale", 8: "Viertelfinale", 4: "Halbfinale" };

// Klassischer 1-gegen-1 K.o.-Baum (Speed2, Team-Speed): pro Runde halbiert sich das
// Feld, die letzten beiden Runden liefern Finale + kleines Finale (Art. 2.5).
function buildDuelBracket(finalistCount) {
  const rounds = [];
  let n = finalistCount;
  while (n > 2) {
    rounds.push({ label: SPEED_DUEL_ROUND_NAMES[n] || `Runde der letzten ${n}`, races: n / 2 });
    n = n / 2;
  }
  rounds.push({ label: "Finale & kleines Finale", races: 2 });
  return rounds;
}

// Speed4 ("modifizierter" K.o.): pro Lauf zu 4 kommen die schnellsten 2 weiter,
// letzter Lauf zu 4 entscheidet direkt über Platz 1-4 (Art. 2.6). Vereinfachtes Modell.
function buildQuadBracket(finalistCount) {
  const rounds = [];
  let n = finalistCount;
  while (n > 4) {
    const races = n / 4;
    rounds.push({ label: `Runde der letzten ${n}`, races });
    n = races * 2;
  }
  rounds.push({ label: "Finale (4er-Lauf)", races: 1 });
  return rounds;
}

function calcSpeedQuali(params) {
  const { starters, runsPerAthlete, timePerRunMin } = params;
  const totalRuns = starters * runsPerAthlete;
  const slots = [];
  for (let i = 0; i < totalRuns; i++) {
    slots.push({
      label: `Lauf ${i + 1}`,
      group: "Quali",
      startOffsetMin: i * timePerRunMin,
      endOffsetMin: (i + 1) * timePerRunMin
    });
  }
  return {
    durationMin: totalRuns * timePerRunMin,
    slots,
    info: `${starters} Starter:innen × ${runsPerAthlete} Läufe = ${totalRuns} Läufe`
  };
}

function calcSpeedFinal(params) {
  const { finalistCount, mode, raceTimeMin, minGapMin } = params;
  const raceSlot = Math.max(raceTimeMin, minGapMin || 0);
  const rounds = mode === "quad" ? buildQuadBracket(finalistCount) : buildDuelBracket(finalistCount);

  const slots = [];
  let raceIndex = 0;
  rounds.forEach(round => {
    for (let i = 0; i < round.races; i++) {
      slots.push({
        label: `${round.label} – Race ${i + 1}`,
        group: round.label,
        startOffsetMin: raceIndex * raceSlot,
        endOffsetMin: raceIndex * raceSlot + raceTimeMin
      });
      raceIndex++;
    }
  });

  return {
    durationMin: raceIndex * raceSlot,
    slots,
    info: `${finalistCount} Finalist:innen, ${raceIndex} Races, min. ${minGapMin} Min zwischen Races`
  };
}
