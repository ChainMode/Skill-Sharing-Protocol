// Normative TypeScript Definitions for Skill Sharing Protocol (SSP) 1.0 (Edition 2025-10-25)

/**
 * 能力类型枚举
 */
export type CapabilityType = "plugin" | "api" | "knowledge" | "task";

/**
 * 执行协同模式（task 型人工协同技能采用异步轮询契约，不绑定任何货币结算）
 */
export type ExecutionMode = "automated" | "human_in_the_loop";

/**
 * 访问控制策略
 */
export type AccessPolicy = "public" | "restricted" | "private";

/**
 * 认证方式
 */
export type AuthType = "api_key" | "oauth2" | "custom" | "none";

/**
 * 执行状态枚举
 */
export type ExecutionStatus = "accepted" | "running" | "completed" | "failed" | "timeout";

/**
 * 调用方 Fay 类型（Fay = iFay + coFay）
 */
export type CallerType = "ifay" | "cofay";

/**
 * SSP 标准错误码
 */
export type SspErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "PERMISSION_DENIED"
  | "SKILL_NOT_FOUND"
  | "INVOCATION_TIMEOUT"
  | "ENDPOINT_UNREACHABLE"
  | "VERSION_INCOMPATIBLE";

/**
 * 技能提供者信息
 */
export interface ProviderInfo {
  /** 提供者名称 */
  name: string;
  /** 提供者规范化 FayID（ifay_ / cofay_ / org_） */
  fay_id?: string;
  /** 提供者声明域名 Origin / URL */
  url?: string;
  /** 联系方式 */
  contact?: string;
}

/**
 * RFC 8785 JCS + RFC 7515/8037 Detached Ed25519 JWS 签名证明
 */
export interface SkillProof {
  /** 固定签名算法 EdDSA (Ed25519) */
  alg: "EdDSA";
  /** 签发方 FayID 密钥标识（如 cofay_<base32>#key-1） */
  kid: string;
  /** 签发时间（ISO 8601 UTC） */
  issued_at: string;
  /** 过期时间（ISO 8601 UTC） */
  expires_at: string;
  /** Detached JWS 紧凑串 (<base64url(header)>..<base64url(signature)>) */
  jws: string;
}

/**
 * 参数定义
 */
export interface ParameterDefinition {
  name: string;
  /** JSON Schema 类型 */
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
  /** 嵌套 JSON Schema（可选，用于复杂类型） */
  schema?: Record<string, unknown>;
}

/**
 * 认证配置
 */
export interface AuthConfig {
  type: AuthType;
  description?: string;
  /** api_key 认证的 header 名称 */
  header?: string;
  /** oauth2 认证的配置（type === "oauth2" 时必需） */
  oauth2?: {
    authorization_url: string;
    token_url: string;
    scopes: Record<string, string>;
  };
  /** 自定义认证的说明（type === "custom" 时必需） */
  custom?: {
    instructions: string;
    parameters: ParameterDefinition[];
  };
}

/**
 * 调用端点配置
 */
export interface InvocationEndpoint {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** 默认 "application/json" */
  content_type?: string;
  /** 状态查询端点模板，包含 {execution_id} 占位符 */
  status_url?: string;
  /** 结果获取端点模板，包含 {execution_id} 占位符 */
  result_url?: string;
  timeout_ms?: number;
  retry?: {
    max_attempts: number;
    backoff_ms: number;
  };
}

/**
 * 输出格式定义
 */
export interface OutputDefinition {
  /** MIME 类型 */
  content_type: string;
  /** JSON Schema 描述输出结构 */
  schema?: Record<string, unknown>;
  description?: string;
}

/**
 * 协议版本信息（两段式 MAJOR.MINOR，如 "1.0"）
 */
export interface ProtocolVersion {
  /** 两段式协议版本字符串 MAJOR.MINOR（严禁包含 PATCH 段） */
  version: string;
  /** 版本变更日志 URL */
  changelog_url?: string;
}

/**
 * 技能描述符 - SSP 核心数据结构
 */
export interface SkillDescriptor {
  /** 协议版本（两段式 MAJOR.MINOR） */
  protocol: ProtocolVersion;

  /** 技能唯一标识符 */
  id: string;

  /** 技能名称 */
  name: string;

  /** 技能自身版本（SemVer 格式） */
  version: string;

  /** 能力类型 */
  capability_type: CapabilityType;

  /** 技能描述 */
  description: string;

  /** 技能提供者信息 */
  provider: ProviderInfo;

  /** 调用端点 */
  endpoint: InvocationEndpoint;

  /** 输入参数定义 */
  inputs: ParameterDefinition[];

  /** 输出格式定义 */
  output: OutputDefinition;

  /** 认证配置 */
  auth: AuthConfig;

  /** 访问控制策略 */
  access: AccessPolicy;

  /** JCS + Ed25519 Detached JWS 签名证明（未签名描述符在消费者侧按 Default-Deny 标为 unverified） */
  proof?: SkillProof;

  /** 执行协同模式 */
  execution_mode?: ExecutionMode;

  /** 标签（用于搜索和分类） */
  tags?: string[];

  /** 技能文档 URL */
  documentation_url?: string;

  /** 创建时间（ISO 8601） */
  created_at?: string;

  /** 更新时间（ISO 8601） */
  updated_at?: string;
}

/**
 * 技能索引条目
 */
export interface SkillIndexEntry {
  /** 技能 ID */
  id: string;

  /** 技能名称 */
  name: string;

  /** 能力类型 */
  capability_type: CapabilityType;

  /** 简短描述 */
  description: string;

  /** 技能描述符完整 URL */
  descriptor_url: string;

  /** 访问控制策略 */
  access: AccessPolicy;

  /** 技能自身版本（SemVer） */
  version: string;
}

/**
 * 技能索引 - Well-Known URI (/.well-known/skill-sharing) 响应
 */
export interface SkillIndex {
  /** 协议版本 */
  protocol: ProtocolVersion;

  /** 提供者信息 */
  provider: ProviderInfo;

  /** 技能列表 */
  skills: SkillIndexEntry[];

  /** JCS + Ed25519 Detached JWS 签名证明 */
  proof?: SkillProof;
}

/**
 * 技能调用请求
 */
export interface InvocationRequest {
  /** 调用者身份标识（必须为规范化 FayID：ifay_<base32> 或 cofay_<base32>） */
  caller: {
    id: string;
    type: CallerType;
    organization_id?: string;
    mandate_ref?: string;
    credentials?: Record<string, unknown>;
  };

  /** 目标技能 ID */
  skill_id: string;

  /** 输入参数 */
  inputs: Record<string, unknown>;

  /** 可选 Faying Mandate 授权引用（归因至人类原型或归属组织） */
  mandate_ref?: string;

  /** 调用上下文 */
  context?: {
    trace_id?: string;
    priority?: "low" | "normal" | "high";
    timeout_ms?: number;
  };
}

/**
 * 重试建议
 */
export interface SchemaRetryHint {
  suggested_delay_ms: number;
  max_attempts: number;
}

/**
 * 技能调用响应
 */
export interface InvocationResponse {
  /** 执行 ID */
  execution_id: string;

  /** 执行状态 */
  status: ExecutionStatus;

  /** 目标技能 ID */
  skill_id: string;

  /** 输出数据（status 为 completed 时） */
  output?: unknown;

  /** 错误信息（status 为 failed 或 timeout 时） */
  error?: {
    code: string;
    message: string;
    details?: unknown;
    /** 超时时的重试建议 */
    retry?: SchemaRetryHint;
  };

  /** 时间戳 */
  timestamps: {
    created_at: string;
    updated_at: string;
    completed_at?: string;
  };
}

/**
 * 统一错误响应结构
 */
export interface SspErrorEnvelope {
  error: {
    code: SspErrorCode;
    message: string;
    details?: unknown;
    retry?: SchemaRetryHint;
  };
}

/**
 * Ed25519 OKP 公钥条目（/.well-known/fayid）
 */
export interface FayIdVerificationKey {
  kid: string;
  kty: "OKP";
  crv: "Ed25519";
  x: string;
  revoked?: boolean;
  expires_at?: string;
}

/**
 * 同源 /.well-known/fayid 公钥锚定文档
 */
export interface FayIdWellKnownDocument {
  fay_id: string;
  origin: string;
  also_known_as?: string[];
  keys: FayIdVerificationKey[];
  updated_at: string;
}
