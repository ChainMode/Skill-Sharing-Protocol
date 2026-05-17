# Capítulo 9: Manejo de Errores

## 9.1 Descripción General

El protocolo define un mecanismo unificado de manejo de errores para asegurar que los consumidores de skills puedan comprender con precisión las causas de error y tomar medidas de recuperación apropiadas.

## 9.2 Clasificación de Errores

| Categoría de Error | Código de Error | Código HTTP | Escenario |
|-------------------|----------------|-------------|-----------|
| Error de validación | VALIDATION_ERROR | N/A (local) | Schema Validator detecta un Skill Descriptor inválido |
| Fallo de autenticación | AUTH_REQUIRED | 401 | Sin credenciales válidas al invocar un skill protegido |
| Permisos insuficientes | PERMISSION_DENIED | 403 | Credenciales válidas pero sin acceso al skill |
| Skill no encontrado | SKILL_NOT_FOUND | 404 | ID de skill o URL de Descriptor solicitado no existe |
| Timeout de ejecución | EXECUTION_TIMEOUT | 408 / 504 | Ejecución del skill excede el timeout configurado |
| Endpoint inalcanzable | ENDPOINT_UNREACHABLE | 502 / 503 | Punto de invocación no puede ser alcanzado |
| Versión incompatible | VERSION_INCOMPATIBLE | 422 | Versión del protocolo del Skill Descriptor incompatible con el consumidor |

## 9.3 Formato Unificado de Respuesta de Error

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción de error legible por humanos",
    "details": {},
    "retry": { "suggested_delay_ms": 0, "max_attempts": 0 }
  }
}
```

### Descripción de Campos

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `error.code` | string | Sí | Código de error legible por máquina |
| `error.message` | string | Sí | Descripción de error legible por humanos |
| `error.details` | object | No | Información contextual detallada del error |
| `error.retry` | object | No | Sugerencias de reintento |
| `error.retry.suggested_delay_ms` | number | No | Retraso de reintento sugerido (milisegundos) |
| `error.retry.max_attempts` | number | No | Máximo de intentos de reintento sugerido |

## 9.4 Descripciones Detalladas de Errores

### Error de Validación

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Skill descriptor validation failed",
    "details": {
      "violations": [
        { "field": "/capability_type", "expected": "one of: plugin, api, knowledge, task", "actual": "unknown_type", "message": "Invalid enum value" },
        { "field": "/endpoint/url", "expected": "string (URI format)", "actual": null, "message": "Required field is missing" }
      ]
    }
  }
}
```

### Timeout de Ejecución

```json
{
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Skill execution exceeded the configured timeout of 30000ms",
    "details": { "timeout_ms": 30000, "elapsed_ms": 30001 },
    "retry": { "suggested_delay_ms": 5000, "max_attempts": 3 }
  }
}
```

## 9.5 Estrategias de Reintento

### Backoff Exponencial

```
retraso = initial_delay × 2^(attempt - 1)
```

Ejemplo (initial_delay = 1000ms): 1000ms → 2000ms → 4000ms → 8000ms

### Errores No Reintentables

- `VALIDATION_ERROR`: El Descriptor necesita ser corregido
- `AUTH_REQUIRED`: Se necesitan credenciales
- `PERMISSION_DENIED`: Se necesitan permisos
- `VERSION_INCOMPATIBLE`: El consumidor necesita ser actualizado
