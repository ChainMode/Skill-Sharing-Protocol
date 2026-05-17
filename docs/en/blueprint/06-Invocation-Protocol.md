# Chapter 6: Invocation Protocol

## 6.1 Overview

The Invocation Protocol defines how skill consumers remotely invoke discovered skills. The protocol adopts an asynchronous invocation model that supports status querying and result retrieval.

## 6.2 Invocation Flow

### Three-Step Invocation Model

| Step | HTTP Method | Endpoint | Description |
|------|-------------|----------|-------------|
| 1. Initiate invocation | POST | `{invocation_endpoint}` | Submit invocation request, returns execution ID |
| 2. Query status | GET | `{status_url}/{execution_id}` | Query execution status |
| 3. Retrieve result | GET | `{result_url}/{execution_id}` | Retrieve execution result |

### Invocation Sequence

```
Consumer                              Provider
  │                                      │
  │── POST /invoke ──────────────────────→│
  │   {caller, skill_id, inputs}         │
  │                                      │
  │←── 202 Accepted ────────────────────│
  │   {execution_id, status: "accepted"} │
  │                                      │
  │── GET /status/{execution_id} ───────→│
  │                                      │
  │←── {status: "running"} ─────────────│
  │                                      │
  │── GET /status/{execution_id} ───────→│
  │                                      │
  │←── {status: "completed"} ───────────│
  │                                      │
  │── GET /result/{execution_id} ───────→│
  │                                      │
  │←── {output: {...}} ─────────────────│
  │                                      │
```

## 6.3 Invocation Request Format

```json
{
  "caller": {
    "id": "ifay-instance-001",
    "type": "ifay",
    "credentials": {
      "api_key": "sk-xxxxx"
    }
  },
  "skill_id": "com.example.translate-v1",
  "inputs": {
    "text": "Hello, world!",
    "target_language": "zh-CN"
  },
  "context": {
    "trace_id": "trace-abc-123",
    "priority": "normal",
    "timeout_ms": 30000
  }
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `caller` | object | Yes | Caller identity information |
| `caller.id` | string | Yes | Caller unique identifier |
| `caller.type` | string | Yes | Caller type (ifay/service/user) |
| `caller.credentials` | object | No | Authentication credentials |
| `skill_id` | string | Yes | Target skill ID |
| `inputs` | object | Yes | Input parameters (key-value pairs) |
| `context` | object | No | Invocation context |
| `context.trace_id` | string | No | Trace ID |
| `context.priority` | string | No | Priority (low/normal/high) |
| `context.timeout_ms` | number | No | Timeout duration (milliseconds) |

## 6.4 Invocation Response Format

```json
{
  "execution_id": "exec-789-xyz",
  "status": "completed",
  "skill_id": "com.example.translate-v1",
  "output": {
    "translated_text": "你好，世界！",
    "source_language": "en",
    "target_language": "zh-CN",
    "confidence": 0.98
  },
  "timestamps": {
    "created_at": "2025-03-20T14:30:00Z",
    "updated_at": "2025-03-20T14:30:02Z",
    "completed_at": "2025-03-20T14:30:02Z"
  }
}
```

### Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `execution_id` | string | Yes | Unique execution identifier |
| `status` | ExecutionStatus | Yes | Execution status |
| `skill_id` | string | Yes | Target skill ID |
| `output` | any | No | Output data (when completed) |
| `error` | object | No | Error information (when failed/timeout) |
| `timestamps` | object | Yes | Timestamp information |

### Execution Status Enum

| Status | Description |
|--------|-------------|
| `accepted` | Request received, awaiting execution |
| `running` | Currently executing |
| `completed` | Execution completed successfully |
| `failed` | Execution failed |
| `timeout` | Execution timed out |

## 6.5 Authentication Flow

Before invocation, the consumer checks the `auth` field in the Skill Descriptor:

```
Consumer                              Provider
  │                                      │
  │── Read descriptor.auth ──→           │
  │                                      │
  │   auth.type == "api_key"?            │
  │   → Attach API Key in Header         │
  │                                      │
  │   auth.type == "oauth2"?             │
  │   → Execute OAuth 2.0 flow for Token │
  │                                      │
  │   auth.type == "none"?               │
  │   → Invoke directly, no credentials  │
  │                                      │
  │── POST /invoke (with credentials) ──→│
  │                                      │
```

### Authentication Failure Response

When valid credentials are not provided, a 401 error is returned:

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

## 6.6 Timeout and Retry

### Timeout Handling

When skill execution exceeds the configured `timeout_ms`:

```json
{
  "execution_id": "exec-789-xyz",
  "status": "timeout",
  "skill_id": "com.example.translate-v1",
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Skill execution exceeded the configured timeout of 30000ms",
    "retry": {
      "suggested_delay_ms": 5000,
      "max_attempts": 3
    }
  },
  "timestamps": {
    "created_at": "2025-03-20T14:30:00Z",
    "updated_at": "2025-03-20T14:30:30Z"
  }
}
```

### Retry Strategy

- Timeout responses include suggested retry delay and maximum retry attempts
- Consumers should implement exponential backoff retry strategies
- For unreachable endpoints, exponential backoff is recommended (initial delay × 2^n)
