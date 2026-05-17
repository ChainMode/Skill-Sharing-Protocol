# Capítulo 8: Gestión de Versiones

## 8.1 Descripción General

La gestión de versiones del protocolo asegura la compatibilidad durante la evolución del protocolo, permitiendo a proveedores y consumidores de skills transicionar suavemente a nuevas versiones.

## 8.2 Versionado Semántico

El protocolo sigue la especificación Semantic Versioning:

```
MAJOR.MINOR.PATCH
```

| Número de Versión | Tipo de Cambio | Compatibilidad |
|-------------------|---------------|----------------|
| MAJOR | Cambios de protocolo incompatibles | Cambios disruptivos; consumidores deben actualizar |
| MINOR | Adiciones de funcionalidad retrocompatibles | Consumidores antiguos siguen funcionando |
| PATCH | Correcciones retrocompatibles | Correcciones de documentación, correcciones de Schema |

## 8.3 Declaración de Versión

Cada Skill Descriptor debe declarar la versión del protocolo que sigue:

```json
{ "protocol": { "version": "1.0.0", "changelog_url": "https://skill-sharing.org/changelog" } }
```

## 8.4 Reglas de Compatibilidad de Versión

### Determinación de Compatibilidad

```
Versión soportada por consumidor: X.Y.Z
Versión del protocolo del Descriptor: A.B.C

Compatible: A == X (misma versión mayor)
Incompatible: A != X (versión mayor diferente)
```

### Ejemplo de Matriz de Compatibilidad

| Versión Consumidor | Versión Descriptor | Compatibilidad | Explicación |
|-------------------|-------------------|----------------|-------------|
| 1.0.0 | 1.0.0 | ✓ Compatible | Coincidencia exacta |
| 1.0.0 | 1.2.0 | ✓ Compatible | Versión menor retrocompatible |
| 1.0.0 | 2.0.0 | ✗ Incompatible | Versión mayor diferente |

### Respuesta de Incompatibilidad de Versión

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.x",
    "details": { "descriptor_version": "2.0.0", "consumer_supported_range": "1.x.x", "upgrade_url": "https://skill-sharing.org/upgrade-guide" }
  }
}
```

## 8.5 Directorios Schema Versionados

```
schema/
├── draft/                    # Borrador actual en desarrollo
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Versión publicada
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

## 8.6 Registro de Cambios de Versión

El Schema del protocolo incluye una ruta de referencia al registro de cambios (`changelog_url`), documentando cambios para cada versión.

## 8.7 Garantías de Retrocompatibilidad

1. Los campos obligatorios existentes no se eliminan
2. Los nuevos campos son opcionales por defecto
3. La semántica de campos existentes no se modifica
4. Los dominios de valores de tipos enumerados no se restringen
5. Los parámetros obligatorios de interfaces existentes no se incrementan
