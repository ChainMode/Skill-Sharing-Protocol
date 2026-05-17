# 제10장: Schema 정의 사양

## 10.1 개요

프로토콜은 3가지 형식의 Schema 정의 파일을 통해 개발자에게 기계 판독 가능한 사양을 제공하며, 자동화된 검증과 코드 생성을 지원합니다.

## 10.2 산출물

| 파일 | 형식 | 용도 |
|------|------|------|
| `schema.json` | JSON Schema Draft 2020-12 | 자동화 검증, 코드 생성 |
| `schema.ts` | TypeScript 타입 정의 | 개발 시 타입 검사, IDE 지원 |
| `schema.mdx` | MDX 인터랙티브 문서 | 사람이 읽을 수 있는 문서, 인터랙티브 예시 |

## 10.3 JSON Schema 사양

### 기본 구조

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "Skill Sharing Protocol의 완전한 Schema 정의",
  "$defs": {
    "CapabilityType": { ... },
    "AccessPolicy": { ... },
    "AuthType": { ... },
    "ParameterDefinition": { ... },
    "SkillDescriptor": { ... },
    "SkillIndex": { ... },
    "InvocationRequest": { ... },
    "InvocationResponse": { ... }
  }
}
```

### TypeScript에서 JSON Schema로의 매핑 규칙

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| 유니온 타입 `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| 선택 필드 `field?` | `required` 배열에 포함되지 않음 |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}`(제약 없음) |

## 10.4 TypeScript 타입 정의

TypeScript 타입 정의 파일(`schema.ts`)은 JSON Schema와 의미적 일관성을 유지하며 다음을 제공합니다:

- 모든 열거형 타입 정의
- 모든 인터페이스 정의
- 완전한 타입 내보내기
- JSDoc 주석 설명

## 10.5 MDX 인터랙티브 문서

MDX 문서(`schema.mdx`)에는 다음이 포함됩니다:

- Schema 개요 및 사용 가이드
- 각 데이터 모델의 필드 설명 테이블
- 유효한 Descriptor 예시
- 무효한 Descriptor 예시(일반적인 오류 표시)
- JSON Schema와 TypeScript 타입의 대조표

## 10.6 버전화 디렉토리 구조

```
schema/
├── draft/                    # 개발 중인 초안 버전
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # 게시된 안정 버전
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

규칙:
- `draft/` 디렉토리는 항상 최신 개발 버전을 포함
- 새 버전 게시 시, draft 내용을 날짜 이름의 버전 디렉토리로 복사
- JSON Schema 업데이트 시, TypeScript 타입 정의와 MDX 문서도 동기 업데이트 필수

## 10.7 Schema Validator

Schema Validator는 `schema.json`에 기반하여 임의의 Skill Descriptor 문서에 대한 준수성 검증을 수행합니다:

- ajv 라이브러리를 사용하여 JSON Schema 로드
- 문서의 구조적 완전성 검증
- 열거형 필드 값 범위 검사
- 상세한 오류 정보 반환(필드 경로, 기대값, 실제값)
- 파싱(JSON → 객체) 및 직렬화(객체 → Pretty Print JSON) 지원
