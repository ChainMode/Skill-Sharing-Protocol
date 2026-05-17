# Глава 10: Спецификация Определения Schema

## 10.1 Обзор

Протокол предоставляет машиночитаемые спецификации через три формата файлов определения Schema, поддерживая автоматизированную валидацию и генерацию кода.

## 10.2 Результаты

| Файл | Формат | Назначение |
|------|--------|-----------|
| `schema.json` | JSON Schema Draft 2020-12 | Автоматизированная валидация, генерация кода |
| `schema.ts` | Определения типов TypeScript | Проверка типов при разработке, поддержка IDE |
| `schema.mdx` | Интерактивная документация MDX | Читаемая документация, интерактивные примеры |

## 10.3 Спецификация JSON Schema

### Базовая Структура

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "Полное определение Schema для Skill Sharing Protocol",
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

### Правила Соответствия TypeScript → JSON Schema

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| Union тип `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| Необязательное поле `field?` | Не в массиве `required` |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (без ограничений) |

## 10.4 Определения Типов TypeScript

Файл определения типов (`schema.ts`) поддерживает семантическую согласованность с JSON Schema: все перечислимые типы, все интерфейсы, полный экспорт типов, описания в JSDoc-комментариях.

## 10.5 Интерактивная Документация MDX

Документ MDX (`schema.mdx`) включает: обзор Schema, таблицы описания полей, примеры валидных и невалидных Descriptors, сравнительную таблицу JSON Schema и типов TypeScript.

## 10.6 Версионированная Структура Директорий

```
schema/
├── draft/                    # Черновая версия в разработке
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Опубликованная стабильная версия
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

## 10.7 Schema Validator

Schema Validator выполняет валидацию соответствия на основе `schema.json`: использует библиотеку ajv, проверяет структурную целостность, проверяет области значений перечислимых полей, возвращает детальную информацию об ошибках, поддерживает парсинг и сериализацию.
