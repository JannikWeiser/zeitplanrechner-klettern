const EVENTS_INDEX_KEY = "zeitplanrechner_events_index_v1";
const CURRENT_EVENT_ID_KEY = "zeitplanrechner_current_event_id";
const LEGACY_EVENT_KEY = "zeitplanrechner_event_v1";

function eventDataKey(id) {
  return "zeitplanrechner_event_" + id;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultEvent() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: "Neues Event",
    days: [{ id: uid(), date: today, label: "Tag 1" }],
    rounds: []
  };
}

const Store = {
  event: null,
  currentEventId: null,

  _readIndex() {
    try {
      return JSON.parse(localStorage.getItem(EVENTS_INDEX_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  _writeIndex(index) {
    localStorage.setItem(EVENTS_INDEX_KEY, JSON.stringify(index));
  },

  listEvents() {
    return this._readIndex().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  },

  // Alte Version speicherte genau ein Event unter einem festen Key - wird beim ersten
  // Laden einmalig in die neue Mehr-Event-Struktur übernommen, damit nichts verloren geht.
  _migrateLegacyIfNeeded() {
    let index = this._readIndex();
    if (index.length > 0) return index;

    const legacyRaw = localStorage.getItem(LEGACY_EVENT_KEY);
    let data = null;
    try {
      data = legacyRaw ? JSON.parse(legacyRaw) : null;
    } catch (e) {
      data = null;
    }
    if (!data || !data.days) data = defaultEvent();

    const id = uid();
    localStorage.setItem(eventDataKey(id), JSON.stringify(data));
    index = [{ id, name: data.name, updatedAt: new Date().toISOString() }];
    this._writeIndex(index);
    localStorage.setItem(CURRENT_EVENT_ID_KEY, id);
    localStorage.removeItem(LEGACY_EVENT_KEY);
    return index;
  },

  load() {
    const index = this._migrateLegacyIfNeeded();
    let currentId = localStorage.getItem(CURRENT_EVENT_ID_KEY);
    if (!currentId || !index.find(e => e.id === currentId)) {
      currentId = index[0].id;
      localStorage.setItem(CURRENT_EVENT_ID_KEY, currentId);
    }
    this.currentEventId = currentId;

    try {
      this.event = JSON.parse(localStorage.getItem(eventDataKey(currentId)));
    } catch (e) {
      this.event = null;
    }
    if (!this.event || !this.event.days) this.event = defaultEvent();
    if (this.event.days.length === 0) this.event.days = defaultEvent().days;
    return this.event;
  },

  save() {
    localStorage.setItem(eventDataKey(this.currentEventId), JSON.stringify(this.event));
    const index = this._readIndex();
    const entry = index.find(e => e.id === this.currentEventId);
    const now = new Date().toISOString();
    if (entry) {
      entry.name = this.event.name;
      entry.updatedAt = now;
    } else {
      index.push({ id: this.currentEventId, name: this.event.name, updatedAt: now });
    }
    this._writeIndex(index);
  },

  createEvent(name) {
    const id = uid();
    const data = defaultEvent();
    data.name = name || "Neues Event";
    localStorage.setItem(eventDataKey(id), JSON.stringify(data));
    const index = this._readIndex();
    index.push({ id, name: data.name, updatedAt: new Date().toISOString() });
    this._writeIndex(index);
    localStorage.setItem(CURRENT_EVENT_ID_KEY, id);
    this.currentEventId = id;
    this.event = data;
    return data;
  },

  switchEvent(id) {
    const raw = localStorage.getItem(eventDataKey(id));
    if (!raw) return false;
    this.currentEventId = id;
    localStorage.setItem(CURRENT_EVENT_ID_KEY, id);
    try {
      this.event = JSON.parse(raw);
    } catch (e) {
      this.event = defaultEvent();
    }
    if (!this.event.days || this.event.days.length === 0) this.event.days = defaultEvent().days;
    return true;
  },

  deleteEvent(id) {
    localStorage.removeItem(eventDataKey(id));
    const index = this._readIndex().filter(e => e.id !== id);
    this._writeIndex(index);
    if (this.currentEventId === id) {
      if (index.length === 0) this.createEvent("Neues Event");
      else this.switchEvent(index[0].id);
    }
  },

  reset() {
    this.event = defaultEvent();
    this.save();
  },

  exportJson() {
    return JSON.stringify(this.event, null, 2);
  },

  importJson(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed.days || !parsed.rounds) {
      throw new Error("Ungültiges Event-Format");
    }
    this.event = parsed;
    this.save();
  },

  addDay() {
    const days = this.event.days;
    const last = days[days.length - 1];
    const nextDate = last ? addDaysToIso(last.date, 1) : new Date().toISOString().slice(0, 10);
    days.push({ id: uid(), date: nextDate, label: `Tag ${days.length + 1}` });
    this.save();
  },

  removeDay(dayId) {
    if (this.event.days.length <= 1) return;
    this.event.days = this.event.days.filter(d => d.id !== dayId);
    const remainingIds = new Set(this.event.days.map(d => d.id));
    const fallback = this.event.days[0].id;
    this.event.rounds.forEach(r => {
      if (!remainingIds.has(r.dayId)) r.dayId = fallback;
    });
    this.save();
  },

  addRound(discipline, roundTypeKey) {
    const preset = getPreset(discipline, roundTypeKey);
    const round = {
      id: uid(),
      discipline,
      roundType: roundTypeKey,
      name: preset.label,
      dayId: this.event.days[0].id,
      startTime: "09:30",
      params: JSON.parse(JSON.stringify(preset.params))
    };
    this.event.rounds.push(round);
    this.save();
    return round;
  },

  duplicateRound(roundId) {
    const original = this.getRound(roundId);
    if (!original) return null;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = uid();
    copy.name = original.name + " (Kopie)";
    const idx = this.event.rounds.findIndex(r => r.id === roundId);
    this.event.rounds.splice(idx + 1, 0, copy);
    this.save();
    return copy;
  },

  removeRound(roundId) {
    this.event.rounds = this.event.rounds.filter(r => r.id !== roundId);
    this.save();
  },

  getRound(roundId) {
    return this.event.rounds.find(r => r.id === roundId);
  }
};

function addDaysToIso(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
