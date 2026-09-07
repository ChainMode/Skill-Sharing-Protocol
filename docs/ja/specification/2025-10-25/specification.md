# Skill Sharing Protocol 仕様書

**ステータス:** 正式版
**バージョン:** 1.0.0
**日付:** 2025-10-25
**スキーマ:** [`schema/draft/schema.json`](../../../../schema/draft/schema.json), [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

---

## 目次

1. [プロトコル概要](#1-プロトコル概要)
2. [用語定義](#2-用語定義)
3. [Skill Descriptor 仕様](#3-skill-descriptor-仕様)
4. [ディスカバリーメカニズム仕様](#4-ディスカバリーメカニズム仕様)
5. [呼び出しプロトコル仕様](#5-呼び出しプロトコル仕様)
6. [バージョン管理仕様](#6-バージョン管理仕様)
7. [セキュリティと認証仕様](#7-セキュリティと認証仕様)
8. [エラーハンドリング仕様](#8-エラーハンドリング仕様)
9. [スキーマリファレンス](#9-スキーマリファレンス)
10. [付録：完全な例](#10-付録完全な例)

---

## 1. プロトコル概要

### 1.1 目的

Skill Sharing Protocol は、インターネット上でスキルを発見、宣言、呼び出すための分散型メカニズムを定義します。スキルプロバイダーは中央集権的なプラットフォームに依存することなく自身の能力を公開でき、スキルコンシューマー（主に iFay インスタンス）はそれらのスキルを自律的に発見し、リモートで呼び出すことができます。

### 1.2 設計原則

- **分散型ディスカバリー：** スキルプロバイダーは自身のドメイン下でスキルを宣言します。コンシューマーは Well-Known URI および直接 URL を通じてスキルを発見します — 中央レジストリは不要です。
- **自己記述型：** 各スキルは、その能力、インターフェース、呼び出し方法を含む標準化された Skill Descriptor ドキュメントによって完全に記述されます。
- **仕様としてのプロトコル：** 成果物はプロトコルドキュメントとスキーマ定義ファイルであり、ソフトウェアアプリケーションではありません。

### 1.3 アーキテクチャ

本プロトコルは、Web のハイパーリンク発見モデルや P2P ネットワークのノード発見に類似した、分散型の Provider-Consumer アーキテクチャに従います。

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

### 1.4 プロトコルインタラクションフロー

1. **ディスカバリーフェーズ：** コンシューマーがプロバイダードメインに `GET /.well-known/skill-sharing` を送信し、宣言されたすべてのスキルへの参照を含む Skill Index を受信します。
2. **バリデーションフェーズ：** コンシューマーが Schema Validator を使用して、各 Skill Descriptor をプロトコルスキーマに対して検証します。
3. **呼び出しフェーズ：** コンシューマーがスキルの呼び出しエンドポイントに POST リクエストを送信し、実行 ID を受信し、ステータスと結果をポーリングします。

### 1.5 成果物

| 成果物 | 説明 |
|---|---|
| プロトコル仕様書 | `docs/{lang}/specification/` 配下に 9 言語で提供 |
| JSON Schema | `schema/{version}/schema.json` — JSON Schema Draft 2020-12 |
| TypeScript 型定義 | `schema/{version}/schema.ts` — 厳密な TypeScript インターフェース |
| MDX ドキュメント | `schema/{version}/schema.mdx` — インタラクティブなスキーマドキュメント |

---

## 2. 用語定義

| 用語 | 定義 |
|---|---|
| **iFay** | インテリジェント認知コンパニオンシステム。Skill Sharing Protocol の主要なコンシューマーであり、自身の能力を拡張するためにスキルを発見・呼び出すことができます。 |
| **Skill（スキル）** | 本プロトコルに従って宣言された呼び出し可能な能力の単位。プラグイン、API、ナレッジパック、タスク実行能力を含みますが、これらに限定されません。 |
| **Skill Provider（スキルプロバイダー）** | インターネット上でスキルを宣言・公開するエンティティ（個人、組織、または自動化システム）。 |
| **Skill Consumer（スキルコンシューマー）** | スキルを発見・呼び出すエンティティ。主に iFay インスタンスです。 |
| **Skill Descriptor（スキルディスクリプター）** | プロトコルスキーマに準拠したメタデータドキュメントで、スキルの能力、インターフェース、呼び出し方法を記述します。 |
| **Discovery Mechanism（ディスカバリーメカニズム）** | スキルコンシューマーが分散型ネットワーク内で Skill Descriptor を特定・発見するための方法とプロセス。 |
| **Protocol Schema（プロトコルスキーマ）** | Skill Descriptor の構造を定義する形式的な仕様。JSON Schema、TypeScript 型、MDX ドキュメントを含みます。 |
| **Skill Registry（スキルレジストリ）** | スキル発見を高速化するためのオプションのスキルインデックスサービス。プロトコルの動作には必須ではありません。 |
| **Invocation Endpoint（呼び出しエンドポイント）** | Skill Descriptor で宣言されたリモート呼び出しのエントリーポイント。 |
| **Capability Type（能力タイプ）** | スキルの分類識別子：`plugin`、`api`、`knowledge`、または `task`。 |
| **Schema Validator（スキーマバリデーター）** | Protocol Schema に対して Skill Descriptor の準拠性を検証するツールまたはコンポーネント。 |
| **Protocol Version（プロトコルバージョン）** | プロトコル仕様のバージョン識別子。Semantic Versioning に従います。 |
| **Well-Known URI** | ドメインの Skill Index を特定するために使用される標準化された発見パス `/.well-known/skill-sharing`。 |

---

## 3. Skill Descriptor 仕様

### 3.1 概要

Skill Descriptor はプロトコルの中核データ構造です。単一のスキルのアイデンティティ、能力、インターフェース、呼び出し方法、アクセス制御ポリシーを完全に記述する JSON ドキュメントです。

すべての Skill Descriptor は、有効と見なされる前にプロトコルの JSON Schema（`schema/draft/schema.json`）に対して検証されなければなりません（MUST）。

### 3.2 必須フィールド

有効な Skill Descriptor は、以下のすべてのフィールドを含まなければなりません（MUST）：

| フィールド | 型 | 説明 |
|---|---|---|
| `protocol` | `ProtocolVersion` | このディスクリプターが準拠するプロトコルバージョン。 |
| `id` | `string` | スキルのグローバルに一意な識別子。 |
| `name` | `string` | スキルの人間が読める名前。 |
| `version` | `string` | SemVer 形式のスキルバージョン（例：`"1.0.0"`）。 |
| `capability_type` | `CapabilityType` | スキルの能力分類。 |
| `description` | `string` | スキルの機能についての人間が読める説明。 |
| `provider` | `object` | スキルプロバイダーの情報（`name` を含まなければなりません（MUST））。 |
| `endpoint` | `InvocationEndpoint` | 呼び出しエンドポイントの設定。 |
| `inputs` | `ParameterDefinition[]` | 入力パラメーター定義の配列。 |
| `output` | `OutputDefinition` | 出力フォーマットの定義。 |
| `auth` | `AuthConfig` | 認証設定。 |
| `access` | `AccessPolicy` | アクセス制御ポリシー。 |

### 3.3 オプションフィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `tags` | `string[]` | 検索とカテゴリ分類のためのタグ。 |
| `documentation_url` | `string` | スキルのドキュメントへの URL。 |
| `created_at` | `string` | ISO 8601 形式の作成タイムスタンプ。 |
| `updated_at` | `string` | ISO 8601 形式の最終更新タイムスタンプ。 |

### 3.4 列挙型

#### 3.4.1 CapabilityType

スキルの能力分類を定義します。有効な値：

| 値 | 説明 |
|---|---|
| `"plugin"` | 機能を拡張するプラグイン。 |
| `"api"` | API サービスエンドポイント。 |
| `"knowledge"` | ナレッジパックまたはデータソース。 |
| `"task"` | タスク実行能力（人間または自動化）。 |

#### 3.4.2 AccessPolicy

スキルのアクセス制御ポリシーを定義します。有効な値：

| 値 | 説明 |
|---|---|
| `"public"` | 制限なくすべてのコンシューマーがアクセス可能。 |
| `"restricted"` | 適切な権限を持つ認証済みコンシューマーのみアクセス可能。 |
| `"private"` | 未認証のディスカバリーリクエストからは非表示。ディスカバリーと呼び出しの両方に認証が必要。 |

#### 3.4.3 AuthType

スキルの呼び出しに必要な認証方式を定義します。有効な値：

| 値 | 説明 |
|---|---|
| `"api_key"` | API キーベースの認証。 |
| `"oauth2"` | OAuth 2.0 認証。 |
| `"custom"` | カスタム認証メカニズム。 |
| `"none"` | 認証不要。 |

#### 3.4.4 ExecutionStatus

スキル呼び出しの実行ステータスを定義します。有効な値：

| 値 | 説明 |
|---|---|
| `"accepted"` | 呼び出しリクエストが受理されました。 |
| `"running"` | スキルが現在実行中です。 |
| `"completed"` | 実行が正常に完了しました。 |
| `"failed"` | 実行が失敗しました。 |
| `"timeout"` | 実行がタイムアウトしました。 |

### 3.5 サブ構造定義

#### 3.5.1 ProtocolVersion

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `version` | `string` | はい | SemVer 形式のバージョン文字列（例：`"1.0.0"`）。 |
| `changelog_url` | `string` | いいえ | バージョン変更履歴への URL。 |

#### 3.5.2 ParameterDefinition

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `name` | `string` | はい | パラメーター名。 |
| `type` | `string` | はい | JSON Schema 型（例：`"string"`、`"number"`、`"object"`）。 |
| `description` | `string` | はい | パラメーターの人間が読める説明。 |
| `required` | `boolean` | はい | このパラメーターが必須かどうか。 |
| `default` | `any` | いいえ | パラメーターが提供されない場合のデフォルト値。 |
| `schema` | `object` | いいえ | 複雑な型のためのネストされた JSON Schema。 |

#### 3.5.3 InvocationEndpoint

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `url` | `string` | はい | 呼び出し URL。 |
| `method` | `string` | はい | HTTP メソッド。`"GET"`、`"POST"`、`"PUT"`、`"DELETE"` のいずれか。 |
| `content_type` | `string` | いいえ | リクエストのコンテンツタイプ。デフォルトは `"application/json"`。 |
| `status_url` | `string` | いいえ | `{execution_id}` プレースホルダーを含むステータス照会エンドポイントテンプレート。 |
| `result_url` | `string` | いいえ | 結果取得エンドポイントテンプレート。 |
| `timeout_ms` | `number` | いいえ | 呼び出しタイムアウト（ミリ秒）。 |
| `retry` | `object` | いいえ | `max_attempts` と `backoff_ms` を含むリトライ設定。 |

#### 3.5.4 OutputDefinition

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `content_type` | `string` | はい | 出力の MIME タイプ（例：`"application/json"`）。 |
| `schema` | `object` | いいえ | 出力構造を記述する JSON Schema。 |
| `description` | `string` | いいえ | 出力の人間が読める説明。 |

#### 3.5.5 AuthConfig

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `type` | `AuthType` | はい | 認証タイプ。 |
| `description` | `string` | いいえ | 認証要件の人間が読める説明。 |
| `header` | `string` | いいえ | API キー認証のヘッダー名。 |
| `oauth2` | `object` | いいえ | OAuth 2.0 設定（`type` が `"oauth2"` の場合に必須）。 |
| `custom` | `object` | いいえ | カスタム認証設定（`type` が `"custom"` の場合に必須）。 |

**OAuth2 設定：**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `authorization_url` | `string` | はい | OAuth 2.0 認可 URL。 |
| `token_url` | `string` | はい | OAuth 2.0 トークン URL。 |
| `scopes` | `Record<string, string>` | はい | キーバリューペアとしての利用可能なスコープ（スコープ名 → 説明）。 |

**カスタム認証設定：**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `instructions` | `string` | はい | カスタム認証フローの人間が読める手順。 |
| `parameters` | `ParameterDefinition[]` | はい | カスタム認証に必要なパラメーター。 |

### 3.6 例：有効な Skill Descriptor

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

## 4. ディスカバリーメカニズム仕様

### 4.1 概要

ディスカバリーメカニズムは、スキルコンシューマーが分散型ネットワーク内で Skill Descriptor を特定する方法を定義します。3 つの発見パスがサポートされており、Well-Known URI が主要な方法です。

### 4.2 発見パス

| パス | メソッド | 説明 |
|---|---|---|
| **Well-Known URI** | `GET /.well-known/skill-sharing` | 主要な発見方法。ドメインの Skill Index を返します。 |
| **直接 URL** | `GET {skill_descriptor_url}` | URL が既知の場合に特定の Skill Descriptor を取得します。 |
| **レジストリクエリ** | `GET {registry_url}/skills?type={capability_type}` | オプション。Skill Registry にバッチスキル取得をクエリします。 |

### 4.3 Well-Known URI

#### 4.3.1 パス

```
/.well-known/skill-sharing
```

スキルプロバイダーはこのパスで Skill Index ドキュメントを提供しなければなりません（MUST）。レスポンスの `Content-Type` は `application/json` でなければなりません（MUST）。

#### 4.3.2 Skill Index 構造

Skill Index は、プロバイダードメインが宣言したすべてのスキルを一覧する JSON ドキュメントです。

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `protocol` | `ProtocolVersion` | はい | プロトコルバージョン。 |
| `provider` | `object` | はい | プロバイダー情報（`name` を含まなければなりません（MUST）。`url` を含んでもよい（MAY））。 |
| `skills` | `SkillIndexEntry[]` | はい | スキルインデックスエントリーの配列。 |

#### 4.3.3 SkillIndexEntry 構造

Skill Index の各エントリーには、スキルの概要情報が含まれます：

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | はい | スキルの一意な識別子。 |
| `name` | `string` | はい | スキルの人間が読める名前。 |
| `capability_type` | `CapabilityType` | はい | スキルの能力分類。 |
| `description` | `string` | はい | スキルの簡潔な説明。 |
| `descriptor_url` | `string` | はい | スキルの完全な Skill Descriptor への URL。 |
| `access` | `AccessPolicy` | はい | スキルのアクセス制御ポリシー。 |
| `version` | `string` | はい | スキルのバージョン。 |

#### 4.3.4 Skill ID の一意性

単一の Skill Index 内のすべてのスキル ID は一意でなければなりません（MUST）。重複する ID を含む Skill Index は無効と見なされます。

### 4.4 ディスカバリーにおけるアクセス制御

**未認証**リクエストが Well-Known URI に送信された場合：
- `access: "private"` のスキルはレスポンスから除外されなければなりません（MUST）。
- `access: "public"` または `access: "restricted"` のスキルは含まれなければなりません（MUST）。

**認証済み**リクエストが送信された場合：
- プロバイダーの認可ロジックに従い、すべてのスキル（`private` を含む）が含まれてもよい（MAY）。

### 4.5 能力タイプによるフィルタリング

コンシューマーは `capability_type` で Skill Index をフィルタリングしてもよい（MAY）。フィルタリング時：
- 結果には、`capability_type` がフィルター値と一致するエントリーのみが含まれなければなりません（MUST）。
- フィルター値に一致する元のインデックスのすべてのエントリーが結果に含まれなければなりません（MUST）。

### 4.6 例：Skill Index

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

> **注意：** 未認証のディスカバリーリクエストでは、`"internal-analytics"` エントリー（`access: "private"`）はレスポンスから除外されます。

---

## 5. 呼び出しプロトコル仕様

### 5.1 概要

呼び出しプロトコルは、スキルコンシューマーが発見したスキルをリモートで呼び出す方法を定義します。本プロトコルは、ステータスポーリングを伴う非同期リクエスト-レスポンスパターンに従います。

### 5.2 呼び出しフロー

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

### 5.3 呼び出しリクエスト

InvocationRequest は、スキルの実行を開始するためにコンシューマーが送信します。

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `caller` | `object` | はい | 呼び出し元の識別情報。 |
| `caller.id` | `string` | はい | 呼び出し元の一意な識別子。 |
| `caller.type` | `string` | はい | 呼び出し元のタイプ（例：`"ifay"`、`"service"`、`"user"`）。 |
| `caller.credentials` | `object` | いいえ | 認証資格情報。 |
| `skill_id` | `string` | はい | 対象スキルの一意な識別子。 |
| `inputs` | `Record<string, unknown>` | はい | キーバリューペアとしての入力パラメーター。 |
| `context` | `object` | いいえ | 呼び出しコンテキスト。 |
| `context.trace_id` | `string` | いいえ | 分散トレーシング識別子。 |
| `context.priority` | `string` | いいえ | 実行優先度：`"low"`、`"normal"`、または `"high"`。 |
| `context.timeout_ms` | `number` | いいえ | クライアント側のタイムアウト（ミリ秒）。 |

#### 例：呼び出しリクエスト

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

### 5.4 呼び出しレスポンス

InvocationResponse は、実行の各段階でプロバイダーから返されます。

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `execution_id` | `string` | はい | この実行の一意な識別子。 |
| `status` | `ExecutionStatus` | はい | 現在の実行ステータス。 |
| `skill_id` | `string` | はい | 対象スキルの識別子。 |
| `output` | `any` | いいえ | 出力データ（`status` が `"completed"` の場合に存在）。 |
| `error` | `object` | いいえ | エラー情報（`status` が `"failed"` または `"timeout"` の場合に存在）。 |
| `error.code` | `string` | はい* | エラーコード。 |
| `error.message` | `string` | はい* | 人間が読めるエラーメッセージ。 |
| `error.details` | `any` | いいえ | 追加のエラー詳細。 |
| `error.retry` | `object` | いいえ | `suggested_delay_ms` と `max_attempts` を含むリトライ提案。 |
| `timestamps` | `object` | はい | 実行タイムスタンプ。 |
| `timestamps.created_at` | `string` | はい | 実行が作成された日時（ISO 8601）。 |
| `timestamps.updated_at` | `string` | はい | 実行が最後に更新された日時（ISO 8601）。 |
| `timestamps.completed_at` | `string` | いいえ | 実行が完了した日時（ISO 8601）。 |

> \* `error` オブジェクトが存在する場合に必須。

#### 例：呼び出しレスポンス（完了）

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

### 5.5 呼び出しエンドポイント

Skill Descriptor の `endpoint` フィールドは 3 つの URL テンプレートを定義します：

| エンドポイント | 目的 | テンプレート変数 |
|---|---|---|
| `url` | 呼び出しリクエストの送信 | — |
| `status_url` | 実行ステータスの照会 | `{execution_id}` |
| `result_url` | 実行結果の取得 | `{execution_id}` |

コンシューマーは `{execution_id}` を初回レスポンスで返された実際の実行 ID に置換しなければなりません（MUST）。

---

## 6. バージョン管理仕様

### 6.1 Semantic Versioning

Skill Sharing Protocol は [Semantic Versioning 2.0.0](https://semver.org/)（SemVer）に従います。すべてのバージョン文字列は `MAJOR.MINOR.PATCH` 形式に準拠しなければなりません（MUST）：

- **MAJOR** — 非負整数。互換性のないプロトコル変更時にインクリメントされます。
- **MINOR** — 非負整数。後方互換性のある追加時にインクリメントされます。
- **PATCH** — 非負整数。後方互換性のあるバグ修正時にインクリメントされます。

有効なバージョン文字列の例：`"1.0.0"`、`"2.3.1"`、`"0.1.0"`。

### 6.2 バージョン宣言

すべての Skill Descriptor は、`protocol.version` フィールドで準拠するプロトコルバージョンを宣言しなければなりません（MUST）：

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/protocol/changelog"
  }
}
```

オプションの `changelog_url` フィールドは、バージョン変更履歴への参照を提供します。

### 6.3 互換性ルール

| 条件 | 結果 |
|---|---|
| Descriptor の MAJOR > Consumer の MAJOR | **非互換。** コンシューマーはより新しいメジャーバージョンを処理できません。 |
| Descriptor の MAJOR = Consumer の MAJOR | **互換。** マイナーおよびパッチの差異は後方互換性があります。 |
| Descriptor の MAJOR < Consumer の MAJOR | **互換。** コンシューマーはより古いメジャーバージョンを処理できます。 |

### 6.4 非互換性の処理

コンシューマーが互換性のないプロトコルバージョンの Skill Descriptor に遭遇した場合：

1. コンシューマーはスキルの呼び出しを試みてはなりません（MUST NOT）。
2. コンシューマーは `VERSION_INCOMPATIBLE` エラーを返すべきです（SHOULD）（[セクション 8](#8-エラーハンドリング仕様) を参照）。
3. エラーレスポンスには、コンシューマーがサポートするバージョン範囲とディスクリプターが要求するバージョンを含めるべきです（SHOULD）。

### 6.5 スキーマのバージョニング

スキーマ定義ファイルはバージョン管理されたディレクトリで管理されます：

```
schema/
├── draft/              # 現在の作業ドラフト
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/         # リリースバージョン（日付ベース）
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

新しいプロトコルバージョンがリリースされると、ドラフトスキーマが新しい日付スタンプ付きディレクトリにコピーされます。

---

## 7. セキュリティと認証仕様

### 7.1 概要

Skill Sharing Protocol は、柔軟な認証およびアクセス制御フレームワークを提供します。スキルプロバイダーは Skill Descriptor でセキュリティ要件を宣言し、コンシューマーは呼び出し前にそれらの要件を満たす責任があります。

### 7.2 認証タイプ

#### 7.2.1 API Key (`api_key`)

最もシンプルな認証方式です。コンシューマーは指定された HTTP ヘッダーで API キーを提供します。

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

標準的な OAuth 2.0 認証フローです。Skill Descriptor は認可 URL、トークン URL、および利用可能なスコープを提供します。

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

#### 7.2.3 カスタム (`custom`)

API キーや OAuth 2.0 でカバーされない認証方式のためのものです。ディスクリプターは人間が読める手順と必要なパラメーターを提供します。

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

#### 7.2.4 なし (`none`)

認証は不要です。スキルは自由にアクセスできます。

```json
{
  "auth": {
    "type": "none"
  }
}
```

### 7.3 アクセス制御ポリシー

アクセス制御は、Skill Descriptor レベルで `access` フィールドを通じて宣言されます：

| ポリシー | ディスカバリー動作 | 呼び出し動作 |
|---|---|---|
| `"public"` | すべてのディスカバリーレスポンスで表示されます。 | 認証不要（`auth.type` が `"none"` でない場合を除く）。 |
| `"restricted"` | すべてのディスカバリーレスポンスで表示されます。 | 認証が必要。認可されたコンシューマーのみ呼び出し可能。 |
| `"private"` | 未認証のディスカバリーリクエストからは非表示。 | 認証が必要。認可されたコンシューマーのみ呼び出し可能。 |

### 7.4 認証フロー

1. コンシューマーが Skill Descriptor を取得します。
2. コンシューマーが `auth` フィールドを検査し、必要な認証方式を判断します。
3. コンシューマーが呼び出しリクエストに適切な資格情報を添付します。
4. 資格情報が欠落しているか無効な場合、プロバイダーは必要な認証方式の詳細を含む `401` エラーを返します。
5. 資格情報は有効だが権限が不十分な場合、プロバイダーは `403` エラーを返します。

---

## 8. エラーハンドリング仕様

### 8.1 エラーカテゴリ

本プロトコルは 7 つのエラーカテゴリを定義します：

| エラーカテゴリ | コード | HTTP ステータス | シナリオ |
|---|---|---|---|
| バリデーションエラー | `VALIDATION_ERROR` | N/A（ローカル） | Schema Validator が無効な Skill Descriptor を検出。 |
| 認証必須 | `AUTH_REQUIRED` | 401 | 保護されたスキルの呼び出し時に有効な資格情報が提供されなかった。 |
| 権限拒否 | `PERMISSION_DENIED` | 403 | 資格情報は有効だが、十分な権限がない。 |
| スキル未検出 | `SKILL_NOT_FOUND` | 404 | 要求されたスキル ID またはディスクリプター URL が存在しない。 |
| 呼び出しタイムアウト | `INVOCATION_TIMEOUT` | 408 / 504 | スキルの実行が設定されたタイムアウトを超過。 |
| エンドポイント到達不能 | `ENDPOINT_UNREACHABLE` | 502 / 503 | 呼び出しエンドポイントに到達できなかった。 |
| バージョン非互換 | `VERSION_INCOMPATIBLE` | 422 | Skill Descriptor のプロトコルバージョンがコンシューマーと互換性がない。 |

### 8.2 統一エラーレスポンス形式

すべてのエラーレスポンスは以下の構造に準拠しなければなりません（MUST）：

```json
{
  "error": {
    "code": "<ErrorCode>",
    "message": "<human-readable message>",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `error.code` | `string` | はい | 上記 7 つのエラーコードのいずれか。 |
| `error.message` | `string` | はい | 人間が読めるエラーメッセージ。 |
| `error.details` | `any` | いいえ | コンテキスト固有の追加エラー詳細。 |
| `error.retry` | `object` | いいえ | リトライ提案。 |
| `error.retry.suggested_delay_ms` | `number` | はい* | リトライ前の推奨遅延（ミリ秒）。 |
| `error.retry.max_attempts` | `number` | はい* | 最大リトライ回数。 |

> \* `retry` オブジェクトが存在する場合に必須。

### 8.3 エラーハンドリング戦略

#### 8.3.1 バリデーションエラー

Skill Descriptor がバリデーションに失敗した場合に Schema Validator がローカルで返します。`details` フィールドには以下を含む配列を含めるべきです（SHOULD）：

- `path` — 無効なフィールドへの JSON Pointer パス。
- `message` — バリデーション失敗の説明。
- `expected` — 期待される値または型。
- `actual` — 実際に見つかった値または型。

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

#### 8.3.2 認証必須

コンシューマーが有効な資格情報を提供しなかった場合に返されます。`details` フィールドには、コンシューマーが自動的に認証を完了できるよう、必要な認証方式を記述するべきです（SHOULD）。

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

#### 8.3.3 権限拒否

資格情報は有効だが、コンシューマーに必要な権限がない場合に返されます。

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

#### 8.3.4 スキル未検出

要求されたスキル ID またはディスクリプター URL が存在しない場合に返されます。

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

#### 8.3.5 呼び出しタイムアウト

スキルの実行が設定されたタイムアウトを超過した場合に返されます。`retry` フィールドはリトライ試行のガイダンスを提供します。

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

#### 8.3.6 エンドポイント到達不能

呼び出しエンドポイントに到達できない場合に返されます。コンシューマーは指数バックオフリトライ戦略を実装するべきです（SHOULD）。

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

#### 8.3.7 バージョン非互換

Skill Descriptor のプロトコルバージョンがコンシューマーと互換性がない場合に返されます。`details` フィールドには、コンシューマーがサポートするバージョン範囲とディスクリプターが要求するバージョンの両方を含めるべきです（SHOULD）。

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

## 9. スキーマリファレンス

### 9.1 JSON Schema

権威あるスキーマ定義は JSON Schema（Draft 2020-12）ファイルとして管理されています：

- **ドラフト：** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)
- **スキーマ ID：** `https://ifay.org/schema/draft/skill-sharing-protocol.json`

スキーマは `$defs` を通じて以下のトップレベル型を定義します：

| 定義 | 説明 |
|---|---|
| `SkillDescriptor`（ルート） | 完全な Skill Descriptor 構造。 |
| `SkillIndex` | スキルのリストを含む Well-Known URI レスポンス。 |
| `SkillIndexEntry` | Skill Index 内の単一エントリー。 |
| `InvocationRequest` | スキル呼び出しリクエスト構造。 |
| `InvocationResponse` | スキル呼び出しレスポンス構造。 |
| `ProtocolVersion` | プロトコルバージョン情報。 |
| `CapabilityType` | 能力タイプ列挙。 |
| `AccessPolicy` | アクセス制御ポリシー列挙。 |
| `AuthType` | 認証タイプ列挙。 |
| `ExecutionStatus` | 実行ステータス列挙。 |
| `ParameterDefinition` | 入出力パラメーター定義。 |
| `AuthConfig` | 認証設定。 |
| `InvocationEndpoint` | 呼び出しエンドポイント設定。 |
| `OutputDefinition` | 出力フォーマット定義。 |

### 9.2 TypeScript 型定義

型安全な開発のために TypeScript インターフェースが提供されています：

- **ドラフト：** [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

すべての TypeScript 型はエクスポートされ、JSON Schema 定義との意味的等価性を維持しています。マッピングルールは以下の通りです：

| TypeScript | JSON Schema |
|---|---|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| ユニオン型 `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| オプションフィールド `field?` | `required` 配列に含まれない |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}`（制約なし） |

### 9.3 スキーマバリデーション

実装は、JSON Schema ファイル（`schema.json`）を JSON Schema Draft 2020-12 準拠のバリデーター（例：[Ajv](https://ajv.js.org/)）と共に使用して Skill Descriptor を検証するべきです（SHOULD）。

Schema Validator は 3 つのコア操作を提供します：

| 操作 | 説明 |
|---|---|
| `validate(document)` | スキーマに対してドキュメントを検証します。`valid`（ブール値）と `errors`（バリデーションエラーの配列）を含む結果を返します。 |
| `parse(document)` | ドキュメントを検証し、型付きの `SkillDescriptor` オブジェクトに解析します。無効な入力の場合はスローします。 |
| `serialize(descriptor)` | `SkillDescriptor` オブジェクトを整形された JSON（2 スペースインデント）にシリアライズします。 |

---

## 10. 付録：完全な例

### 10.1 完全なディスカバリーと呼び出しワークフロー

**ステップ 1：Well-Known URI を通じてスキルを発見する**

```http
GET /.well-known/skill-sharing HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**レスポンス：**

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

**ステップ 2：完全な Skill Descriptor を取得する**

```http
GET /skills/text-summarizer.json HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**レスポンス：** 完全な Skill Descriptor ドキュメント（完全な構造については[セクション 3.6](#36-例有効な-skill-descriptor) を参照）。

**ステップ 3：Skill Descriptor を検証する**

コンシューマーは、取得したドキュメントを Schema Validator を使用して `schema/draft/schema.json` に対して検証します。バリデーションが失敗した場合、コンシューマーはスキルを呼び出してはなりません（MUST NOT）。

**ステップ 4：スキルを呼び出す**

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

**レスポンス（受理）：**

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

**ステップ 5：ステータスをポーリングする**

```http
GET /api/v1/status/exec-f5e4d3c2 HTTP/1.1
Host: skills.example.com
```

**レスポンス（完了）：**

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

### 10.2 エラーレスポンスの例

**認証なしでスキルを呼び出す場合：**

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

**レスポンス（401）：**

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

## ライセンス

本仕様書は Skill Sharing Protocol プロジェクトの一部です。詳細については [LICENSE](../../../../LICENSE) ファイルを参照してください。
