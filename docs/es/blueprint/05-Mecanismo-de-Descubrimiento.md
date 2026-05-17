# Capítulo 5: Mecanismo de Descubrimiento

## 5.1 Descripción General

El Discovery Mechanism define cómo los consumidores de skills localizan y obtienen Skill Descriptors en una red descentralizada. El protocolo proporciona tres rutas de descubrimiento complementarias para asegurar flexibilidad y extensibilidad.

## 5.2 Descubrimiento por Well-Known URI

### Especificación de Ruta

Los proveedores de skills exponen una ruta estandarizada bajo su dominio:

```
GET https://{domain}/.well-known/skill-sharing
```

### Formato de Respuesta: Índice de Skills

```json
{
  "protocol": { "version": "1.0.0" },
  "provider": { "name": "Example Corp", "url": "https://example.com" },
  "skills": [
    {
      "id": "com.example.translate-v1",
      "name": "Universal Translator",
      "capability_type": "api",
      "description": "Servicio de traducción de texto de alta calidad con soporte para 100+ idiomas",
      "descriptor_url": "https://example.com/skills/translate/descriptor.json",
      "access": "restricted",
      "version": "2.1.0"
    }
  ]
}
```

### Campos del Índice de Skills

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `protocol` | ProtocolVersion | Sí | Versión del protocolo |
| `provider` | object | Sí | Información del proveedor |
| `skills` | SkillIndexEntry[] | Sí | Lista de skills |

### Campos de Entrada del Índice

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | string | Sí | Identificador único del skill |
| `name` | string | Sí | Nombre del skill |
| `capability_type` | CapabilityType | Sí | Tipo de capacidad |
| `description` | string | Sí | Descripción breve |
| `descriptor_url` | string | Sí | URL completa del Descriptor |
| `access` | AccessPolicy | Sí | Política de control de acceso |
| `version` | string | Sí | Versión del skill |

## 5.3 Descubrimiento por URL Directa

Cuando un consumidor ya conoce la URL completa de un Skill Descriptor, puede obtenerlo directamente:

```
GET https://example.com/skills/translate/descriptor.json
```

## 5.4 Descubrimiento por Registro (Opcional)

Un Skill Registry es un servicio de índice opcional usado para acelerar el descubrimiento de skills entre dominios. El registro no es un prerrequisito para la operación del protocolo.

### Interfaz de Consulta

```
GET {registry_url}/skills?type={capability_type}
```

## 5.5 Control de Acceso y Descubrimiento

| Política de Acceso | Descubrimiento no autenticado | Descubrimiento autenticado | Invocación |
|-------------------|-------------------------------|---------------------------|------------|
| `public` | ✓ Visible | ✓ Visible | Sin autenticación requerida |
| `restricted` | ✓ Visible | ✓ Visible | Autenticación requerida |
| `private` | ✗ No visible | ✓ Visible | Autenticación requerida |

Reglas clave:
- Cuando una solicitud no autenticada accede a la Well-Known URI, el índice retornado **no incluye** skills con `access` establecido en `private`
- Las solicitudes autenticadas pueden ver todos los skills (incluyendo los privados)

## 5.6 Filtrado por Tipo de Capacidad

```
GET /.well-known/skill-sharing?type=api
```

Reglas de filtrado:
- Cada skill en el conjunto de resultados tiene un `capability_type` igual al valor del filtro
- Todos los skills que coinciden con ese tipo del conjunto original aparecen en los resultados
- El filtrado no afecta las reglas de control de acceso

## 5.7 Unicidad del Identificador de Skill

Dentro del mismo índice de skills, todos los skills deben tener valores de campo `id` únicos. El formato de ID recomendado es:

```
{reverse_domain}.{skill_name}-v{major_version}
```

Ejemplos:
- `com.example.translate-v1`
- `org.openai.gpt4-v1`
- `io.github.user.code-review-v2`
