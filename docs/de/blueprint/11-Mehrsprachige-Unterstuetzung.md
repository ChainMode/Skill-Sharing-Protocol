# Kapitel 11: Mehrsprachige Unterstützung

## 11.1 Überblick

Das Protokoll richtet sich an die globale Entwicklergemeinschaft und bietet Protokolldokumentation in 9 Sprachen, um sicherzustellen, dass Entwickler unterschiedlicher Sprachhintergründe die Protokollspezifikation genau verstehen können.

## 11.2 Unterstützte Sprachen

| Sprachcode | Sprache | Verzeichnispfad | Rolle |
|-----------|---------|----------------|-------|
| `en` | English | `docs/en/` | Basissprache |
| `zh-CN` | Vereinfachtes Chinesisch | `docs/zh-CN/` | Übersetzung |
| `zh-TW` | Traditionelles Chinesisch | `docs/zh-TW/` | Übersetzung |
| `ja` | Japanisch | `docs/ja/` | Übersetzung |
| `ko` | Koreanisch | `docs/ko/` | Übersetzung |
| `de` | Deutsch | `docs/de/` | Übersetzung |
| `fr` | Französisch | `docs/fr/` | Übersetzung |
| `es` | Spanisch | `docs/es/` | Übersetzung |
| `ru` | Russisch | `docs/ru/` | Übersetzung |

## 11.3 Verzeichnisstruktur

Jede Sprache pflegt eine unabhängige Verzeichnisstruktur:

```
docs/{language_code}/
├── specification/
│   ├── draft/                # Entwurfsspezifikationsdokument
│   │   └── specification.md
│   └── 2025-11-25/          # Versioniertes Spezifikationsdokument
│       └── specification.md
├── blueprint/               # Blueprint-Dokumentation
│   └── illustration/        # Illustrationsressourcen
├── community/               # Community-Dokumentation
├── develop/                 # Entwicklungsleitfäden
└── sdk/                     # SDK-Dokumentation
```

## 11.4 Basissprachenstrategie

- Englisch (en) dient als Basissprache für die Protokolldokumentation
- Alle neuen Inhalte werden zuerst auf Englisch verfasst
- Andere Sprachversionen werden aus dem Englischen übersetzt
- Wenn Basissprachendokumente aktualisiert werden, wird der Synchronisierungsstatus in anderen Sprachversionen annotiert

## 11.5 Übersetzungsprinzipien

1. Technische Begriffe werden auf Englisch beibehalten (z.B. Skill Descriptor, Well-Known URI)
2. Konzeptuelle Beschreibungen werden in der Zielsprache ausgedrückt
3. Kommentare in Codebeispielen werden in die Zielsprache übersetzt
4. Dokumentstruktur bleibt konsistent mit der Basissprache
5. Jede übersetzte Version annotiert die entsprechende Basissprachen-Versionsnummer

## 11.6 Synchronisierungsstatus-Annotation

Wenn Basissprachendokumente aktualisiert werden, sollten andere Sprachversionen den Synchronisierungsstatus im Dokumentkopf annotieren:

```markdown
---
base_version: en/2025-11-25
sync_status: synced | outdated | in_progress
last_synced: 2025-11-25
---
```
