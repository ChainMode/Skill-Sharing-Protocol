# Kapitel 8: Versionsverwaltung

## 8.1 Überblick

Die Protokollversionsverwaltung stellt die Kompatibilität während der Protokollevolution sicher und ermöglicht Skill-Anbietern und -Konsumenten einen reibungslosen Übergang zu neuen Versionen.

## 8.2 Semantische Versionierung

Das Protokoll folgt der Semantic Versioning-Spezifikation:

```
MAJOR.MINOR.PATCH
```

| Versionsnummer | Änderungstyp | Kompatibilität |
|---------------|-------------|----------------|
| MAJOR | Inkompatible Protokolländerungen | Breaking Changes; Konsumenten müssen upgraden |
| MINOR | Abwärtskompatible Funktionserweiterungen | Ältere Konsumenten funktionieren weiterhin normal |
| PATCH | Abwärtskompatible Fehlerbehebungen | Dokumentationskorrekturen, Schema-Fixes |

## 8.3 Versionsdeklaration

Jeder Skill Descriptor muss die Protokollversion deklarieren, der er folgt:

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://skill-sharing.org/changelog"
  }
}
```

## 8.4 Versionskompatibilitätsregeln

### Kompatibilitätsbestimmung

```
Vom Konsumenten unterstützte Version: X.Y.Z
Descriptor-Protokollversion: A.B.C

Kompatibel: A == X (gleiche Hauptversion)
Inkompatibel: A != X (unterschiedliche Hauptversion)
```

### Kompatibilitätsmatrix-Beispiel

| Konsumentenversion | Descriptor-Version | Kompatibilität | Erklärung |
|-------------------|-------------------|----------------|-----------|
| 1.0.0 | 1.0.0 | ✓ Kompatibel | Exakte Übereinstimmung |
| 1.0.0 | 1.2.0 | ✓ Kompatibel | Nebenversion ist abwärtskompatibel |
| 1.0.0 | 1.2.3 | ✓ Kompatibel | Patch-Version ist abwärtskompatibel |
| 1.0.0 | 2.0.0 | ✗ Inkompatibel | Unterschiedliche Hauptversion |
| 2.0.0 | 1.5.0 | ✗ Inkompatibel | Unterschiedliche Hauptversion |

### Versionsinkompatibilitäts-Antwort

Wenn ein Konsument eine inkompatible Protokollversion antrifft:

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

## 8.5 Schema-versionierte Verzeichnisse

Schema-Definitionsdateien sind nach Version organisiert:

```
schema/
├── draft/                    # Aktueller Entwurf in Entwicklung
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Veröffentlichte Version
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

- `draft/`: Die neueste Version in Entwicklung, die instabile Änderungen enthalten kann
- `{date}/`: Veröffentlichte stabile Versionen, benannt nach Veröffentlichungsdatum

## 8.6 Versions-Changelog

Das Protokoll-Schema enthält einen Referenzpfad zum Versions-Changelog (`changelog_url`), der Änderungen für jede Version dokumentiert:

- Neu hinzugefügte Felder oder Funktionen
- Veraltete Felder oder Funktionen
- Beschreibungen von Breaking Changes
- Migrationsleitfäden

## 8.7 Abwärtskompatibilitätsgarantien

Abwärtskompatibilitätsgarantien für Nebenversionsupdates:

1. Bestehende Pflichtfelder werden nicht entfernt
2. Neue Felder sind standardmäßig optional
3. Semantik bestehender Felder wird nicht geändert
4. Wertebereiche von Aufzählungstypen werden nicht eingeschränkt
5. Pflichtparameter bestehender Schnittstellen werden nicht erweitert
