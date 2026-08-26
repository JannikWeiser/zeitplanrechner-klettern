const SPEED_DUEL_ROUND_NAMES = { 32: "Runde der letzten 32", 16: "Achtelfinale", 8: "Viertelfinale", 4: "Halbfinale" };

// Klassischer 1-gegen-1 K.o.-Baum (Speed2, Team-Speed): pro Runde halbiert sich das
// Feld, die letzten beiden Runden liefern Finale + kleines Finale (Art. 2.5). "level"
// = Teilnehmerzahl beim Einstieg in die Runde, dient dem Verzahnen mehrerer Kategorien
// (z.B. Achtelfinale W direkt gefolgt von Achtelfinale M, siehe calcSpeedFinal).
function buildDuelBracket(finalistCount) {
  const rounds = [];
  let n = finalistCount;
  while (n > 2) {
    rounds.push({ level: n, label: SPEED_DUEL_ROUND_NAMES[n] || `Runde der letzten ${n}`, races: n / 2 });
    n = n / 2;
  }
  rounds.push({ level: 2, label: "Finale & kleines Finale", races: 2 });
  return rounds;
}

// Speed4 ("modifizierter" K.o.): pro Lauf zu 4 kommen die schnellsten 2 weiter,
// letzter Lauf zu 4 entscheidet direkt über Platz 1-4 (Art. 2.6). Vereinfachtes Modell.
function buildQuadBracket(finalistCount) {
  const rounds = [];
  let n = finalistCount;
  while (n > 4) {
    const races = n / 4;
    rounds.push({ level: n, label: `Runde der letzten ${n}`, races });
    n = races * 2;
  }
  rounds.push({ level: 4, label: "Finale (4er-Lauf)", races: 1 });
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

// Ältere gespeicherte Runden hatten finalistCount/mode direkt auf params statt einer
// categories-Liste - hier einmalig in die neue Form umhängen, statt eine Migration zu bauen.
function normalizeSpeedFinalParams(params) {
  if (params.categories) return params.categories;
  return [{ name: "Kategorie 1", finalistCount: params.finalistCount || 16, mode: params.mode || "duel" }];
}

// Mehrere Kategorien im Finale werden Runde für Runde verzahnt statt nacheinander
// komplett abgearbeitet (z.B. Achtelfinale W, Achtelfinale M, Viertelfinale W, ...).
// Kategorien mit unterschiedlicher Finalist:innenzahl werden über "level" (Teilnehmerzahl
// beim Rundenstart) synchronisiert - eine Kategorie ohne Runde auf einem Level pausiert
// dort einfach, bis die anderen so weit sind.
function calcSpeedFinal(params) {
  const { raceTimeMin, minGapMin } = params;
  const categories = normalizeSpeedFinalParams(params);
  const raceSlot = Math.max(raceTimeMin, minGapMin || 0);

  const catBrackets = categories.map(cat => ({
    name: cat.name,
    rounds: cat.mode === "quad" ? buildQuadBracket(cat.finalistCount) : buildDuelBracket(cat.finalistCount)
  }));
  const levels = [...new Set(catBrackets.flatMap(c => c.rounds.map(r => r.level)))].sort((a, b) => b - a);

  const slots = [];
  let raceIndex = 0;
  levels.forEach(level => {
    catBrackets.forEach(cat => {
      const round = cat.rounds.find(r => r.level === level);
      if (!round) return;
      for (let i = 0; i < round.races; i++) {
        slots.push({
          label: `${cat.name} – ${round.label} – Race ${i + 1}`,
          group: `${cat.name} – ${round.label}`,
          startOffsetMin: raceIndex * raceSlot,
          endOffsetMin: raceIndex * raceSlot + raceTimeMin
        });
        raceIndex++;
      }
    });
  });

  return {
    durationMin: raceIndex * raceSlot,
    slots,
    info: `${categories.length} Kategorie(n) verzahnt, ${raceIndex} Races insgesamt, min. ${minGapMin} Min zwischen Races`
  };
}
