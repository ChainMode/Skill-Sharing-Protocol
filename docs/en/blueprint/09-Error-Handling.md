# Chapter 9: Error Handling

## 9.1 Overview

The protocol defines a unified error handling mechanism to ensure that skill consumers can accurately understand error causes and take appropriate recovery measures.

## 9.2 Error Classification

| Error Category | Error Code | HTTP Status Code | Scenario |
|----------------|------------|-----------------|----------|
| Validation Error | VALIDATION_ERROR | N/A (local) | Schema Validator detects an invalid Skill Descriptor |
| Authentication Failure | AUTH_REQUIRED | 401 | No valid credentials provided when invoking a protected skill |
| Insufficient Permissions | PERMISSION_DENIED | 403 | Credentials are valid but lack access to the skill |
| Skill Not Found | SKILL_NOT_FOUND | 404 | Requested skill ID or descriptor URL does not exist |
| Execution Timeout | EXECUTION_TIMEOUT | 408 / 504 | Skill execution exceeds the configured timeout |
| Endpoint Unreachable | ENDPOINT_UNREACHABLE | 502 / 503 | Invocation endpoint cannot be reached |
| Version Incompatible | VERSION_INCOMPATIBLE | 422 | Skill Descriptor protocol version is incompatible with the consumer |

## 9.3 Unified Error Response Format

All error responses follow a unified structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error.code` | string | Yes | Machine-readable error code |
| `error.message` | string | Yes | Human-readable error description |
| `error.details` | object | No | Detailed contextual error information |
| `error.retry` | object | No | Retry suggestions |
| `error.retry.suggested_delay_ms` | number | No | Suggested retry delay (milliseconds) |
| `error.retry.max_attempts` | number | No | Suggested maximum retry attempts |

## 9.4 Detailed Error Descriptions

### Validation Error

Returned when the Schema Validator detects an invalid document:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Skill descriptor validation failed",
    "details": {
      "violations": [
        {
          "field": "/capability_type",
          "expected": "one of: plugin, api, knowledge, task",
          "actual": "unknown_type",
          "message": "Invalid enum value"
        },
        {
          "field": "/endpoint/url",
          "expected": "string (URI format)",
          "actual": null,
          "message": "Required field is missing"
        }
      ]
    }
  }
}
```

Characteristics:
- Returns a list of all violating fields (not just the first error)
- Each entry includes the field path (JSON Pointer format), expected value, and actual value

### Authentication Failure

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://example.com/oauth/authorize",
      "scopes": ["skill:invoke"]
    }
  }
}
```

Characteristics:
- Includes description of the required authentication method
- Helps consumers automatically complete the authentication flow

### Execution Timeout

```json
{
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Skill execution exceeded the configured timeout of 30000ms",
    "details": {
      "timeout_ms": 30000,
      "elapsed_ms": 30001
    },
    "retry": {
      "suggested_delay_ms": 5000,
      "max_attempts": 3
    }
  }
}
```

Characteristics:
- Includes suggested retry delay and maximum retry attempts
- Consumers can implement automatic retry based on this information

### Endpoint Unreachable

```json
{
  "error": {
    "code": "ENDPOINT_UNREACHABLE",
    "message": "Failed to connect to skill endpoint",
    "details": {
      "endpoint_url": "https://api.example.com/skills/translate/invoke",
      "reason": "Connection refused"
    },
    "retry": {
      "suggested_delay_ms": 2000,
      "max_attempts": 5
    }
  }
}
```

### Version Incompatible

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.x",
    "details": {
      "descriptor_version": "2.0.0",
      "consumer_supported_range": "1.x.x",
      "upgrade_url": "https://skill-sharing.org/upgrade-guide"
    }
  }
}
```

## 9.5 Retry Strategies

### Exponential Backoff

For retryable errors (timeout, endpoint unreachable), exponential backoff is recommended:

```
delay = initial_delay × 2^(attempt - 1)
```

Example (initial_delay = 1000ms):
- 1st retry: 1000ms
- 2nd retry: 2000ms
- 3rd retry: 4000ms
- 4th retry: 8000ms

### Non-Retryable Errors

The following errors should not be retried:
- `VALIDATION_ERROR`: Descriptor needs to be fixed
- `AUTH_REQUIRED`: Credentials need to be provided
- `PERMISSION_DENIED`: Permissions need to be obtained
- `VERSION_INCOMPATIBLE`: Consumer needs to be upgraded
