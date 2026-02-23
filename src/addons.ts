import type { ClawValue } from "./interpreter.js";

let cryptoModule: typeof import("node:crypto") | null = null;
function getCrypto(): typeof import("node:crypto") | null {
  if (!cryptoModule) {
    try {
      const { createRequire } = require("node:module");
      const require = createRequire(import.meta.url);
      cryptoModule = require("node:crypto");
    } catch {
      cryptoModule = null;
    }
  }
  return cryptoModule;
}

export interface ClawAddon {
  name: string;
  description: string;
  version: string;
  init: (interpreter: AddonContext) => void;
}

export interface AddonContext {
  registerFunction(name: string, fn: (...args: ClawValue[]) => ClawValue): void;
  registerAsyncFunction(name: string, fn: (...args: ClawValue[]) => Promise<ClawValue>): void;
  registerObject(name: string, obj: Record<string, ClawValue>): void;
  config: AddonConfig;
}

export interface AddonConfig {
  allowNetwork?: boolean;
  allowFilesystem?: boolean;
  maxExecutionTime?: number;
  maxMemory?: number;
  crypto?: typeof import("node:crypto");
}

const builtinAddons: Record<string, () => ClawAddon> = {
  http: () => ({
    name: "http",
    description: "HTTP client for making web requests",
    version: "1.0.0",
    init(ctx) {
      ctx.registerObject("Http", {
        get: (url: string, options?: ClawValue) => httpRequest("GET", url, options, ctx),
        post: (url: string, data?: ClawValue, options?: ClawValue) => httpRequest("POST", url, data, options, ctx),
        put: (url: string, data?: ClawValue, options?: ClawValue) => httpRequest("PUT", url, data, options, ctx),
        delete: (url: string, options?: ClawValue) => httpRequest("DELETE", url, options, ctx),
        patch: (url: string, data?: ClawValue, options?: ClawValue) => httpRequest("PATCH", url, data, options, ctx),
        head: (url: string, options?: ClawValue) => httpRequest("HEAD", url, options, ctx),
      });
    },
  }),

  crypto: () => ({
    name: "crypto",
    description: "Cryptographic functions (hashing, encoding)",
    version: "1.0.0",
    init(ctx) {
      const nodeCrypto = ctx.config.crypto;
      ctx.registerObject("Crypto", {
        md5: (data: string) => nodeCrypto?.createHash("md5").update(String(data)).digest("hex") || "",
        sha1: (data: string) => nodeCrypto?.createHash("sha1").update(String(data)).digest("hex") || "",
        sha256: (data: string) => nodeCrypto?.createHash("sha256").update(String(data)).digest("hex") || "",
        sha512: (data: string) => nodeCrypto?.createHash("sha512").update(String(data)).digest("hex") || "",
        base64Encode: (data: string) => Buffer.from(String(data)).toString("base64"),
        base64Decode: (data: string) => Buffer.from(String(data), "base64").toString("utf8"),
        hexEncode: (data: string) => Buffer.from(String(data)).toString("hex"),
        hexDecode: (data: string) => Buffer.from(String(data), "hex").toString("utf8"),
        randomBytes: (length: number) => nodeCrypto?.randomBytes(Number(length) || 16).toString("hex") || "",
        randomUUID: () => nodeCrypto?.randomUUID() || "",
        timingSafeEqual: (a: string, b: string) => {
          const bufA = Buffer.from(String(a));
          const bufB = Buffer.from(String(b));
          try {
            return nodeCrypto?.timingSafeEqual(bufA, bufB) || false;
          } catch {
            return false;
          }
        },
        hmac: (algo: string, data: string, key: string) => 
          nodeCrypto?.createHmac(algo, key).update(String(data)).digest("hex") || "",
      });
    },
  }),

  regex: () => ({
    name: "regex",
    description: "Regular expression utilities",
    version: "1.0.0",
    init(ctx) {
      ctx.registerObject("Regex", {
        match: (pattern: string, text: string, flags?: string) => {
          const re = new RegExp(pattern, flags || "");
          const matches = text.match(re);
          if (!matches) return null;
          return flags?.includes("g") ? matches : matches[0];
        },
        replace: (pattern: string, text: string, replacement: string, flags?: string) => {
          const re = new RegExp(pattern, flags || "");
          return text.replace(re, replacement);
        },
        replaceAll: (pattern: string, text: string, replacement: string) => {
          const re = new RegExp(pattern, "g");
          return text.replace(re, replacement);
        },
        split: (pattern: string, text: string, flags?: string) => {
          const re = new RegExp(pattern, flags || "");
          return text.split(re);
        },
        test: (pattern: string, text: string, flags?: string) => {
          const re = new RegExp(pattern, flags || "");
          return re.test(text);
        },
        search: (pattern: string, text: string, flags?: string) => {
          const re = new RegExp(pattern, flags || "");
          return text.search(re);
        },
        exec: (pattern: string, text: string, flags?: string) => {
          const re = new RegExp(pattern, flags || "");
          const match = re.exec(text);
          return match || null;
        },
        isValid: (pattern: string) => {
          try {
            new RegExp(pattern);
            return true;
          } catch {
            return false;
          }
        },
        escape: (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      });
    },
  }),

  uuid: () => ({
    name: "uuid",
    description: "UUID generation and parsing",
    version: "1.0.0",
    init(ctx) {
      const nodeCrypto = ctx.config.crypto;
      ctx.registerObject("UUID", {
        v4: () => nodeCrypto?.randomUUID() || "",
        v4Hex: () => (nodeCrypto?.randomUUID() || "").replace(/-/g, ""),
        isValid: (id: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(String(id));
        },
        parse: (id: string) => {
          const str = String(id).replace(/-/g, "");
          return {
            timeLow: str.slice(0, 8),
            timeMid: str.slice(8, 12),
            timeHiAndVersion: str.slice(12, 16),
            clockSeqHiAndReserved: str.slice(16, 18),
            clockSeqLow: str.slice(18, 20),
            node: str.slice(20, 32),
          };
        },
      });
    },
  }),

  base64: () => ({
    name: "base64",
    description: "Base64 encoding and decoding",
    version: "1.0.0",
    init(ctx) {
      ctx.registerObject("Base64", {
        encode: (data: string) => Buffer.from(String(data)).toString("base64"),
        decode: (data: string) => Buffer.from(String(data), "base64").toString("utf8"),
        encodeUrl: (data: string) => Buffer.from(String(data)).toString("base64url"),
        decodeUrl: (data: string) => Buffer.from(String(data), "base64url").toString("utf8"),
      });
    },
  }),

  time: () => ({
    name: "time",
    description: "Time and date utilities",
    version: "1.0.0",
    init(ctx) {
      ctx.registerObject("Time", {
        now: () => Date.now(),
        epoch: () => Math.floor(Date.now() / 1000),
        sleep: (ms: number) => new Promise<void>(resolve => setTimeout(resolve, Number(ms))),
        format: (timestamp: number | null, format: string) => {
          const d = timestamp ? new Date(timestamp) : new Date();
          const pad = (n: number) => n.toString().padStart(2, "0");
          return format
            .replace("YYYY", d.getFullYear().toString())
            .replace("MM", pad(d.getMonth() + 1))
            .replace("DD", pad(d.getDate()))
            .replace("HH", pad(d.getHours()))
            .replace("mm", pad(d.getMinutes()))
            .replace("ss", pad(d.getSeconds()));
        },
        parse: (str: string) => new Date(String(str)).getTime(),
        add: (timestamp: number, amount: number, unit: string) => {
          const d = new Date(timestamp);
          switch (unit) {
            case "ms": case "milliseconds": return timestamp + amount;
            case "s": case "seconds": return timestamp + amount * 1000;
            case "m": case "minutes": return timestamp + amount * 60000;
            case "h": case "hours": return timestamp + amount * 3600000;
            case "d": case "days": return timestamp + amount * 86400000;
            case "w": case "weeks": return timestamp + amount * 604800000;
            default: return timestamp;
          }
        },
      });
    },
  }),

  encoding: () => ({
    name: "encoding",
    description: "Text encoding conversions",
    version: "1.0.0",
    init(ctx) {
      ctx.registerObject("Encoding", {
        utf8ToBytes: (str: string) => Array.from(Buffer.from(String(str), "utf8")),
        bytesToUtf8: (bytes: ClawValue) => {
          const arr = Array.isArray(bytes) ? bytes.map(b => Number(b)) : [];
          return Buffer.from(arr).toString("utf8");
        },
        hexToBytes: (hex: string) => Array.from(Buffer.from(String(hex), "hex")),
        bytesToHex: (bytes: ClawValue) => {
          const arr = Array.isArray(bytes) ? bytes.map(b => Number(b)) : [];
          return Buffer.from(arr).toString("hex");
        },
        latin1ToBytes: (str: string) => Array.from(Buffer.from(String(str), "latin1")),
        bytesToLatin1: (bytes: ClawValue) => {
          const arr = Array.isArray(bytes) ? bytes.map(b => Number(b)) : [];
          return Buffer.from(arr).toString("latin1");
        },
      });
    },
  }),

  validation: () => ({
    name: "validation",
    description: "Data validation utilities",
    version: "1.0.0",
    init(ctx) {
      ctx.registerObject("Validate", {
        email: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)),
        url: (url: string) => {
          try {
            new URL(String(url));
            return true;
          } catch {
            return false;
          }
        },
        ip: (ip: string) => {
          const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
          const ipv6 = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
          return ipv4.test(String(ip)) || ipv6.test(String(ip));
        },
        ipv4: (ip: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(String(ip)),
        ipv6: (ip: string) => /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i.test(String(ip)),
        uuid: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id)),
        hex: (str: string) => /^[0-9a-f]+$/i.test(String(str)),
        numeric: (str: string) => /^\d+$/.test(String(str)),
        alpha: (str: string) => /^[a-zA-Z]+$/.test(String(str)),
        alphaNumeric: (str: string) => /^[a-zA-Z0-9]+$/.test(String(str)),
        mobile: (phone: string) => /^\+?[\d\s-]{10,}$/.test(String(phone)),
        creditCard: (card: string) => /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(String(card)),
      });
    },
  }),

  collection: () => ({
    name: "collection",
    description: "Collection utilities (queue, stack, set, map)",
    version: "1.0.0",
    init(ctx) {
      ctx.registerFunction("Queue", (...args) => {
        const queue: ClawValue[] = [];
        return {
          enqueue: (...items: ClawValue[]) => { queue.push(...items); return queue.length; },
          dequeue: () => queue.shift(),
          peek: () => queue[0],
          size: () => queue.length,
          isEmpty: () => queue.length === 0,
          clear: () => { queue.length = 0; },
          toArray: () => [...queue],
        };
      });

      ctx.registerFunction("Stack", (...args) => {
        const stack: ClawValue[] = [];
        return {
          push: (...items: ClawValue[]) => { stack.push(...items); return stack.length; },
          pop: () => stack.pop(),
          peek: () => stack[stack.length - 1],
          size: () => stack.length,
          isEmpty: () => stack.length === 0,
          clear: () => { stack.length = 0; },
          toArray: () => [...stack],
        };
      });

      ctx.registerFunction("Set", (...items) => {
        const set = new Set(items);
        return {
          add: (...items: ClawValue[]) => { items.forEach(i => set.add(i)); return set.size; },
          has: (item: ClawValue) => set.has(item),
          delete: (item: ClawValue) => set.delete(item),
          size: () => set.size,
          clear: () => set.clear(),
          toArray: () => Array.from(set),
        };
      });

      ctx.registerFunction("Map", (...args) => {
        const map = new Map<string, ClawValue>();
        return {
          set: (key: string, value: ClawValue) => { map.set(key, value); return value; },
          get: (key: string, fallback?: ClawValue) => map.has(key) ? map.get(key) : fallback,
          has: (key: string) => map.has(key),
          delete: (key: string) => map.delete(key),
          keys: () => Array.from(map.keys()),
          values: () => Array.from(map.values()),
          entries: () => Array.from(map.entries()).map(([k, v]) => ({ key: k, value: v })),
          size: () => map.size,
          clear: () => map.clear(),
        };
      });
    },
  }),
};

async function httpRequest(
  method: string,
  url: string,
  bodyOrOptions?: ClawValue,
  optionsOrCtx?: ClawValue | AddonContext,
  ctx?: AddonContext
): Promise<ClawValue> {
  const actualCtx = ctx || (optionsOrCtx as AddonContext) || (bodyOrOptions as AddonContext);
  if (!actualCtx?.config?.allowNetwork) {
    return { error: "Network access disabled. Enable allowNetwork in config." };
  }

  const options = method === "GET" || method === "HEAD" 
    ? (bodyOrOptions as Record<string, ClawValue> | undefined)
    : (optionsOrCtx as Record<string, ClawValue> | undefined);
  const body = method === "GET" || method === "HEAD" ? undefined : bodyOrOptions;

  try {
    const headers: Record<string, string> = {};
    if (typeof options?.headers === "object" && options.headers !== null) {
      for (const [k, v] of Object.entries(options.headers as Record<string, ClawValue>)) {
        headers[k] = String(v);
      }
    }

    const fetchOptions: RequestInit = { method, headers };
    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    }

    if (options?.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), Number(options.timeout));
      fetchOptions.signal = controller.signal;
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get("content-type") || "";
    let data: ClawValue;
    
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
    } else {
      data = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: data,
      text: typeof data === "string" ? data : JSON.stringify(data),
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export class AddonManager {
  private loadedAddons: Map<string, ClawAddon> = new Map();
  private interpreters: WeakMap<object, Map<string, ClawValue>> = new WeakMap();

  constructor(
    private enabledAddons: string[] = [],
    private config: AddonConfig = {}
  ) {
    this.config.crypto = getCrypto() || undefined;
    
    for (const name of enabledAddons) {
      const factory = builtinAddons[name];
      if (factory) {
        const addon = factory();
        this.loadedAddons.set(name, addon);
      }
    }
  }

  getAvailableAddons(): string[] {
    return Object.keys(builtinAddons);
  }

  getLoadedAddons(): string[] {
    return Array.from(this.loadedAddons.keys());
  }

  isLoaded(name: string): boolean {
    return this.loadedAddons.has(name);
  }

  loadAddon(name: string): boolean {
    if (this.loadedAddons.has(name)) return true;
    const factory = builtinAddons[name];
    if (!factory) return false;
    const addon = factory();
    this.loadedAddons.set(name, addon);
    return true;
  }

  unloadAddon(name: string): boolean {
    return this.loadedAddons.delete(name);
  }

  initForInterpreter(interpreter: object): void {
    const addonValues = new Map<string, ClawValue>();
    
    const context: AddonContext = {
      config: this.config,
      registerFunction: (name: string, fn: (...args: ClawValue[]) => ClawValue) => {
        addonValues.set(name, fn);
      },
      registerAsyncFunction: (name: string, fn: (...args: ClawValue[]) => Promise<ClawValue>) => {
        addonValues.set(name, fn);
      },
      registerObject: (name: string, obj: Record<string, ClawValue>) => {
        addonValues.set(name, obj);
      },
    };

    for (const addon of this.loadedAddons.values()) {
      try {
        addon.init(context);
      } catch (err) {
        console.error(`Error loading addon ${addon.name}:`, err);
      }
    }

    this.interpreters.set(interpreter, addonValues);
  }

  getAddonValues(interpreter: object): Map<string, ClawValue> | null {
    return this.interpreters.get(interpreter) || null;
  }
}

export const availableAddons = builtinAddons;
