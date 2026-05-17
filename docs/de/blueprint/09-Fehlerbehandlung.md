# Kapitel 9: Fehlerbehandlung

## 9.1 Überblick

Das Protokoll definiert einen einheitlichen Fehlerbehandlungsmechanismus, der sicherstellt, dass Skill-Konsumenten Fehlerursachen genau verstehen und geeignete Wiederherstellungsmaßnahmen ergreifen können.

## 9.2 Fehlerklassifikation

| Fehlerkategorie | Fehlercode | HTTP-Statuscode | Szenario |
|----------------|-----------|----------------|----------|
| Validierungsfehler | VALIDATION_ERROR | N/A (lokal) | Schema Validator erkennt einen ungültigen Skill Descriptor |
| Authentifizierungsfehler | AUTH_REQUIRED | 401 | Keine gültigen Credentials beim Aufruf eines geschützten Skills |
| Unzureichende Berechtigungen | PERMISSION_DENIED | 403 | Credentials gültig, aber kein Zugriff auf den Skill |
| Skill nicht gefunden | SKILL_NOT_FOUND | 404 | Angeforderte Skill-ID oder Descriptor-URL existiert nicht |
| Ausführungs-Timeout | EXECUTION_TIMEOUT | 408 / 504 | Skill-Ausführung überschreitet konfiguriertes Timeout |
| Endpunkt nicht erreichbar | ENDPOINT_UNREACHABLE | 502 / 503 | Aufrufendpunkt kann nicht erreicht werden |
| Version inkompatibel | VERSION_INCOMPATIBLE | 422 | Skill Descriptor-Protokollversion ist mit dem Konsumenten inkompatibel |

## 9.3 Einheitliches Fehlerantwortformat

Alle Fehlerantworten folgen einer einheitlichen Struktur:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Menschenlesbare Fehlerbeschreibung",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

### Feldbeschreibungen

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `error.code` | string | Ja | Maschinenlesbarer Fehlercode |
| `error.message` | string | Ja | Menschenlesbare Fehlerbeschreibung |
| `error.details` | object | Nein | Detaillierte Kontextinformation zum Fehler |
| `error.retry` | object | Nein | Wiederholungsvorschläge |
| `error.retry.suggested_delay_ms` | number | Nein | Empfohlene Wiederholungsverzögerung (Millisekunden) |
| `error.retry.max_attempts` | number | Nein | Empfohlene maximale Wiederholungsversuche |

## 9.4 Detaillierte Fehlerbeschreibungen

### Validierungsfehler

Wird zurückgegeben, wenn der Schema Validator ein ungültiges Dokument erkennt:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Skill descriptor validation failed",
    "details": {
      "violations": [
        {
          "field": "/capability_type",
          "expected": "one of: plugin, api, knowledge, task",
          "actual": "unknown_type",
          "message": "Invalid enum value"
        },
        {
          "field": "/endpoint/url",
          "expected": "string (URI format)",
          "actual": null,
          "message": "Required field is missing"
        }
      ]
    }
  }
}
```

Merkmale:
- Gibt eine Liste aller verletzenden Felder zurück (nicht nur den ersten Fehler)
- Jeder Eintrag enthält Feldpfad (JSON Pointer-Format), erwarteten Wert und tatsächlichen Wert

### Authentifizierungsfehler

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://example.com/oauth/authorize",
      "scopes": ["skill:invoke"]
    }
  }
}
```

Merkmale:
- Enthält Beschreibung der erforderlichen Authentifizierungsmethode
- Hilft Konsumenten, den Authentifizierungsfluss automatisch abzuschließen

### Ausführungs-Timeout

```json
{
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Skill execution exceeded the configured timeout of 30000ms",
    "details": {
      "timeout_ms": 30000,
      "elapsed_ms": 30001
    },
    "retry": {
      "suggested_delay_ms": 5000,
      "max_attempts": 3
    }
  }
}
```

### Endpunkt nicht erreichbar

```json
{
  "error": {
    "code": "ENDPOINT_UNREACHABLE",
    "message": "Failed to connect to skill endpoint",
    "details": {
      "endpoint_url": "https://api.example.com/skills/translate/invoke",
      "reason": "Connection refused"
    },
    "retry": {
      "suggested_delay_ms": 2000,
      "max_attempts": 5
    }
  }
}
```

### Version inkompatibel

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.x",
    "details": {
      "descriptor_version": "2.0.0",
      "consumer_supported_range": "1.x.x",
      "upgrade_url": "https://skill-sharing.org/upgrade-guide"
    }
  }
}
```

## 9.5 Wiederholungsstrategien

### Exponentielles Backoff

Für wiederholbare Fehler (Timeout, Endpunkt nicht erreichbar) wird exponentielles Backoff empfohlen:

```
Verzögerung = initial_delay × 2^(attempt - 1)
```

Beispiel (initial_delay = 1000ms):
- 1. Wiederholung: 1000ms
- 2. Wiederholung: 2000ms
- 3. Wiederholung: 4000ms
- 4. Wiederholung: 8000ms

### Nicht wiederholbare Fehler

Folgende Fehler sollten nicht wiederholt werden:
- `VALIDATION_ERROR`: Descriptor muss korrigiert werden
- `AUTH_REQUIRED`: Credentials müssen bereitgestellt werden
- `PERMISSION_DENIED`: Berechtigungen müssen eingeholt werden
- `VERSION_INCOMPATIBLE`: Konsument muss aktualisiert werden
