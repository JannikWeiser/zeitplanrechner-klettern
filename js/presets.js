// Vorbelegte Startwerte je Disziplin/Rundentyp, angelehnt an DAV-Wettkampfbestimmungen
// (Stand Baustelle 04.03.2026) + IFSC-übliche Werte. Alle Werte sind in der Runde frei
// überschreibbar - es sind nur sinnvolle Startpunkte, keine harten Vorgaben der App.

const PRESETS = {
  boulder: {
    quali: {
      label: "Bouldern – Qualifikation",
      params: { starters: 20, numBoulders: 5, climbTimeMin: 5, transitionSec: 15, numGroups: 2, offsetIntervals: 2 }
    },
    semi: {
      label: "Bouldern – Halbfinale",
      params: { starters: 24, numBoulders: 4, climbTimeMin: 5, transitionSec: 15, numGroups: 2, offsetIntervals: 2 }
    },
    final: {
      label: "Bouldern – Finale",
      params: { starters: 8, numBoulders: 4, climbTimeMin: 4, transitionSec: 15, numGroups: 2, offsetIntervals: 2 }
    }
  },
  lead: {
    quali: {
      label: "Lead – Qualifikation",
      params: { starters: 22, numRoutes: 2, climbTimeMin: 5 }
    },
    semi: {
      label: "Lead – Halbfinale",
      params: { starters: 24, numRoutes: 1, climbTimeMin: 5 }
    },
    final: {
      label: "Lead – Finale",
      params: { starters: 8, numRoutes: 1, climbTimeMin: 5 }
    }
  },
  speed: {
    quali: {
      label: "Speed – Qualifikation",
      params: { kind: "quali", starters: 30, runsPerAthlete: 2, timePerRunMin: 1.5 }
    },
    final: {
      label: "Speed – Finale (K.-o.)",
      params: {
        kind: "final",
        raceTimeMin: 2,
        minGapMin: 5,
        categories: [{ id: uid(), name: "Kategorie 1", finalistCount: 16, mode: "duel" }]
      }
    }
  }
};

function getPreset(discipline, roundTypeKey) {
  const group = PRESETS[discipline];
  return group[roundTypeKey] || group[Object.keys(group)[0]];
}
