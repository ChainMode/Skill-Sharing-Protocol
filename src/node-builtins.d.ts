/**
 * Minimal ambient type declarations for Node.js built-in globals and `node:*` modules
 * used by the zero-network-install SSP 1.0 reference implementation.
 */

declare type BufferEncoding = "ascii" | "utf8" | "utf-8" | "hex" | "base64" | "base64url";

interface Buffer extends Uint8Array {
  toString(encoding?: BufferEncoding): string;
  subarray(begin?: number, end?: number): Buffer;
}

declare var Buffer: {
  from(value: string, encoding?: BufferEncoding): Buffer;
  from(value: ArrayLike<number> | ArrayBufferView): Buffer;
  concat(list: readonly Uint8Array[], totalLength?: number): Buffer;
  byteLength(string: string | Uint8Array, encoding?: BufferEncoding): number;
  isBuffer(obj: unknown): obj is Buffer;
};

declare var process: {
  argv: string[];
  exitCode?: number;
  env: Record<string, string | undefined>;
  exit(code?: number): never;
  on(event: string, listener: (...args: unknown[]) => void): void;
};

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
  export function readFileSync(path: string, encoding: "utf-8" | "utf8"): string;
  export function readFileSync(path: string): Buffer;
  export function writeFileSync(path: string, data: string | Uint8Array, encoding?: BufferEncoding): void;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function mkdtempSync(prefix: string): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}

declare module "node:net" {
  export interface AddressInfo {
    address: string;
    family: string;
    port: number;
  }
}

declare module "node:crypto" {
  export interface KeyObject {
    readonly type: "secret" | "public" | "private";
    readonly asymmetricKeyType?: string;
    export(options: { format: "der"; type: "spki" | "pkcs8" }): Buffer;
    export(options: { format: "pem"; type: "spki" | "pkcs8" }): string;
  }

  export function generateKeyPairSync(type: "ed25519"): {
    publicKey: KeyObject;
    privateKey: KeyObject;
  };

  export function createPrivateKey(key: {
    key: Buffer | Uint8Array;
    format: "der";
    type: "pkcs8";
  }): KeyObject;

  export function createPublicKey(
    key:
      | KeyObject
      | {
          key: Buffer | Uint8Array;
          format: "der";
          type: "spki";
        }
  ): KeyObject;

  export function sign(
    algorithm: string | null | undefined,
    data: Uint8Array,
    key: KeyObject
  ): Buffer;

  export function verify(
    algorithm: string | null | undefined,
    data: Uint8Array,
    key: KeyObject,
    signature: Uint8Array
  ): boolean;

  export interface Hash {
    update(data: string | Uint8Array, inputEncoding?: BufferEncoding): Hash;
    digest(): Buffer;
    digest(encoding: "hex" | "base64" | "base64url"): string;
  }

  export function createHash(algorithm: "sha256"): Hash;
  export function randomUUID(): string;
}

declare module "node:http" {
  import type { AddressInfo } from "node:net";

  export type IncomingHttpHeaders = Record<string, string | string[] | undefined>;

  export interface IncomingMessage extends AsyncIterable<Buffer | Uint8Array> {
    method?: string;
    url?: string;
    headers: IncomingHttpHeaders;
  }

  export interface ServerResponse {
    statusCode: number;
    writeHead(
      statusCode: number,
      headers?: Record<string, string | number>
    ): this;
    end(chunk?: string | Uint8Array): this;
  }

  export interface Server {
    listen(port?: number, hostname?: string, listeningListener?: () => void): this;
    close(callback?: (err?: Error) => void): this;
    address(): AddressInfo | string | null;
    once(event: "error", listener: (err: Error) => void): this;
    off(event: "error", listener: (err: Error) => void): this;
  }

  export function createServer(
    requestListener?: (req: IncomingMessage, res: ServerResponse) => void
  ): Server;
}
