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

// Pro Race starten immer 2 Athlet:innen gleichzeitig (Lane A + Lane B), daher ist die
// Anzahl geplanter Race-Slots nur halb so groß wie die Summe aller Einzel-Läufe.
function calcSpeedQuali(params) {
  const { starters, runsPerAthlete, timePerRunMin } = params;
  const totalRuns = starters * runsPerAthlete;
  const totalRaces = Math.ceil(totalRuns / 2);
  const slots = [];
  for (let i = 0; i < totalRaces; i++) {
    slots.push({
      label: `Race ${i + 1} (2 Athlet:innen)`,
      group: "Quali",
      startOffsetMin: i * timePerRunMin,
      endOffsetMin: (i + 1) * timePerRunMin
    });
  }
  return {
    durationMin: totalRaces * timePerRunMin,
    slots,
    info: `${starters} Starter:innen × ${runsPerAthlete} Läufe = ${totalRuns} Einzelläufe, je 2 gleichzeitig an der Wand = ${totalRaces} Races`
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
//
// "Mindestpause zwischen Races" ist die Erholzeit EINES Athlet:in zwischen zwei eigenen
// Läufen, nicht der Takt zwischen zwei beliebigen Races an der Wand - während ein:e
// Athlet:in pausiert, laufen andere Paarungen ganz normal weiter. Races werden daher im
// Takt von raceTimeMin ohne künstliche Streckung geplant; die Mindestpause wird
// nachträglich als Plausibilitätscheck ausgewertet: pro Kategorie wird der Abstand
// zwischen dem Ende ihres letzten Race auf einem Level und dem Start ihres ersten Race
// auf dem nächsten Level ermittelt (Worst Case: Athlet:in läuft zuletzt auf Level L und
// zuerst auf Level L').
function calcSpeedFinal(params) {
  const { raceTimeMin, minGapMin } = params;
  const categories = normalizeSpeedFinalParams(params);

  const catBrackets = categories.map(cat => ({
    name: cat.name,
    rounds: cat.mode === "quad" ? buildQuadBracket(cat.finalistCount) : buildDuelBracket(cat.finalistCount)
  }));
  const levels = [...new Set(catBrackets.flatMap(c => c.rounds.map(r => r.level)))].sort((a, b) => b - a);

  const slots = [];
  const catLevelSpans = {};
  let raceIndex = 0;
  levels.forEach(level => {
    catBrackets.forEach(cat => {
      const round = cat.rounds.find(r => r.level === level);
      if (!round) return;
      const spanStart = raceIndex * raceTimeMin;
      for (let i = 0; i < round.races; i++) {
        slots.push({
          label: `${cat.name} – ${round.label} – Race ${i + 1}`,
          group: `${cat.name} – ${round.label}`,
          startOffsetMin: raceIndex * raceTimeMin,
          endOffsetMin: raceIndex * raceTimeMin + raceTimeMin
        });
        raceIndex++;
      }
      const spanEnd = raceIndex * raceTimeMin;
      (catLevelSpans[cat.name] = catLevelSpans[cat.name] || []).push({ level, startOffsetMin: spanStart, endOffsetMin: spanEnd });
    });
  });

  let minPause = Infinity;
  Object.values(catLevelSpans).forEach(spans => {
    spans.sort((a, b) => b.level - a.level);
    for (let k = 0; k < spans.length - 1; k++) {
      const gap = spans[k + 1].startOffsetMin - spans[k].endOffsetMin;
      if (gap < minPause) minPause = gap;
    }
  });
  const pauseOk = !isFinite(minPause) || minPause >= minGapMin;

  return {
    durationMin: raceIndex * raceTimeMin,
    slots,
    minPause: isFinite(minPause) ? minPause : null,
    warning: pauseOk ? null : `Kürzeste Pause für eine:n Athlet:in zwischen zwei eigenen Läufen beträgt nur ${Math.round(minPause)} Min (Ziel: mind. ${minGapMin} Min). Reihenfolge der Kategorien/Paarungen anpassen oder mehr Kategorien parallel verzahnen, um mehr Pufferzeit zu erzeugen.`,
    info: `${categories.length} Kategorie(n) verzahnt, ${raceIndex} Races à ${raceTimeMin} Min` + (isFinite(minPause) ? `, kürzeste Athlet:innen-Pause: ${Math.round(minPause)} Min` : "")
  };
}
