# Kapitel 12: Korrektheitsgarantien

## 12.1 Überblick

Das Protokoll definiert Systeminvarianten durch formalisierte Correctness Properties (Korrektheitseigenschaften). Diese Eigenschaften dienen als Brücke zwischen menschenlesbaren Spezifikationen und maschinenverifizierbaren Korrektheitsgarantien, validiert durch Property-Based Testing.

## 12.2 Liste der Korrektheitseigenschaften

### Eigenschaft 1: Strukturelle Integrität des Skill Descriptors

Für jedes gültige SkillDescriptor-Objekt muss es alle Pflichtfelder enthalten: `protocol` (mit `version`), `id`, `name`, `version`, `capability_type`, `description`, `provider`, `endpoint`, `inputs`, `output`, `auth`, `access`. Jedes Objekt, dem ein Pflichtfeld fehlt, sollte die Validierung nicht bestehen.

### Eigenschaft 2: Aufzählungsfeld-Wertebereichsbeschränkungen

Für jedes gültige SkillDescriptor-Objekt:
- `capability_type` muss eines von `["plugin", "api", "knowledge", "task"]` sein
- `access` muss eines von `["public", "restricted", "private"]` sein
- `auth.type` muss eines von `["api_key", "oauth2", "custom", "none"]` sein

### Eigenschaft 3: Serialisierung/Parsing-Roundtrip-Konsistenz

Für jedes gültige SkillDescriptor-Objekt sollte das Serialisieren in ein JSON-Dokument und anschließendes Zurückparsen in ein Objekt ein semantisch äquivalentes Ergebnis zum Original liefern:

```
parse(serialize(descriptor)) == descriptor
```

### Eigenschaft 4: Schema-Validierungskorrektheit

- Für jedes dem Schema konforme JSON-Dokument sollte der Schema Validator es erfolgreich parsen und ein strukturiertes Objekt zurückgeben
- Für jedes nicht dem Schema konforme JSON-Dokument sollte der Schema Validator Fehlerinformationen mit spezifischen verletzenden Feldnamen und Fehlergründen zurückgeben

### Eigenschaft 5: Skill-Bezeichner-Eindeutigkeit

Für jede Sammlung von Skill Descriptors in einem Skill-Index müssen alle Skills gegenseitig unterschiedliche `id`-Feldwerte haben.

### Eigenschaft 6: Skill-Index-Korrektheit und Zugriffskontrolle

Für jede Anbieter-Domain mit N Skills, wenn eine nicht-authentifizierte Anfrage auf die Well-Known URI zugreift:
- Der zurückgegebene Skill-Index sollte alle Skills enthalten, deren `access` nicht `"private"` ist
- Er sollte keine Skills enthalten, deren `access` `"private"` ist
- Die `descriptor_url` jedes Eintrags im Index sollte auf einen gültigen Skill Descriptor verweisen

### Eigenschaft 7: Fähigkeitstyp-Filterungskorrektheit

Für jede Skill-Sammlung und jeden CapabilityType-Filterwert:
- Jeder Skill in der gefilterten Ergebnismenge hat einen `capability_type` gleich dem Filterwert
- Alle Skills des entsprechenden Typs aus der Originalsammlung erscheinen in der Ergebnismenge

### Eigenschaft 8: Strukturelle Integrität der Aufrufnachricht

- Für jede gültige InvocationRequest muss sie `caller` (mit `id` und `type`), `skill_id` und `inputs`-Felder enthalten
- Für jede gültige InvocationResponse muss sie `execution_id`, `status`, `skill_id` und `timestamps`-Felder enthalten

### Eigenschaft 9: Protokollversion SemVer-Format

Für jedes gültige ProtocolVersion-Objekt muss sein `version`-Feld dem Format `MAJOR.MINOR.PATCH` entsprechen, wobei MAJOR, MINOR und PATCH alle nicht-negative Ganzzahlen sind.

### Eigenschaft 10: Versionsinkompatibilitätserkennung

Für jede Skill Descriptor-Protokollversion und vom Konsumenten unterstützte Protokollversion:
- Wenn die Hauptversion (MAJOR) des Descriptors größer ist als die vom Konsumenten unterstützte Hauptversion, wird ein Versionsinkompatibilitätsfehler zurückgegeben
- Wenn die Hauptversionen gleich sind, wird normal verarbeitet

### Eigenschaft 11: TypeScript- und JSON Schema-semantische Konsistenz

- Für jede gültige SkillDescriptor-Instanz, die aus TypeScript-Typdefinitionen generiert wurde, sollte diese Instanz die JSON Schema-Validierung bestehen
- Für jedes JSON-Dokument, das die JSON Schema-Validierung besteht, sollte es vom TypeScript-Typsystem akzeptiert werden

## 12.3 Teststrategie

### Dual-Track-Testmethode

| Methode | Zweck | Werkzeug |
|---------|-------|----------|
| Unit-Tests | Verifizierung spezifischer Beispiele, Grenzfälle und Fehlerbedingungen | vitest |
| Property-Tests | Verifizierung universeller Eigenschaften über alle Eingaben | fast-check |

### Property-Based-Testing-Konfiguration

- Jeder Property-Test läuft mindestens 100 Iterationen
- Verwendet die fast-check-Bibliothek zur Generierung zufälliger Testdaten
- Jede Korrektheitseigenschaft wird durch einen einzelnen Property-Test implementiert
- Testlabel-Format: `Feature: skill-sharing-protocol, Property {N}: {description}`

### Testbeispiel

```typescript
import fc from 'fast-check';

fc.assert(
  fc.property(
    skillDescriptorArbitrary,
    (descriptor) => {
      // Feature: skill-sharing-protocol, Property 3: round-trip consistency
      const serialized = serialize(descriptor);
      const parsed = parse(serialized);
      expect(parsed).toEqual(descriptor);
    }
  ),
  { numRuns: 100 }
);
```
