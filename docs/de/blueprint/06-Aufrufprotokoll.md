# Kapitel 6: Aufrufprotokoll

## 6.1 Überblick

Das Invocation Protocol definiert, wie Skill-Konsumenten entdeckte Skills remote aufrufen. Das Protokoll verwendet ein asynchrones Aufrufmodell, das Statusabfragen und Ergebnisabruf unterstützt.

## 6.2 Aufruffluss

### Drei-Schritte-Aufrufmodell

| Schritt | HTTP-Methode | Endpunkt | Beschreibung |
|---------|-------------|----------|-------------|
| 1. Aufruf initiieren | POST | `{invocation_endpoint}` | Aufrufanfrage senden, Ausführungs-ID zurückgeben |
| 2. Status abfragen | GET | `{status_url}/{execution_id}` | Ausführungsstatus abfragen |
| 3. Ergebnis abrufen | GET | `{result_url}/{execution_id}` | Ausführungsergebnis abrufen |

### Aufrufsequenz

```
Konsument                               Anbieter
  │                                      │
  │── POST /invoke ──────────────────────→│
  │   {caller, skill_id, inputs}         │
  │                                      │
  │←── 202 Accepted ────────────────────│
  │   {execution_id, status: "accepted"} │
  │                                      │
  │── GET /status/{execution_id} ───────→│
  │                                      │
  │←── {status: "running"} ─────────────│
  │                                      │
  │── GET /status/{execution_id} ───────→│
  │                                      │
  │←── {status: "completed"} ───────────│
  │                                      │
  │── GET /result/{execution_id} ───────→│
  │                                      │
  │←── {output: {...}} ─────────────────│
  │                                      │
```

## 6.3 Aufrufanfrageformat

```json
{
  "caller": {
    "id": "ifay-instance-001",
    "type": "ifay",
    "credentials": {
      "api_key": "sk-xxxxx"
    }
  },
  "skill_id": "com.example.translate-v1",
  "inputs": {
    "text": "Hello, world!",
    "target_language": "zh-CN"
  },
  "context": {
    "trace_id": "trace-abc-123",
    "priority": "normal",
    "timeout_ms": 30000
  }
}
```

### Anfragefelder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `caller` | object | Ja | Aufrufer-Identitätsinformation |
| `caller.id` | string | Ja | Eindeutiger Aufrufer-Bezeichner |
| `caller.type` | string | Ja | Aufrufertyp (ifay/service/user) |
| `caller.credentials` | object | Nein | Authentifizierungsdaten |
| `skill_id` | string | Ja | Ziel-Skill-ID |
| `inputs` | object | Ja | Eingabeparameter (Schlüssel-Wert-Paare) |
| `context` | object | Nein | Aufrufkontext |
| `context.trace_id` | string | Nein | Trace-ID |
| `context.priority` | string | Nein | Priorität (low/normal/high) |
| `context.timeout_ms` | number | Nein | Timeout-Dauer (Millisekunden) |

## 6.4 Aufrufantwortformat

```json
{
  "execution_id": "exec-789-xyz",
  "status": "completed",
  "skill_id": "com.example.translate-v1",
  "output": {
    "translated_text": "你好，世界！",
    "source_language": "en",
    "target_language": "zh-CN",
    "confidence": 0.98
  },
  "timestamps": {
    "created_at": "2025-03-20T14:30:00Z",
    "updated_at": "2025-03-20T14:30:02Z",
    "completed_at": "2025-03-20T14:30:02Z"
  }
}
```

### Antwortfelder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `execution_id` | string | Ja | Eindeutiger Ausführungsbezeichner |
| `status` | ExecutionStatus | Ja | Ausführungsstatus |
| `skill_id` | string | Ja | Ziel-Skill-ID |
| `output` | any | Nein | Ausgabedaten (bei completed) |
| `error` | object | Nein | Fehlerinformation (bei failed/timeout) |
| `timestamps` | object | Ja | Zeitstempelinformation |

### Ausführungsstatus-Aufzählung

| Status | Beschreibung |
|--------|-------------|
| `accepted` | Anfrage empfangen, wartet auf Ausführung |
| `running` | Wird derzeit ausgeführt |
| `completed` | Ausführung erfolgreich abgeschlossen |
| `failed` | Ausführung fehlgeschlagen |
| `timeout` | Ausführung hat Zeitlimit überschritten |

## 6.5 Authentifizierungsfluss

Vor dem Aufruf prüft der Konsument das `auth`-Feld im Skill Descriptor:

```
Konsument                               Anbieter
  │                                      │
  │── descriptor.auth lesen ──→          │
  │                                      │
  │   auth.type == "api_key"?            │
  │   → API Key im Header anhängen       │
  │                                      │
  │   auth.type == "oauth2"?             │
  │   → OAuth 2.0-Fluss für Token        │
  │                                      │
  │   auth.type == "none"?               │
  │   → Direkt aufrufen, keine Daten     │
  │                                      │
  │── POST /invoke (mit Credentials) ───→│
  │                                      │
```

### Authentifizierungsfehler-Antwort

Wenn keine gültigen Credentials bereitgestellt werden, wird ein 401-Fehler zurückgegeben:

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://example.com/oauth/authorize"
    }
  }
}
```

## 6.6 Timeout und Wiederholung

### Timeout-Behandlung

Wenn die Skill-Ausführung das konfigurierte `timeout_ms` überschreitet:

```json
{
  "execution_id": "exec-789-xyz",
  "status": "timeout",
  "skill_id": "com.example.translate-v1",
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Skill execution exceeded the configured timeout of 30000ms",
    "retry": {
      "suggested_delay_ms": 5000,
      "max_attempts": 3
    }
  },
  "timestamps": {
    "created_at": "2025-03-20T14:30:00Z",
    "updated_at": "2025-03-20T14:30:30Z"
  }
}
```

### Wiederholungsstrategie

- Timeout-Antworten enthalten empfohlene Wiederholungsverzögerung und maximale Wiederholungsversuche
- Konsumenten sollten exponentielle Backoff-Wiederholungsstrategien implementieren
- Bei nicht erreichbaren Endpunkten wird exponentielles Backoff empfohlen (Anfangsverzögerung × 2^n)
