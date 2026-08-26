let selectedRoundId = null;

const FIELD_DEFS = {
  boulder: [
    { key: "starters", label: "Starter:innen", type: "number" },
    { key: "numBoulders", label: "Anzahl Boulder", type: "number" },
    { key: "climbTimeMin", label: "Boulderzeit (Min)", type: "number", step: 0.5 },
    { key: "transitionSec", label: "Wechselzeit (Sek)", type: "number" },
    { key: "numGroups", label: "Anzahl Gruppen", type: "number", hint: "Rotationslogik ist frei wählbar (siehe Hinweis unten)" },
    { key: "offsetIntervals", label: "Versatz zwischen Gruppen (Intervalle)", type: "number" }
  ],
  lead: [
    { key: "starters", label: "Starter:innen", type: "number" },
    { key: "numRoutes", label: "Anzahl Routen", type: "select", options: [[1, "1 Route"], [2, "2 Routen (parallel)"]] },
    { key: "climbTimeMin", label: "Kletterzeit (Min)", type: "number", step: 0.5 },
    { key: "minGapMin", label: "Mindestdauer Runde (Min)", type: "number", hint: "Regelwerk: min. 50 Min zwischen Routenwechsel" }
  ],
  speed_quali: [
    { key: "starters", label: "Starter:innen", type: "number" },
    { key: "runsPerAthlete", label: "Läufe pro Athlet:in", type: "number" },
    { key: "timePerRunMin", label: "Zeit pro Lauf (Min)", type: "number", step: 0.25 }
  ],
  speed_final: [
    { key: "finalistCount", label: "Anzahl Finalist:innen", type: "select", options: [[4, "4"], [8, "8"], [16, "16"], [32, "32"]] },
    { key: "mode", label: "Format", type: "select", options: [["duel", "Speed2 / Team (1 vs 1)"], ["quad", "Speed4 (4er-Läufe)"]] },
    { key: "raceTimeMin", label: "Zeit pro Race (Min)", type: "number", step: 0.5 },
    { key: "minGapMin", label: "Mindestpause zwischen Races (Min)", type: "number", hint: "Regelwerk: min. 5 Min" }
  ]
};

function fieldSetFor(round) {
  if (round.discipline === "speed") return FIELD_DEFS[round.params.kind === "final" ? "speed_final" : "speed_quali"];
  return FIELD_DEFS[round.discipline];
}

function calcRound(round) {
  if (round.discipline === "boulder") return calcBoulder(round.params);
  if (round.discipline === "lead") return calcLead(round.params);
  if (round.discipline === "speed") {
    return round.params.kind === "final" ? calcSpeedFinal(round.params) : calcSpeedQuali(round.params);
  }
  return { durationMin: 0, slots: [], info: "" };
}

function computeAll() {
  const event = Store.event;
  const computed = event.rounds.map(round => {
    const result = calcRound(round);
    const startMin = timeToMinutes(round.startTime);
    return { round, result, startMin, endMin: startMin + result.durationMin, conflict: false };
  });

  for (let i = 0; i < computed.length; i++) {
    for (let j = i + 1; j < computed.length; j++) {
      const a = computed[i], b = computed[j];
      if (a.round.dayId !== b.round.dayId) continue;
      if (a.startMin < b.endMin && b.startMin < a.endMin) {
        a.conflict = true;
        b.conflict = true;
      }
    }
  }
  return computed;
}

function renderAll() {
  const computed = computeAll();
  renderDays();
  renderRoundList(computed);
  renderEditor(computed);
  renderGantt(document.getElementById("ganttContainer"), Store.event, computed);
}

function renderDays() {
  const list = document.getElementById("daysList");
  list.innerHTML = "";
  Store.event.days.forEach(day => {
    const chip = document.createElement("div");
    chip.className = "day-chip";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = day.label;
    labelInput.style.width = "70px";
    labelInput.addEventListener("input", () => { day.label = labelInput.value; Store.save(); renderAll(); });

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = day.date;
    dateInput.addEventListener("input", () => { day.date = dateInput.value; Store.save(); renderAll(); });

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.title = "Tag entfernen";
    removeBtn.addEventListener("click", () => { Store.removeDay(day.id); renderAll(); });

    chip.appendChild(labelInput);
    chip.appendChild(dateInput);
    if (Store.event.days.length > 1) chip.appendChild(removeBtn);
    list.appendChild(chip);
  });
}

function renderRoundList(computed) {
  const ul = document.getElementById("roundList");
  ul.innerHTML = "";
  const byId = {};
  computed.forEach(c => (byId[c.round.id] = c));

  Store.event.rounds.forEach(round => {
    const c = byId[round.id];
    const li = document.createElement("li");
    li.className = "round-item" + (round.id === selectedRoundId ? " active" : "") + (c.conflict ? " conflict" : "");

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = disciplineColor(round.discipline);

    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("div");
    name.className = "rname";
    name.textContent = round.name;
    const time = document.createElement("div");
    time.className = "rtime";
    time.textContent = `${minutesToTime(c.startMin)}–${minutesToTime(c.endMin)}`;
    info.appendChild(name);
    info.appendChild(time);

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "🗑";
    del.title = "Runde löschen";
    del.addEventListener("click", e => {
      e.stopPropagation();
      Store.removeRound(round.id);
      if (selectedRoundId === round.id) selectedRoundId = null;
      renderAll();
    });

    li.appendChild(dot);
    li.appendChild(info);
    li.appendChild(del);
    li.addEventListener("click", () => { selectedRoundId = round.id; renderAll(); });

    ul.appendChild(li);
  });
}

function disciplineColor(discipline) {
  return { boulder: "#d9731d", lead: "#2f6fed", speed: "#1f9d55" }[discipline];
}

function renderEditor(computed) {
  const panel = document.getElementById("editorPanel");
  panel.innerHTML = "";

  const round = Store.getRound(selectedRoundId);
  if (!round) {
    panel.innerHTML = '<div class="editor-empty">Wähle links eine Runde aus oder lege eine neue an.</div>';
    return;
  }
  const c = computed.find(x => x.round.id === round.id);

  const header = document.createElement("div");
  header.className = "editor-header";
  const nameInput = document.createElement("input");
  nameInput.className = "rname-input";
  nameInput.value = round.name;
  nameInput.addEventListener("input", () => { round.name = nameInput.value; Store.save(); renderAll(); });
  const summary = document.createElement("div");
  summary.className = "editor-summary";
  summary.innerHTML = `Dauer: <strong>${formatDuration(c.result.durationMin)}</strong> &nbsp;·&nbsp; Ende: <strong>${minutesToTime(c.endMin)}</strong> Uhr`;
  header.appendChild(nameInput);
  header.appendChild(summary);
  panel.appendChild(header);

  if (c.conflict) {
    const warn = document.createElement("div");
    warn.className = "warning-box";
    warn.textContent = "⚠ Diese Runde überschneidet sich zeitlich mit einer anderen Runde am selben Tag.";
    panel.appendChild(warn);
  }

  const grid = document.createElement("div");
  grid.className = "form-grid";

  grid.appendChild(buildField("Tag", "select",
    Store.event.days.map(d => [d.id, `${d.label} (${formatDateDe(d.date)})`]),
    round.dayId, val => { round.dayId = val; Store.save(); renderAll(); }));

  grid.appendChild(buildField("Startzeit", "time", null, round.startTime,
    val => { round.startTime = val; Store.save(); renderAll(); }));

  if (round.discipline === "speed") {
    grid.appendChild(buildField("Rundenart", "select",
      [["quali", "Qualifikation (Läufe)"], ["final", "Finale (K.-o.)"]],
      round.params.kind,
      val => {
        const preset = getPreset("speed", val);
        round.params = JSON.parse(JSON.stringify(preset.params));
        round.name = preset.label;
        Store.save();
        renderAll();
      }));
  }

  fieldSetFor(round).forEach(def => {
    const el = buildField(def.label, def.type, def.options, round.params[def.key], val => {
      round.params[def.key] = def.type === "number" ? Number(val) : (def.type === "select" && /^\d+$/.test(String(val)) ? Number(val) : val);
      Store.save();
      renderAll();
    }, def.step, def.hint);
    grid.appendChild(el);
  });

  panel.appendChild(grid);

  if (round.discipline === "boulder") {
    const note = document.createElement("div");
    note.className = "warning-box";
    note.textContent = "Hinweis: Das Regelwerk schreibt Kletterzeit (5/4 Min) und Wechselzeit (15 Sek) fest, legt die Gruppen-/Rotationslogik aber nicht fest. \"Anzahl Gruppen\" und \"Versatz\" bilden ab, nach wie vielen Intervallen die nächste Gruppe an Boulder 1 startet - passe beides an eure tatsächliche Aufteilung an.";
    panel.appendChild(note);
  }

  const slotsWrap = document.createElement("div");
  slotsWrap.className = "slots-table-wrap";
  const table = document.createElement("table");
  table.className = "slots-table";
  table.innerHTML = "<thead><tr><th>Slot</th><th>Gruppe</th><th>Start</th><th>Ende</th></tr></thead>";
  const tbody = document.createElement("tbody");
  c.result.slots.forEach(s => {
    const tr = document.createElement("tr");
    const start = c.startMin + s.startOffsetMin;
    const end = c.startMin + s.endOffsetMin;
    tr.innerHTML = `<td>${s.label}</td><td>${s.group}</td><td>${minutesToTime(start)}</td><td>${minutesToTime(end)}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  slotsWrap.appendChild(table);
  panel.appendChild(slotsWrap);
}

function buildField(label, type, options, value, onChange, step, hint) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  wrap.appendChild(lbl);

  let input;
  if (type === "select") {
    input = document.createElement("select");
    options.forEach(([val, text]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = text;
      if (String(val) === String(value)) opt.selected = true;
      input.appendChild(opt);
    });
  } else {
    input = document.createElement("input");
    input.type = type;
    input.value = value;
    if (step) input.step = step;
  }
  input.addEventListener("input", () => onChange(input.value));
  wrap.appendChild(input);

  if (hint) {
    const h = document.createElement("div");
    h.className = "hint";
    h.textContent = hint;
    wrap.appendChild(h);
  }
  return wrap;
}

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} Min`;
  return `${h} Std ${m} Min`;
}

function init() {
  Store.load();

  document.getElementById("eventName").value = Store.event.name;
  document.getElementById("eventName").addEventListener("input", e => {
    Store.event.name = e.target.value;
    Store.save();
  });

  document.getElementById("btnAddDay").addEventListener("click", () => { Store.addDay(); renderAll(); });

  document.querySelectorAll(".btn-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const discipline = btn.dataset.discipline;
      const round = Store.addRound(discipline, "quali");
      selectedRoundId = round.id;
      renderAll();
    });
  });

  document.getElementById("btnExport").addEventListener("click", () => {
    const blob = new Blob([Store.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${Store.event.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btnImport").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJson(reader.result);
        selectedRoundId = null;
        renderAll();
      } catch (err) {
        alert("Import fehlgeschlagen: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    if (confirm("Wirklich das gesamte Event löschen?")) {
      Store.reset();
      selectedRoundId = null;
      renderAll();
    }
  });

  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
