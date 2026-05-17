# Kapitel 1: Überblick und Vision

## 1.1 Projekthintergrund

Das Skill Sharing Protocol ist ein Kernunterprojekt des iFay-Ökosystems. Als intelligentes kognitives Partnersystem benötigt iFay eine standardisierte Methode, um im Internet verteilte Fähigkeiten zu entdecken und aufzurufen — diese Fähigkeiten bezeichnen wir zusammenfassend als „Skills".

Aktuelle KI-Fähigkeitserweiterungsmodelle basieren auf zentralisierten Plattformen (wie Plugin-Marktplätzen und API-Gateways), die Single Points of Failure, Plattform-Lock-in und Innovationsengpässe verursachen. Das Skill Sharing Protocol schlägt ein neues dezentrales Paradigma vor: Skill-Anbieter deklarieren und exponieren Skills im Internet gemäß Protokollkonventionen, und iFay kann diese Skills autonom entdecken und remote aufrufen.

Dieses Konzept ist analog zu:
- **Das Hyperlink-Modell des Webs**: Jeder kann Inhalte unter seiner eigenen Domain veröffentlichen, und Suchmaschinen entdecken sie automatisch
- **Dezentrale Knoten der Blockchain**: Keine zentrale Registrierung erforderlich; Knoten deklarieren und entdecken autonom
- **P2P-Seed-Discovery-Mechanismen**: Ressourcenlokalisierung in verteilten Netzwerken

## 1.2 Kernphilosophie

> Jede ausführbare Fähigkeit kann zu einem aufrufbaren Skill werden.

Der Umfang von „Skills" umfasst:

| Typ | Beschreibung | Beispiele |
|-----|-------------|-----------|
| Plugin | Einbettbare Funktionsmodule | Bildverarbeitungs-Plugin, Textanalyse-Plugin |
| API | Remote-Service-Schnittstellen | Wetter-API, Übersetzungsdienst |
| Knowledge | Strukturierte Wissensressourcen | Domänen-Wissensbasis, FAQ-Datensatz |
| Task | Von Menschen oder iFay ausführbare Aufgaben | Code-Review, Dokumentenübersetzung |

## 1.3 Designprinzipien

1. **Dezentrale Entdeckung**: Skill-Anbieter deklarieren Skills unter ihrer eigenen Domain; Konsumenten entdecken Skills über standardisierte Pfade ohne zentrale Plattformen
2. **Selbstbeschreibend**: Jeder Skill beschreibt seine Fähigkeiten, Schnittstellen und Aufrufmethoden vollständig durch einen standardisierten Skill Descriptor
3. **Protokoll als Spezifikation**: Liefergegenstände sind Protokolldokumente und Schema-Definitionsdateien, keine Softwareanwendungen
4. **Offen und inklusiv**: Protokolldokumentation in 9 Sprachen, ausgerichtet auf die globale Entwicklergemeinschaft

## 1.4 Projektliefergegenstände

Dies ist ein Open-Source-Projekt mit folgenden Liefergegenständen:

1. **Protokollspezifikationsdokumente**: 9 Sprachversionen (en, zh-CN, zh-TW, ja, ko, de, fr, es, ru)
2. **Schema-Definitionsdateien**:
   - JSON Schema (Draft 2020-12)
   - TypeScript-Typdefinitionen
   - MDX-interaktive Dokumentation
3. **Schema Validator**: Ein Werkzeug zur Validierung der Konformität von Skill Descriptors gegenüber dem Protokoll-Schema

## 1.5 Zielgruppe

- **Skill-Anbieter**: Diejenigen, die ihre Fähigkeiten als entdeckbare und aufrufbare Skills exponieren möchten
- **Skill-Konsumenten (iFay-Instanzen)**: Diejenigen, die externe Skills entdecken und aufrufen müssen, um ihre eigenen Fähigkeiten zu erweitern
- **Protokollintegrationsentwickler**: Diejenigen, die Werkzeuge, SDKs oder Plattformen auf Basis des Protokolls erstellen
- **Globale Entwicklergemeinschaft**: Diejenigen, die an der Diskussion, Verbesserung und Implementierung des Protokolls teilnehmen
