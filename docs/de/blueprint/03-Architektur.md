# Kapitel 3: Architektur

## 3.1 Gesamtarchitektur

Das Protokoll verwendet eine dezentrale Provider-Consumer-Architektur, ähnlich dem Hyperlink-Entdeckungsmodell des Webs und dem Knotenentdeckungsmechanismus von P2P-Netzwerken.

```
┌─────────────────────────────────────────────────────────┐
│              Skill-Anbieter-Domain (Provider Domain)      │
│                                                         │
│  ┌──────────────────────────┐                           │
│  │ /.well-known/skill-sharing│                           │
│  └────────┬─────────────────┘                           │
│           │                                             │
│     ┌─────┴─────┐                                       │
│     ▼           ▼                                       │
│  ┌──────┐   ┌──────┐                                   │
│  │Desk.A│   │Desk.B│                                   │
│  └──┬───┘   └──┬───┘                                   │
│     ▼           ▼                                       │
│  ┌──────┐   ┌──────┐                                   │
│  │Endp.A│   │Endp.B│                                   │
│  └──────┘   └──────┘                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Skill-Konsument (iFay)                       │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐      │
│  │Discovery   │→ │Schema        │→ │Invocation  │      │
│  │Client      │  │Validator     │  │Client      │      │
│  └────────────┘  └──────────────┘  └────────────┘      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         Optional: Skill-Registry (Skill Registry)        │
│                                                         │
│  ┌────────────────────────────────────┐                 │
│  │          Registry Index            │                 │
│  │  (Index-Referenzen → Deskriptoren der Anbieter)      │
│  └────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

## 3.2 Protokoll-Interaktionsfluss

### Phase 1: Skill-Entdeckung

```
Skill-Konsument (iFay)               Skill-Anbieter
      │                                  │
      │── GET /.well-known/skill-sharing ─→│
      │                                  │
      │←── Skill-Index (Skill Index) ────│
      │                                  │
      │── Schema Validator Parsing ──→    │
      │                                  │
```

### Phase 2: Skill-Aufruf

```
Skill-Konsument (iFay)               Skill-Anbieter
      │                                  │
      │── POST {invocation_endpoint} ────→│
      │   (Aufrufanfrage)                 │
      │                                  │
      │←── 202 Accepted ─────────────────│
      │   (Bestätigung + Ausführungs-ID)  │
      │                                  │
      │── GET {status_endpoint}/{id} ────→│
      │                                  │
      │←── Ausführungsstatus ────────────│
      │   (laufend/abgeschlossen/fehlgeschlagen) │
      │                                  │
      │── GET {result_endpoint}/{id} ────→│
      │                                  │
      │←── Ausführungsergebnis ──────────│
      │                                  │
```

## 3.3 Drei Entdeckungspfade

| Pfad | Methode | Beschreibung | Anwendungsfall |
|------|---------|-------------|----------------|
| Well-Known URI | `GET /.well-known/skill-sharing` | Hauptentdeckungsmethode. Gibt den Index aller Skills unter der Domain zurück | Alle Skills eines Anbieters erkunden |
| Direkte URL | `GET {skill_descriptor_url}` | Direkter Abruf bei bekannter Skill Descriptor URL | Konkrete Skill-Adresse bekannt |
| Registry-Abfrage | `GET {registry_url}/skills?type={type}` | Optional. Massensuche über Registry | Typbasierte Skill-Suche |

## 3.4 Dateiorganisationsarchitektur

```
project-root/
├── docs/
│   ├── en/                          # Basissprache (Englisch)
│   │   ├── specification/
│   │   │   ├── 2025-11-25/          # Versionierte Dokumente
│   │   │   └── draft/               # Entwurfsdokumente
│   │   ├── blueprint/               # Blueprint-Dokumente
│   │   ├── community/               # Community-Dokumente
│   │   ├── develop/                 # Entwicklungsleitfäden
│   │   └── sdk/                     # SDK-Dokumente
│   ├── zh-CN/                       # Vereinfachtes Chinesisch
│   ├── zh-TW/                       # Traditionelles Chinesisch
│   ├── ja/                          # Japanisch
│   ├── ko/                          # Koreanisch
│   ├── de/                          # Deutsch
│   ├── fr/                          # Französisch
│   ├── es/                          # Spanisch
│   └── ru/                          # Russisch
├── schema/
│   ├── draft/                       # Entwurfs-Schema
│   │   ├── schema.json              # JSON Schema (Draft 2020-12)
│   │   ├── schema.ts                # TypeScript-Typdefinitionen
│   │   └── schema.mdx               # MDX-interaktive Dokumentation
│   └── 2025-10-25/                  # Versioniertes Schema
│       ├── schema.json
│       ├── schema.ts
│       └── schema.mdx
└── src/                             # Werkzeug-Quellcode
    ├── validator.ts                 # Schema Validator
    ├── discovery.ts                 # Entdeckungsmechanismus-Logik
    ├── invocation.ts                # Aufrufprotokoll-Logik
    └── version.ts                   # Versionsverwaltungs-Logik
```

## 3.5 Komponentenverantwortlichkeiten

### Discovery Client (Entdeckungsclient)

Verantwortlich für die Lokalisierung von Skill Descriptors im dezentralen Netzwerk:
- Anfragen an Well-Known URI senden, um den Skill-Index abzurufen
- Bekannte Skill Descriptors über direkte URL abrufen
- Massensuche über Registry
- Filterabfragen basierend auf Fähigkeitstyp unterstützen

### Schema Validator

Verantwortlich für die Validierung der Konformität von Skill Descriptors:
- Verwendet schema.json zur Validierung von Skill Descriptor-Dokumenten
- Parst gültige Dokumente in strukturierte Skill Descriptor-Objekte
- Gibt bei ungültigen Dokumenten spezifische Verletzungsfelder und Gründe zurück
- Unterstützt Serialisierung von Skill Descriptor-Objekten in Pretty Print JSON

### Invocation Client (Aufrufclient)

Verantwortlich für den Remote-Aufruf entdeckter Skills:
- Konstruktion standardisierter Aufrufanfragen
- Verarbeitung des Authentifizierungsflusses
- Verwaltung von Ausführungsstatusabfragen
- Behandlung von Timeout- und Fehlerantworten
