# SportRadar Pro V28 – Analyse- und Testplan

Status: Entwurf auf separatem Branch. Keine Änderung an laufender V27, kein Merge, kein APK-Release.

## 1. Abrechnung der 19 Testwetten
Benötigte Daten je Ticket: eindeutige Ticket-ID, Sportart, Wettbewerb, Begegnung, Startzeit, Markt, Auswahl, Einzel-/Kombi, Dezimalquote bei Platzierung, Einsatz, Prognosewahrscheinlichkeit, Quelle/Zeitpunkt, Status, Ergebnis, tatsächliche Auszahlung, Gebühren und Abrechnungszeitpunkt.
Statuswerte: offen, gewonnen, verloren, void/storniert, unklar. Offene/unklare Tickets nicht als verloren zählen. Bei Kombis alle Legs und Settlement-Regeln prüfen.
Kennzahlen: Nettoprofit = Auszahlung - Einsatz (nur abgerechnet); ROI = Summe Nettoprofit / Summe Einsätze; Break-even p = 1/Quote; Brier/Log Loss nur bei gültigen, vorab gespeicherten Prognosen. Keine Daten erfinden.

## 2. Filter und Strategie
- Keine Wettplatzierung bei fehlender Quote, unklarer Marktart, veralteten Daten, widersprüchlichen Spielzeiten oder ungeklärtem Status.
- Markt- und sportartspezifische Validierung; keine pauschale 50%-Sicherheit als Gewinnversprechen.
- Prognosewert p gegen 1/Quote vergleichen, inklusive konservativem Fehler-/Margenpuffer. Kalibrierung nur out-of-sample, zeitlich getrennt, ohne Leakage.
- Kombis: Abhängigkeiten zwischen Spielen und vervielfachte Buchmachermarge berücksichtigen; zunächst Einzelwetten separat messen.
- Vergleich A/B: bisherige Auswahl gegen strengere Filter auf demselben historischen Datenbestand, anschließend prospektiver Demotest.
- Limits im Demo-Modus konfigurierbar; Sicherheitsgrenzen für Gesamt-Exposure und offene Tickets; keine Echtgeldautomatisierung.

## 3. Demokonto
Unveränderliche Ticket-Snapshots (Quote, Einsatz, Zeit, Prognose, Quelle), idempotente Abrechnung, Statusänderungsprotokoll, exportierbare JSON/CSV-Daten und Backup. Verfügbares Guthaben + reservierte Einsätze + realisierter Saldo konsistent halten; unklare Settlements gesondert anzeigen.

## 4. UI V28
Startseite: virtueller Kontostand und realisierter Gewinn/Verlust prominent, darunter offene Wetten mit Einsatz, Quote, möglicher Bruttoauszahlung, Nettogewinn, gewähltem Team/Markt, Spielstand und Zeit (wenn verifiziert verfügbar). Statusfarben: offen neutral, gewonnen grün, verloren rot, unklar gelb; barrierefreie Textlabels. Kein Gewinn aus offenen Tickets als realisiert ausweisen.

## 5. Tests und Freigabe
Unit-Tests: Gewinn/Verlust/void, Teil-void bei Kombis, Doppelergebnis, fehlende/alte Quoten, Zeitzonen, Datumswechsel, Duplikate, Wallet-Invarianten, Backup-Restore, Ergebnisquelle. Integration: Datenabruf/Timeout/Fehlerzustände; Android Build/Lint und Windows-Test auf Zielgerät. Erst nach Nachweis der V27-Quellen einen V28-Codebranch von diesem Stand erstellen; signierte APK nur mit bestehender Eigentümeridentität; keine Installation/Änderung auf Laptop ohne überprüften Zugriff. Kein Merge nach main ohne Freigabe.
