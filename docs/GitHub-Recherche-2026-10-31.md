# GitHub-Bausteine für SportRadar Pro

Geprüft am 31.10.2026. Recherche anhand der Repository-Dokumentation; beim NBA-Projekt zusätzlich XGBoost-Trainingscode und Dateibaum gelesen. Keine fremden Modelle ausgeführt oder Codebestandteile übernommen. Kein Projekt ist als dauerhaft profitabel nachgewiesen.

| Projekt | Nutzen | Stand und Grenze |
| --- | --- | --- |
| [penaltyblog](https://github.com/martineastwood/penaltyblog) | Fußball: Poisson/Dixon-Coles, Teamratings, Entfernen der Buchmachermarge, Bewertungsmetriken. | MIT-Lizenz in LICENCE geprüft. Python-Baustein, keine fertige Android-App; Daten und Rücktests erforderlich. Erste Wahl für den Ausbau unserer Fußballanalyse. |
| [NBA-Machine-Learning-Sports-Betting](https://github.com/kyleskom/NBA-Machine-Learning-Sports-Betting) | NBA-Sieger und Gesamtpunkte, historische Teamdaten, Quotenvergleich und Erwartungswert. | README und src/Train-Models/XGBoost_Model_ML.py geprüft. Zeitlich sortierter Holdout, TimeSeriesSplit und Kalibrierung sind vorhanden. Datenaufbereitung nicht vollständig auf Datenleckage geprüft, keine eigene Ergebnisreproduktion. TensorFlow/XGBoost/Python laufen nicht direkt in unserer Java/WebView-App; separater Analyseprozess wäre nötig. In der gelesenen Repository-Wurzel war keine Lizenzdatei vorhanden; vor Codeübernahme Lizenz klären. Tipico ist nicht in der dokumentierten Quotenanbieter-Liste. |
| [soccerdata](https://github.com/probberechts/soccerdata) | Fußball-Datenaufbereitung aus mehreren Quellen, unter anderem Club Elo, ESPN und Understat. | README.rst und Apache-2.0-Lizenz gelesen. Scraper sind von fremden Seiten abhängig und können ausfallen; selbst kein Siegprognosemodell. Datenzugang und Verfügbarkeit vor Einbindung testen. |
| [nflreadpy](https://github.com/nflverse/nflreadpy) | NFL: Spielzüge, Team-/Spielerstatistiken, Termine und Ausfallinformationen. | README einschließlich MIT-Lizenzhinweis gelesen. Daten haben eigene Nutzungsbedingungen; Projekt bezeichnet sich als experimentell. Datenbasis, keine fertigen Wetttipps. |

## Konkrete Empfehlung

1. Aktuelles 100-EUR-Demokonto als unveränderte Referenz testen und Quoten/Prognosen vor Beginn einfrieren.
2. Für Fußball zuerst penaltyblog mit einer kleinen, geprüften historischen Datenbasis ausprobieren, da bisher im Kombi-Radar häufig belastbare numerische Fußballprognosen fehlen.
3. Für NBA das gefundene XGBoost-Projekt als Vergleichskandidat untersuchen. Erst Datenaufbereitung und Lizenz klären, dann unabhängigen Rücktest durchführen.
4. NFL-Daten über nflreadpy als weitere Datenquelle evaluieren, ohne daraus automatisch einen neuen Gewinnvorteil abzuleiten.

## Was ein brauchbarer Test nachweisen müsste

- Strikte zeitliche Trennung: Nur vor Spielbeginn bekannte Daten verwenden.
- Quoten mit Erfassungszeitpunkt und identischen Abrechnungsregeln speichern.
- Wahrscheinlichkeit mit Brier Score/Log Loss und Kalibrierung prüfen, nicht nur Trefferquote.
- Einzelwetten und Zwei-/Dreierkombis getrennt bewerten; Teilnehmerüberschneidungen und Abhängigkeiten beachten.
- Ertrag nach realistischen Abzügen, längste Verlustserie und maximalen Kontorückgang ausweisen.
- Ein unberührter späterer Testzeitraum und ein anschließender Vorwärtstest im Demokonto sind nötig, bevor eine Qualitätsaussage möglich ist.

## Gelesene Primärquellen

- https://github.com/martineastwood/penaltyblog/blob/master/README.md
- https://github.com/martineastwood/penaltyblog/blob/master/LICENCE
- https://github.com/kyleskom/NBA-Machine-Learning-Sports-Betting/blob/master/README.md
- https://github.com/kyleskom/NBA-Machine-Learning-Sports-Betting/blob/master/src/Train-Models/XGBoost_Model_ML.py
- https://github.com/probberechts/soccerdata/blob/master/README.rst
- https://github.com/probberechts/soccerdata/blob/master/LICENSE.rst
- https://github.com/nflverse/nflreadpy/blob/main/README.md
