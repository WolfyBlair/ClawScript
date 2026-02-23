import readline from "node:readline";
import type { ClawValue } from "./interpreter.js";

export interface ShellConfig {
  welcomeMessage?: string;
  prompt?: string;
  historyFile?: string;
  maxHistorySize?: number;
}

interface Command {
  name: string;
  description: string;
  aliases?: string[];
  usage: string;
  execute: (args: string[], interpreter: ShellInterpreter) => Promise<ClawValue | void>;
}

export class ShellInterpreter {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();
  private variables: Map<string, ClawValue> = new Map();
  private exitRequested = false;

  constructor(
    private interpreter: import("./interpreter.js").ClawScriptInterpreter,
    private config: ShellConfig = {}
  ) {
    this.registerBuiltins();
  }

  private registerBuiltins() {
    this.registerCommand({
      name: "help",
      description: "Show help for commands",
      aliases: ["h"],
      usage: "help [command]",
      execute: async (args) => {
        if (args.length > 0) {
          const cmd = this.findCommand(args[0]);
          if (cmd) {
            console.log(`\n${cmd.name} - ${cmd.description}`);
            console.log(`Usage: ${cmd.usage}`);
            if (cmd.aliases?.length) {
              console.log(`Aliases: ${cmd.aliases.join(", ")}`);
            }
            return;
          }
          console.log(`Unknown command: ${args[0]}`);
          return;
        }
        console.log("\nClawShell Commands:");
        console.log("------------------");
        for (const [_, cmd] of this.commands) {
          console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
        }
        console.log("\nClawScript: Write and execute ClawScript code");
        console.log("  var x = 5; print(x * 2);");
        console.log("\nType 'help <command>' for details\n");
      },
    });

    this.registerCommand({
      name: "exit",
      description: "Exit the shell",
      aliases: ["quit", "q", "bye"],
      usage: "exit",
      execute: async () => {
        this.exitRequested = true;
        console.log("Goodbye!");
      },
    });

    this.registerCommand({
      name: "clear",
      description: "Clear the screen",
      aliases: ["cls"],
      usage: "clear",
      execute: async () => {
        console.clear();
      },
    });

    this.registerCommand({
      name: "vars",
      description: "List all defined variables",
      aliases: ["variables", "v"],
      usage: "vars",
      execute: async () => {
        const vars: string[] = [];
        for (const [key, val] of this.variables) {
          const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
          vars.push(`  ${key} = ${valStr}`);
        }
        if (vars.length === 0) {
          console.log("  (no variables defined)");
        } else {
          console.log(vars.join("\n"));
        }
      },
    });

    this.registerCommand({
      name: "set",
      description: "Set a variable",
      usage: "set <name> <value>",
      execute: async (args) => {
        if (args.length < 2) {
          console.log("Usage: set <name> <value>");
          return;
        }
        const [name, ...valueParts] = args;
        const valueStr = valueParts.join(" ");
        try {
          const result = this.interpreter.interpret(`${name} = ${valueStr}`);
          if (result.success) {
            this.variables.set(name, result.result!);
            console.log(`  ${name} = ${result.result}`);
          } else {
            console.log(`  Error: ${result.error}`);
          }
        } catch (err) {
          console.log(`  Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    });

    this.registerCommand({
      name: "unset",
      description: "Unset a variable",
      usage: "unset <name>",
      execute: async (args) => {
        if (args.length < 1) {
          console.log("Usage: unset <name>");
          return;
        }
        const name = args[0];
        if (this.variables.has(name)) {
          this.variables.delete(name);
          console.log(`  Unset ${name}`);
        } else {
          console.log(`  Variable ${name} not found`);
        }
      },
    });

    this.registerCommand({
      name: "run",
      description: "Execute a ClawScript file",
      aliases: ["exec", "source", "."],
      usage: "run <filepath>",
      execute: async (args) => {
        if (args.length < 1) {
          console.log("Usage: run <filepath>");
          return;
        }
        const filename = args[0];
        try {
          const fs = await import("node:fs");
          if (!fs.existsSync(filename)) {
            console.log(`  Error: File not found: ${filename}`);
            return;
          }
          const code = fs.readFileSync(filename, "utf-8");
          const result = this.interpreter.interpret(code);
          if (!result.success) {
            console.log(`  Error: ${result.error}`);
          } else if (result.logs?.length) {
            console.log(result.logs.join("\n"));
          }
        } catch (err) {
          console.log(`  Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    });

    this.registerCommand({
      name: "load",
      description: "Load and execute ClawScript code from a string",
      aliases: ["eval", "e"],
      usage: "load <code>",
      execute: async (args) => {
        if (args.length < 1) {
          console.log("Usage: load <code>");
          return;
        }
        const code = args.join(" ");
        const result = this.interpreter.interpret(code);
        if (!result.success) {
          console.log(`  Error: ${result.error}`);
        } else if (result.logs?.length) {
          console.log(result.logs.join("\n"));
        }
      },
    });

    this.registerCommand({
      name: "fun",
      description: "Define a shell function",
      aliases: ["function"],
      usage: "fun <name> <args> <code>",
      execute: async (args) => {
        if (args.length < 3) {
          console.log("Usage: fun <name> <args> <code>");
          console.log("  fun greet name 'print(\"Hello \" + name + \"!\")'");
          return;
        }
        const name = args[0];
        const funcArgs = args[1].split(",").map((s) => s.trim());
        const code = args.slice(2).join(" ");
        const fullCode = `function ${name}(${funcArgs.join(", ")}) { ${code} }`;
        const result = this.interpreter.interpret(fullCode);
        if (result.success) {
          console.log(`  Function ${name} defined`);
        } else {
          console.log(`  Error: ${result.error}`);
        }
      },
    });

    this.registerCommand({
      name: "funcs",
      description: "List all defined functions",
      aliases: ["functions", "f"],
      usage: "funcs",
      execute: async () => {
        const funcs = this.interpreter.getGlobals?.() || {};
        const functionList: string[] = [];
        for (const [key, val] of Object.entries(funcs)) {
          if (typeof val === "function" && key[0] !== key[0].toUpperCase()) {
            functionList.push(`  ${key}()`);
          }
        }
        if (functionList.length === 0) {
          console.log("  (no functions defined)");
        } else {
          console.log(functionList.join("\n"));
        }
      },
    });

    this.registerCommand({
      name: "history",
      description: "Show command history",
      aliases: ["hist", "h"],
      usage: "history [n]",
      execute: async (args) => {
        const n = args.length > 0 ? parseInt(args[0], 10) : 10;
        console.log(`  Last ${n} commands (history not persisted)`);
      },
    });

    this.registerCommand({
      name: "reset",
      description: "Reset the shell state (clear variables)",
      aliases: ["reset"],
      usage: "reset",
      execute: async () => {
        this.variables.clear();
        console.log("  Shell state reset");
      },
    });

    this.registerCommand({
      name: "info",
      description: "Show ClawShell information",
      aliases: ["about", "i"],
      usage: "info",
      execute: async () => {
        const globals = this.interpreter.getGlobals();
        const addonsList = globals.Addons?.list?.() || [];
        const availableList = globals.Addons?.available?.() || [];
        
        console.log(`
ClawShell - Interactive Shell for ClawScript
--------------------------------------------
Version: 1.0.0
Language: ClawScript
Addons: ${addonsList.length > 0 ? addonsList.join(", ") : "(none)"}

Built-in Commands:
  help, exit, clear, vars, set, unset
  run, load, funcs, fun, reset, info

ClawScript Features:
  - Variables: var, let, const
  - Types: strings, numbers, booleans, arrays, objects
  - Control flow: if/else, while, for, return
  - Functions: function name(params) { ... }
  - Built-ins: print, len, typeof, Math.*, String.*, Array.*, etc.

Available Addons (experimental):
  ${availableList.join(", ")}

To enable addons, set "addons" in plugin config.
`);
      },
    });

    this.registerCommand({
      name: "math",
      description: "Quick math calculations",
      aliases: ["calc"],
      usage: "math <expression>",
      execute: async (args) => {
        if (args.length < 1) {
          console.log("Usage: math <expression>");
          console.log("  math 2 + 2");
          console.log("  math 10 * 5");
          return;
        }
        const expr = args.join(" ");
        const result = this.interpreter.interpret(expr);
        if (result.success) {
          console.log(`  ${result.result}`);
        } else {
          console.log(`  Error: ${result.error}`);
        }
      },
    });
  }

  registerCommand(cmd: Command) {
    this.commands.set(cmd.name, cmd);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.aliases.set(alias, cmd.name);
      }
    }
  }

  findCommand(name: string): Command | undefined {
    const resolved = this.aliases.get(name) || name;
    return this.commands.get(resolved);
  }

  isExitRequested() {
    return this.exitRequested;
  }

  async executeLine(line: string): Promise<boolean> {
    const trimmed = line.trim();
    if (!trimmed) return true;

    if (trimmed.startsWith("#")) {
      return true;
    }

    const parts = this.parseLine(trimmed);
    const cmd = this.findCommand(parts[0]);

    if (cmd) {
      await cmd.execute(parts.slice(1), this);
      return true;
    }

    const result = this.interpreter.interpret(trimmed);
    if (!result.success) {
      console.log(`  Error: ${result.error}`);
      return false;
    }
    if (result.logs?.length) {
      console.log(result.logs.join("\n"));
    }
    if (result.result !== undefined && result.result !== null) {
      console.log(`  => ${this.stringify(result.result)}`);
    }

    return true;
  }

  private parseLine(line: string): string[] {
    const parts: string[] = [];
    let current = "";
    let inString = false;
    let stringChar = "";

    for (const char of line) {
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = "";
      } else if (char === " " && !inString) {
        if (current) {
          parts.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current) {
      parts.push(current);
    }
    return parts;
  }

  private stringify(val: ClawValue): string {
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    if (typeof val === "object") {
      return JSON.stringify(val);
    }
    return String(val);
  }
}

export async function startShell(
  interpreter: import("./interpreter.js").ClawScriptInterpreter,
  config: ShellConfig = {}
) {
  const prompt = config.prompt || "clawshell> ";
  const welcome = config.welcomeMessage || `
╔══════════════════════════════════════════════════════╗
║           ClawShell - ClawScript Interactive        ║
║                                                      ║
║  Type 'help' for commands, 'exit' to quit          ║
║  Write ClawScript code directly for execution       ║
╚══════════════════════════════════════════════════════╝
`;

  console.log(welcome);

  const shell = new ShellInterpreter(interpreter, config);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: prompt,
  });

  rl.on("line", async (line) => {
    await shell.executeLine(line);
    if (!shell.isExitRequested()) {
      rl.prompt();
    } else {
      rl.close();
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });

  rl.on("SIGINT", () => {
    console.log("\nUse 'exit' to quit");
    rl.prompt();
  });

  rl.prompt();

  return shell;
}
