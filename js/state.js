const STORAGE_KEY = "zeitplanrechner_event_v1";

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

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.event = raw ? JSON.parse(raw) : defaultEvent();
    } catch (e) {
      this.event = defaultEvent();
    }
    if (!this.event.days || this.event.days.length === 0) {
      this.event.days = defaultEvent().days;
    }
    return this.event;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.event));
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
      name: preset.label,
      dayId: this.event.days[0].id,
      startTime: "09:30",
      params: JSON.parse(JSON.stringify(preset.params))
    };
    this.event.rounds.push(round);
    this.save();
    return round;
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
