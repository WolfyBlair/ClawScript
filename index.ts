import type { Command } from "commander";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { ClawScriptInterpreter, type ClawValue, type ClawFunction } from "./src/interpreter.js";
import { startShell } from "./src/shell.js";
import { availableAddons, AddonManager } from "./src/addons.js";
import { createAddonsApi, createAddonFromDefinition, type AddonsApi, type AddonDefinition, type AddonBuilder } from "./src/addons-api.js";

export { ClawScriptInterpreter, type ClawValue, type ClawFunction };
export { startShell };
export { availableAddons, AddonManager };
export { createAddonsApi, createAddonFromDefinition, type AddonsApi, type AddonDefinition, type AddonBuilder };

const defaultAddons = ["crypto", "regex", "uuid", "base64", "time", "encoding", "validation", "collection"];

const ClawScriptConfigSchema = {
  parse(value: unknown) {
    const raw = value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
    let addons: string[] = [];
    if (Array.isArray(raw.addons)) {
      addons = raw.addons.filter((a): a is string => typeof a === "string");
    } else if (raw.addons === true) {
      addons = defaultAddons;
    }
    return {
      maxExecutionTime: typeof raw.maxExecutionTime === "number" ? raw.maxExecutionTime : 5000,
      maxMemory: typeof raw.maxMemory === "number" ? raw.maxMemory : 128,
      allowFilesystem: typeof raw.allowFilesystem === "boolean" ? raw.allowFilesystem : false,
      allowNetwork: typeof raw.allowNetwork === "boolean" ? raw.allowNetwork : false,
      addons,
    };
  },
  uiHints: {
    maxExecutionTime: {
      label: "Max Execution Time (ms)",
      help: "Maximum time a ClawScript can run before being terminated",
    },
    maxMemory: {
      label: "Max Memory (MB)",
      help: "Maximum memory allocated for ClawScript execution",
    },
    allowFilesystem: {
      label: "Allow Filesystem Access",
      help: "Enable filesystem operations in ClawScript",
    },
    allowNetwork: {
      label: "Allow Network Access",
      help: "Enable network operations in ClawScript",
    },
    addons: {
      label: "Enabled Addons",
      help: "Experimental addons to enable (http requires allowNetwork)",
    },
  },
};

const ExecuteClawScriptSchema = {
  parse(value: unknown) {
    const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
      code: typeof raw.code === "string" ? raw.code : "",
      timeout: typeof raw.timeout === "number" ? raw.timeout : 5000,
    };
  },
  jsonSchema: {
    type: "object",
    properties: {
      code: { type: "string", description: "ClawScript code to execute" },
      timeout: { type: "number", description: "Execution timeout in milliseconds" },
    },
    required: ["code"],
  },
};

const ClawScriptPlugin = {
  id: "clawscript",
  name: "ClawScript",
  description: "ClawScript scripting language plugin - execute custom scripts with built-in functions for math, string manipulation, arrays, and more. Includes ClawShell interactive REPL.",
  configSchema: ClawScriptConfigSchema,
  register(api: OpenClawPluginApi) {
    const config = ClawScriptConfigSchema.parse(api.pluginConfig);

    api.registerTool({
      name: "clawscript",
      label: "ClawScript Executor",
      description: `Execute ClawScript code - a custom scripting language with:
- Variables: var, let, const
- Types: strings, numbers, booleans, arrays, objects
- Control flow: if/else, while, for loops
- Functions: function name(params) { ... }
- Exception handling: try/catch/finally, throw
- Operators: +, -, *, /, %, ==, !=, <, >, <=, >=, &&, ||, !, ++, --, +=, -=, ?, :, in, of
- Built-ins: print, len, typeof, Math.*, String.*, Array.*, JSON.*, Date.*, Object.*, keys, values, get, set, has
- Addons (experimental): Crypto.*, Regex.*, UUID.*, Base64.*, Time.*, Encoding.*, Validate.*, Http.*, Queue, Stack, Set, Map
- Addons API: Addons.api.create(), Addons.api.register(), Addons.load(), Addons.*

Example:
\`\`\`clawscript
var numbers = [1, 2, 3, 4, 5];
var sum = 0;
for (var i = 0; i < len(numbers); i = i + 1) {
  sum = sum + numbers[i];
}
print("Sum: " + sum);
sum;
\`\`\`
`,
      parameters: ExecuteClawScriptSchema,
      async execute(_toolCallId, params) {
        const { code, timeout } = ExecuteClawScriptSchema.parse(params);

        if (!code.trim()) {
          return {
            content: [{ type: "text" as const, text: "Error: No code provided" }],
            details: { error: "No code provided" },
          };
        }

        const interpreter = new ClawScriptInterpreter(config);
        
        let timedOut = false;
        const timeoutId = setTimeout(() => {
          timedOut = true;
        }, timeout);

        try {
          const result = interpreter.interpret(code);
          clearTimeout(timeoutId);

          if (timedOut) {
            return {
              content: [{ type: "text" as const, text: `Error: Execution timed out after ${timeout}ms` }],
              details: { error: "Timeout", timedOut: true },
            };
          }

          if (!result.success) {
            return {
              content: [{ type: "text" as const, text: `Error: ${result.error}` }],
              details: { error: result.error, logs: result.logs },
            };
          }

          const output = result.logs?.length 
            ? result.logs.join("\n") 
            : result.result !== undefined 
              ? String(result.result) 
              : "(no output)";

          return {
            content: [{ type: "text" as const, text: output }],
            details: {
              result: result.result,
              logs: result.logs,
            },
          };
        } catch (err) {
          clearTimeout(timeoutId);
          const errorMessage = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: `Error: ${errorMessage}` }],
            details: { error: errorMessage },
          };
        }
      },
    });

    api.registerGatewayMethod(
      "clawscript.execute",
      async ({ params, respond }) => {
        const { code, timeout } = ExecuteClawScriptSchema.parse(params);

        if (!code.trim()) {
          respond(false, { error: "No code provided" });
          return;
        }

        const interpreter = new ClawScriptInterpreter(config);
        
        let timedOut = false;
        const timeoutId = setTimeout(() => {
          timedOut = true;
        }, timeout);

        try {
          const result = interpreter.interpret(code);
          clearTimeout(timeoutId);

          if (timedOut) {
            respond(false, { error: `Execution timed out after ${timeout}ms`, timedOut: true });
            return;
          }

          if (!result.success) {
            respond(false, { error: result.error, logs: result.logs });
            return;
          }

          respond(true, { result: result.result, logs: result.logs });
        } catch (err) {
          clearTimeout(timeoutId);
          const errorMessage = err instanceof Error ? err.message : String(err);
          respond(false, { error: errorMessage });
        }
      },
    );

    api.registerCli(
      ({ program }) => {
        const shell = program
          .command("clawshell")
          .description("Start ClawShell - Interactive ClawScript REPL")
          .addHelpText("after", () => `
ClawShell Commands:
  help              Show this help
  exit, quit, q     Exit the shell
  clear, cls       Clear the screen
  vars, v          List defined variables
  set <n> <v>      Set a variable
  unset <n>        Unset a variable
  run <file>       Execute a ClawScript file
  load <code>      Execute ClawScript code
  fun <n> <args> <code>  Define a shell function
  funcs, f         List defined functions
  reset            Reset shell state
  math <expr>      Quick math calculations
  info             Show ClawShell info

Examples:
  clawshell> var x = 5
  clawshell> print(x * 2)
  clawshell> math 2 + 2
  clawshell> run script.claw
  clawshell> fun greet name 'print("Hello " + name)'
  clawshell> greet "World"
`);
        shell.action(async () => {
          const interpreter = new ClawScriptInterpreter(config);
          await startShell(interpreter, {
            prompt: "clawshell> ",
          });
        });
      },
      { commands: ["clawshell"] },
    );

    api.registerService({
      id: "clawscript",
      start: async () => {
        api.logger.info("[clawscript] ClawScript plugin started");
      },
      stop: async () => {
        api.logger.info("[clawscript] ClawScript plugin stopped");
      },
    });
  },
};

export default ClawScriptPlugin;
