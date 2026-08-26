const GANTT_ZOOM_DEFAULT = 3.6;
const GANTT_ZOOM_MIN = 0.8;
const GANTT_ZOOM_MAX = 10;
let ganttZoom = Number(localStorage.getItem("zoomPxPerMin")) || GANTT_ZOOM_DEFAULT;
const expandedRounds = new Set();

function setGanttZoom(value) {
  ganttZoom = Math.min(GANTT_ZOOM_MAX, Math.max(GANTT_ZOOM_MIN, value));
  localStorage.setItem("zoomPxPerMin", ganttZoom);
}

function renderGantt(container, event, computed) {
  container.innerHTML = "";

  if (computed.length === 0) {
    container.innerHTML = '<div class="gantt-empty">Noch keine Runden angelegt.</div>';
    return;
  }

  event.days.forEach(day => {
    const dayRows = computed
      .filter(c => c.round.dayId === day.id)
      .sort((a, b) => a.startMin - b.startMin);

    const dayEl = document.createElement("div");
    dayEl.className = "gantt-day";

    const title = document.createElement("div");
    title.className = "gantt-day-title";
    title.textContent = `${day.label || "Tag"} – ${formatDateDe(day.date)}`;
    dayEl.appendChild(title);

    if (dayRows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "gantt-empty";
      empty.textContent = "Keine Runden an diesem Tag.";
      dayEl.appendChild(empty);
      container.appendChild(dayEl);
      return;
    }

    let dayMin = Math.min(480, ...dayRows.map(r => r.startMin));
    let dayMax = Math.max(dayMin + 480, ...dayRows.map(r => r.endMin));
    dayMin = Math.floor(dayMin / 60) * 60;
    dayMax = Math.ceil(dayMax / 60) * 60;
    const totalWidth = (dayMax - dayMin) * ganttZoom;

    const scale = document.createElement("div");
    scale.className = "gantt-scale";
    scale.style.width = totalWidth + "px";
    for (let t = dayMin; t <= dayMax; t += 60) {
      const tick = document.createElement("div");
      tick.className = "tick";
      tick.style.left = (t - dayMin) * ganttZoom + "px";
      tick.textContent = minutesToTime(t);
      scale.appendChild(tick);
    }
    dayEl.appendChild(scale);

    const rows = document.createElement("div");
    rows.className = "gantt-rows";
    rows.style.width = totalWidth + "px";

    dayRows.forEach(c => {
      const row = document.createElement("div");
      row.className = "gantt-row";

      const bar = document.createElement("div");
      bar.className = `gantt-bar gantt-bar-${c.round.discipline}`;
      bar.style.left = (c.startMin - dayMin) * ganttZoom + "px";
      bar.style.width = Math.max((c.endMin - c.startMin) * ganttZoom, 40) + "px";
      bar.textContent = `${c.round.name} (${minutesToTime(c.startMin)}–${minutesToTime(c.endMin)})`;
      bar.title = c.result.warning ? `⚠ ${c.result.warning}` : (c.result.info || "");
      bar.addEventListener("click", () => {
        if (expandedRounds.has(c.round.id)) expandedRounds.delete(c.round.id);
        else expandedRounds.add(c.round.id);
        renderGantt(container, event, computed);
      });
      row.appendChild(bar);

      if (c.result.warning) {
        const badge = document.createElement("div");
        badge.className = "gantt-warning-badge";
        badge.textContent = "⚠";
        badge.title = c.result.warning;
        badge.style.left = (c.startMin - dayMin) * ganttZoom + "px";
        row.appendChild(badge);
      }

      rows.appendChild(row);

      if (expandedRounds.has(c.round.id)) {
        const details = document.createElement("div");
        details.className = "gantt-details";
        details.style.width = totalWidth + "px";

        const groups = {};
        (c.result.slots || []).forEach(s => {
          if (!groups[s.group]) groups[s.group] = [];
          groups[s.group].push(s);
        });

        Object.keys(groups).forEach(groupName => {
          const subrow = document.createElement("div");
          subrow.className = "gantt-subrow";
          groups[groupName].forEach(s => {
            const sub = document.createElement("div");
            sub.className = `gantt-subbar gantt-bar-${c.round.discipline}`;
            const absStart = c.startMin + s.startOffsetMin;
            const absEnd = c.startMin + s.endOffsetMin;
            sub.style.left = (absStart - dayMin) * ganttZoom + "px";
            sub.style.width = Math.max((absEnd - absStart) * ganttZoom, 3) + "px";
            sub.title = `${s.label}: ${minutesToTime(absStart)}–${minutesToTime(absEnd)}`;
            subrow.appendChild(sub);
          });
          details.appendChild(subrow);
        });

        rows.appendChild(details);
      }
    });

    dayEl.appendChild(rows);
    container.appendChild(dayEl);
  });
}

function formatDateDe(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}
