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

Diese Datei ist zunächst eine Debug-/Test-APK, kein Play-Store-Release. Der erste GitHub-Build steht noch aus. Eine vollständige Android-Kompilierung wurde in der Vorbereitungsumgebung mangels SDK nicht ausgeführt. Die Web- und Kontorechnungstests werden vor jedem APK-Build ausgeführt.

## Daten und Updates

Die Android-App hat einen eigenen lokalen Datenspeicher. Guthaben und Tests der bisherigen Website werden nicht automatisch übernommen. Löschen der App-Daten oder Deinstallation entfernt lokale Einträge; Sicherungen vorher exportieren. Android selbst kann zusätzlich Gerätesicherungen anlegen.

Debug-Signaturschlüssel können zwischen GitHub-Builds wechseln. Dann lässt sich eine neue Test-APK erst nach Deinstallation der alten installieren. Für dauerhafte Updates wird vor einer regulären Veröffentlichung ein eigener, dauerhaft gesicherter Release-Schlüssel benötigt. Keine Signierschlüssel sind in diesem Projekt hinterlegt.

## Technik

Java 17, AGP 8.9.2, Gradle 8.11.1, Android SDK 35, minSdk 26, AndroidX WebKit 1.12.1. Die Weboberfläche wird über `WebViewAssetLoader` aus dem APK unter einem lokalen HTTPS-Ursprung geladen. Externe Seiten öffnen sich im Browser. Unverschlüsselte Verbindungen sind deaktiviert; kein universeller file://-Zugriff.

Mit `node --test tests/*.mjs` lassen sich die Web- und Demokonto-Tests separat ausführen. Für Android Studio das Projektverzeichnis öffnen und ggf. einen Gradle-Wrapper mit Gradle 8.11.1 erzeugen; der GitHub-Workflow benötigt keinen eingecheckten Wrapper.
