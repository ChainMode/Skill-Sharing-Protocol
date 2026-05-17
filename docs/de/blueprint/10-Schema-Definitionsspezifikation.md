# Kapitel 10: Schema-Definitionsspezifikation

## 10.1 Überblick

Das Protokoll stellt maschinenlesbare Spezifikationen durch drei Formate von Schema-Definitionsdateien bereit und unterstützt automatisierte Validierung und Codegenerierung.

## 10.2 Liefergegenstände

| Datei | Format | Zweck |
|-------|--------|-------|
| `schema.json` | JSON Schema Draft 2020-12 | Automatisierte Validierung, Codegenerierung |
| `schema.ts` | TypeScript-Typdefinitionen | Typprüfung zur Entwicklungszeit, IDE-Unterstützung |
| `schema.mdx` | MDX-interaktive Dokumentation | Menschenlesbare Dokumentation, interaktive Beispiele |

## 10.3 JSON Schema-Spezifikation

### Grundstruktur

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "Vollständige Schema-Definition für das Skill Sharing Protocol",
  "$defs": {
    "CapabilityType": { ... },
    "AccessPolicy": { ... },
    "AuthType": { ... },
    "ParameterDefinition": { ... },
    "SkillDescriptor": { ... },
    "SkillIndex": { ... },
    "InvocationRequest": { ... },
    "InvocationResponse": { ... }
  }
}
```

### TypeScript-zu-JSON-Schema-Zuordnungsregeln

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| Union-Typ `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| Optionales Feld `field?` | Nicht im `required`-Array |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (keine Einschränkungen) |

## 10.4 TypeScript-Typdefinitionen

Die TypeScript-Typdefinitionsdatei (`schema.ts`) wahrt semantische Konsistenz mit dem JSON Schema und bietet:

- Alle Aufzählungstyp-Definitionen
- Alle Interface-Definitionen
- Vollständige Typ-Exporte
- JSDoc-Kommentarbeschreibungen

## 10.5 MDX-interaktive Dokumentation

Das MDX-Dokument (`schema.mdx`) enthält:

- Schema-Überblick und Nutzungsleitfaden
- Feldbeschreibungstabellen für jedes Datenmodell
- Gültige Descriptor-Beispiele
- Ungültige Descriptor-Beispiele (zeigen häufige Fehler)
- Vergleichstabelle von JSON Schema und TypeScript-Typen

## 10.6 Versionierte Verzeichnisstruktur

```
schema/
├── draft/                    # Entwurfsversion in Entwicklung
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Veröffentlichte stabile Version
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

Regeln:
- Das `draft/`-Verzeichnis enthält immer die neueste Entwicklungsversion
- Bei Veröffentlichung einer neuen Version wird der Draft-Inhalt in ein datumbenanntes Versionsverzeichnis kopiert
- Bei Aktualisierung des JSON Schema müssen TypeScript-Typdefinitionen und MDX-Dokumentation synchron aktualisiert werden

## 10.7 Schema Validator

Der Schema Validator führt Konformitätsvalidierung beliebiger Skill Descriptor-Dokumente basierend auf `schema.json` durch:

- Verwendet die ajv-Bibliothek zum Laden des JSON Schema
- Validiert die strukturelle Integrität des Dokuments
- Prüft Aufzählungsfeld-Wertebereiche
- Gibt detaillierte Fehlerinformationen zurück (Feldpfad, erwarteter Wert, tatsächlicher Wert)
- Unterstützt Parsing (JSON → Objekt) und Serialisierung (Objekt → Pretty Print JSON)
