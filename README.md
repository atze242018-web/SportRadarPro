# SportRadar Pro für Android

Installierbare Android-Test-App mit lokal eingebautem SportRadar und 100 EUR virtuellem Demokonto. Kein Tipico-Login, keine Echtgeld-Orders, kein ChatGPT-Login beim App-Start.

## Enthalten

- Meine Tipps mit vorbereiteten Kombis und Quellen.
- Sportdatenabruf: NBA, NFL, NHL, MLB, Bundesliga, Premier League, La Liga, ATP/WTA. Numerische Prognosen nur, wenn die Quelle sie liefert; andere Sportarten bleiben manuell.
- Demokonto: 100 EUR virtuelles Startguthaben, zunächst 5 EUR pro Kombi (änderbar), offene Tipps, Ergebnisprüfung und Gewinn-/Verlustrechnung.
- Native Android-Dateiauswahl für JSON-Importe und Export über den Android-Speichern-Dialog.
- Alle SportRadar-Module sind im APK enthalten. Sportdaten benötigen Internet. Prognosen sind nicht als profitabel nachgewiesen; die Risikogrenzen sind Modellrechnungen.

## APK mit GitHub bauen

1. Die Projektdateien in das Repository `SportRadarPro` auf den Branch `main` übertragen.
2. Unter **Actions → Android APK bauen** den ausgelösten Lauf öffnen. Alternativ **Run workflow** drücken.
3. Nach erfolgreichem Lauf unter **Artifacts → SportRadarPro-Android-APK** herunterladen und entpacken.
4. `app-debug.apk` auf Android installieren. Android kann für den herunterladenden Browser die Berechtigung „Unbekannte Apps installieren“ verlangen.

Diese Datei ist zunächst eine Debug-/Test-APK, kein Play-Store-Release. Der erste GitHub-Build wurde am 31.10.2026 erfolgreich abgeschlossen: 27 Web-/Demokonto-Tests, Android-Kompilierung und Android Lint. Eine Installation auf einem echten Android-Gerät wurde hier noch nicht geprüft. Die Web- und Kontorechnungstests werden vor jedem APK-Build ausgeführt.

Erfolgreicher Lauf: https://github.com/atze242018-web/SportRadarPro/actions/runs/41237271602

Geprüfte weitere GitHub-Bausteine: [Recherche und Empfehlungen](docs/GitHub-Recherche-2026-10-31.md).

## Daten und Updates

Die Android-App hat einen eigenen lokalen Datenspeicher. Guthaben und Tests der bisherigen Website werden nicht automatisch übernommen. Löschen der App-Daten oder Deinstallation entfernt lokale Einträge; Sicherungen vorher exportieren. Android selbst kann zusätzlich Gerätesicherungen anlegen.

Debug-Signaturschlüssel können zwischen GitHub-Builds wechseln. Dann lässt sich eine neue Test-APK erst nach Deinstallation der alten installieren. Für dauerhafte Updates wird vor einer regulären Veröffentlichung ein eigener, dauerhaft gesicherter Release-Schlüssel benötigt. Keine Signierschlüssel sind in diesem Projekt hinterlegt.

## Technik

Java 17, AGP 8.9.2, Gradle 8.11.1, Android SDK 35, minSdk 26, AndroidX WebKit 1.12.1. Die Weboberfläche wird über `WebViewAssetLoader` aus dem APK unter einem lokalen HTTPS-Ursprung geladen. Externe Seiten öffnen sich im Browser. Unverschlüsselte Verbindungen sind deaktiviert; kein universeller file://-Zugriff.

Mit `node --test tests/*.mjs` lassen sich die Web- und Demokonto-Tests separat ausführen. Für Android Studio das Projektverzeichnis öffnen und ggf. einen Gradle-Wrapper mit Gradle 8.11.1 erzeugen; der GitHub-Workflow benötigt keinen eingecheckten Wrapper.

## Version 0.2.0

- **Demokonto-Übernahme repariert:** Sowohl die Recherchekarte als auch die automatischen Kombis besitzen jetzt „Ins Demokonto übernehmen“. Ein gespeicherter Entwurf erscheint im Demokonto, auch wenn Quoten noch fehlen. Erst nach Quoten, Regelbestätigung und „Demo-Kombi jetzt starten“ werden 5 € bzw. der gewählte virtuelle Standardeinsatz reserviert.
- **KI & Qualität:** Lokale logistische Kalibrierung, mindestens 80 nicht überlappende, automatisch abgerechnete Kombis. Chronologischer 75/25-Vergleich; Training nur mit vor dem Prüfzeitraum bekannten Ergebnissen, mindestens 60 Trainings- und 20 Prüffälle. Kein Sprachmodell, keine automatische Webrecherche und keine automatische Änderung der Auswahl. Technische Mindestgrenzen sind kein Beleg für Prognosequalität.
- **Validierung:** Brier, Log Loss, Kalibrierungstabelle und Wilson-Intervall. Manuelle, offene, annullierte und überlappende Fälle werden aus der Modellprüfung ausgeschlossen. Sportübergreifende Stationarität und Unabhängigkeit sind nicht bewiesen.
- Vollständiger Quotenmarkt-Vergleich, sichtbare Datenlücken und JSON-Wiederherstellung des Demokontos.

### Quellenrecherche (31.10.2026)

[The Hammer / Rob Pizzola](https://thehammer.bet/watch/what-is-closing-line-value-w-rob-pizzola) beschreibt ein YouTube-Video über Closing Line Value. Es wurde die Herausgeberseite geprüft, kein vollständiges Video-Transkript ausgewertet. [TikTok](https://newsroom.tiktok.com/how-to-tell-if-an-account-is-verified-on-tiktok?lang=en) erklärt, dass Verifizierung die Identität bestätigt; kein Leistungsnachweis. Keine vollständige unabhängig verifizierte und für unsere Märkte nachweislich profitable Influencer-Tippserie wurde gefunden oder als Prognosequelle eingebaut. [penaltyblog](https://github.com/martineastwood/penaltyblog) liefert Anregungen zu probabilistischen Modellen und Bewertungsmethoden; dessen Python-Code wird nicht gebündelt. Aktuelle Spielprognosen stammen weiter aus gelieferten ESPN-Modellzahlen. Treffersteigerung und Profitabilität sind bisher unbewiesen.

## Version 0.3.0

- Android: Tipico-Wettschein-Screenshots auswählen und mit gebündeltem ML Kit auf dem Gerät lesen. Nur eindeutige Zeilen `Tipp: Teamname` mit genau einer Einzelquote werden der vorbereiteten Kombi zugeordnet. Keine automatische Anmeldung, kein Zugriff auf andere Apps und kein Live-Quotenfeed. Generische Marktübersichten, abgeschnittene Namen und mehrdeutige Quoten bleiben zur manuellen Prüfung offen. Auch importierte Preise müssen nach Prüfung von Partie, Screenshot-Alter und Marktregeln bestätigt werden.
- Mobile Navigation: fünf stets sichtbare Schaltflächen (Meine Tipps, Demokonto, KI & Qualität, Kombi-Radar, Mehr); weitere Bereiche im Menü. Nur der Inhaltsbereich scrollt.
- **Signaturkorrektur:** v0.1 und v0.2 hatten unterschiedliche, flüchtige Debug-Zertifikate. Die ausgelieferten APKs werden ab v0.3 mit einer dauerhaft privat gesicherten Release-Identität signiert. Der Wechsel von der alten Debug-App erfordert einmalig Export, Deinstallation, Installation und Import. Danach dieselbe signierte App regulär aktualisieren.

### Release-Signatur

CI erzeugt ausschließlich `app-release-unsigned.apk` und kennzeichnet das Artefakt deutlich als nicht installierbar. Es darf nicht als Nutzer-Download verteilt werden. `scripts/sign-apk.py` signiert es mit dem **bereits vorhandenen** privaten Eigentümer-Backup `SportRadarPro_signing_backup.json` und offiziellen Android-Build-Tools. Backup und Passwort niemals ins öffentliche Repository, in Logs oder CI-Artefakte kopieren. Bei künftigen Releases dieses Backup wiederverwenden, keinen neuen Schlüssel erzeugen. Neue Versionsnummern müssen steigen.

Festgelegter SHA-256-Fingerabdruck des Release-Zertifikats:
`2d577e2d58f8b6b19c82b8b90bfe60307d6e0fdc8cd853f518c563930361aadc`

Der private Eigentümer-Speicher enthält das Backup; es gehört nicht zum Projektarchiv. Ausgelieferte APKs müssen mit `apksigner verify --verbose --print-certs` auf diesen Fingerabdruck geprüft werden. Die Installation und die OCR sind zusätzlich auf einem echten Gerät zu prüfen.

## Version 0.4.0: automatische Tipico-Verbindung

Der öffentliche Tipico-Webclient referenziert den lesenden Programm-Endpunkt
`https://sports.tipico.de/v1/tpapi/programgateway/program/events/hourEvents/48?language=de&maxMarkets=1&selectedSports=...`.
Am 31.10.2026 lieferte dieser ohne Cookies, Anmeldung oder API-Schlüssel HTTP 200 und strukturierte aktuelle Vorab-Quoten für `soccer`, `basketball` und `football`. Kleine echte Antwortausschnitte liegen als Parser-Testfixtures im Repository. Kein Code des Tipico-Webclients wird ausgeführt oder gebündelt.

Android fragt ausschließlich diesen fest vorgegebenen HTTPS-Endpunkt ab; freigegebene Sportnamen: soccer, basketball, football, baseball, tennis. Keine frei wählbaren URLs, keine Weiterleitungen, keine Zugangsdaten und keine Wettabgabe. Größen- und Zeitlimits, 30 Sekunden Cache und eine begrenzte Übertragung an das lokale WebView. Öffentliche Website-Schnittstelle, kein vertraglich zugesicherter oder offizieller Partnerzugang. Änderungen oder Sperren führen zu sichtbaren Fehlern; es wird nichts umgangen.

Automatischer Abruf nach der ESPN-Analyse, nach Kombi-Übernahme, beim Öffnen einer vorbereiteten Kombi im Demokonto und alle 60 Sekunden bei sichtbarer entsprechender App-Seite. Abrufzeit anzeigen; bei automatischen Demopreisen älter als 90 Sekunden vor Start aktualisieren. Bereits gestartete Demotests behalten ihre eingefrorenen Preise. Nur bevorstehende Spiele der nächsten 48 Stunden; keine In-Play-Siegerprognosen.

Matching benötigt beide Teilnehmernamen (nur wenige explizite Aliasnamen, kein unscharfes Raten), höchstens zwei Minuten Zeitabweichung, eindeutiges Ereignis, Zustand `pre_match` und genau einen vollständigen Standard-Siegermarkt ohne Abschnitt oder Handicap. Fußball: 1/X/2; Basketball, NFL, MLB, Tennis: 1/2. Marktregeln werden vor Teststart bestätigt. NHL bleibt automatisch ausgeschlossen, damit Dreiweg-60-Minuten-Quoten nicht mit dem ESPN-Tipp inklusive Overtime vermischt werden. Tatsächlich fehlende, gesperrte oder unklare Preise werden nicht erfunden. Nur für NBA, NFL und Fußball wurde der echte öffentliche Abruf hier verifiziert; MLB/Tennis müssen bei vorhandenen kommenden Spielen zusätzlich geprüft werden.

Direkter Zugriff läuft nativ unter Android. Die statische Website zeigt dafür bewusst keine vorgetäuschte Verbindung; dort bleiben manuelle/Screenshot-Textimporte verfügbar. Ein echter Android-Gerätetest steht aus.
