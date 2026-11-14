# Fußball-Diagnose und sichere 1X2-Abgrenzung

Stand: 14.11.2026. Grundlage im Branch `feature/football-diagnostics`, geprüfte Erweiterung in `feature/forecast-evaluation-20261114`; **nicht** in `main` und **nicht** auf dem Nutzergerät.

## Im bestehenden Code verifiziert
- `app/src/main/assets/web/multisport.mjs`: Bundesliga, Premier League und La Liga werden als `sport:'football'` geführt; die Marktregel lautet 90-Minuten-Sieger.
- `deriveAnalysis()` liest bis zu zwei ESPN-`gameProjection`-Werte (Heim/Auswärts) und kann ohne explizite Unentschieden-Wahrscheinlichkeit einen `pick` erzeugen.
- `buildCombos()` verlangt 2 oder 3 Legs und eine gepufferte gemeinsame Wahrscheinlichkeit von mindestens 50 % (bei Standardparametern).
- `app/src/main/assets/web/finder.mjs` aktiviert standardmäßig NBA, NFL, NHL und Bundesliga, nicht Premier League oder La Liga.
- `app/src/main/assets/web/auto-demo-core.mjs` verlangt zusätzlich eindeutige Tipico-Marktzuordnung, frische Quoten, freie Slots und Budget.

## Sicherheitsänderung
`buildCombos()` schließt Fußball vorläufig von automatischen Kombi-Kandidaten aus, solange nur zwei ESPN-Werte vorliegen. Das verhindert die unzulässige Gleichsetzung einer Zweiweg-Siegerprognose mit einer Dreiweg-1X2-Wette. Manuelle Recherche bleibt unverändert. Die Änderung ist nicht deployed.

## Für korrekte Fußball-Automatik noch erforderlich
1. Historische Daten mit Heim-/Remis-/Auswärtsergebnissen und zeitlich korrekten Quoten beschaffen, Nutzungsrechte prüfen.
2. Dreiweg-Baseline (z. B. Poisson) mit validierten Heim- und Auswärts-Torerwartungen entwickeln; die drei Wahrscheinlichkeiten müssen zu 1 summieren.
3. Chronologische Backtests, Kalibrierung je Liga und Vergleich mit Markt-Baseline.
4. Dreiweg-Quotenmatching mit 90-Minuten-Regeln und getrennten Ausfallgründen im Live-Funnel instrumentieren.
5. Erst nach bestandenem Test automatisierte **Demo**-Einzelwetten aktivieren. Keine Echtgeldanbindung.

## Tests
Am 14.11.2026 ausgeführt: `node --test diagnostics/*.test.mjs tests/*.mjs`: 69 Tests bestanden, inklusive bestehender Dreiweg-, Remis- und Kombi-Abgrenzungsprüfungen sowie vier neuer Bewertungsprüfungen. GitHub-CI ebenfalls erfolgreich. Kein Laptop-Deployment.

`forecast-evaluation.mjs` bewertet eingefrorene Dreiweg-Prognosen pro Liga, prüft Training/Prognose/Anstoß/Ergebniszeit und schließt doppelte Ereignisse aus. Modell und Markt werden auf identischen Fällen mit Multiclass-Brier und Log Loss verglichen. Herkunft und Zeitstempel der Eingabedaten müssen unabhängig belegt werden. Keine automatische Auswahl, kein trainiertes Dixon-Coles-Modell und kein Profitabilitätsnachweis.

Methodische Referenzen: [penaltyblog-Modelle](https://penaltyblog.readthedocs.io/en/latest/models/overview.html), [Metriken](https://penaltyblog.readthedocs.io/en/latest/metrics/), [OpenFootball CC0-Ergebnisse](https://github.com/openfootball/football.json). Kein Fremdcode oder neuer Datensatz gebündelt.
