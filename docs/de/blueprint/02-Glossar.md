# Kapitel 2: Glossar

## 2.1 Kernbegriffe

| Begriff | Englisch | Definition |
|---------|----------|------------|
| iFay | iFay | Intelligentes kognitives Partnersystem. Hauptkonsument des Skill Sharing Protocol, der Skills entdeckt und aufruft, um seine eigenen Fähigkeiten zu erweitern |
| Skill | Skill | Eine gemäß Protokoll deklarierte aufrufbare Fähigkeitseinheit. Umfasst unter anderem Plugins, APIs, Wissenspakete und Aufgabenausführungsfähigkeiten |
| Skill-Anbieter | Skill Provider | Eine Entität (Person, Organisation oder automatisiertes System), die Skills im Internet deklariert und exponiert |
| Skill-Konsument | Skill Consumer | Eine Entität, die Skills entdeckt und aufruft. Hauptsächlich iFay-Instanzen |
| Skill-Deskriptor | Skill Descriptor | Ein gemäß Protokoll-Schema definiertes Skill-Metadatendokument, das Fähigkeiten, Schnittstellen, Aufrufmethoden usw. eines Skills beschreibt |

## 2.2 Protokollbegriffe

| Begriff | Englisch | Definition |
|---------|----------|------------|
| Entdeckungsmechanismus | Discovery Mechanism | Methoden und Prozesse, mit denen Skill-Konsumenten Skill Descriptors in dezentralen Netzwerken lokalisieren und entdecken |
| Protokoll-Schema | Protocol Schema | Formalisierte Spezifikation, die die Struktur von Skill Descriptors definiert. Umfasst JSON Schema, TypeScript-Typen und MDX-Dokumentation |
| Skill-Registry | Skill Registry | Optionaler Skill-Indexdienst zur Beschleunigung der Skill-Entdeckung, aber keine Voraussetzung für den Protokollbetrieb |
| Aufrufendpunkt | Invocation Endpoint | Die im Skill Descriptor deklarierte Einstiegsadresse für Remote-Aufrufe |
| Fähigkeitstyp | Capability Type | Klassifikationskennung eines Skills. Umfasst plugin, api, knowledge, task |
| Schema Validator | Schema Validator | Werkzeug oder Komponente zur Validierung der Konformität von Skill Descriptors gegenüber dem Protokoll-Schema |
| Protokollversion | Protocol Version | Versionskennung der Protokollspezifikation. Folgt Semantic Versioning |

## 2.3 Technische Begriffe

| Begriff | Englisch | Definition |
|---------|----------|------------|
| Well-Known URI | Well-Known URI | Standardisierter Entdeckungspfad `/.well-known/skill-sharing`. Wird verwendet, um den Skill-Index unter einer Domain zu exponieren |
| Skill-Index | Skill Index | Das von der Well-Known URI zurückgegebene Dokument. Enthält eine Referenzliste aller deklarierten Skill Descriptors unter der Domain |
| Semantische Versionierung | Semantic Versioning (SemVer) | Versionsnummernformat `MAJOR.MINOR.PATCH`. Wird für die Protokollversionsverwaltung verwendet |
| JSON Schema | JSON Schema | Standard zur Beschreibung von JSON-Datenstrukturen. Dieses Protokoll verwendet Draft 2020-12 |
| Zugriffskontrollrichtlinie | Access Policy | Sichtbarkeitsstufe eines Skills: öffentlich (public), eingeschränkt (restricted), privat (private) |
| Ausführungs-ID | Execution ID | Eindeutiger Bezeichner, der nach einem Skill-Aufruf zurückgegeben wird. Wird zur Verfolgung des Ausführungsstatus und zum Abrufen von Ergebnissen verwendet |
