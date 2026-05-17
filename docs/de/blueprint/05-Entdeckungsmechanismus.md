# Kapitel 5: Entdeckungsmechanismus

## 5.1 Überblick

Der Discovery Mechanism definiert, wie Skill-Konsumenten Skill Descriptors in einem dezentralen Netzwerk lokalisieren und abrufen. Das Protokoll bietet drei komplementäre Entdeckungspfade, um Flexibilität und Erweiterbarkeit zu gewährleisten.

## 5.2 Well-Known URI-Entdeckung

### Pfadspezifikation

Skill-Anbieter exponieren einen standardisierten Pfad unter ihrer Domain:

```
GET https://{domain}/.well-known/skill-sharing
```

### Antwortformat: Skill-Index

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
      "id": "com.example.translate-v1",
      "name": "Universal Translator",
      "capability_type": "api",
      "description": "Hochwertiger Textübersetzungsdienst mit Unterstützung für 100+ Sprachen",
      "descriptor_url": "https://example.com/skills/translate/descriptor.json",
      "access": "restricted",
      "version": "2.1.0"
    },
    {
      "id": "com.example.sentiment-v1",
      "name": "Sentiment Analyzer",
      "capability_type": "api",
      "description": "Text-Sentimentanalyse-Dienst",
      "descriptor_url": "https://example.com/skills/sentiment/descriptor.json",
      "access": "public",
      "version": "1.0.0"
    }
  ]
}
```

### Skill-Index-Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `protocol` | ProtocolVersion | Ja | Protokollversion |
| `provider` | object | Ja | Anbieterinformation |
| `provider.name` | string | Ja | Anbietername |
| `provider.url` | string | Nein | Anbieter-Website |
| `skills` | SkillIndexEntry[] | Ja | Skill-Liste |

### Skill-Index-Eintragsfelder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | string | Ja | Eindeutiger Skill-Bezeichner |
| `name` | string | Ja | Skill-Name |
| `capability_type` | CapabilityType | Ja | Fähigkeitstyp |
| `description` | string | Ja | Kurzbeschreibung |
| `descriptor_url` | string | Ja | Vollständige Descriptor-URL |
| `access` | AccessPolicy | Ja | Zugriffskontrollrichtlinie |
| `version` | string | Ja | Skill-Version |

## 5.3 Direkte URL-Entdeckung

Wenn ein Konsument die vollständige URL eines Skill Descriptors bereits kennt, kann er direkt abgerufen werden:

```
GET https://example.com/skills/translate/descriptor.json
```

Die Antwort ist ein vollständiges Skill Descriptor JSON-Dokument.

## 5.4 Registry-Entdeckung (Optional)

Eine Skill Registry ist ein optionaler Indexdienst zur Beschleunigung der domainübergreifenden Skill-Entdeckung. Die Registry ist keine Voraussetzung für den Protokollbetrieb.

### Abfrageschnittstelle

```
GET {registry_url}/skills?type={capability_type}
```

### Antwortformat

Gibt eine Liste übereinstimmender Skill Descriptor-Referenzen im gleichen Format wie Skill-Index-Einträge zurück.

## 5.5 Zugriffskontrolle und Entdeckung

Der Entdeckungsmechanismus ist eng mit Zugriffskontrollrichtlinien verknüpft:

| Zugriffsrichtlinie | Nicht-authentifizierte Entdeckung | Authentifizierte Entdeckung | Aufruf |
|-------------------|----------------------------------|----------------------------|--------|
| `public` | ✓ Sichtbar | ✓ Sichtbar | Keine Authentifizierung erforderlich |
| `restricted` | ✓ Sichtbar | ✓ Sichtbar | Authentifizierung erforderlich |
| `private` | ✗ Nicht sichtbar | ✓ Sichtbar | Authentifizierung erforderlich |

Schlüsselregeln:
- Wenn eine nicht-authentifizierte Anfrage auf die Well-Known URI zugreift, enthält der zurückgegebene Skill-Index **keine** Skills mit `access` gleich `private`
- Authentifizierte Anfragen können alle Skills sehen (einschließlich private)

## 5.6 Fähigkeitstyp-Filterung

Konsumenten können Skills nach Fähigkeitstyp filtern:

```
GET /.well-known/skill-sharing?type=api
```

Filterregeln:
- Jeder Skill in der Ergebnismenge hat einen `capability_type` gleich dem Filterwert
- Alle Skills des entsprechenden Typs aus der Originalmenge erscheinen in den Ergebnissen
- Filterung beeinflusst nicht die Zugriffskontrollregeln (private Skills bleiben für nicht-authentifizierte Anfragen unsichtbar)

## 5.7 Skill-Bezeichner-Eindeutigkeit

Innerhalb desselben Skill-Index müssen alle Skills eindeutige `id`-Feldwerte haben. Das empfohlene ID-Format ist:

```
{reverse_domain}.{skill_name}-v{major_version}
```

Beispiele:
- `com.example.translate-v1`
- `org.openai.gpt4-v1`
- `io.github.user.code-review-v2`
