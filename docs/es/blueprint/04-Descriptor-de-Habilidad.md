# Capítulo 4: Descriptor de Habilidad

## 4.1 Descripción General

El Skill Descriptor es la estructura de datos central del protocolo, existiendo como un documento JSON que describe completamente los metadatos de un skill. Sirve como contrato entre proveedores y consumidores de skills — los proveedores declaran las capacidades de un skill a través del Descriptor, y los consumidores entienden cómo invocar el skill a través de él.

## 4.2 Definiciones Completas de Campos

### Campos Obligatorios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `protocol` | ProtocolVersion | Información de versión del protocolo |
| `id` | string | Identificador único del skill |
| `name` | string | Nombre del skill |
| `version` | string | Versión del skill (formato SemVer) |
| `capability_type` | CapabilityType | Tipo de capacidad |
| `description` | string | Descripción del skill |
| `provider` | object | Información del proveedor |
| `endpoint` | InvocationEndpoint | Configuración del punto de invocación |
| `inputs` | ParameterDefinition[] | Definiciones de parámetros de entrada |
| `output` | OutputDefinition | Definición del formato de salida |
| `auth` | AuthConfig | Configuración de autenticación |
| `access` | AccessPolicy | Política de control de acceso |

### Campos Opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tags` | string[] | Etiquetas (para búsqueda y clasificación) |
| `documentation_url` | string | URL de documentación del skill |
| `created_at` | string | Fecha de creación (ISO 8601) |
| `updated_at` | string | Fecha de actualización (ISO 8601) |

## 4.3 Tipos Enumerados

### CapabilityType

```json
["plugin", "api", "knowledge", "task"]
```

- `plugin`: Módulo funcional integrable
- `api`: Interfaz de servicio remoto
- `knowledge`: Recurso de conocimiento estructurado
- `task`: Tarea ejecutable por humanos o iFay

### AccessPolicy

```json
["public", "restricted", "private"]
```

- `public`: Abierto; cualquiera puede descubrir e invocar
- `restricted`: Descubrible pero la invocación requiere autenticación
- `private`: No descubrible sin autenticación

### AuthType

```json
["api_key", "oauth2", "custom", "none"]
```

## 4.4 Definiciones de Subestructuras

### ProtocolVersion

```json
{
  "version": "1.0.0",
  "changelog_url": "https://example.com/changelog"
}
```

### InvocationEndpoint

```json
{
  "url": "https://example.com/skills/translate/invoke",
  "method": "POST",
  "content_type": "application/json",
  "status_url": "https://example.com/skills/translate/status/{execution_id}",
  "result_url": "https://example.com/skills/translate/result/{execution_id}",
  "timeout_ms": 30000,
  "retry": {
    "max_attempts": 3,
    "backoff_ms": 1000
  }
}
```

### ParameterDefinition

```json
{
  "name": "text",
  "type": "string",
  "description": "Texto a traducir",
  "required": true,
  "default": null,
  "schema": { "minLength": 1, "maxLength": 10000 }
}
```

### AuthConfig

Ejemplo de autenticación API Key:
```json
{
  "type": "api_key",
  "description": "Pasar API Key vía HTTP Header",
  "header": "X-API-Key"
}
```

Ejemplo de autenticación OAuth 2.0:
```json
{
  "type": "oauth2",
  "oauth2": {
    "authorization_url": "https://example.com/oauth/authorize",
    "token_url": "https://example.com/oauth/token",
    "scopes": {
      "skill:invoke": "Invocar skill",
      "skill:read": "Leer información del skill"
    }
  }
}
```

### OutputDefinition

```json
{
  "content_type": "application/json",
  "schema": {
    "type": "object",
    "properties": {
      "translated_text": { "type": "string" },
      "source_language": { "type": "string" },
      "target_language": { "type": "string" }
    }
  },
  "description": "Resultado de traducción incluyendo texto traducido e información de idioma"
}
```

## 4.5 Ejemplo Completo

El siguiente es un ejemplo completo de Descriptor para un skill de traducción:

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://skill-sharing.org/changelog"
  },
  "id": "com.example.translate-v1",
  "name": "Universal Translator",
  "version": "2.1.0",
  "capability_type": "api",
  "description": "Servicio de traducción de texto de alta calidad con soporte para 100+ idiomas",
  "provider": {
    "name": "Example Corp",
    "url": "https://example.com",
    "contact": "skills@example.com"
  },
  "endpoint": {
    "url": "https://api.example.com/skills/translate/invoke",
    "method": "POST",
    "content_type": "application/json",
    "status_url": "https://api.example.com/skills/translate/status/{execution_id}",
    "result_url": "https://api.example.com/skills/translate/result/{execution_id}",
    "timeout_ms": 30000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  },
  "inputs": [
    {
      "name": "text",
      "type": "string",
      "description": "Texto a traducir",
      "required": true,
      "schema": { "minLength": 1, "maxLength": 10000 }
    },
    {
      "name": "target_language",
      "type": "string",
      "description": "Código del idioma destino (ISO 639-1)",
      "required": true
    },
    {
      "name": "source_language",
      "type": "string",
      "description": "Código del idioma fuente (dejar vacío para detección automática)",
      "required": false,
      "default": "auto"
    }
  ],
  "output": {
    "content_type": "application/json",
    "schema": {
      "type": "object",
      "properties": {
        "translated_text": { "type": "string" },
        "source_language": { "type": "string" },
        "target_language": { "type": "string" },
        "confidence": { "type": "number" }
      }
    },
    "description": "Resultado de traducción"
  },
  "auth": {
    "type": "api_key",
    "description": "Pasar clave vía header X-API-Key",
    "header": "X-API-Key"
  },
  "access": "restricted",
  "tags": ["translation", "nlp", "multilingual"],
  "documentation_url": "https://docs.example.com/skills/translate",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-03-20T14:30:00Z"
}
```
