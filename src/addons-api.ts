import type { ClawValue } from "./interpreter.js";

export interface AddonDefinition {
  name: string;
  description?: string;
  version?: string;
  functions?: Record<string, (...args: ClawValue[]) => ClawValue>;
  asyncFunctions?: Record<string, (...args: ClawValue[]) => Promise<ClawValue>>;
  objects?: Record<string, Record<string, ClawValue>>;
}

export interface AddonsApi {
  create(name: string, definition: Partial<AddonDefinition>): AddonBuilder;
  register(addon: AddonDefinition): boolean;
  unregister(name: string): boolean;
  list(): string[];
  get(name: string): AddonDefinition | undefined;
  enable(name: string): boolean;
  disable(name: string): boolean;
  isEnabled(name: string): boolean;
}

export interface AddonBuilder {
  description(desc: string): AddonBuilder;
  version(ver: string): AddonBuilder;
  function(name: string, fn: (...args: ClawValue[]) => ClawValue): AddonBuilder;
  asyncFunction(name: string, fn: (...args: ClawValue[]) => Promise<ClawValue>): AddonBuilder;
  object(name: string, obj: Record<string, ClawValue>): AddonBuilder;
  build(): AddonDefinition;
}

class AddonBuilderImpl implements AddonBuilder {
  private definition: AddonDefinition;

  constructor(private baseName: string) {
    this.definition = {
      name: baseName,
      functions: {},
      asyncFunctions: {},
      objects: {},
    };
  }

  description(desc: string): AddonBuilder {
    this.definition.description = desc;
    return this;
  }

  version(ver: string): AddonBuilder {
    this.definition.version = ver;
    return this;
  }

  function(name: string, fn: (...args: ClawValue[]) => ClawValue): AddonBuilder {
    this.definition.functions = this.definition.functions || {};
    this.definition.functions[name] = fn;
    return this;
  }

  asyncFunction(name: string, fn: (...args: ClawValue[]) => Promise<ClawValue>): AddonBuilder {
    this.definition.asyncFunctions = this.definition.asyncFunctions || {};
    this.definition.asyncFunctions[name] = fn;
    return this;
  }

  object(name: string, obj: Record<string, ClawValue>): AddonBuilder {
    this.definition.objects = this.definition.objects || {};
    this.definition.objects[name] = obj;
    return this;
  }

  build(): AddonDefinition {
    return { ...this.definition };
  }
}

export function createAddonsApi(): AddonsApi {
  const customAddons = new Map<string, AddonDefinition>();
  const enabledAddons = new Set<string>();

  return {
    create(name: string, definition: Partial<AddonDefinition>): AddonBuilder {
      return new AddonBuilderImpl(name);
    },

    register(addon: AddonDefinition): boolean {
      if (!addon.name) return false;
      customAddons.set(addon.name, addon);
      return true;
    },

    unregister(name: string): boolean {
      enabledAddons.delete(name);
      return customAddons.delete(name);
    },

    list(): string[] {
      return Array.from(customAddons.keys());
    },

    get(name: string): AddonDefinition | undefined {
      return customAddons.get(name);
    },

    enable(name: string): boolean {
      if (customAddons.has(name)) {
        enabledAddons.add(name);
        return true;
      }
      return false;
    },

    disable(name: string): boolean {
      return enabledAddons.delete(name);
    },

    isEnabled(name: string): boolean {
      return enabledAddons.has(name);
    },
  };
}

export function createAddonFromDefinition(
  definition: AddonDefinition,
  config?: { allowNetwork?: boolean; allowFilesystem?: boolean }
) {
  const functions: Record<string, ClawValue> = {};
  const asyncFunctions: Record<string, ClawValue> = {};
  const objects: Record<string, ClawValue> = {};

  if (definition.functions) {
    for (const [name, fn] of Object.entries(definition.functions)) {
      functions[name] = fn;
    }
  }

  if (definition.asyncFunctions) {
    for (const [name, fn] of Object.entries(definition.asyncFunctions)) {
      asyncFunctions[name] = fn;
    }
  }

  if (definition.objects) {
    for (const [name, obj] of Object.entries(definition.objects)) {
      objects[name] = obj;
    }
  }

  return {
    name: definition.name,
    description: definition.description || "",
    version: definition.version || "1.0.0",
    init(ctx: { registerFunction: (n: string, f: (...args: ClawValue[]) => ClawValue) => void; registerAsyncFunction: (n: string, f: (...args: ClawValue[]) => Promise<ClawValue>) => void; registerObject: (n: string, o: Record<string, ClawValue>) => void }) {
      for (const [name, fn] of Object.entries(functions)) {
        ctx.registerFunction(name, fn);
      }
      for (const [name, fn] of Object.entries(asyncFunctions)) {
        ctx.registerAsyncFunction(name, fn);
      }
      for (const [name, obj] of Object.entries(objects)) {
        ctx.registerObject(name, obj);
      }
    },
  };
}
