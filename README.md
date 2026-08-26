# Zeitplanrechner Klettern

Kostenloses, lokal lauffähiges Web-Tool zur Zeitplanberechnung für Kletterwettkämpfe
(Bouldern, Lead, Speed). Kein Server, kein Build-Schritt, keine Kosten.

## Benutzen

Einfach `index.html` im Browser öffnen (Doppelklick) – funktioniert offline.

Alternativ mit einem einfachen lokalen Server (z. B. wenn Chrome bei `file://` meckert):

```bash
python3 -m http.server 8000
```

und dann `http://localhost:8000` öffnen.

Daten werden automatisch im Browser gespeichert (`localStorage`). Über **Export JSON**
kann ein Event als Datei gesichert oder an andere Personen weitergegeben werden, über
**Import JSON** wieder eingelesen werden.

## Funktionsweise

- **Event**: Name + beliebig viele Wettkampftage (Datum).
- **Runden**: pro Runde eine Disziplin (Bouldern/Lead/Speed), ein Tag, eine Startzeit
  und disziplinspezifische Parameter. Die Rundendauer wird automatisch berechnet.
- **Zeitplan (Gantt)**: alle Runden über die Wettkampftage, farbcodiert nach Disziplin.
  Ein Klick auf eine Runde zeigt die Detail-Slots (Gruppen/Routen/Races). Überschneidende
  Runden am selben Tag werden rot markiert.
- Die vorbelegten Werte orientieren sich an den DAV-Wettkampfbestimmungen (Kletterzeiten,
  Wechselzeiten, Mindestabstände). Alle Werte sind frei überschreibbar – insbesondere die
  Boulder-Rotationslogik (Gruppenanzahl/Versatz) ist im Regelwerk nicht fest vorgegeben.

## Auf GitHub Pages veröffentlichen (kostenlos)

```bash
git init
git add .
git commit -m "Zeitplanrechner v1"
git branch -M main
git remote add origin https://github.com/<dein-nutzername>/<repo-name>.git
git push -u origin main
```

Danach in den Repo-Einstellungen unter **Settings → Pages** als Quelle den `main`-Branch
(Root-Verzeichnis) auswählen. Die App ist danach unter
`https://<dein-nutzername>.github.io/<repo-name>/` erreichbar.
