# Kapitel 4: Skill-Deskriptor

## 4.1 Überblick

Der Skill Descriptor ist die zentrale Datenstruktur des Protokolls, existiert als JSON-Dokument und beschreibt vollständig die Metadaten eines Skills. Er dient als Vertrag zwischen Skill-Anbietern und -Konsumenten — Anbieter deklarieren die Fähigkeiten eines Skills über den Descriptor, und Konsumenten verstehen durch ihn, wie der Skill aufgerufen wird.

## 4.2 Vollständige Felddefinitionen

### Pflichtfelder

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `protocol` | ProtocolVersion | Protokollversionsinformation |
| `id` | string | Eindeutiger Skill-Bezeichner |
| `name` | string | Skill-Name |
| `version` | string | Skill-Version (SemVer-Format) |
| `capability_type` | CapabilityType | Fähigkeitstyp |
| `description` | string | Skill-Beschreibung |
| `provider` | object | Skill-Anbieterinformation |
| `endpoint` | InvocationEndpoint | Aufrufendpunkt-Konfiguration |
| `inputs` | ParameterDefinition[] | Eingabeparameter-Definitionen |
| `output` | OutputDefinition | Ausgabeformat-Definition |
| `auth` | AuthConfig | Authentifizierungskonfiguration |
| `access` | AccessPolicy | Zugriffskontrollrichtlinie |

### Optionale Felder

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `tags` | string[] | Tags (für Suche und Klassifikation) |
| `documentation_url` | string | Skill-Dokumentations-URL |
| `created_at` | string | Erstellungszeit (ISO 8601) |
| `updated_at` | string | Aktualisierungszeit (ISO 8601) |

## 4.3 Aufzählungstypen

### CapabilityType

```json
["plugin", "api", "knowledge", "task"]
```

- `plugin`: Einbettbares Funktionsmodul
- `api`: Remote-Service-Schnittstelle
- `knowledge`: Strukturierte Wissensressource
- `task`: Von Menschen oder iFay ausführbare Aufgabe

### AccessPolicy

```json
["public", "restricted", "private"]
```

- `public`: Offen; jeder kann entdecken und aufrufen
- `restricted`: Entdeckbar, aber Aufruf erfordert Authentifizierung
- `private`: Ohne Authentifizierung nicht entdeckbar

### AuthType

```json
["api_key", "oauth2", "custom", "none"]
```

## 4.4 Unterstruktur-Definitionen

### ProtocolVersion

```json
{
  "version": "1.0.0",
  "changelog_url": "https://example.com/changelog"
}
```

- `version` (Pflicht): Protokollversionsnummer im SemVer-Format
- `changelog_url` (Optional): URL des Versions-Changelogs

### InvocationEndpoint

```json
{
  "url": "https://example.com/skills/translate/invoke",
  "method": "POST",
  "content_type": "application/json",
  "status_url": "https://example.com/skills/translate/status/{execution_id}",
  "result_url": "https://example.com/skills/translate/result/{execution_id}",
  "timeout_ms": 30000,
  "retry": {
    "max_attempts": 3,
    "backoff_ms": 1000
  }
}
```

### ParameterDefinition

```json
{
  "name": "text",
  "type": "string",
  "description": "Zu übersetzender Text",
  "required": true,
  "default": null,
  "schema": { "minLength": 1, "maxLength": 10000 }
}
```

### AuthConfig

API-Key-Authentifizierungsbeispiel:
```json
{
  "type": "api_key",
  "description": "API Key über HTTP Header übergeben",
  "header": "X-API-Key"
}
```

OAuth 2.0-Authentifizierungsbeispiel:
```json
{
  "type": "oauth2",
  "oauth2": {
    "authorization_url": "https://example.com/oauth/authorize",
    "token_url": "https://example.com/oauth/token",
    "scopes": {
      "skill:invoke": "Skill aufrufen",
      "skill:read": "Skill-Informationen lesen"
    }
  }
}
```

### OutputDefinition

```json
{
  "content_type": "application/json",
  "schema": {
    "type": "object",
    "properties": {
      "translated_text": { "type": "string" },
      "source_language": { "type": "string" },
      "target_language": { "type": "string" }
    }
  },
  "description": "Übersetzungsergebnis mit übersetztem Text und Sprachinformationen"
}
```

## 4.5 Vollständiges Beispiel

Das folgende ist ein vollständiges Descriptor-Beispiel für einen Übersetzungs-Skill:

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://skill-sharing.org/changelog"
  },
  "id": "com.example.translate-v1",
  "name": "Universal Translator",
  "version": "2.1.0",
  "capability_type": "api",
  "description": "Hochwertiger Textübersetzungsdienst mit Unterstützung für 100+ Sprachen",
  "provider": {
    "name": "Example Corp",
    "url": "https://example.com",
    "contact": "skills@example.com"
  },
  "endpoint": {
    "url": "https://api.example.com/skills/translate/invoke",
    "method": "POST",
    "content_type": "application/json",
    "status_url": "https://api.example.com/skills/translate/status/{execution_id}",
    "result_url": "https://api.example.com/skills/translate/result/{execution_id}",
    "timeout_ms": 30000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  },
  "inputs": [
    {
      "name": "text",
      "type": "string",
      "description": "Zu übersetzender Text",
      "required": true,
      "schema": { "minLength": 1, "maxLength": 10000 }
    },
    {
      "name": "target_language",
      "type": "string",
      "description": "Zielsprachcode (ISO 639-1)",
      "required": true
    },
    {
      "name": "source_language",
      "type": "string",
      "description": "Quellsprachcode (leer lassen für automatische Erkennung)",
      "required": false,
      "default": "auto"
    }
  ],
  "output": {
    "content_type": "application/json",
    "schema": {
      "type": "object",
      "properties": {
        "translated_text": { "type": "string" },
        "source_language": { "type": "string" },
        "target_language": { "type": "string" },
        "confidence": { "type": "number" }
      }
    },
    "description": "Übersetzungsergebnis"
  },
  "auth": {
    "type": "api_key",
    "description": "Schlüssel über X-API-Key Header übergeben",
    "header": "X-API-Key"
  },
  "access": "restricted",
  "tags": ["translation", "nlp", "multilingual"],
  "documentation_url": "https://docs.example.com/skills/translate",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-03-20T14:30:00Z"
}
```
