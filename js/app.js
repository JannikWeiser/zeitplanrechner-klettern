let selectedRoundId = null;
let focusNameOnRender = false;

const FIELD_DEFS = {
  boulder: [
    { key: "starters", label: "Starter:innen", type: "number" },
    { key: "numBoulders", label: "Anzahl Boulder", type: "number" },
    { key: "climbTimeMin", label: "Boulderzeit (Min)", type: "number", step: 0.5 },
    { key: "transitionSec", label: "Wechselzeit (Sek)", type: "number" },
    { key: "restIntervals", label: "Versatz zwischen eigenen Boulder-Versuchen (Intervalle)", type: "number", hint: "Rotationslogik ist frei wählbar (siehe Hinweis unten)" },
    { key: "numSets", label: "Anzahl Sets (physische Zonen)", type: "select", options: [[1, "1 Set"], [2, "2 Sets (Feld startet in 2 Zonen)"]] }
  ],
  lead: [
    { key: "starters", label: "Starter:innen", type: "number" },
    { key: "numRoutes", label: "Anzahl Routen", type: "number" },
    { key: "parallel", label: "Parallel geklettert", type: "checkbox" },
    { key: "climbTimeMin", label: "Kletterzeit (Min, Rechenwert)", type: "number", step: 0.5, hint: "Regelwerk-Maximum 6 Min; 5 Min ist der realistische Durchschnitt fürs Timing" }
  ],
  speed_quali: [
    { key: "starters", label: "Starter:innen", type: "number" },
    { key: "runsPerAthlete", label: "Läufe pro Athlet:in", type: "number" },
    { key: "timePerRunMin", label: "Zeit pro Lauf (Min)", type: "number", step: 0.25 }
  ],
  speed_final: [
    { key: "raceTimeMin", label: "Zeit pro Race (Min)", type: "number", step: 0.5 },
    { key: "minGapMin", label: "Mindestpause pro Athlet:in zwischen eigenen Läufen (Min)", type: "number", hint: "Races selbst laufen im Takt von \"Zeit pro Race\" durch - andere Paarungen laufen ja weiter, während eine:r pausiert. Regelwerk-Richtwert: 5 Min" }
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

// Überschneidende Zeiten sind erwünscht (mehrere Kategorien/Wände laufen bewusst
// parallel), daher gibt es hier bewusst keine Konflikterkennung mehr.
function computeAll() {
  const event = Store.event;
  return event.rounds.map(round => {
    const result = calcRound(round);
    const startMin = timeToMinutes(round.startTime);
    return { round, result, startMin, endMin: startMin + result.durationMin };
  });
}

function renderAll() {
  const computed = computeAll();
  renderDays();
  renderRoundList(computed);
  renderEditor(computed);
  renderGantt(document.getElementById("ganttContainer"), Store.event, computed);
  document.getElementById("zoomLabel").textContent = Math.round((ganttZoom / GANTT_ZOOM_DEFAULT) * 100) + "%";
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
    bindCommit(labelInput, () => { day.label = labelInput.value; Store.save(); renderAll(); });

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = day.date;
    bindCommit(dateInput, () => { day.date = dateInput.value; Store.save(); renderAll(); });

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
    li.className = "round-item" + (round.id === selectedRoundId ? " active" : "");

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
  bindCommit(nameInput, () => { round.name = nameInput.value; Store.save(); renderAll(); });
  if (focusNameOnRender) {
    focusNameOnRender = false;
    setTimeout(() => { nameInput.focus(); nameInput.select(); }, 0);
  }
  const summary = document.createElement("div");
  summary.className = "editor-summary";
  summary.innerHTML = `Dauer: <strong>${formatDuration(c.result.durationMin)}</strong> &nbsp;·&nbsp; Ende: <strong>${minutesToTime(c.endMin)}</strong> Uhr`;
  header.appendChild(nameInput);
  header.appendChild(summary);
  panel.appendChild(header);

  const roundTypeOptions = Object.keys(PRESETS[round.discipline]).map(key => [key, ROUND_TYPE_LABELS[key] || key]);
  if (roundTypeOptions.length > 1) {
    const kindField = document.createElement("div");
    kindField.className = "form-grid";
    kindField.appendChild(buildField("Rundenart", "select", roundTypeOptions,
      round.discipline === "speed" ? round.params.kind : round.roundType,
      val => {
        const preset = getPreset(round.discipline, val);
        round.params = JSON.parse(JSON.stringify(preset.params));
        round.roundType = val;
        round.name = preset.label;
        Store.save();
        renderAll();
      }));
    panel.appendChild(kindField);
  }

  const grid = document.createElement("div");
  grid.className = "form-grid";

  fieldSetFor(round).forEach(def => {
    const el = buildField(def.label, def.type, def.options, round.params[def.key], val => {
      round.params[def.key] = convertFieldValue(def.type, val);
      Store.save();
      renderAll();
    }, def.step, def.hint);
    grid.appendChild(el);
  });

  panel.appendChild(grid);

  if (round.discipline === "boulder") {
    const note = document.createElement("div");
    note.className = "warning-box";
    note.textContent = "Hinweis: Das Regelwerk schreibt Kletterzeit (5/4 Min) und Wechselzeit (15 Sek) fest, legt die Rotationslogik aber nicht fest. Jede:r Athlet:in betritt Boulder 1 im eigenen Startintervall und wechselt alle \"Versatz\"-Intervalle zum nächsten Boulder - passe das an eure tatsächliche Aufteilung an.";
    panel.appendChild(note);
  }

  if (c.result.warning) {
    const warn = document.createElement("div");
    warn.className = "warning-box";
    warn.textContent = "⚠ " + c.result.warning;
    panel.appendChild(warn);
  }

  if (round.discipline === "speed" && round.params.kind === "final") {
    panel.appendChild(buildCategoryEditor(round));
  }

  const timeGrid = document.createElement("div");
  timeGrid.className = "form-grid";
  timeGrid.appendChild(buildField("Tag", "select",
    Store.event.days.map(d => [d.id, `${d.label} (${formatDateDe(d.date)})`]),
    round.dayId, val => { round.dayId = val; Store.save(); renderAll(); }));
  timeGrid.appendChild(buildField("Startzeit", "time", null, round.startTime,
    val => { round.startTime = val; Store.save(); renderAll(); }));
  panel.appendChild(timeGrid);

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

const SPEED_FINALIST_OPTIONS = [[4, "4"], [8, "8"], [16, "16"], [32, "32"]];
const SPEED_MODE_OPTIONS = [["duel", "Speed2 / Team (1 vs 1)"], ["quad", "Speed4 (4er-Läufe)"]];

// Mehrere Kategorien (z.B. U17w/U17m) werden im Finale rundenweise verzahnt
// (calcSpeedFinal) - hier die Liste editierbar machen: hinzufügen, benennen,
// Finalist:innenzahl + Format je Kategorie einstellen, entfernen.
function buildCategoryEditor(round) {
  const section = document.createElement("div");
  section.className = "category-section";
  const h = document.createElement("h3");
  h.textContent = "Kategorien (werden im Finale rundenweise verzahnt, z. B. Achtelfinale W → Achtelfinale M → Viertelfinale W → …)";
  section.appendChild(h);

  round.params.categories.forEach((cat, idx) => {
    const row = document.createElement("div");
    row.className = "category-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = cat.name;
    bindCommit(nameInput, () => { cat.name = nameInput.value; Store.save(); renderAll(); });

    const countSelect = document.createElement("select");
    SPEED_FINALIST_OPTIONS.forEach(([val, text]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = text;
      if (val === cat.finalistCount) opt.selected = true;
      countSelect.appendChild(opt);
    });
    countSelect.addEventListener("change", () => { cat.finalistCount = Number(countSelect.value); Store.save(); renderAll(); });

    const modeSelect = document.createElement("select");
    SPEED_MODE_OPTIONS.forEach(([val, text]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = text;
      if (val === cat.mode) opt.selected = true;
      modeSelect.appendChild(opt);
    });
    modeSelect.addEventListener("change", () => { cat.mode = modeSelect.value; Store.save(); renderAll(); });

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "🗑";
    del.title = "Kategorie entfernen";
    del.disabled = round.params.categories.length <= 1;
    del.addEventListener("click", () => {
      round.params.categories.splice(idx, 1);
      Store.save();
      renderAll();
    });

    row.appendChild(nameInput);
    row.appendChild(countSelect);
    row.appendChild(modeSelect);
    row.appendChild(del);
    section.appendChild(row);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "btn-small";
  addBtn.textContent = "+ Kategorie hinzufügen";
  addBtn.addEventListener("click", () => {
    round.params.categories.push({
      name: `Kategorie ${round.params.categories.length + 1}`,
      finalistCount: 16,
      mode: "duel"
    });
    Store.save();
    renderAll();
  });
  section.appendChild(addBtn);

  return section;
}

// Re-rendert bei jedem Tastendruck (renderAll baut das ganze Panel neu auf) hätte den
// Fokus ständig verloren und Eingaben abgebrochen (z.B. bei Leerzeichen). Änderungen
// werden daher erst beim Verlassen des Felds (blur) übernommen; Enter löst das gezielt aus.
function bindCommit(input, commit) {
  input.addEventListener("change", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.keyCode === 13 || e.code === "Enter" || e.code === "NumpadEnter") {
      e.preventDefault();
      input.blur();
    }
  });
}

function convertFieldValue(type, rawValue) {
  if (type === "number") return Number(rawValue);
  if (type === "select" && /^\d+$/.test(String(rawValue))) return Number(rawValue);
  return rawValue;
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
    input.addEventListener("change", () => onChange(input.value));
  } else if (type === "checkbox") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!value;
    input.addEventListener("change", () => onChange(input.checked));
  } else {
    input = document.createElement("input");
    input.type = type;
    input.value = value;
    if (step) input.step = step;
    bindCommit(input, () => onChange(input.value));
  }
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

// Jeder Tag soll auf eine eigene A4-Seite passen (page-break-after: page in CSS).
// Damit das bei stark unterschiedlicher Rundenzahl/Zeitspanne pro Tag verlässlich klappt,
// wird jeder .gantt-day-Block vor dem Drucken per CSS "zoom" so herunterskaliert, dass er
// in die nutzbare A4-Querformat-Fläche passt (Detail-Ansichten werden dafür eingeklappt,
// damit die Höhe pro Runde vorhersehbar bleibt).
let printSavedExpanded = null;
const PRINT_PAGE_WIDTH_PX = 1000;
const PRINT_PAGE_HEIGHT_PX = 680;

function preparePrint() {
  printSavedExpanded = new Set(expandedRounds);
  expandedRounds.clear();
  renderAll();
  if (!window.CSS || !CSS.supports("zoom", "1")) return;
  document.querySelectorAll(".gantt-day").forEach(dayEl => {
    dayEl.style.zoom = "1";
    const scale = Math.min(1, PRINT_PAGE_WIDTH_PX / dayEl.scrollWidth, PRINT_PAGE_HEIGHT_PX / dayEl.scrollHeight);
    dayEl.style.zoom = scale;
  });
}

function restoreAfterPrint() {
  document.querySelectorAll(".gantt-day").forEach(dayEl => { dayEl.style.zoom = ""; });
  if (printSavedExpanded) {
    printSavedExpanded.forEach(id => expandedRounds.add(id));
    printSavedExpanded = null;
  }
  renderAll();
}

function init() {
  Store.load();
  window.addEventListener("beforeprint", preparePrint);
  window.addEventListener("afterprint", restoreAfterPrint);

  document.getElementById("eventName").value = Store.event.name;
  document.getElementById("eventName").addEventListener("input", e => {
    Store.event.name = e.target.value;
    Store.save();
  });

  document.getElementById("btnAddDay").addEventListener("click", () => { Store.addDay(); renderAll(); });
  document.getElementById("btnPrintGantt").addEventListener("click", () => window.print());
  document.getElementById("btnZoomIn").addEventListener("click", () => { setGanttZoom(ganttZoom * 1.25); renderAll(); });
  document.getElementById("btnZoomOut").addEventListener("click", () => { setGanttZoom(ganttZoom / 1.25); renderAll(); });

  document.querySelectorAll(".btn-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const discipline = btn.dataset.discipline;
      const round = Store.addRound(discipline, "quali");
      selectedRoundId = round.id;
      focusNameOnRender = true;
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
