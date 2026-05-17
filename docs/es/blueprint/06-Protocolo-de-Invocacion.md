# Capítulo 6: Protocolo de Invocación

## 6.1 Descripción General

El Invocation Protocol define cómo los consumidores de skills invocan remotamente los skills descubiertos. El protocolo adopta un modelo de invocación asíncrono que soporta consultas de estado y recuperación de resultados.

## 6.2 Flujo de Invocación

### Modelo de Invocación en Tres Pasos

| Paso | Método HTTP | Endpoint | Descripción |
|------|-------------|----------|-------------|
| 1. Iniciar invocación | POST | `{invocation_endpoint}` | Enviar solicitud, retornar ID de ejecución |
| 2. Consultar estado | GET | `{status_url}/{execution_id}` | Consultar estado de ejecución |
| 3. Obtener resultado | GET | `{result_url}/{execution_id}` | Obtener resultado de ejecución |

### Secuencia de Invocación

```
Consumidor                              Proveedor
  │                                      │
  │── POST /invoke ──────────────────────→│
  │   {caller, skill_id, inputs}         │
  │                                      │
  │←── 202 Accepted ────────────────────│
  │   {execution_id, status: "accepted"} │
  │                                      │
  │── GET /status/{execution_id} ───────→│
  │←── {status: "completed"} ───────────│
  │                                      │
  │── GET /result/{execution_id} ───────→│
  │←── {output: {...}} ─────────────────│
  │                                      │
```

## 6.3 Formato de Solicitud

```json
{
  "caller": {
    "id": "ifay-instance-001",
    "type": "ifay",
    "credentials": { "api_key": "sk-xxxxx" }
  },
  "skill_id": "com.example.translate-v1",
  "inputs": { "text": "Hello, world!", "target_language": "zh-CN" },
  "context": { "trace_id": "trace-abc-123", "priority": "normal", "timeout_ms": 30000 }
}
```

### Campos de la Solicitud

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `caller` | object | Sí | Información de identidad del invocador |
| `caller.id` | string | Sí | Identificador único del invocador |
| `caller.type` | string | Sí | Tipo de invocador (ifay/service/user) |
| `caller.credentials` | object | No | Credenciales de autenticación |
| `skill_id` | string | Sí | ID del skill objetivo |
| `inputs` | object | Sí | Parámetros de entrada (pares clave-valor) |
| `context` | object | No | Contexto de invocación |
| `context.timeout_ms` | number | No | Duración del timeout (milisegundos) |

## 6.4 Formato de Respuesta

```json
{
  "execution_id": "exec-789-xyz",
  "status": "completed",
  "skill_id": "com.example.translate-v1",
  "output": { "translated_text": "你好，世界！", "confidence": 0.98 },
  "timestamps": { "created_at": "2025-03-20T14:30:00Z", "completed_at": "2025-03-20T14:30:02Z" }
}
```

### Enumeración de Estados de Ejecución

| Estado | Descripción |
|--------|-------------|
| `accepted` | Solicitud recibida, esperando ejecución |
| `running` | En ejecución |
| `completed` | Ejecución completada exitosamente |
| `failed` | Ejecución fallida |
| `timeout` | Ejecución expirada |

## 6.5 Flujo de Autenticación

Antes de la invocación, el consumidor verifica el campo `auth` en el Skill Descriptor:

```
Consumidor                              Proveedor
  │                                      │
  │── Leer descriptor.auth ──→           │
  │   auth.type == "api_key"? → Header   │
  │   auth.type == "oauth2"? → Token     │
  │   auth.type == "none"? → Directo     │
  │── POST /invoke (con credenciales) ──→│
  │                                      │
```

## 6.6 Timeout y Reintento

Cuando la ejecución del skill excede el `timeout_ms` configurado:

```json
{
  "execution_id": "exec-789-xyz",
  "status": "timeout",
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Skill execution exceeded the configured timeout of 30000ms",
    "retry": { "suggested_delay_ms": 5000, "max_attempts": 3 }
  }
}
```

### Estrategia de Reintento

- Las respuestas de timeout incluyen retraso de reintento sugerido y máximo de intentos
- Los consumidores deben implementar estrategias de reintento con backoff exponencial
- Para endpoints inalcanzables, se recomienda backoff exponencial (retraso inicial × 2^n)
