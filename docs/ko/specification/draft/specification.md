# Skill Sharing Protocol 사양

**상태:** 초안  
**버전:** 1.0.0  
**날짜:** 2025-01-01  
**Schema:** [`schema/draft/schema.json`](../../../../schema/draft/schema.json), [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

---

## 목차

1. [프로토콜 개요](#1-프로토콜-개요)
2. [용어 정의](#2-용어-정의)
3. [Skill Descriptor 사양](#3-skill-descriptor-사양)
4. [발견 메커니즘 사양](#4-발견-메커니즘-사양)
5. [호출 프로토콜 사양](#5-호출-프로토콜-사양)
6. [버전 관리 사양](#6-버전-관리-사양)
7. [보안 및 인증 사양](#7-보안-및-인증-사양)
8. [오류 처리 사양](#8-오류-처리-사양)
9. [Schema 참조](#9-schema-참조)
10. [부록: 전체 예제](#10-부록-전체-예제)

---

## 1. 프로토콜 개요

### 1.1 목적

Skill Sharing Protocol은 인터넷을 통해 스킬을 발견, 선언 및 호출하기 위한 탈중앙화 메커니즘을 정의합니다. 스킬 제공자가 중앙 집중식 플랫폼에 의존하지 않고 자신의 기능을 노출할 수 있게 하며, 스킬 소비자(주로 iFay 인스턴스)가 자율적으로 스킬을 발견하고 원격으로 호출할 수 있도록 합니다.

### 1.2 설계 원칙

- **탈중앙화 발견:** 스킬 제공자는 자신의 도메인 하에 스킬을 선언합니다. 소비자는 Well-Known URI와 직접 URL을 통해 스킬을 발견하며, 중앙 레지스트리가 필요하지 않습니다.
- **자기 기술적(Self-Describing):** 각 스킬은 기능, 인터페이스 및 호출 방법을 포함하는 표준화된 Skill Descriptor 문서로 완전히 기술됩니다.
- **프로토콜이 곧 사양:** 산출물은 프로토콜 문서와 Schema 정의 파일이며, 소프트웨어 애플리케이션이 아닙니다.

### 1.3 아키텍처

프로토콜은 웹의 하이퍼링크 발견 모델 및 P2P 네트워크 노드 발견과 유사한 탈중앙화 Provider-Consumer 아키텍처를 따릅니다.

```
┌─────────────────────────────────────────────────────┐
│              Skill Provider Domain                   │
│                                                     │
│  /.well-known/skill-sharing  ──► Skill Index        │
│       │                                             │
│       ├──► Skill Descriptor A ──► Invocation EP A   │
│       └──► Skill Descriptor B ──► Invocation EP B   │
└─────────────────────────────────────────────────────┘
        ▲                              ▲
        │ 1. Discovery                 │ 2. Invocation
        │                              │
┌───────┴──────────────────────────────┴──────────────┐
│              Skill Consumer (iFay)                    │
│                                                     │
│  Discovery Client ──► Schema Validator ──► Invoker  │
└─────────────────────────────────────────────────────┘
```

### 1.4 프로토콜 상호작용 흐름

1. **발견 단계:** 소비자가 제공자 도메인에 `GET /.well-known/skill-sharing` 요청을 보내고, 선언된 모든 스킬에 대한 참조를 포함하는 Skill Index를 수신합니다.
2. **검증 단계:** 소비자가 Schema Validator를 사용하여 각 Skill Descriptor를 프로토콜 Schema에 대해 검증합니다.
3. **호출 단계:** 소비자가 스킬의 호출 엔드포인트에 POST 요청을 보내고, 실행 ID를 수신한 후 상태와 결과를 폴링합니다.

### 1.5 산출물

| 산출물 | 설명 |
|---|---|
| 프로토콜 사양 문서 | `docs/{lang}/specification/` 하에 9개 언어로 제공 |
| JSON Schema | `schema/{version}/schema.json` — JSON Schema Draft 2020-12 |
| TypeScript 타입 정의 | `schema/{version}/schema.ts` — 엄격한 TypeScript 인터페이스 |
| MDX 문서 | `schema/{version}/schema.mdx` — 대화형 Schema 문서 |

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| **iFay** | 지능형 인지 동반자 시스템으로, Skill Sharing Protocol의 주요 소비자이며 스킬을 발견하고 호출하여 자체 기능을 확장할 수 있습니다. |
| **Skill(스킬)** | 본 프로토콜에 따라 선언된 호출 가능한 기능 단위로, 플러그인, API, 지식 팩, 작업 실행 기능 등을 포함하되 이에 국한되지 않습니다. |
| **Skill Provider(스킬 제공자)** | 인터넷에서 스킬을 선언하고 노출하는 엔티티(개인, 조직 또는 자동화 시스템)입니다. |
| **Skill Consumer(스킬 소비자)** | 스킬을 발견하고 호출하는 엔티티로, 주로 iFay 인스턴스입니다. |
| **Skill Descriptor(스킬 디스크립터)** | 프로토콜 Schema를 준수하는 메타데이터 문서로, 스킬의 기능, 인터페이스 및 호출 방법을 기술합니다. |
| **Discovery Mechanism(발견 메커니즘)** | 스킬 소비자가 탈중앙화 네트워크에서 Skill Descriptor를 찾고 발견하는 방법과 프로세스입니다. |
| **Protocol Schema(프로토콜 Schema)** | JSON Schema, TypeScript 타입 및 MDX 문서를 포함하여 Skill Descriptor의 구조를 정의하는 공식 사양입니다. |
| **Skill Registry(스킬 레지스트리)** | 스킬 발견을 가속화하기 위한 선택적 스킬 인덱스 서비스로, 프로토콜 운영에 필수적이지 않습니다. |
| **Invocation Endpoint(호출 엔드포인트)** | Skill Descriptor에 선언된 원격 호출 진입점입니다. |
| **Capability Type(기능 유형)** | 스킬의 분류 식별자: `plugin`, `api`, `knowledge` 또는 `task`입니다. |
| **Schema Validator(Schema 검증기)** | Protocol Schema에 대해 Skill Descriptor의 준수 여부를 검증하는 도구 또는 컴포넌트입니다. |
| **Protocol Version(프로토콜 버전)** | Semantic Versioning을 따르는 프로토콜 사양의 버전 식별자입니다. |
| **Well-Known URI** | 도메인의 Skill Index를 찾기 위해 사용되는 표준화된 발견 경로 `/.well-known/skill-sharing`입니다. |

---

## 3. Skill Descriptor 사양

### 3.1 개요

Skill Descriptor는 프로토콜의 핵심 데이터 구조입니다. 단일 스킬의 신원, 기능, 인터페이스, 호출 방법 및 접근 제어 정책을 완전히 기술하는 JSON 문서입니다.

모든 Skill Descriptor는 유효한 것으로 간주되기 전에 프로토콜의 JSON Schema(`schema/draft/schema.json`)에 대해 검증되어야 합니다(MUST).

### 3.2 필수 필드

유효한 Skill Descriptor는 다음의 모든 필드를 포함해야 합니다(MUST):

| 필드 | 타입 | 설명 |
|---|---|---|
| `protocol` | `ProtocolVersion` | 이 디스크립터가 준수하는 프로토콜 버전입니다. |
| `id` | `string` | 스킬의 전역 고유 식별자입니다. |
| `name` | `string` | 사람이 읽을 수 있는 스킬 이름입니다. |
| `version` | `string` | SemVer 형식의 스킬 버전입니다(예: `"1.0.0"`). |
| `capability_type` | `CapabilityType` | 스킬의 기능 분류입니다. |
| `description` | `string` | 스킬이 수행하는 작업에 대한 사람이 읽을 수 있는 설명입니다. |
| `provider` | `object` | 스킬 제공자 정보입니다(`name`을 반드시 포함해야 합니다). |
| `endpoint` | `InvocationEndpoint` | 호출 엔드포인트 구성입니다. |
| `inputs` | `ParameterDefinition[]` | 입력 매개변수 정의 배열입니다. |
| `output` | `OutputDefinition` | 출력 형식 정의입니다. |
| `auth` | `AuthConfig` | 인증 구성입니다. |
| `access` | `AccessPolicy` | 접근 제어 정책입니다. |

### 3.3 선택적 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `tags` | `string[]` | 검색 및 분류를 위한 태그입니다. |
| `documentation_url` | `string` | 스킬 문서의 URL입니다. |
| `created_at` | `string` | ISO 8601 형식의 생성 타임스탬프입니다. |
| `updated_at` | `string` | ISO 8601 형식의 최종 업데이트 타임스탬프입니다. |

### 3.4 열거형 타입

#### 3.4.1 CapabilityType

스킬 기능의 분류를 정의합니다. 유효한 값:

| 값 | 설명 |
|---|---|
| `"plugin"` | 기능을 확장하는 플러그인입니다. |
| `"api"` | API 서비스 엔드포인트입니다. |
| `"knowledge"` | 지식 팩 또는 데이터 소스입니다. |
| `"task"` | 작업 실행 기능(사람 또는 자동화)입니다. |

#### 3.4.2 AccessPolicy

스킬의 접근 제어 정책을 정의합니다. 유효한 값:

| 값 | 설명 |
|---|---|
| `"public"` | 제한 없이 모든 소비자가 접근할 수 있습니다. |
| `"restricted"` | 적절한 권한을 가진 인증된 소비자만 접근할 수 있습니다. |
| `"private"` | 인증되지 않은 발견 요청에서 숨겨지며, 발견과 호출 모두에 인증이 필요합니다. |

#### 3.4.3 AuthType

스킬 호출에 필요한 인증 방법을 정의합니다. 유효한 값:

| 값 | 설명 |
|---|---|
| `"api_key"` | API 키 기반 인증입니다. |
| `"oauth2"` | OAuth 2.0 인증입니다. |
| `"custom"` | 사용자 정의 인증 메커니즘입니다. |
| `"none"` | 인증이 필요하지 않습니다. |

#### 3.4.4 ExecutionStatus

스킬 호출의 실행 상태를 정의합니다. 유효한 값:

| 값 | 설명 |
|---|---|
| `"accepted"` | 호출 요청이 수락되었습니다. |
| `"running"` | 스킬이 현재 실행 중입니다. |
| `"completed"` | 실행이 성공적으로 완료되었습니다. |
| `"failed"` | 실행이 실패했습니다. |
| `"timeout"` | 실행 시간이 초과되었습니다. |

### 3.5 하위 구조 정의

#### 3.5.1 ProtocolVersion

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `version` | `string` | 예 | SemVer 형식의 버전 문자열입니다(예: `"1.0.0"`). |
| `changelog_url` | `string` | 아니오 | 버전 변경 로그의 URL입니다. |

#### 3.5.2 ParameterDefinition

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `name` | `string` | 예 | 매개변수 이름입니다. |
| `type` | `string` | 예 | JSON Schema 타입입니다(예: `"string"`, `"number"`, `"object"`). |
| `description` | `string` | 예 | 매개변수에 대한 사람이 읽을 수 있는 설명입니다. |
| `required` | `boolean` | 예 | 이 매개변수가 필수인지 여부입니다. |
| `default` | `any` | 아니오 | 매개변수가 제공되지 않을 경우의 기본값입니다. |
| `schema` | `object` | 아니오 | 복잡한 타입을 위한 중첩 JSON Schema입니다. |

#### 3.5.3 InvocationEndpoint

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `url` | `string` | 예 | 호출 URL입니다. |
| `method` | `string` | 예 | HTTP 메서드입니다. `"GET"`, `"POST"`, `"PUT"`, `"DELETE"` 중 하나입니다. |
| `content_type` | `string` | 아니오 | 요청 콘텐츠 타입입니다. 기본값은 `"application/json"`입니다. |
| `status_url` | `string` | 아니오 | `{execution_id}` 플레이스홀더를 포함하는 상태 조회 엔드포인트 템플릿입니다. |
| `result_url` | `string` | 아니오 | 결과 조회 엔드포인트 템플릿입니다. |
| `timeout_ms` | `number` | 아니오 | 호출 타임아웃(밀리초)입니다. |
| `retry` | `object` | 아니오 | `max_attempts`와 `backoff_ms`를 포함하는 재시도 구성입니다. |

#### 3.5.4 OutputDefinition

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `content_type` | `string` | 예 | 출력의 MIME 타입입니다(예: `"application/json"`). |
| `schema` | `object` | 아니오 | 출력 구조를 기술하는 JSON Schema입니다. |
| `description` | `string` | 아니오 | 출력에 대한 사람이 읽을 수 있는 설명입니다. |

#### 3.5.5 AuthConfig

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `type` | `AuthType` | 예 | 인증 유형입니다. |
| `description` | `string` | 아니오 | 인증 요구사항에 대한 사람이 읽을 수 있는 설명입니다. |
| `header` | `string` | 아니오 | API 키 인증을 위한 헤더 이름입니다. |
| `oauth2` | `object` | 아니오 | OAuth 2.0 구성입니다(`type`이 `"oauth2"`일 때 필수). |
| `custom` | `object` | 아니오 | 사용자 정의 인증 구성입니다(`type`이 `"custom"`일 때 필수). |

**OAuth2 구성:**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `authorization_url` | `string` | 예 | OAuth 2.0 인가 URL입니다. |
| `token_url` | `string` | 예 | OAuth 2.0 토큰 URL입니다. |
| `scopes` | `Record<string, string>` | 예 | 키-값 쌍으로 된 사용 가능한 스코프입니다(스코프 이름 → 설명). |

**사용자 정의 인증 구성:**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `instructions` | `string` | 예 | 사용자 정의 인증 흐름에 대한 사람이 읽을 수 있는 지침입니다. |
| `parameters` | `ParameterDefinition[]` | 예 | 사용자 정의 인증에 필요한 매개변수입니다. |

### 3.6 예제: 유효한 Skill Descriptor

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/changelog"
  },
  "id": "example-provider/weather-forecast",
  "name": "Weather Forecast",
  "version": "2.1.0",
  "capability_type": "api",
  "description": "Provides weather forecast data for a given location and date range.",
  "provider": {
    "name": "Example Weather Co.",
    "url": "https://weather.example.com",
    "contact": "api-support@example.com"
  },
  "endpoint": {
    "url": "https://api.weather.example.com/v2/forecast",
    "method": "POST",
    "content_type": "application/json",
    "status_url": "https://api.weather.example.com/v2/status/{execution_id}",
    "result_url": "https://api.weather.example.com/v2/result/{execution_id}",
    "timeout_ms": 30000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  },
  "inputs": [
    {
      "name": "location",
      "type": "string",
      "description": "City name or coordinates (lat,lon).",
      "required": true
    },
    {
      "name": "days",
      "type": "number",
      "description": "Number of forecast days (1-14).",
      "required": false,
      "default": 7
    }
  ],
  "output": {
    "content_type": "application/json",
    "description": "JSON object containing forecast data.",
    "schema": {
      "type": "object",
      "properties": {
        "location": { "type": "string" },
        "forecasts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "date": { "type": "string" },
              "high": { "type": "number" },
              "low": { "type": "number" },
              "condition": { "type": "string" }
            }
          }
        }
      }
    }
  },
  "auth": {
    "type": "api_key",
    "description": "Provide your API key in the X-API-Key header.",
    "header": "X-API-Key"
  },
  "access": "public",
  "tags": ["weather", "forecast", "meteorology"],
  "documentation_url": "https://weather.example.com/docs/api",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-06-20T14:30:00Z"
}
```

---

## 4. 발견 메커니즘 사양

### 4.1 개요

발견 메커니즘은 스킬 소비자가 탈중앙화 네트워크에서 Skill Descriptor를 찾는 방법을 정의합니다. 세 가지 발견 경로가 지원되며, Well-Known URI가 주요 방법입니다.

### 4.2 발견 경로

| 경로 | 방법 | 설명 |
|---|---|---|
| **Well-Known URI** | `GET /.well-known/skill-sharing` | 주요 발견 방법입니다. 도메인의 Skill Index를 반환합니다. |
| **직접 URL** | `GET {skill_descriptor_url}` | URL이 이미 알려진 경우 특정 Skill Descriptor를 조회합니다. |
| **레지스트리 조회** | `GET {registry_url}/skills?type={capability_type}` | 선택 사항입니다. Skill Registry에서 일괄 스킬 조회를 수행합니다. |

### 4.3 Well-Known URI

#### 4.3.1 경로

```
/.well-known/skill-sharing
```

스킬 제공자는 이 경로에서 Skill Index 문서를 제공해야 합니다(MUST). 응답의 `Content-Type`은 `application/json`이어야 합니다(MUST).

#### 4.3.2 Skill Index 구조

Skill Index는 제공자 도메인이 선언한 모든 스킬을 나열하는 JSON 문서입니다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `protocol` | `ProtocolVersion` | 예 | 프로토콜 버전입니다. |
| `provider` | `object` | 예 | 제공자 정보입니다(`name`을 반드시 포함해야 하며, `url`을 포함할 수 있습니다). |
| `skills` | `SkillIndexEntry[]` | 예 | 스킬 인덱스 항목의 배열입니다. |

#### 4.3.3 SkillIndexEntry 구조

Skill Index의 각 항목은 스킬에 대한 요약 정보를 포함합니다:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | `string` | 예 | 스킬의 고유 식별자입니다. |
| `name` | `string` | 예 | 스킬의 사람이 읽을 수 있는 이름입니다. |
| `capability_type` | `CapabilityType` | 예 | 스킬의 기능 분류입니다. |
| `description` | `string` | 예 | 스킬에 대한 간략한 설명입니다. |
| `descriptor_url` | `string` | 예 | 스킬의 전체 Skill Descriptor에 대한 완전한 URL입니다. |
| `access` | `AccessPolicy` | 예 | 스킬의 접근 제어 정책입니다. |
| `version` | `string` | 예 | 스킬의 버전입니다. |

#### 4.3.4 Skill ID 고유성

단일 Skill Index 내의 모든 스킬 ID는 고유해야 합니다(MUST). 중복 ID를 포함하는 Skill Index는 유효하지 않은 것으로 간주됩니다.

### 4.4 발견에서의 접근 제어

**인증되지 않은** 요청이 Well-Known URI에 전송될 때:
- `access: "private"`인 스킬은 응답에서 제외되어야 합니다(MUST).
- `access: "public"` 또는 `access: "restricted"`인 스킬은 포함되어야 합니다(MUST).

**인증된** 요청이 전송될 때:
- 제공자의 인가 로직에 따라 모든 스킬(`private` 포함)이 포함될 수 있습니다(MAY).

### 4.5 기능 유형 필터링

소비자는 `capability_type`으로 Skill Index를 필터링할 수 있습니다(MAY). 필터링 시:
- 결과에는 `capability_type`이 필터 값과 일치하는 항목만 포함되어야 합니다(MUST).
- 필터 값과 일치하는 원본 인덱스의 모든 항목이 결과에 나타나야 합니다(MUST).

### 4.6 예제: Skill Index

```json
{
  "protocol": {
    "version": "1.0.0"
  },
  "provider": {
    "name": "Example Corp",
    "url": "https://example.com"
  },
  "skills": [
    {
      "id": "example-corp/weather-forecast",
      "name": "Weather Forecast",
      "capability_type": "api",
      "description": "Provides weather forecast data.",
      "descriptor_url": "https://example.com/skills/weather-forecast.json",
      "access": "public",
      "version": "2.1.0"
    },
    {
      "id": "example-corp/document-translator",
      "name": "Document Translator",
      "capability_type": "task",
      "description": "Translates documents between languages.",
      "descriptor_url": "https://example.com/skills/document-translator.json",
      "access": "restricted",
      "version": "1.3.0"
    },
    {
      "id": "example-corp/internal-analytics",
      "name": "Internal Analytics",
      "capability_type": "plugin",
      "description": "Internal analytics dashboard plugin.",
      "descriptor_url": "https://example.com/skills/internal-analytics.json",
      "access": "private",
      "version": "0.9.0"
    }
  ]
}
```

> **참고:** 인증되지 않은 발견 요청에서는 `"internal-analytics"` 항목(`access: "private"`)이 응답에서 제외됩니다.

---

## 5. 호출 프로토콜 사양

### 5.1 개요

호출 프로토콜은 스킬 소비자가 발견된 스킬을 원격으로 호출하는 방법을 정의합니다. 프로토콜은 상태 폴링을 포함하는 비동기 요청-응답 패턴을 따릅니다.

### 5.2 호출 흐름

```
Consumer                          Provider
   │                                 │
   │  POST {invocation_endpoint}     │
   │  (InvocationRequest)            │
   │────────────────────────────────►│
   │                                 │
   │  202 Accepted                   │
   │  (InvocationResponse:accepted)  │
   │◄────────────────────────────────│
   │                                 │
   │  GET {status_url}/{exec_id}     │
   │────────────────────────────────►│
   │                                 │
   │  200 OK                         │
   │  (InvocationResponse:running)   │
   │◄────────────────────────────────│
   │                                 │
   │  GET {result_url}/{exec_id}     │
   │────────────────────────────────►│
   │                                 │
   │  200 OK                         │
   │  (InvocationResponse:completed) │
   │◄────────────────────────────────│
```

### 5.3 호출 요청

InvocationRequest는 소비자가 스킬 실행을 시작하기 위해 전송합니다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `caller` | `object` | 예 | 호출자 신원 정보입니다. |
| `caller.id` | `string` | 예 | 호출자의 고유 식별자입니다. |
| `caller.type` | `string` | 예 | 호출자 유형입니다(예: `"ifay"`, `"service"`, `"user"`). |
| `caller.credentials` | `object` | 아니오 | 인증 자격 증명입니다. |
| `skill_id` | `string` | 예 | 대상 스킬의 고유 식별자입니다. |
| `inputs` | `Record<string, unknown>` | 예 | 키-값 쌍으로 된 입력 매개변수입니다. |
| `context` | `object` | 아니오 | 호출 컨텍스트입니다. |
| `context.trace_id` | `string` | 아니오 | 분산 추적 식별자입니다. |
| `context.priority` | `string` | 아니오 | 실행 우선순위: `"low"`, `"normal"` 또는 `"high"`입니다. |
| `context.timeout_ms` | `number` | 아니오 | 클라이언트 측 타임아웃(밀리초)입니다. |

#### 예제: 호출 요청

```json
{
  "caller": {
    "id": "ifay-instance-001",
    "type": "ifay",
    "credentials": {
      "api_key": "sk-abc123..."
    }
  },
  "skill_id": "example-corp/weather-forecast",
  "inputs": {
    "location": "Tokyo",
    "days": 5
  },
  "context": {
    "trace_id": "trace-7f3a9b2c",
    "priority": "normal",
    "timeout_ms": 30000
  }
}
```

### 5.4 호출 응답

InvocationResponse는 실행의 각 단계에서 제공자가 반환합니다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `execution_id` | `string` | 예 | 이 실행의 고유 식별자입니다. |
| `status` | `ExecutionStatus` | 예 | 현재 실행 상태입니다. |
| `skill_id` | `string` | 예 | 대상 스킬의 식별자입니다. |
| `output` | `any` | 아니오 | 출력 데이터입니다(`status`가 `"completed"`일 때 존재). |
| `error` | `object` | 아니오 | 오류 정보입니다(`status`가 `"failed"` 또는 `"timeout"`일 때 존재). |
| `error.code` | `string` | 예* | 오류 코드입니다. |
| `error.message` | `string` | 예* | 사람이 읽을 수 있는 오류 메시지입니다. |
| `error.details` | `any` | 아니오 | 추가 오류 세부 정보입니다. |
| `error.retry` | `object` | 아니오 | `suggested_delay_ms`와 `max_attempts`를 포함하는 재시도 제안입니다. |
| `timestamps` | `object` | 예 | 실행 타임스탬프입니다. |
| `timestamps.created_at` | `string` | 예 | 실행이 생성된 시간입니다(ISO 8601). |
| `timestamps.updated_at` | `string` | 예 | 실행이 마지막으로 업데이트된 시간입니다(ISO 8601). |
| `timestamps.completed_at` | `string` | 아니오 | 실행이 완료된 시간입니다(ISO 8601). |

> \* `error` 객체가 존재할 때 필수입니다.

#### 예제: 호출 응답 (완료)

```json
{
  "execution_id": "exec-a1b2c3d4",
  "status": "completed",
  "skill_id": "example-corp/weather-forecast",
  "output": {
    "location": "Tokyo",
    "forecasts": [
      {
        "date": "2025-07-01",
        "high": 31,
        "low": 24,
        "condition": "Partly Cloudy"
      },
      {
        "date": "2025-07-02",
        "high": 29,
        "low": 22,
        "condition": "Rain"
      }
    ]
  },
  "timestamps": {
    "created_at": "2025-07-01T10:00:00Z",
    "updated_at": "2025-07-01T10:00:05Z",
    "completed_at": "2025-07-01T10:00:05Z"
  }
}
```

### 5.5 호출 엔드포인트

Skill Descriptor의 `endpoint` 필드는 세 가지 URL 템플릿을 정의합니다:

| 엔드포인트 | 용도 | 템플릿 변수 |
|---|---|---|
| `url` | 호출 요청 제출 | — |
| `status_url` | 실행 상태 조회 | `{execution_id}` |
| `result_url` | 실행 결과 조회 | `{execution_id}` |

소비자는 `{execution_id}`를 초기 응답에서 반환된 실제 실행 ID로 대체해야 합니다(MUST).

---

## 6. 버전 관리 사양

### 6.1 Semantic Versioning

Skill Sharing Protocol은 [Semantic Versioning 2.0.0](https://semver.org/)(SemVer)을 따릅니다. 모든 버전 문자열은 `MAJOR.MINOR.PATCH` 형식을 준수해야 합니다(MUST):

- **MAJOR** — 음이 아닌 정수입니다. 호환되지 않는 프로토콜 변경 시 증가합니다.
- **MINOR** — 음이 아닌 정수입니다. 하위 호환 가능한 추가 시 증가합니다.
- **PATCH** — 음이 아닌 정수입니다. 하위 호환 가능한 버그 수정 시 증가합니다.

유효한 버전 문자열 예시: `"1.0.0"`, `"2.3.1"`, `"0.1.0"`.

### 6.2 버전 선언

모든 Skill Descriptor는 `protocol.version` 필드에 준수하는 프로토콜 버전을 선언해야 합니다(MUST):

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/protocol/changelog"
  }
}
```

선택적 `changelog_url` 필드는 버전 변경 로그에 대한 참조를 제공합니다.

### 6.3 호환성 규칙

| 조건 | 결과 |
|---|---|
| 디스크립터 MAJOR > 소비자 MAJOR | **비호환.** 소비자가 더 높은 주 버전을 처리할 수 없습니다. |
| 디스크립터 MAJOR = 소비자 MAJOR | **호환.** 부 버전 및 패치 차이는 하위 호환됩니다. |
| 디스크립터 MAJOR < 소비자 MAJOR | **호환.** 소비자가 이전 주 버전을 처리할 수 있습니다. |

### 6.4 비호환성 처리

소비자가 호환되지 않는 프로토콜 버전의 Skill Descriptor를 만났을 때:

1. 소비자는 해당 스킬을 호출하려고 시도해서는 안 됩니다(MUST NOT).
2. 소비자는 `VERSION_INCOMPATIBLE` 오류를 반환해야 합니다(SHOULD)([8절](#8-오류-처리-사양) 참조).
3. 오류 응답에는 소비자의 지원 버전 범위와 디스크립터의 요구 버전이 포함되어야 합니다(SHOULD).

### 6.5 Schema 버전 관리

Schema 정의 파일은 버전화된 디렉토리에서 관리됩니다:

```
schema/
├── draft/              # 현재 작업 초안
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/         # 릴리스된 버전 (날짜 기반)
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

새로운 프로토콜 버전이 릴리스되면 초안 Schema가 새로운 날짜 스탬프 디렉토리로 복사됩니다.

---

## 7. 보안 및 인증 사양

### 7.1 개요

Skill Sharing Protocol은 유연한 인증 및 접근 제어 프레임워크를 제공합니다. 스킬 제공자는 Skill Descriptor에 보안 요구사항을 선언하고, 소비자는 호출 전에 해당 요구사항을 충족할 책임이 있습니다.

### 7.2 인증 유형

#### 7.2.1 API Key (`api_key`)

가장 간단한 인증 방법입니다. 소비자가 지정된 HTTP 헤더에 API 키를 제공합니다.

```json
{
  "auth": {
    "type": "api_key",
    "description": "Include your API key in the X-API-Key header.",
    "header": "X-API-Key"
  }
}
```

#### 7.2.2 OAuth 2.0 (`oauth2`)

표준 OAuth 2.0 인증 흐름입니다. Skill Descriptor는 인가 및 토큰 URL과 사용 가능한 스코프를 제공합니다.

```json
{
  "auth": {
    "type": "oauth2",
    "description": "OAuth 2.0 authentication required.",
    "oauth2": {
      "authorization_url": "https://auth.example.com/authorize",
      "token_url": "https://auth.example.com/token",
      "scopes": {
        "read:forecast": "Read forecast data",
        "write:preferences": "Update user preferences"
      }
    }
  }
}
```

#### 7.2.3 사용자 정의 (`custom`)

API 키 또는 OAuth 2.0으로 다루지 못하는 인증 방법을 위한 것입니다. 디스크립터는 사람이 읽을 수 있는 지침과 필요한 매개변수를 제공합니다.

```json
{
  "auth": {
    "type": "custom",
    "description": "HMAC-SHA256 signed requests.",
    "custom": {
      "instructions": "Sign the request body with your secret key using HMAC-SHA256 and include the signature in the X-Signature header.",
      "parameters": [
        {
          "name": "secret_key",
          "type": "string",
          "description": "Your HMAC secret key.",
          "required": true
        }
      ]
    }
  }
}
```

#### 7.2.4 없음 (`none`)

인증이 필요하지 않습니다. 스킬에 자유롭게 접근할 수 있습니다.

```json
{
  "auth": {
    "type": "none"
  }
}
```

### 7.3 접근 제어 정책

접근 제어는 `access` 필드를 통해 Skill Descriptor 수준에서 선언됩니다:

| 정책 | 발견 동작 | 호출 동작 |
|---|---|---|
| `"public"` | 모든 발견 응답에서 표시됩니다. | 인증이 필요하지 않습니다(`auth.type`이 `"none"`이 아닌 경우 제외). |
| `"restricted"` | 모든 발견 응답에서 표시됩니다. | 인증이 필요하며, 인가된 소비자만 호출할 수 있습니다. |
| `"private"` | 인증되지 않은 발견 요청에서 숨겨집니다. | 인증이 필요하며, 인가된 소비자만 호출할 수 있습니다. |

### 7.4 인증 흐름

1. 소비자가 Skill Descriptor를 조회합니다.
2. 소비자가 `auth` 필드를 검사하여 필요한 인증 방법을 결정합니다.
3. 소비자가 호출 요청에 적절한 자격 증명을 첨부합니다.
4. 자격 증명이 누락되거나 유효하지 않은 경우, 제공자는 필요한 인증 방법에 대한 세부 정보와 함께 `401` 오류를 반환합니다.
5. 자격 증명이 유효하지만 권한이 부족한 경우, 제공자는 `403` 오류를 반환합니다.

---

## 8. 오류 처리 사양

### 8.1 오류 범주

프로토콜은 7가지 오류 범주를 정의합니다:

| 오류 범주 | 코드 | HTTP 상태 | 시나리오 |
|---|---|---|---|
| 검증 오류 | `VALIDATION_ERROR` | N/A (로컬) | Schema Validator가 유효하지 않은 Skill Descriptor를 감지했습니다. |
| 인증 필요 | `AUTH_REQUIRED` | 401 | 보호된 스킬을 호출할 때 유효한 자격 증명이 제공되지 않았습니다. |
| 권한 거부 | `PERMISSION_DENIED` | 403 | 자격 증명은 유효하지만 충분한 권한이 없습니다. |
| 스킬 미발견 | `SKILL_NOT_FOUND` | 404 | 요청한 스킬 ID 또는 디스크립터 URL이 존재하지 않습니다. |
| 호출 타임아웃 | `INVOCATION_TIMEOUT` | 408 / 504 | 스킬 실행이 구성된 타임아웃을 초과했습니다. |
| 엔드포인트 도달 불가 | `ENDPOINT_UNREACHABLE` | 502 / 503 | 호출 엔드포인트에 도달할 수 없습니다. |
| 버전 비호환 | `VERSION_INCOMPATIBLE` | 422 | Skill Descriptor의 프로토콜 버전이 소비자와 호환되지 않습니다. |

### 8.2 통합 오류 응답 형식

모든 오류 응답은 다음 구조를 준수해야 합니다(MUST):

```json
{
  "error": {
    "code": "<ErrorCode>",
    "message": "<사람이 읽을 수 있는 메시지>",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `error.code` | `string` | 예 | 위에 나열된 7가지 오류 코드 중 하나입니다. |
| `error.message` | `string` | 예 | 사람이 읽을 수 있는 오류 메시지입니다. |
| `error.details` | `any` | 아니오 | 추가적인 컨텍스트별 오류 세부 정보입니다. |
| `error.retry` | `object` | 아니오 | 재시도 제안입니다. |
| `error.retry.suggested_delay_ms` | `number` | 예* | 재시도 전 권장 지연 시간(밀리초)입니다. |
| `error.retry.max_attempts` | `number` | 예* | 최대 재시도 횟수입니다. |

> \* `retry` 객체가 존재할 때 필수입니다.

### 8.3 오류 처리 전략

#### 8.3.1 검증 오류

Skill Descriptor가 검증에 실패할 때 Schema Validator가 로컬에서 반환합니다. `details` 필드에는 검증 오류 배열이 포함되어야 합니다(SHOULD). 각 항목은 다음을 포함합니다:

- `path` — 유효하지 않은 필드에 대한 JSON Pointer 경로입니다.
- `message` — 검증 실패에 대한 설명입니다.
- `expected` — 기대되는 값 또는 타입입니다.
- `actual` — 발견된 실제 값 또는 타입입니다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid SkillDescriptor document",
    "details": [
      {
        "path": "/capability_type",
        "message": "must be equal to one of the allowed values",
        "expected": ["plugin", "api", "knowledge", "task"],
        "actual": "invalid_type"
      },
      {
        "path": "/endpoint/method",
        "message": "must be equal to one of the allowed values",
        "expected": ["GET", "POST", "PUT", "DELETE"],
        "actual": "PATCH"
      }
    ]
  }
}
```

#### 8.3.2 인증 필요

소비자가 유효한 자격 증명을 제공하지 못했을 때 반환됩니다. `details` 필드에는 소비자가 자동으로 인증을 완료할 수 있도록 필요한 인증 방법이 기술되어야 합니다(SHOULD).

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://auth.example.com/authorize"
    },
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 1
    }
  }
}
```

#### 8.3.3 권한 거부

자격 증명은 유효하지만 소비자에게 필요한 권한이 없을 때 반환됩니다.

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to invoke this skill",
    "details": {
      "required_scopes": ["read:forecast"],
      "granted_scopes": []
    }
  }
}
```

#### 8.3.4 스킬 미발견

요청한 스킬 ID 또는 디스크립터 URL이 존재하지 않을 때 반환됩니다.

```json
{
  "error": {
    "code": "SKILL_NOT_FOUND",
    "message": "Skill 'example-corp/nonexistent' was not found",
    "details": {
      "skill_id": "example-corp/nonexistent"
    }
  }
}
```

#### 8.3.5 호출 타임아웃

스킬 실행이 구성된 타임아웃을 초과했을 때 반환됩니다. `retry` 필드는 재시도 시도에 대한 안내를 제공합니다.

```json
{
  "error": {
    "code": "INVOCATION_TIMEOUT",
    "message": "Skill execution timed out after 30000ms",
    "details": {
      "timeout_ms": 30000,
      "execution_id": "exec-a1b2c3d4"
    },
    "retry": {
      "suggested_delay_ms": 1000,
      "max_attempts": 3
    }
  }
}
```

#### 8.3.6 엔드포인트 도달 불가

호출 엔드포인트에 도달할 수 없을 때 반환됩니다. 소비자는 지수 백오프 재시도 전략을 구현해야 합니다(SHOULD).

```json
{
  "error": {
    "code": "ENDPOINT_UNREACHABLE",
    "message": "Failed to connect to invocation endpoint",
    "details": {
      "url": "https://api.weather.example.com/v2/forecast",
      "reason": "Connection refused"
    },
    "retry": {
      "suggested_delay_ms": 2000,
      "max_attempts": 3
    }
  }
}
```

#### 8.3.7 버전 비호환

Skill Descriptor의 프로토콜 버전이 소비자와 호환되지 않을 때 반환됩니다. `details` 필드에는 소비자의 지원 버전 범위와 디스크립터의 요구 버전이 모두 포함되어야 합니다(SHOULD).

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.5.0",
    "details": {
      "descriptor_version": "2.0.0",
      "consumer_version": "1.5.0",
      "supported_major": 1
    }
  }
}
```

---

## 9. Schema 참조

### 9.1 JSON Schema

권위 있는 Schema 정의는 JSON Schema(Draft 2020-12) 파일로 관리됩니다:

- **초안:** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)
- **Schema ID:** `https://ifay.org/schema/draft/skill-sharing-protocol.json`

Schema는 `$defs`를 통해 다음과 같은 최상위 타입을 정의합니다:

| 정의 | 설명 |
|---|---|
| `SkillDescriptor` (루트) | 완전한 Skill Descriptor 구조입니다. |
| `SkillIndex` | 스킬 목록을 포함하는 Well-Known URI 응답입니다. |
| `SkillIndexEntry` | Skill Index의 단일 항목입니다. |
| `InvocationRequest` | 스킬 호출 요청 구조입니다. |
| `InvocationResponse` | 스킬 호출 응답 구조입니다. |
| `ProtocolVersion` | 프로토콜 버전 정보입니다. |
| `CapabilityType` | 기능 유형 열거형입니다. |
| `AccessPolicy` | 접근 제어 정책 열거형입니다. |
| `AuthType` | 인증 유형 열거형입니다. |
| `ExecutionStatus` | 실행 상태 열거형입니다. |
| `ParameterDefinition` | 입출력 매개변수 정의입니다. |
| `AuthConfig` | 인증 구성입니다. |
| `InvocationEndpoint` | 호출 엔드포인트 구성입니다. |
| `OutputDefinition` | 출력 형식 정의입니다. |

### 9.2 TypeScript 타입 정의

타입 안전 개발을 위한 TypeScript 인터페이스가 제공됩니다:

- **초안:** [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

모든 TypeScript 타입은 내보내기되며 JSON Schema 정의와 의미적 동등성을 유지합니다. 매핑 규칙은 다음과 같습니다:

| TypeScript | JSON Schema |
|---|---|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| 유니온 타입 `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| 선택적 필드 `field?` | `required` 배열에 포함되지 않음 |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (제약 없음) |

### 9.3 Schema 검증

구현체는 JSON Schema 파일(`schema.json`)을 JSON Schema Draft 2020-12 호환 검증기(예: [Ajv](https://ajv.js.org/))와 함께 사용하여 Skill Descriptor를 검증해야 합니다(SHOULD).

Schema Validator는 세 가지 핵심 작업을 제공합니다:

| 작업 | 설명 |
|---|---|
| `validate(document)` | Schema에 대해 문서를 검증합니다. `valid`(불리언)와 `errors`(검증 오류 배열)를 포함하는 결과를 반환합니다. |
| `parse(document)` | 문서를 검증하고 타입이 지정된 `SkillDescriptor` 객체로 파싱합니다. 유효하지 않은 입력 시 예외를 발생시킵니다. |
| `serialize(descriptor)` | `SkillDescriptor` 객체를 보기 좋게 출력된 JSON(2칸 들여쓰기)으로 직렬화합니다. |

---

## 10. 부록: 전체 예제

### 10.1 전체 발견 및 호출 워크플로

**1단계: Well-Known URI를 통한 스킬 발견**

```http
GET /.well-known/skill-sharing HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**응답:**

```json
{
  "protocol": { "version": "1.0.0" },
  "provider": {
    "name": "Example Skills Provider",
    "url": "https://skills.example.com"
  },
  "skills": [
    {
      "id": "example/text-summarizer",
      "name": "Text Summarizer",
      "capability_type": "api",
      "description": "Summarizes long text into concise paragraphs.",
      "descriptor_url": "https://skills.example.com/skills/text-summarizer.json",
      "access": "public",
      "version": "1.2.0"
    }
  ]
}
```

**2단계: 전체 Skill Descriptor 조회**

```http
GET /skills/text-summarizer.json HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**응답:** 완전한 Skill Descriptor 문서입니다(전체 구조는 [3.6절](#36-예제-유효한-skill-descriptor)을 참조하세요).

**3단계: Skill Descriptor 검증**

소비자가 조회한 문서를 Schema Validator를 사용하여 `schema/draft/schema.json`에 대해 검증합니다. 검증에 실패하면 소비자는 해당 스킬을 호출해서는 안 됩니다(MUST NOT).

**4단계: 스킬 호출**

```http
POST /api/v1/summarize HTTP/1.1
Host: skills.example.com
Content-Type: application/json

{
  "caller": {
    "id": "ifay-instance-042",
    "type": "ifay"
  },
  "skill_id": "example/text-summarizer",
  "inputs": {
    "text": "The Skill Sharing Protocol defines a decentralized mechanism...",
    "max_length": 100
  },
  "context": {
    "trace_id": "trace-9e8d7c6b",
    "priority": "normal"
  }
}
```

**응답 (수락됨):**

```json
{
  "execution_id": "exec-f5e4d3c2",
  "status": "accepted",
  "skill_id": "example/text-summarizer",
  "timestamps": {
    "created_at": "2025-07-01T12:00:00Z",
    "updated_at": "2025-07-01T12:00:00Z"
  }
}
```

**5단계: 상태 폴링**

```http
GET /api/v1/status/exec-f5e4d3c2 HTTP/1.1
Host: skills.example.com
```

**응답 (완료됨):**

```json
{
  "execution_id": "exec-f5e4d3c2",
  "status": "completed",
  "skill_id": "example/text-summarizer",
  "output": {
    "summary": "The Skill Sharing Protocol enables decentralized skill discovery and invocation across the internet."
  },
  "timestamps": {
    "created_at": "2025-07-01T12:00:00Z",
    "updated_at": "2025-07-01T12:00:02Z",
    "completed_at": "2025-07-01T12:00:02Z"
  }
}
```

### 10.2 오류 응답 예제

**인증 없이 스킬 호출:**

```http
POST /api/v1/forecast HTTP/1.1
Host: api.weather.example.com
Content-Type: application/json

{
  "caller": { "id": "ifay-001", "type": "ifay" },
  "skill_id": "example-corp/weather-forecast",
  "inputs": { "location": "Berlin" }
}
```

**응답 (401):**

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "api_key",
      "header": "X-API-Key"
    },
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 1
    }
  }
}
```

---

## 라이선스

이 사양은 Skill Sharing Protocol 프로젝트의 일부입니다. 자세한 내용은 [LICENSE](../../../../LICENSE) 파일을 참조하세요.
