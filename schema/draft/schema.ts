// Schema definition for Skill Sharing Protocol

/**
 * 能力类型枚举
 */
export type CapabilityType = "plugin" | "api" | "knowledge" | "task";

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
 * 参数定义
 */
export interface ParameterDefinition {
  name: string;
  type: string;           // JSON Schema 类型
  description: string;
  required: boolean;
  default?: unknown;
  schema?: object;        // 嵌套 JSON Schema（可选，用于复杂类型）
}

/**
 * 认证配置
 */
export interface AuthConfig {
  type: AuthType;
  description?: string;
  /** api_key 认证的 header 名称 */
  header?: string;
  /** oauth2 认证的配置 */
  oauth2?: {
    authorization_url: string;
    token_url: string;
    scopes: Record<string, string>;
  };
  /** 自定义认证的说明 */
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
  content_type?: string;  // 默认 "application/json"
  /** 状态查询端点模板，包含 {execution_id} 占位符 */
  status_url?: string;
  /** 结果获取端点模板 */
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
  content_type: string;   // MIME 类型
  schema?: object;        // JSON Schema 描述输出结构
  description?: string;
}

/**
 * 协议版本信息
 */
export interface ProtocolVersion {
  version: string;        // SemVer 格式，如 "1.0.0"
  changelog_url?: string; // 版本变更日志 URL
}

/**
 * 技能描述符 - 协议核心数据结构
 */
export interface SkillDescriptor {
  /** 协议版本 */
  protocol: ProtocolVersion;

  /** 技能唯一标识符 */
  id: string;

  /** 技能名称 */
  name: string;

  /** 技能版本（SemVer） */
  version: string;

  /** 能力类型 */
  capability_type: CapabilityType;

  /** 技能描述 */
  description: string;

  /** 技能提供者信息 */
  provider: {
    name: string;
    url?: string;
    contact?: string;
  };

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

  /** 技能版本 */
  version: string;
}

/**
 * 技能索引 - Well-Known URI 响应
 */
export interface SkillIndex {
  /** 协议版本 */
  protocol: ProtocolVersion;

  /** 提供者信息 */
  provider: {
    name: string;
    url?: string;
  };

  /** 技能列表 */
  skills: SkillIndexEntry[];
}

/**
 * 技能调用请求
 */
export interface InvocationRequest {
  /** 调用者身份标识 */
  caller: {
    id: string;
    type: string;         // 如 "ifay", "service", "user"
    credentials?: object; // 认证凭据
  };

  /** 目标技能 ID */
  skill_id: string;

  /** 输入参数 */
  inputs: Record<string, unknown>;

  /** 调用上下文 */
  context?: {
    trace_id?: string;
    priority?: "low" | "normal" | "high";
    timeout_ms?: number;
  };
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
    retry?: {
      suggested_delay_ms: number;
      max_attempts: number;
    };
  };

  /** 时间戳 */
  timestamps: {
    created_at: string;
    updated_at: string;
    completed_at?: string;
  };
}
