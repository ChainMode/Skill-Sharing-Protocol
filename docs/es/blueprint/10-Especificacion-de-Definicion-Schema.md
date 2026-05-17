# Capítulo 10: Especificación de Definición Schema

## 10.1 Descripción General

El protocolo proporciona especificaciones legibles por máquina a través de tres formatos de archivos de definición Schema, soportando validación automatizada y generación de código.

## 10.2 Entregables

| Archivo | Formato | Propósito |
|---------|---------|-----------|
| `schema.json` | JSON Schema Draft 2020-12 | Validación automatizada, generación de código |
| `schema.ts` | Definiciones de tipos TypeScript | Verificación de tipos en desarrollo, soporte IDE |
| `schema.mdx` | Documentación interactiva MDX | Documentación legible, ejemplos interactivos |

## 10.3 Especificación JSON Schema

### Estructura Básica

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "Definición Schema completa para el Skill Sharing Protocol",
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

### Reglas de Mapeo TypeScript a JSON Schema

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| Tipo unión `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| Campo opcional `field?` | No en el array `required` |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (sin restricciones) |

## 10.4 Definiciones de Tipos TypeScript

El archivo de definición de tipos TypeScript (`schema.ts`) mantiene consistencia semántica con el JSON Schema, proporcionando todas las definiciones de tipos enumerados, interfaces, exportaciones completas de tipos y descripciones en comentarios JSDoc.

## 10.5 Documentación Interactiva MDX

El documento MDX (`schema.mdx`) incluye: resumen del Schema y guía de uso, tablas de descripción de campos, ejemplos válidos e inválidos de Descriptors, y tabla comparativa de JSON Schema y tipos TypeScript.

## 10.6 Estructura de Directorios Versionada

```
schema/
├── draft/                    # Versión borrador en desarrollo
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Versión estable publicada
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

Reglas:
- El directorio `draft/` siempre contiene la última versión de desarrollo
- Al publicar una nueva versión, el contenido del draft se copia a un directorio de versión nombrado por fecha
- Cuando el JSON Schema se actualiza, las definiciones de tipos TypeScript y la documentación MDX deben actualizarse en sincronía

## 10.7 Schema Validator

El Schema Validator realiza validación de conformidad de cualquier documento Skill Descriptor basado en `schema.json`:

- Usa la biblioteca ajv para cargar el JSON Schema
- Valida la integridad estructural del documento
- Verifica dominios de valores de campos enumerados
- Retorna información de error detallada (ruta del campo, valor esperado, valor real)
- Soporta parsing (JSON → objeto) y serialización (objeto → Pretty Print JSON)
