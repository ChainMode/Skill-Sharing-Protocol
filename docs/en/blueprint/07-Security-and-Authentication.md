# Chapter 7: Security and Authentication

## 7.1 Overview

Security mechanisms are an essential part of the protocol, ensuring that skill providers can control who can discover and invoke their skills. The protocol supports multiple authentication methods and access control policies, striking a balance between openness and security.

## 7.2 Access Control Policies

### Three-Level Access Control

| Level | Discovery Visibility | Invocation Permission | Use Case |
|-------|---------------------|----------------------|----------|
| `public` | Visible to everyone | No authentication required | Open APIs, public knowledge bases |
| `restricted` | Visible to everyone | Authentication required | Commercial APIs, paid services |
| `private` | Visible only after authentication | Authentication required | Internal tools, private services |

### Relationship Between Access Control and Discovery

- When an unauthenticated request accesses the Well-Known URI:
  - All `public` and `restricted` skills are returned
  - `private` skills are not returned
- When an authenticated request accesses the Well-Known URI:
  - All skills are returned (including `private`)

## 7.3 Authentication Methods

### API Key Authentication

The simplest authentication method, passing a key via HTTP Header.

Descriptor declaration:
```json
{
  "type": "api_key",
  "description": "Pass API Key via HTTP Header",
  "header": "X-API-Key"
}
```

Header attached during invocation:
```
POST /invoke HTTP/1.1
Host: api.example.com
X-API-Key: sk-your-api-key-here
Content-Type: application/json
```

### OAuth 2.0 Authentication

Suitable for scenarios requiring fine-grained permission control.

Descriptor declaration:
```json
{
  "type": "oauth2",
  "oauth2": {
    "authorization_url": "https://example.com/oauth/authorize",
    "token_url": "https://example.com/oauth/token",
    "scopes": {
      "skill:invoke": "Invoke skill",
      "skill:read": "Read skill information",
      "skill:admin": "Manage skill configuration"
    }
  }
}
```

Header attached during invocation:
```
POST /invoke HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
```

### Custom Authentication

Suitable for non-standard authentication scenarios; providers explain the authentication method through the `instructions` field.

Descriptor declaration:
```json
{
  "type": "custom",
  "custom": {
    "instructions": "Sign the request body using HMAC-SHA256 and place the signature in the X-Signature header",
    "parameters": [
      {
        "name": "secret_key",
        "type": "string",
        "description": "Secret key for HMAC signing",
        "required": true
      }
    ]
  }
}
```

### No Authentication

Public skills require no authentication:
```json
{
  "type": "none"
}
```

## 7.4 Authentication Error Handling

### Authentication Failure (401)

When valid credentials are not provided:
```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://example.com/oauth/authorize"
    }
  }
}
```

### Insufficient Permissions (403)

When credentials are valid but lack access rights:
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to invoke this skill",
    "details": {
      "required_scopes": ["skill:invoke"],
      "current_scopes": ["skill:read"]
    }
  }
}
```

## 7.5 Security Best Practices

1. All communication should use HTTPS
2. API Keys should be passed via Headers, avoiding exposure in URLs
3. OAuth 2.0 Tokens should have reasonable expiration times
4. Skill providers should implement rate limiting to prevent abuse
5. Sensitive skills should use the `private` access policy to avoid discovery by unauthorized parties
