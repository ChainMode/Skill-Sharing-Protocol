# 第10章：Schema定義仕様

## 10.1 概要

プロトコルは3つの形式のSchema定義ファイルを通じて、開発者に機械可読な仕様を提供し、自動化された検証とコード生成をサポートします。

## 10.2 成果物

| ファイル | 形式 | 用途 |
|---------|------|------|
| `schema.json` | JSON Schema Draft 2020-12 | 自動化検証、コード生成 |
| `schema.ts` | TypeScript型定義 | 開発時の型チェック、IDEサポート |
| `schema.mdx` | MDXインタラクティブドキュメント | 人間が読めるドキュメント、インタラクティブな例 |

## 10.3 JSON Schema仕様

### 基本構造

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "Skill Sharing Protocolの完全なSchema定義",
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

### TypeScriptからJSON Schemaへのマッピングルール

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| ユニオン型 `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| オプションフィールド `field?` | `required`配列に含まれない |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}`（制約なし） |

## 10.4 TypeScript型定義

TypeScript型定義ファイル（`schema.ts`）はJSON Schemaとセマンティックな一貫性を維持し、以下を提供します：

- すべての列挙型定義
- すべてのインターフェース定義
- 完全な型エクスポート
- JSDocコメント説明

## 10.5 MDXインタラクティブドキュメント

MDXドキュメント（`schema.mdx`）には以下が含まれます：

- Schemaの概要と使用ガイド
- 各データモデルのフィールド説明テーブル
- 有効なDescriptorの例
- 無効なDescriptorの例（一般的なエラーを示す）
- JSON SchemaとTypeScript型の対照表

## 10.6 バージョン化ディレクトリ構造

```
schema/
├── draft/                    # 開発中のドラフトバージョン
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # 公開済みの安定バージョン
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

ルール：
- `draft/`ディレクトリは常に最新の開発バージョンを含む
- 新バージョン公開時、draftの内容を日付名のバージョンディレクトリにコピー
- JSON Schema更新時、TypeScript型定義とMDXドキュメントも同期更新が必須

## 10.7 Schema Validator

Schema Validatorは`schema.json`に基づいて任意のSkill Descriptorドキュメントの準拠性検証を行います：

- ajvライブラリを使用してJSON Schemaをロード
- ドキュメントの構造的完全性を検証
- 列挙フィールドの値域をチェック
- 詳細なエラー情報を返す（フィールドパス、期待値、実際の値）
- 解析（JSON → オブジェクト）とシリアライズ（オブジェクト → Pretty Print JSON）をサポート
