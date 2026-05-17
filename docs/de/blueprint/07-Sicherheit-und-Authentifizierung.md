# Kapitel 7: Sicherheit und Authentifizierung

## 7.1 Überblick

Sicherheitsmechanismen sind ein wesentlicher Bestandteil des Protokolls und stellen sicher, dass Skill-Anbieter kontrollieren können, wer ihre Skills entdecken und aufrufen kann. Das Protokoll unterstützt mehrere Authentifizierungsmethoden und Zugriffskontrollrichtlinien und schafft ein Gleichgewicht zwischen Offenheit und Sicherheit.

## 7.2 Zugriffskontrollrichtlinien

### Drei-Stufen-Zugriffskontrolle

| Stufe | Entdeckungssichtbarkeit | Aufrufberechtigung | Anwendungsfall |
|-------|------------------------|-------------------|----------------|
| `public` | Für alle sichtbar | Keine Authentifizierung erforderlich | Offene APIs, öffentliche Wissensbasen |
| `restricted` | Für alle sichtbar | Authentifizierung erforderlich | Kommerzielle APIs, kostenpflichtige Dienste |
| `private` | Nur nach Authentifizierung sichtbar | Authentifizierung erforderlich | Interne Werkzeuge, private Dienste |

### Beziehung zwischen Zugriffskontrolle und Entdeckung

- Wenn eine nicht-authentifizierte Anfrage auf die Well-Known URI zugreift:
  - Alle `public`- und `restricted`-Skills werden zurückgegeben
  - `private`-Skills werden nicht zurückgegeben
- Wenn eine authentifizierte Anfrage auf die Well-Known URI zugreift:
  - Alle Skills werden zurückgegeben (einschließlich `private`)

## 7.3 Authentifizierungsmethoden

### API-Key-Authentifizierung

Die einfachste Authentifizierungsmethode, bei der ein Schlüssel über HTTP Header übergeben wird.

Descriptor-Deklaration:
```json
{
  "type": "api_key",
  "description": "API Key über HTTP Header übergeben",
  "header": "X-API-Key"
}
```

Header beim Aufruf:
```
POST /invoke HTTP/1.1
Host: api.example.com
X-API-Key: sk-your-api-key-here
Content-Type: application/json
```

### OAuth 2.0-Authentifizierung

Geeignet für Szenarien, die feingranulare Berechtigungskontrolle erfordern.

Descriptor-Deklaration:
```json
{
  "type": "oauth2",
  "oauth2": {
    "authorization_url": "https://example.com/oauth/authorize",
    "token_url": "https://example.com/oauth/token",
    "scopes": {
      "skill:invoke": "Skill aufrufen",
      "skill:read": "Skill-Informationen lesen",
      "skill:admin": "Skill-Konfiguration verwalten"
    }
  }
}
```

Bearer Token beim Aufruf:
```
POST /invoke HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
```

### Benutzerdefinierte Authentifizierung

Geeignet für nicht-standardmäßige Authentifizierungsszenarien; Anbieter erklären die Authentifizierungsmethode über das `instructions`-Feld.

Descriptor-Deklaration:
```json
{
  "type": "custom",
  "custom": {
    "instructions": "Anfragekörper mit HMAC-SHA256 signieren und Signatur im X-Signature Header platzieren",
    "parameters": [
      {
        "name": "secret_key",
        "type": "string",
        "description": "Geheimer Schlüssel für HMAC-Signierung",
        "required": true
      }
    ]
  }
}
```

### Keine Authentifizierung

Öffentliche Skills erfordern keine Authentifizierung:
```json
{
  "type": "none"
}
```

## 7.4 Authentifizierungsfehlerbehandlung

### Authentifizierungsfehler (401)

Wenn keine gültigen Credentials bereitgestellt werden:
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

### Unzureichende Berechtigungen (403)

Wenn Credentials gültig sind, aber Zugriffsrechte fehlen:
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to invoke this skill",
    "details": {
      "required_scopes": ["skill:invoke"],
      "current_scopes": ["skill:read"]
    }
  }
}
```

## 7.5 Sicherheits-Best-Practices

1. Alle Kommunikation sollte HTTPS verwenden
2. API Keys sollten über Header übergeben werden, nicht in URLs exponiert
3. OAuth 2.0 Tokens sollten angemessene Ablaufzeiten haben
4. Skill-Anbieter sollten Rate-Limiting implementieren, um Missbrauch zu verhindern
5. Sensible Skills sollten die `private`-Zugriffsrichtlinie verwenden, um Entdeckung durch Unbefugte zu vermeiden
