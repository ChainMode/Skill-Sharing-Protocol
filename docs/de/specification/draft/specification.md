# Spezifikation des Skill Sharing Protocol

**Status:** Entwurf  
**Version:** 1.0.0  
**Datum:** 2025-01-01  
**Schema:** [`schema/draft/schema.json`](../../../../schema/draft/schema.json), [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

---

## Inhaltsverzeichnis

1. [Protokollübersicht](#1-protokollübersicht)
2. [Terminologie](#2-terminologie)
3. [Spezifikation des Skill Descriptor](#3-spezifikation-des-skill-descriptor)
4. [Spezifikation des Discovery-Mechanismus](#4-spezifikation-des-discovery-mechanismus)
5. [Spezifikation des Invocation-Protokolls](#5-spezifikation-des-invocation-protokolls)
6. [Spezifikation der Versionsverwaltung](#6-spezifikation-der-versionsverwaltung)
7. [Spezifikation für Sicherheit und Authentifizierung](#7-spezifikation-für-sicherheit-und-authentifizierung)
8. [Spezifikation der Fehlerbehandlung](#8-spezifikation-der-fehlerbehandlung)
9. [Schema-Referenz](#9-schema-referenz)
10. [Anhang: Vollständige Beispiele](#10-anhang-vollständige-beispiele)

---

## 1. Protokollübersicht

### 1.1 Zweck

Das Skill Sharing Protocol definiert einen dezentralen Mechanismus zur Entdeckung, Deklaration und Ausführung von Skills über das Internet. Es ermöglicht Skill-Anbietern, ihre Fähigkeiten bereitzustellen, ohne auf eine zentrale Plattform angewiesen zu sein, und erlaubt Skill-Konsumenten (hauptsächlich iFay-Instanzen), diese Skills autonom zu entdecken und remote aufzurufen.

### 1.2 Designprinzipien

- **Dezentrale Entdeckung:** Skill-Anbieter deklarieren Skills unter ihrer eigenen Domain. Konsumenten entdecken Skills über Well-Known URIs und direkte URLs — ein zentrales Register ist nicht erforderlich.
- **Selbstbeschreibend:** Jeder Skill wird vollständig durch ein standardisiertes SkillDescriptor-Dokument beschrieben, das seine Fähigkeiten, Schnittstelle und Aufrufmethode enthält.
- **Protokoll als Spezifikation:** Die Ergebnisse sind Protokolldokumente und Schema-Definitionsdateien, keine Softwareanwendung.

### 1.3 Architektur

Das Protokoll folgt einer dezentralen Provider-Consumer-Architektur, analog zum Hyperlink-Entdeckungsmodell des Webs und der Knotenentdeckung in P2P-Netzwerken.

```
┌─────────────────────────────────────────────────────┐
│              Skill Provider Domain                   │
│                                                     │
│  /.well-known/skill-sharing  ──► Skill Index        │
│       │                                             │
│       ├──► Skill Descriptor A ──► Invocation EP A   │
│       └──► Skill Descriptor B ──► Invocation EP B   │
└─────────────────────────────────────────────────────┘
        ▲                              ▲
        │ 1. Discovery                 │ 2. Invocation
        │                              │
┌───────┴──────────────────────────────┴──────────────┐
│              Skill Consumer (iFay)                    │
│                                                     │
│  Discovery Client ──► Schema Validator ──► Invoker  │
└─────────────────────────────────────────────────────┘
```

### 1.4 Protokoll-Interaktionsablauf

1. **Discovery-Phase:** Der Konsument sendet `GET /.well-known/skill-sharing` an die Provider-Domain und erhält einen Skill Index mit Verweisen auf alle deklarierten Skills.
2. **Validierungsphase:** Der Konsument validiert jeden SkillDescriptor gegen das Protokoll-Schema mithilfe eines Schema Validators.
3. **Invocation-Phase:** Der Konsument sendet eine POST-Anfrage an den Invocation Endpoint des Skills, erhält eine Ausführungs-ID und fragt den Status sowie die Ergebnisse ab.

### 1.5 Ergebnisse

| Ergebnis | Beschreibung |
|---|---|
| Protokoll-Spezifikationsdokumente | Verfügbar in 9 Sprachen unter `docs/{lang}/specification/` |
| JSON Schema | `schema/{version}/schema.json` — JSON Schema Draft 2020-12 |
| TypeScript-Typdefinitionen | `schema/{version}/schema.ts` — Strikte TypeScript-Interfaces |
| MDX-Dokumentation | `schema/{version}/schema.mdx` — Interaktive Schema-Dokumentation |

---

## 2. Terminologie

| Begriff | Definition |
|---|---|
| **iFay** | Ein intelligentes kognitives Begleitsystem; der primäre Konsument des Skill Sharing Protocol, der in der Lage ist, Skills zu entdecken und aufzurufen, um seine eigenen Fähigkeiten zu erweitern. |
| **Skill** | Eine aufrufbare Fähigkeitseinheit, die gemäß diesem Protokoll deklariert wird, einschließlich, aber nicht beschränkt auf Plugins, APIs, Wissenspakete und Aufgabenausführungsfähigkeiten. |
| **Skill Provider** | Eine Entität (Einzelperson, Organisation oder automatisiertes System), die Skills im Internet deklariert und bereitstellt. |
| **Skill Consumer** | Eine Entität, die Skills entdeckt und aufruft; hauptsächlich iFay-Instanzen. |
| **SkillDescriptor** | Ein Metadaten-Dokument, das dem Protokoll-Schema entspricht und die Fähigkeiten, Schnittstelle und Aufrufmethode eines Skills beschreibt. |
| **Discovery-Mechanismus** | Die Methoden und Prozesse, mit denen ein Skill Consumer SkillDescriptors in einem dezentralen Netzwerk lokalisiert und entdeckt. |
| **Protocol Schema** | Die formale Spezifikation, die die Struktur von SkillDescriptors definiert, einschließlich JSON Schema, TypeScript-Typen und MDX-Dokumentation. |
| **Skill Registry** | Ein optionaler Skill-Indexdienst zur Beschleunigung der Skill-Entdeckung; nicht erforderlich für den Protokollbetrieb. |
| **Invocation Endpoint** | Der im SkillDescriptor deklarierte Einstiegspunkt für den Remote-Aufruf. |
| **Capability Type** | Ein Klassifizierungsbezeichner für Skills: `plugin`, `api`, `knowledge` oder `task`. |
| **Schema Validator** | Ein Werkzeug oder eine Komponente, die die Konformität von SkillDescriptors mit dem Protocol Schema überprüft. |
| **Protocol Version** | Der Versionsbezeichner der Protokollspezifikation, gemäß Semantic Versioning. |
| **Well-Known URI** | Der standardisierte Entdeckungspfad `/.well-known/skill-sharing`, der zum Auffinden des Skill Index einer Domain verwendet wird. |

---

## 3. Spezifikation des Skill Descriptor

### 3.1 Übersicht

Ein SkillDescriptor ist die zentrale Datenstruktur des Protokolls. Es handelt sich um ein JSON-Dokument, das die Identität, Fähigkeiten, Schnittstelle, Aufrufmethode und Zugriffskontrollrichtlinie eines einzelnen Skills vollständig beschreibt.

Jeder SkillDescriptor MUSS gegen das JSON Schema des Protokolls (`schema/draft/schema.json`) validiert werden, bevor er als gültig betrachtet wird.

### 3.2 Pflichtfelder

Ein gültiger SkillDescriptor MUSS alle folgenden Felder enthalten:

| Feld | Typ | Beschreibung |
|---|---|---|
| `protocol` | `ProtocolVersion` | Die Protokollversion, der dieser Deskriptor entspricht. |
| `id` | `string` | Ein global eindeutiger Bezeichner für den Skill. |
| `name` | `string` | Ein menschenlesbarer Name für den Skill. |
| `version` | `string` | Die Version des Skills im SemVer-Format (z. B. `"1.0.0"`). |
| `capability_type` | `CapabilityType` | Die Fähigkeitsklassifizierung des Skills. |
| `description` | `string` | Eine menschenlesbare Beschreibung der Funktion des Skills. |
| `provider` | `object` | Informationen über den Skill-Anbieter (MUSS `name` enthalten). |
| `endpoint` | `InvocationEndpoint` | Die Konfiguration des Invocation Endpoint. |
| `inputs` | `ParameterDefinition[]` | Ein Array von Eingabeparameter-Definitionen. |
| `output` | `OutputDefinition` | Die Definition des Ausgabeformats. |
| `auth` | `AuthConfig` | Die Authentifizierungskonfiguration. |
| `access` | `AccessPolicy` | Die Zugriffskontrollrichtlinie. |

### 3.3 Optionale Felder

| Feld | Typ | Beschreibung |
|---|---|---|
| `tags` | `string[]` | Tags für Suche und Kategorisierung. |
| `documentation_url` | `string` | URL zur Dokumentation des Skills. |
| `created_at` | `string` | Erstellungszeitstempel im ISO 8601-Format. |
| `updated_at` | `string` | Zeitstempel der letzten Aktualisierung im ISO 8601-Format. |

### 3.4 Aufzählungstypen

#### 3.4.1 CapabilityType

Definiert die Klassifizierung der Fähigkeit eines Skills. Gültige Werte:

| Wert | Beschreibung |
|---|---|
| `"plugin"` | Ein Plugin, das die Funktionalität erweitert. |
| `"api"` | Ein API-Dienstendpunkt. |
| `"knowledge"` | Ein Wissenspaket oder eine Datenquelle. |
| `"task"` | Eine Aufgabenausführungsfähigkeit (menschlich oder automatisiert). |

#### 3.4.2 AccessPolicy

Definiert die Zugriffskontrollrichtlinie für einen Skill. Gültige Werte:

| Wert | Beschreibung |
|---|---|
| `"public"` | Für alle Konsumenten ohne Einschränkung zugänglich. |
| `"restricted"` | Nur für authentifizierte Konsumenten mit entsprechenden Berechtigungen zugänglich. |
| `"private"` | Vor nicht authentifizierten Discovery-Anfragen verborgen; erfordert Authentifizierung sowohl für die Entdeckung als auch für den Aufruf. |

#### 3.4.3 AuthType

Definiert die Authentifizierungsmethode, die zum Aufrufen eines Skills erforderlich ist. Gültige Werte:

| Wert | Beschreibung |
|---|---|
| `"api_key"` | API-Key-basierte Authentifizierung. |
| `"oauth2"` | OAuth 2.0-Authentifizierung. |
| `"custom"` | Ein benutzerdefinierter Authentifizierungsmechanismus. |
| `"none"` | Keine Authentifizierung erforderlich. |

#### 3.4.4 ExecutionStatus

Definiert den Ausführungsstatus eines Skill-Aufrufs. Gültige Werte:

| Wert | Beschreibung |
|---|---|
| `"accepted"` | Die Aufrufanfrage wurde angenommen. |
| `"running"` | Der Skill wird derzeit ausgeführt. |
| `"completed"` | Die Ausführung wurde erfolgreich abgeschlossen. |
| `"failed"` | Die Ausführung ist fehlgeschlagen. |
| `"timeout"` | Die Ausführung hat das Zeitlimit überschritten. |

### 3.5 Unterstruktur-Definitionen

#### 3.5.1 ProtocolVersion

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `version` | `string` | Ja | Versionszeichenkette im SemVer-Format (z. B. `"1.0.0"`). |
| `changelog_url` | `string` | Nein | URL zum Versions-Änderungsprotokoll. |

#### 3.5.2 ParameterDefinition

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `name` | `string` | Ja | Parametername. |
| `type` | `string` | Ja | JSON Schema-Typ (z. B. `"string"`, `"number"`, `"object"`). |
| `description` | `string` | Ja | Menschenlesbare Beschreibung des Parameters. |
| `required` | `boolean` | Ja | Ob dieser Parameter erforderlich ist. |
| `default` | `any` | Nein | Standardwert, wenn der Parameter nicht angegeben wird. |
| `schema` | `object` | Nein | Verschachteltes JSON Schema für komplexe Typen. |

#### 3.5.3 InvocationEndpoint

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `url` | `string` | Ja | Die Aufruf-URL. |
| `method` | `string` | Ja | HTTP-Methode. Eine von: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`. |
| `content_type` | `string` | Nein | Inhaltstyp der Anfrage. Standard ist `"application/json"`. |
| `status_url` | `string` | Nein | Statusabfrage-Endpunkt-Vorlage mit `{execution_id}`-Platzhalter. |
| `result_url` | `string` | Nein | Ergebnisabruf-Endpunkt-Vorlage. |
| `timeout_ms` | `number` | Nein | Aufruf-Zeitlimit in Millisekunden. |
| `retry` | `object` | Nein | Wiederholungskonfiguration mit `max_attempts` und `backoff_ms`. |

#### 3.5.4 OutputDefinition

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `content_type` | `string` | Ja | MIME-Typ der Ausgabe (z. B. `"application/json"`). |
| `schema` | `object` | Nein | JSON Schema, das die Ausgabestruktur beschreibt. |
| `description` | `string` | Nein | Menschenlesbare Beschreibung der Ausgabe. |

#### 3.5.5 AuthConfig

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `type` | `AuthType` | Ja | Der Authentifizierungstyp. |
| `description` | `string` | Nein | Menschenlesbare Beschreibung der Authentifizierungsanforderungen. |
| `header` | `string` | Nein | Header-Name für API-Key-Authentifizierung. |
| `oauth2` | `object` | Nein | OAuth 2.0-Konfiguration (erforderlich wenn `type` `"oauth2"` ist). |
| `custom` | `object` | Nein | Benutzerdefinierte Authentifizierungskonfiguration (erforderlich wenn `type` `"custom"` ist). |

**OAuth2-Konfiguration:**

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `authorization_url` | `string` | Ja | Die OAuth 2.0-Autorisierungs-URL. |
| `token_url` | `string` | Ja | Die OAuth 2.0-Token-URL. |
| `scopes` | `Record<string, string>` | Ja | Verfügbare Bereiche als Schlüssel-Wert-Paare (Bereichsname → Beschreibung). |

**Benutzerdefinierte Authentifizierungskonfiguration:**

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `instructions` | `string` | Ja | Menschenlesbare Anweisungen für den benutzerdefinierten Authentifizierungsablauf. |
| `parameters` | `ParameterDefinition[]` | Ja | Für die benutzerdefinierte Authentifizierung erforderliche Parameter. |

### 3.6 Beispiel: Gültiger SkillDescriptor

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/changelog"
  },
  "id": "example-provider/weather-forecast",
  "name": "Weather Forecast",
  "version": "2.1.0",
  "capability_type": "api",
  "description": "Provides weather forecast data for a given location and date range.",
  "provider": {
    "name": "Example Weather Co.",
    "url": "https://weather.example.com",
    "contact": "api-support@example.com"
  },
  "endpoint": {
    "url": "https://api.weather.example.com/v2/forecast",
    "method": "POST",
    "content_type": "application/json",
    "status_url": "https://api.weather.example.com/v2/status/{execution_id}",
    "result_url": "https://api.weather.example.com/v2/result/{execution_id}",
    "timeout_ms": 30000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  },
  "inputs": [
    {
      "name": "location",
      "type": "string",
      "description": "City name or coordinates (lat,lon).",
      "required": true
    },
    {
      "name": "days",
      "type": "number",
      "description": "Number of forecast days (1-14).",
      "required": false,
      "default": 7
    }
  ],
  "output": {
    "content_type": "application/json",
    "description": "JSON object containing forecast data.",
    "schema": {
      "type": "object",
      "properties": {
        "location": { "type": "string" },
        "forecasts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "date": { "type": "string" },
              "high": { "type": "number" },
              "low": { "type": "number" },
              "condition": { "type": "string" }
            }
          }
        }
      }
    }
  },
  "auth": {
    "type": "api_key",
    "description": "Provide your API key in the X-API-Key header.",
    "header": "X-API-Key"
  },
  "access": "public",
  "tags": ["weather", "forecast", "meteorology"],
  "documentation_url": "https://weather.example.com/docs/api",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-06-20T14:30:00Z"
}
```

---

## 4. Spezifikation des Discovery-Mechanismus

### 4.1 Übersicht

Der Discovery-Mechanismus definiert, wie Skill-Konsumenten SkillDescriptors in einem dezentralen Netzwerk lokalisieren. Drei Entdeckungspfade werden unterstützt, wobei die Well-Known URI die primäre Methode ist.

### 4.2 Entdeckungspfade

| Pfad | Methode | Beschreibung |
|---|---|---|
| **Well-Known URI** | `GET /.well-known/skill-sharing` | Primäre Entdeckungsmethode. Gibt einen Skill Index für die Domain zurück. |
| **Direkte URL** | `GET {skill_descriptor_url}` | Ruft einen bestimmten SkillDescriptor ab, wenn dessen URL bereits bekannt ist. |
| **Registry-Abfrage** | `GET {registry_url}/skills?type={capability_type}` | Optional. Fragt eine Skill Registry für den Batch-Abruf von Skills ab. |

### 4.3 Well-Known URI

#### 4.3.1 Pfad

```
/.well-known/skill-sharing
```

Skill-Anbieter MÜSSEN ein Skill Index-Dokument unter diesem Pfad bereitstellen. Die Antwort MUSS einen `Content-Type` von `application/json` haben.

#### 4.3.2 Skill Index-Struktur

Der Skill Index ist ein JSON-Dokument, das alle von einer Provider-Domain deklarierten Skills auflistet.

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `protocol` | `ProtocolVersion` | Ja | Die Protokollversion. |
| `provider` | `object` | Ja | Anbieterinformationen (MUSS `name` enthalten; KANN `url` enthalten). |
| `skills` | `SkillIndexEntry[]` | Ja | Array von Skill-Index-Einträgen. |

#### 4.3.3 SkillIndexEntry-Struktur

Jeder Eintrag im Skill Index enthält zusammenfassende Informationen über einen Skill:

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `id` | `string` | Ja | Der eindeutige Bezeichner des Skills. |
| `name` | `string` | Ja | Der menschenlesbare Name des Skills. |
| `capability_type` | `CapabilityType` | Ja | Die Fähigkeitsklassifizierung des Skills. |
| `description` | `string` | Ja | Eine kurze Beschreibung des Skills. |
| `descriptor_url` | `string` | Ja | Die vollständige URL zum vollständigen SkillDescriptor des Skills. |
| `access` | `AccessPolicy` | Ja | Die Zugriffskontrollrichtlinie des Skills. |
| `version` | `string` | Ja | Die Version des Skills. |

#### 4.3.4 Eindeutigkeit der Skill-ID

Alle Skill-IDs innerhalb eines einzelnen Skill Index MÜSSEN eindeutig sein. Ein Skill Index mit doppelten IDs gilt als ungültig.

### 4.4 Zugriffskontrolle bei der Entdeckung

Wenn eine **nicht authentifizierte** Anfrage an die Well-Known URI gestellt wird:
- Skills mit `access: "private"` MÜSSEN aus der Antwort ausgeschlossen werden.
- Skills mit `access: "public"` oder `access: "restricted"` MÜSSEN enthalten sein.

Wenn eine **authentifizierte** Anfrage gestellt wird:
- Alle Skills (einschließlich `private`) KÖNNEN enthalten sein, abhängig von der Autorisierungslogik des Anbieters.

### 4.5 Filterung nach Capability Type

Konsumenten KÖNNEN den Skill Index nach `capability_type` filtern. Beim Filtern:
- Das Ergebnis MUSS nur Einträge enthalten, deren `capability_type` dem Filterwert entspricht.
- Alle Einträge im ursprünglichen Index, die dem Filterwert entsprechen, MÜSSEN im Ergebnis erscheinen.

### 4.6 Beispiel: Skill Index

```json
{
  "protocol": {
    "version": "1.0.0"
  },
  "provider": {
    "name": "Example Corp",
    "url": "https://example.com"
  },
  "skills": [
    {
      "id": "example-corp/weather-forecast",
      "name": "Weather Forecast",
      "capability_type": "api",
      "description": "Provides weather forecast data.",
      "descriptor_url": "https://example.com/skills/weather-forecast.json",
      "access": "public",
      "version": "2.1.0"
    },
    {
      "id": "example-corp/document-translator",
      "name": "Document Translator",
      "capability_type": "task",
      "description": "Translates documents between languages.",
      "descriptor_url": "https://example.com/skills/document-translator.json",
      "access": "restricted",
      "version": "1.3.0"
    },
    {
      "id": "example-corp/internal-analytics",
      "name": "Internal Analytics",
      "capability_type": "plugin",
      "description": "Internal analytics dashboard plugin.",
      "descriptor_url": "https://example.com/skills/internal-analytics.json",
      "access": "private",
      "version": "0.9.0"
    }
  ]
}
```

> **Hinweis:** Bei einer nicht authentifizierten Discovery-Anfrage würde der Eintrag `"internal-analytics"` (mit `access: "private"`) aus der Antwort ausgeschlossen.

---

## 5. Spezifikation des Invocation-Protokolls

### 5.1 Übersicht

Das Invocation-Protokoll definiert, wie ein Skill-Konsument einen entdeckten Skill remote aufruft. Das Protokoll folgt einem asynchronen Anfrage-Antwort-Muster mit Statusabfrage.

### 5.2 Aufrufablauf

```
Consumer                          Provider
   │                                 │
   │  POST {invocation_endpoint}     │
   │  (InvocationRequest)            │
   │────────────────────────────────►│
   │                                 │
   │  202 Accepted                   │
   │  (InvocationResponse:accepted)  │
   │◄────────────────────────────────│
   │                                 │
   │  GET {status_url}/{exec_id}     │
   │────────────────────────────────►│
   │                                 │
   │  200 OK                         │
   │  (InvocationResponse:running)   │
   │◄────────────────────────────────│
   │                                 │
   │  GET {result_url}/{exec_id}     │
   │────────────────────────────────►│
   │                                 │
   │  200 OK                         │
   │  (InvocationResponse:completed) │
   │◄────────────────────────────────│
```

### 5.3 Aufrufanfrage

Eine InvocationRequest wird vom Konsumenten gesendet, um die Skill-Ausführung zu initiieren.

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `caller` | `object` | Ja | Identitätsinformationen des Aufrufers. |
| `caller.id` | `string` | Ja | Eindeutiger Bezeichner des Aufrufers. |
| `caller.type` | `string` | Ja | Aufrufertyp (z. B. `"ifay"`, `"service"`, `"user"`). |
| `caller.credentials` | `object` | Nein | Authentifizierungsdaten. |
| `skill_id` | `string` | Ja | Der eindeutige Bezeichner des Ziel-Skills. |
| `inputs` | `Record<string, unknown>` | Ja | Eingabeparameter als Schlüssel-Wert-Paare. |
| `context` | `object` | Nein | Aufrufkontext. |
| `context.trace_id` | `string` | Nein | Bezeichner für verteiltes Tracing. |
| `context.priority` | `string` | Nein | Ausführungspriorität: `"low"`, `"normal"` oder `"high"`. |
| `context.timeout_ms` | `number` | Nein | Clientseitiges Zeitlimit in Millisekunden. |

#### Beispiel: Aufrufanfrage

```json
{
  "caller": {
    "id": "ifay-instance-001",
    "type": "ifay",
    "credentials": {
      "api_key": "sk-abc123..."
    }
  },
  "skill_id": "example-corp/weather-forecast",
  "inputs": {
    "location": "Tokyo",
    "days": 5
  },
  "context": {
    "trace_id": "trace-7f3a9b2c",
    "priority": "normal",
    "timeout_ms": 30000
  }
}
```

### 5.4 Aufrufantwort

Eine InvocationResponse wird vom Anbieter in jeder Phase der Ausführung zurückgegeben.

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `execution_id` | `string` | Ja | Eindeutiger Bezeichner für diese Ausführung. |
| `status` | `ExecutionStatus` | Ja | Aktueller Ausführungsstatus. |
| `skill_id` | `string` | Ja | Der Bezeichner des Ziel-Skills. |
| `output` | `any` | Nein | Ausgabedaten (vorhanden wenn `status` `"completed"` ist). |
| `error` | `object` | Nein | Fehlerinformationen (vorhanden wenn `status` `"failed"` oder `"timeout"` ist). |
| `error.code` | `string` | Ja* | Fehlercode. |
| `error.message` | `string` | Ja* | Menschenlesbare Fehlermeldung. |
| `error.details` | `any` | Nein | Zusätzliche Fehlerdetails. |
| `error.retry` | `object` | Nein | Wiederholungsvorschlag mit `suggested_delay_ms` und `max_attempts`. |
| `timestamps` | `object` | Ja | Ausführungszeitstempel. |
| `timestamps.created_at` | `string` | Ja | Wann die Ausführung erstellt wurde (ISO 8601). |
| `timestamps.updated_at` | `string` | Ja | Wann die Ausführung zuletzt aktualisiert wurde (ISO 8601). |
| `timestamps.completed_at` | `string` | Nein | Wann die Ausführung abgeschlossen wurde (ISO 8601). |

> \* Erforderlich wenn das `error`-Objekt vorhanden ist.

#### Beispiel: Aufrufantwort (Abgeschlossen)

```json
{
  "execution_id": "exec-a1b2c3d4",
  "status": "completed",
  "skill_id": "example-corp/weather-forecast",
  "output": {
    "location": "Tokyo",
    "forecasts": [
      {
        "date": "2025-07-01",
        "high": 31,
        "low": 24,
        "condition": "Partly Cloudy"
      },
      {
        "date": "2025-07-02",
        "high": 29,
        "low": 22,
        "condition": "Rain"
      }
    ]
  },
  "timestamps": {
    "created_at": "2025-07-01T10:00:00Z",
    "updated_at": "2025-07-01T10:00:05Z",
    "completed_at": "2025-07-01T10:00:05Z"
  }
}
```

### 5.5 Invocation Endpoints

Das `endpoint`-Feld des SkillDescriptors definiert drei URL-Vorlagen:

| Endpunkt | Zweck | Vorlagenvariable |
|---|---|---|
| `url` | Aufrufanfrage einreichen | — |
| `status_url` | Ausführungsstatus abfragen | `{execution_id}` |
| `result_url` | Ausführungsergebnis abrufen | `{execution_id}` |

Konsumenten MÜSSEN `{execution_id}` durch die tatsächliche Ausführungs-ID ersetzen, die in der initialen Antwort zurückgegeben wird.

---

## 6. Spezifikation der Versionsverwaltung

### 6.1 Semantische Versionierung

Das Skill Sharing Protocol folgt [Semantic Versioning 2.0.0](https://semver.org/) (SemVer). Alle Versionszeichenketten MÜSSEN dem Format `MAJOR.MINOR.PATCH` entsprechen, wobei:

- **MAJOR** — Eine nicht-negative Ganzzahl. Wird bei inkompatiblen Protokolländerungen erhöht.
- **MINOR** — Eine nicht-negative Ganzzahl. Wird bei abwärtskompatiblen Ergänzungen erhöht.
- **PATCH** — Eine nicht-negative Ganzzahl. Wird bei abwärtskompatiblen Fehlerbehebungen erhöht.

Beispiele für gültige Versionszeichenketten: `"1.0.0"`, `"2.3.1"`, `"0.1.0"`.

### 6.2 Versionsdeklaration

Jeder SkillDescriptor MUSS die Protokollversion, der er entspricht, im Feld `protocol.version` deklarieren:

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/protocol/changelog"
  }
}
```

Das optionale Feld `changelog_url` bietet einen Verweis auf das Versions-Änderungsprotokoll.

### 6.3 Kompatibilitätsregeln

| Bedingung | Ergebnis |
|---|---|
| Deskriptor MAJOR > Konsument MAJOR | **Inkompatibel.** Der Konsument kann eine neuere Hauptversion nicht verarbeiten. |
| Deskriptor MAJOR = Konsument MAJOR | **Kompatibel.** Unterschiede in Minor- und Patch-Versionen sind abwärtskompatibel. |
| Deskriptor MAJOR < Konsument MAJOR | **Kompatibel.** Der Konsument kann ältere Hauptversionen verarbeiten. |

### 6.4 Behandlung von Inkompatibilität

Wenn ein Konsument einen SkillDescriptor mit einer inkompatiblen Protokollversion antrifft:

1. Der Konsument DARF NICHT versuchen, den Skill aufzurufen.
2. Der Konsument SOLLTE einen `VERSION_INCOMPATIBLE`-Fehler zurückgeben (siehe [Abschnitt 8](#8-spezifikation-der-fehlerbehandlung)).
3. Die Fehlerantwort SOLLTE den unterstützten Versionsbereich des Konsumenten und die erforderliche Version des Deskriptors enthalten.

### 6.5 Schema-Versionierung

Schema-Definitionsdateien werden in versionierten Verzeichnissen gepflegt:

```
schema/
├── draft/              # Aktueller Arbeitsentwurf
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/         # Veröffentlichte Version (datumsbasiert)
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

Wenn eine neue Protokollversion veröffentlicht wird, werden die Entwurfs-Schemas in ein neues datumsstempelbasiertes Verzeichnis kopiert.

---

## 7. Spezifikation für Sicherheit und Authentifizierung

### 7.1 Übersicht

Das Skill Sharing Protocol bietet ein flexibles Framework für Authentifizierung und Zugriffskontrolle. Skill-Anbieter deklarieren ihre Sicherheitsanforderungen im SkillDescriptor, und Konsumenten sind dafür verantwortlich, diese Anforderungen vor dem Aufruf zu erfüllen.

### 7.2 Authentifizierungstypen

#### 7.2.1 API Key (`api_key`)

Die einfachste Authentifizierungsmethode. Der Konsument stellt einen API-Key in einem angegebenen HTTP-Header bereit.

```json
{
  "auth": {
    "type": "api_key",
    "description": "Include your API key in the X-API-Key header.",
    "header": "X-API-Key"
  }
}
```

#### 7.2.2 OAuth 2.0 (`oauth2`)

Standard-OAuth 2.0-Authentifizierungsablauf. Der SkillDescriptor stellt die Autorisierungs- und Token-URLs zusammen mit den verfügbaren Bereichen bereit.

```json
{
  "auth": {
    "type": "oauth2",
    "description": "OAuth 2.0 authentication required.",
    "oauth2": {
      "authorization_url": "https://auth.example.com/authorize",
      "token_url": "https://auth.example.com/token",
      "scopes": {
        "read:forecast": "Read forecast data",
        "write:preferences": "Update user preferences"
      }
    }
  }
}
```

#### 7.2.3 Benutzerdefiniert (`custom`)

Für Authentifizierungsmethoden, die nicht durch API Key oder OAuth 2.0 abgedeckt werden. Der Deskriptor stellt menschenlesbare Anweisungen und erforderliche Parameter bereit.

```json
{
  "auth": {
    "type": "custom",
    "description": "HMAC-SHA256 signed requests.",
    "custom": {
      "instructions": "Sign the request body with your secret key using HMAC-SHA256 and include the signature in the X-Signature header.",
      "parameters": [
        {
          "name": "secret_key",
          "type": "string",
          "description": "Your HMAC secret key.",
          "required": true
        }
      ]
    }
  }
}
```

#### 7.2.4 Keine (`none`)

Keine Authentifizierung erforderlich. Der Skill ist frei zugänglich.

```json
{
  "auth": {
    "type": "none"
  }
}
```

### 7.3 Zugriffskontrollrichtlinien

Die Zugriffskontrolle wird auf SkillDescriptor-Ebene über das Feld `access` deklariert:

| Richtlinie | Discovery-Verhalten | Aufrufverhalten |
|---|---|---|
| `"public"` | In allen Discovery-Antworten sichtbar. | Keine Authentifizierung erforderlich (es sei denn, `auth.type` ist nicht `"none"`). |
| `"restricted"` | In allen Discovery-Antworten sichtbar. | Authentifizierung erforderlich; nur autorisierte Konsumenten dürfen aufrufen. |
| `"private"` | Vor nicht authentifizierten Discovery-Anfragen verborgen. | Authentifizierung erforderlich; nur autorisierte Konsumenten dürfen aufrufen. |

### 7.4 Authentifizierungsablauf

1. Der Konsument ruft den SkillDescriptor ab.
2. Der Konsument prüft das Feld `auth`, um die erforderliche Authentifizierungsmethode zu bestimmen.
3. Der Konsument fügt die entsprechenden Anmeldedaten der Aufrufanfrage bei.
4. Wenn Anmeldedaten fehlen oder ungültig sind, gibt der Anbieter einen `401`-Fehler mit Details zur erforderlichen Authentifizierungsmethode zurück.
5. Wenn Anmeldedaten gültig sind, aber unzureichende Berechtigungen vorliegen, gibt der Anbieter einen `403`-Fehler zurück.

---

## 8. Spezifikation der Fehlerbehandlung

### 8.1 Fehlerkategorien

Das Protokoll definiert sieben Fehlerkategorien:

| Fehlerkategorie | Code | HTTP-Status | Szenario |
|---|---|---|---|
| Validierungsfehler | `VALIDATION_ERROR` | N/A (lokal) | Schema Validator erkennt einen ungültigen SkillDescriptor. |
| Authentifizierung erforderlich | `AUTH_REQUIRED` | 401 | Gültige Anmeldedaten wurden beim Aufrufen eines geschützten Skills nicht bereitgestellt. |
| Berechtigung verweigert | `PERMISSION_DENIED` | 403 | Anmeldedaten sind gültig, aber die Berechtigungen sind unzureichend. |
| Skill nicht gefunden | `SKILL_NOT_FOUND` | 404 | Die angeforderte Skill-ID oder Deskriptor-URL existiert nicht. |
| Aufruf-Zeitüberschreitung | `INVOCATION_TIMEOUT` | 408 / 504 | Die Skill-Ausführung hat das konfigurierte Zeitlimit überschritten. |
| Endpunkt nicht erreichbar | `ENDPOINT_UNREACHABLE` | 502 / 503 | Der Invocation Endpoint konnte nicht erreicht werden. |
| Version inkompatibel | `VERSION_INCOMPATIBLE` | 422 | Die Protokollversion des SkillDescriptors ist mit dem Konsumenten inkompatibel. |

### 8.2 Einheitliches Fehlerantwortformat

Alle Fehlerantworten MÜSSEN der folgenden Struktur entsprechen:

```json
{
  "error": {
    "code": "<ErrorCode>",
    "message": "<human-readable message>",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `error.code` | `string` | Ja | Einer der sieben oben aufgeführten Fehlercodes. |
| `error.message` | `string` | Ja | Eine menschenlesbare Fehlermeldung. |
| `error.details` | `any` | Nein | Zusätzliche kontextspezifische Fehlerdetails. |
| `error.retry` | `object` | Nein | Wiederholungsvorschlag. |
| `error.retry.suggested_delay_ms` | `number` | Ja* | Empfohlene Verzögerung vor einem erneuten Versuch (Millisekunden). |
| `error.retry.max_attempts` | `number` | Ja* | Maximale Anzahl von Wiederholungsversuchen. |

> \* Erforderlich wenn das `retry`-Objekt vorhanden ist.

### 8.3 Strategien zur Fehlerbehandlung

#### 8.3.1 Validierungsfehler

Wird lokal vom Schema Validator zurückgegeben, wenn ein SkillDescriptor die Validierung nicht besteht. Das Feld `details` SOLLTE ein Array enthalten mit:

- `path` — Der JSON Pointer-Pfad zum ungültigen Feld.
- `message` — Eine Beschreibung des Validierungsfehlers.
- `expected` — Der erwartete Wert oder Typ.
- `actual` — Der tatsächlich gefundene Wert oder Typ.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid SkillDescriptor document",
    "details": [
      {
        "path": "/capability_type",
        "message": "must be equal to one of the allowed values",
        "expected": ["plugin", "api", "knowledge", "task"],
        "actual": "invalid_type"
      },
      {
        "path": "/endpoint/method",
        "message": "must be equal to one of the allowed values",
        "expected": ["GET", "POST", "PUT", "DELETE"],
        "actual": "PATCH"
      }
    ]
  }
}
```

#### 8.3.2 Authentifizierung erforderlich

Wird zurückgegeben, wenn der Konsument keine gültigen Anmeldedaten bereitstellt. Das Feld `details` SOLLTE die erforderliche Authentifizierungsmethode beschreiben, um dem Konsumenten die automatische Authentifizierung zu ermöglichen.

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://auth.example.com/authorize"
    },
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 1
    }
  }
}
```

#### 8.3.3 Berechtigung verweigert

Wird zurückgegeben, wenn die Anmeldedaten gültig sind, der Konsument aber nicht über die erforderlichen Berechtigungen verfügt.

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to invoke this skill",
    "details": {
      "required_scopes": ["read:forecast"],
      "granted_scopes": []
    }
  }
}
```

#### 8.3.4 Skill nicht gefunden

Wird zurückgegeben, wenn die angeforderte Skill-ID oder Deskriptor-URL nicht existiert.

```json
{
  "error": {
    "code": "SKILL_NOT_FOUND",
    "message": "Skill 'example-corp/nonexistent' was not found",
    "details": {
      "skill_id": "example-corp/nonexistent"
    }
  }
}
```

#### 8.3.5 Aufruf-Zeitüberschreitung

Wird zurückgegeben, wenn die Skill-Ausführung das konfigurierte Zeitlimit überschreitet. Das Feld `retry` bietet Hinweise für Wiederholungsversuche.

```json
{
  "error": {
    "code": "INVOCATION_TIMEOUT",
    "message": "Skill execution timed out after 30000ms",
    "details": {
      "timeout_ms": 30000,
      "execution_id": "exec-a1b2c3d4"
    },
    "retry": {
      "suggested_delay_ms": 1000,
      "max_attempts": 3
    }
  }
}
```

#### 8.3.6 Endpunkt nicht erreichbar

Wird zurückgegeben, wenn der Invocation Endpoint nicht erreicht werden kann. Konsumenten SOLLTEN Strategien mit exponentiellem Backoff für Wiederholungsversuche implementieren.

```json
{
  "error": {
    "code": "ENDPOINT_UNREACHABLE",
    "message": "Failed to connect to invocation endpoint",
    "details": {
      "url": "https://api.weather.example.com/v2/forecast",
      "reason": "Connection refused"
    },
    "retry": {
      "suggested_delay_ms": 2000,
      "max_attempts": 3
    }
  }
}
```

#### 8.3.7 Version inkompatibel

Wird zurückgegeben, wenn die Protokollversion des SkillDescriptors mit dem Konsumenten inkompatibel ist. Das Feld `details` SOLLTE sowohl den unterstützten Versionsbereich des Konsumenten als auch die erforderliche Version des Deskriptors enthalten.

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.5.0",
    "details": {
      "descriptor_version": "2.0.0",
      "consumer_version": "1.5.0",
      "supported_major": 1
    }
  }
}
```

---

## 9. Schema-Referenz

### 9.1 JSON Schema

Die maßgebliche Schema-Definition wird als JSON Schema (Draft 2020-12)-Datei gepflegt:

- **Entwurf:** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)
- **Schema-ID:** `https://ifay.org/schema/draft/skill-sharing-protocol.json`

Das Schema definiert die folgenden Top-Level-Typen über `$defs`:

| Definition | Beschreibung |
|---|---|
| `SkillDescriptor` (Wurzel) | Die vollständige SkillDescriptor-Struktur. |
| `SkillIndex` | Die Well-Known URI-Antwort mit einer Liste von Skills. |
| `SkillIndexEntry` | Ein einzelner Eintrag im Skill Index. |
| `InvocationRequest` | Die Struktur der Skill-Aufrufanfrage. |
| `InvocationResponse` | Die Struktur der Skill-Aufrufantwort. |
| `ProtocolVersion` | Protokollversionsinformationen. |
| `CapabilityType` | Aufzählung der Fähigkeitstypen. |
| `AccessPolicy` | Aufzählung der Zugriffskontrollrichtlinien. |
| `AuthType` | Aufzählung der Authentifizierungstypen. |
| `ExecutionStatus` | Aufzählung der Ausführungsstatus. |
| `ParameterDefinition` | Definition von Eingabe-/Ausgabeparametern. |
| `AuthConfig` | Authentifizierungskonfiguration. |
| `InvocationEndpoint` | Konfiguration des Invocation Endpoint. |
| `OutputDefinition` | Definition des Ausgabeformats. |

### 9.2 TypeScript-Typdefinitionen

TypeScript-Interfaces werden für typsichere Entwicklung bereitgestellt:

- **Entwurf:** [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

Alle TypeScript-Typen werden exportiert und behalten die semantische Äquivalenz mit den JSON Schema-Definitionen bei. Die Zuordnungsregeln sind:

| TypeScript | JSON Schema |
|---|---|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| Union-Typ `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| Optionales Feld `field?` | Nicht im `required`-Array |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (uneingeschränkt) |

### 9.3 Schema-Validierung

Implementierungen SOLLTEN die JSON Schema-Datei (`schema.json`) mit einem JSON Schema Draft 2020-12-konformen Validator (z. B. [Ajv](https://ajv.js.org/)) verwenden, um SkillDescriptors zu validieren.

Der Schema Validator bietet drei Kernoperationen:

| Operation | Beschreibung |
|---|---|
| `validate(document)` | Validiert ein Dokument gegen das Schema. Gibt ein Ergebnis mit `valid` (boolean) und `errors` (Array von Validierungsfehlern) zurück. |
| `parse(document)` | Validiert und parst ein Dokument in ein typisiertes `SkillDescriptor`-Objekt. Wirft bei ungültiger Eingabe einen Fehler. |
| `serialize(descriptor)` | Serialisiert ein `SkillDescriptor`-Objekt in formatiertes JSON (2-Leerzeichen-Einrückung). |

---

## 10. Anhang: Vollständige Beispiele

### 10.1 Vollständiger Discovery- und Invocation-Workflow

**Schritt 1: Skills über Well-Known URI entdecken**

```http
GET /.well-known/skill-sharing HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**Antwort:**

```json
{
  "protocol": { "version": "1.0.0" },
  "provider": {
    "name": "Example Skills Provider",
    "url": "https://skills.example.com"
  },
  "skills": [
    {
      "id": "example/text-summarizer",
      "name": "Text Summarizer",
      "capability_type": "api",
      "description": "Summarizes long text into concise paragraphs.",
      "descriptor_url": "https://skills.example.com/skills/text-summarizer.json",
      "access": "public",
      "version": "1.2.0"
    }
  ]
}
```

**Schritt 2: Den vollständigen SkillDescriptor abrufen**

```http
GET /skills/text-summarizer.json HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**Antwort:** Ein vollständiges SkillDescriptor-Dokument (siehe [Abschnitt 3.6](#36-beispiel-gültiger-skilldescriptor) für die vollständige Struktur).

**Schritt 3: Den SkillDescriptor validieren**

Der Konsument validiert das abgerufene Dokument gegen `schema/draft/schema.json` mithilfe eines Schema Validators. Wenn die Validierung fehlschlägt, DARF der Konsument den Skill NICHT aufrufen.

**Schritt 4: Den Skill aufrufen**

```http
POST /api/v1/summarize HTTP/1.1
Host: skills.example.com
Content-Type: application/json

{
  "caller": {
    "id": "ifay-instance-042",
    "type": "ifay"
  },
  "skill_id": "example/text-summarizer",
  "inputs": {
    "text": "The Skill Sharing Protocol defines a decentralized mechanism...",
    "max_length": 100
  },
  "context": {
    "trace_id": "trace-9e8d7c6b",
    "priority": "normal"
  }
}
```

**Antwort (Angenommen):**

```json
{
  "execution_id": "exec-f5e4d3c2",
  "status": "accepted",
  "skill_id": "example/text-summarizer",
  "timestamps": {
    "created_at": "2025-07-01T12:00:00Z",
    "updated_at": "2025-07-01T12:00:00Z"
  }
}
```

**Schritt 5: Status abfragen**

```http
GET /api/v1/status/exec-f5e4d3c2 HTTP/1.1
Host: skills.example.com
```

**Antwort (Abgeschlossen):**

```json
{
  "execution_id": "exec-f5e4d3c2",
  "status": "completed",
  "skill_id": "example/text-summarizer",
  "output": {
    "summary": "The Skill Sharing Protocol enables decentralized skill discovery and invocation across the internet."
  },
  "timestamps": {
    "created_at": "2025-07-01T12:00:00Z",
    "updated_at": "2025-07-01T12:00:02Z",
    "completed_at": "2025-07-01T12:00:02Z"
  }
}
```

### 10.2 Beispiel einer Fehlerantwort

**Aufruf eines Skills ohne Authentifizierung:**

```http
POST /api/v1/forecast HTTP/1.1
Host: api.weather.example.com
Content-Type: application/json

{
  "caller": { "id": "ifay-001", "type": "ifay" },
  "skill_id": "example-corp/weather-forecast",
  "inputs": { "location": "Berlin" }
}
```

**Antwort (401):**

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "api_key",
      "header": "X-API-Key"
    },
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 1
    }
  }
}
```

---

## Lizenz

Diese Spezifikation ist Teil des Skill Sharing Protocol-Projekts. Siehe die [LICENSE](../../../../LICENSE)-Datei für Details.
