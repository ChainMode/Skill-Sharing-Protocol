# Capítulo 7: Seguridad y Autenticación

## 7.1 Descripción General

Los mecanismos de seguridad son una parte esencial del protocolo, garantizando que los proveedores de skills puedan controlar quién puede descubrir e invocar sus skills. El protocolo soporta múltiples métodos de autenticación y políticas de control de acceso, logrando un equilibrio entre apertura y seguridad.

## 7.2 Políticas de Control de Acceso

### Control de Acceso de Tres Niveles

| Nivel | Visibilidad de descubrimiento | Permiso de invocación | Caso de uso |
|-------|-------------------------------|----------------------|-------------|
| `public` | Visible para todos | Sin autenticación requerida | APIs abiertas, bases de conocimiento públicas |
| `restricted` | Visible para todos | Autenticación requerida | APIs comerciales, servicios de pago |
| `private` | Visible solo tras autenticación | Autenticación requerida | Herramientas internas, servicios privados |

### Relación entre Control de Acceso y Descubrimiento

- Solicitud no autenticada a Well-Known URI: retorna skills `public` y `restricted`, no retorna `private`
- Solicitud autenticada a Well-Known URI: retorna todos los skills (incluyendo `private`)

## 7.3 Métodos de Autenticación

### Autenticación por API Key

```json
{ "type": "api_key", "description": "Pasar API Key vía HTTP Header", "header": "X-API-Key" }
```

### Autenticación OAuth 2.0

```json
{
  "type": "oauth2",
  "oauth2": {
    "authorization_url": "https://example.com/oauth/authorize",
    "token_url": "https://example.com/oauth/token",
    "scopes": { "skill:invoke": "Invocar skill", "skill:read": "Leer información del skill", "skill:admin": "Gestionar configuración del skill" }
  }
}
```

### Autenticación Personalizada

```json
{
  "type": "custom",
  "custom": {
    "instructions": "Firmar el cuerpo de la solicitud con HMAC-SHA256 y colocar la firma en el header X-Signature",
    "parameters": [{ "name": "secret_key", "type": "string", "description": "Clave secreta para firma HMAC", "required": true }]
  }
}
```

### Sin Autenticación

```json
{ "type": "none" }
```

## 7.4 Manejo de Errores de Autenticación

### Fallo de Autenticación (401)

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": { "required_auth_type": "oauth2", "authorization_url": "https://example.com/oauth/authorize" }
  }
}
```

### Permisos Insuficientes (403)

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to invoke this skill",
    "details": { "required_scopes": ["skill:invoke"], "current_scopes": ["skill:read"] }
  }
}
```

## 7.5 Mejores Prácticas de Seguridad

1. Toda comunicación debe usar HTTPS
2. Las API Keys deben pasarse vía Headers, evitando exposición en URLs
3. Los Tokens OAuth 2.0 deben tener tiempos de expiración razonables
4. Los proveedores de skills deben implementar limitación de tasa para prevenir abuso
5. Los skills sensibles deben usar la política de acceso `private` para evitar descubrimiento por partes no autorizadas
