/**
 * Schema Validator - 基于 ajv (JSON Schema Draft 2020-12) 的 SSP 1.0 规范验证器
 *
 * 职责：
 * - 使用权威 schemas/ssp-1.0.json 验证 SkillDescriptor / SkillIndex / FayIdWellKnownDocument
 * - 解析有效文档为结构化对象
 * - 对无效文档返回具体违规字段路径（JSON Pointer）、期望值和实际值
 * - 支持将 SkillDescriptor 对象序列化为 Pretty Print JSON
 */

import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateUniqueIds } from "./discovery.js";
import type {
  SkillDescriptor,
  SkillIndex,
  FayIdWellKnownDocument,
} from "../schema/draft/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 单个验证错误
 */
export interface ValidationError {
  /** 违规字段路径（JSON Pointer 格式） */
  path: string;
  /** 错误描述信息 */
  message: string;
  /** 期望值（如适用） */
  expected?: unknown;
  /** 实际值（如适用） */
  actual?: unknown;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 验证错误列表（valid 为 true 时为空数组） */
  errors: ValidationError[];
}

/**
 * 将 ajv ErrorObject 转换为 ValidationError
 */
export function mapAjvError(error: ErrorObject, document: unknown): ValidationError {
  const path = error.instancePath || "/";
  const message = error.message ?? "Unknown validation error";

  if (error.keyword === "required") {
    const missingProp = (error.params as { missingProperty?: string }).missingProperty;
    const basePath = error.instancePath || "";
    return {
      path: `${basePath}/${missingProp}`,
      message: `Missing required property: ${missingProp}`,
      expected: "defined",
      actual: "undefined",
    };
  }

  if (error.keyword === "type") {
    const expected = (error.params as { type?: string }).type;
    let actual = getValueAtPath(document, error.instancePath);
    if (actual !== undefined) {
      actual = actual === null ? "null" : typeof actual;
    }
    return { path, message, expected, actual };
  }

  if (error.keyword === "enum") {
    const expected = (error.params as { allowedValues?: unknown[] }).allowedValues;
    const actual = getValueAtPath(document, error.instancePath);
    return { path, message, expected, actual };
  }

  if (error.keyword === "const") {
    const expected = (error.params as { allowedValue?: unknown }).allowedValue;
    const actual = getValueAtPath(document, error.instancePath);
    return { path, message, expected, actual };
  }

  if (error.keyword === "pattern") {
    const expected = (error.params as { pattern?: string }).pattern;
    const actual = getValueAtPath(document, error.instancePath);
    return { path, message, expected, actual };
  }

  if (error.keyword === "additionalProperties") {
    const additionalProp = (error.params as { additionalProperty?: string }).additionalProperty;
    const basePath = error.instancePath || "";
    return {
      path: `${basePath}/${additionalProp}`,
      message: `Unexpected additional property: ${additionalProp}`,
      expected: "not present",
      actual: "present",
    };
  }

  return { path, message };
}

function getValueAtPath(document: unknown, path: string): unknown {
  if (!path || path === "/") return document;
  const parts = path.split("/").filter(Boolean);
  let current: unknown = document;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function createAjvValidators() {
  const directCandidate = resolve(__dirname, "..", "schemas", "ssp-1.0.json");
  const distCandidate = resolve(__dirname, "..", "..", "schemas", "ssp-1.0.json");
  const schemaPath = existsSync(directCandidate) ? directCandidate : distCandidate;
  const schemaContent = readFileSync(schemaPath, "utf-8");
  const schema = JSON.parse(schemaContent);

  const ajv = new Ajv2020({ allErrors: true, verbose: true });
  ajv.addSchema(schema);

  const descriptorValidate = ajv.getSchema(schema.$id)!;
  const indexValidate = ajv.compile({
    $ref: `${schema.$id}#/$defs/SkillIndex`,
  });
  const fayIdDocValidate = ajv.compile({
    $ref: `${schema.$id}#/$defs/FayIdWellKnownDocument`,
  });

  return { descriptorValidate, indexValidate, fayIdDocValidate };
}

const { descriptorValidate, indexValidate, fayIdDocValidate } = createAjvValidators();

/**
 * 验证文档是否符合 SkillDescriptor Schema (SSP 1.0)
 */
export function validate(document: unknown): ValidationResult {
  const valid = descriptorValidate(document);
  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (descriptorValidate.errors ?? [])
    .filter((err) => err.keyword !== "if")
    .map((err) => mapAjvError(err, document));

  return { valid: false, errors };
}

/**
 * 验证文档是否符合 SkillIndex Schema（含 skills[].id 唯一性校验）
 */
export function validateSkillIndex(document: unknown): ValidationResult {
  const valid = indexValidate(document);
  if (!valid) {
    const errors: ValidationError[] = (indexValidate.errors ?? [])
      .filter((err) => err.keyword !== "if")
      .map((err) => mapAjvError(err, document));
    return { valid: false, errors };
  }

  const index = document as SkillIndex;
  if (!validateUniqueIds(index.skills)) {
    return {
      valid: false,
      errors: [
        {
          path: "/skills",
          message: "Duplicate skill id detected in SkillIndex",
          expected: "unique skill ids",
          actual: index.skills.map((s) => s.id),
        },
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * 验证 /.well-known/fayid 文档结构
 */
export function validateFayIdWellKnown(document: unknown): ValidationResult {
  const valid = fayIdDocValidate(document);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors: ValidationError[] = (fayIdDocValidate.errors ?? [])
    .filter((err) => err.keyword !== "if")
    .map((err) => mapAjvError(err, document));
  return { valid: false, errors };
}

/**
 * 验证并解析文档为 SkillDescriptor 对象
 */
export function parse(document: unknown): SkillDescriptor {
  const parsedDoc =
    typeof document === "string" ? (JSON.parse(document) as unknown) : document;
  const result = validate(parsedDoc);

  if (!result.valid) {
    const errorDetails = result.errors
      .map((e) => `  ${e.path}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid SkillDescriptor document:\n${errorDetails}`);
  }

  return parsedDoc as SkillDescriptor;
}

/**
 * 将 SkillDescriptor 对象序列化为 Pretty Print JSON
 */
export function serialize(descriptor: SkillDescriptor): string {
  return JSON.stringify(descriptor, null, 2);
}
