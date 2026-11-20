/**
 * Invocation - 调用消息验证与统一错误响应格式 (SSP 1.0)
 *
 * 职责：
 * - 使用权威 schemas/ssp-1.0.json 验证 InvocationRequest（含规范化 FayID 与可选 mandate_ref）
 * - 验证 InvocationResponse 结构
 * - 提供 7 种错误类别的统一错误响应构造函数
 */

import { Ajv2020 } from "ajv/dist/2020.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapAjvError, type ValidationResult, type ValidationError } from "./validator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 错误类别代码
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "PERMISSION_DENIED"
  | "SKILL_NOT_FOUND"
  | "INVOCATION_TIMEOUT"
  | "ENDPOINT_UNREACHABLE"
  | "VERSION_INCOMPATIBLE";

/**
 * 重试建议
 */
export interface RetryHint {
  suggested_delay_ms: number;
  max_attempts: number;
}

/**
 * 统一错误响应格式
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    retry?: RetryHint;
  };
}

function loadSchema() {
  const directCandidate = resolve(__dirname, "..", "schemas", "ssp-1.0.json");
  const distCandidate = resolve(__dirname, "..", "..", "schemas", "ssp-1.0.json");
  const schemaPath = existsSync(directCandidate) ? directCandidate : distCandidate;
  const schemaContent = readFileSync(schemaPath, "utf-8");
  return JSON.parse(schemaContent);
}

function createValidators() {
  const schema = loadSchema();
  const ajv = new Ajv2020({ allErrors: true, verbose: true });
  ajv.addSchema(schema);

  const requestValidate = ajv.compile({
    $ref: `${schema.$id}#/$defs/InvocationRequest`,
  });

  const responseValidate = ajv.compile({
    $ref: `${schema.$id}#/$defs/InvocationResponse`,
  });

  const errorValidate = ajv.compile({
    $ref: `${schema.$id}#/$defs/ErrorResponse`,
  });

  return { requestValidate, responseValidate, errorValidate };
}

const { requestValidate, responseValidate, errorValidate } = createValidators();

/**
 * 验证调用请求结构是否符合 InvocationRequest Schema
 */
export function validateInvocationRequest(req: unknown): ValidationResult {
  const valid = requestValidate(req);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors: ValidationError[] = (requestValidate.errors ?? [])
    .filter((err) => err.keyword !== "if")
    .map((err) => mapAjvError(err, req));
  return { valid: false, errors };
}

/**
 * 验证调用响应结构是否符合 InvocationResponse Schema
 */
export function validateInvocationResponse(res: unknown): ValidationResult {
  const valid = responseValidate(res);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors: ValidationError[] = (responseValidate.errors ?? [])
    .filter((err) => err.keyword !== "if")
    .map((err) => mapAjvError(err, res));
  return { valid: false, errors };
}

/**
 * 验证统一错误响应是否符合 ErrorResponse Schema
 */
export function validateErrorResponse(res: unknown): ValidationResult {
  const valid = errorValidate(res);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors: ValidationError[] = (errorValidate.errors ?? [])
    .filter((err) => err.keyword !== "if")
    .map((err) => mapAjvError(err, res));
  return { valid: false, errors };
}

export function createValidationError(
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export function createAuthRequiredError(
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    error: {
      code: "AUTH_REQUIRED",
      message,
      ...(details !== undefined ? { details } : {}),
      retry: { suggested_delay_ms: 0, max_attempts: 1 },
    },
  };
}

export function createPermissionDeniedError(
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    error: {
      code: "PERMISSION_DENIED",
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export function createSkillNotFoundError(
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    error: {
      code: "SKILL_NOT_FOUND",
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export function createInvocationTimeoutError(
  message: string,
  details?: unknown,
  retry?: RetryHint
): ErrorResponse {
  return {
    error: {
      code: "INVOCATION_TIMEOUT",
      message,
      ...(details !== undefined ? { details } : {}),
      retry: retry ?? { suggested_delay_ms: 1000, max_attempts: 3 },
    },
  };
}

export function createEndpointUnreachableError(
  message: string,
  details?: unknown,
  retry?: RetryHint
): ErrorResponse {
  return {
    error: {
      code: "ENDPOINT_UNREACHABLE",
      message,
      ...(details !== undefined ? { details } : {}),
      retry: retry ?? { suggested_delay_ms: 2000, max_attempts: 3 },
    },
  };
}

export function createVersionIncompatibleError(
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    error: {
      code: "VERSION_INCOMPATIBLE",
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}
