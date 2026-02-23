# ClawScript

ClawScript is a custom scripting language plugin for OpenClaw that provides a full interpreted language with variables, control flow, functions, and built-in libraries.

## Features

- **Variables**: `var`, `let`, `const` with support for strings, numbers, booleans, arrays, and objects
- **Control Flow**: `if/else`, `while`, `for` loops
- **Functions**: User-defined functions with closures
- **Exception Handling**: `try/catch/finally` and `throw`
- **Built-in Libraries**: Math, String, Array, JSON, Date, Object
- **Experimental Addons**: HTTP, Crypto, Regex, UUID, Base64, Time, Encoding, Validation, Collections
- **Interactive REPL**: ClawShell for interactive development

## Installation

```json
{
  "plugins": {
    "clawscript": {
      "addons": ["crypto", "regex", "uuid", "base64", "time", "encoding", "validation", "collection"]
    }
  }
}
```

## Usage

### Execute Script

```typescript
const interpreter = new ClawScriptInterpreter({ addons: ["crypto"] });
const result = interpreter.interpret(`
  var numbers = [1, 2, 3, 4, 5];
  var sum = 0;
  for (var i = 0; i < len(numbers); i = i + 1) {
    sum = sum + numbers[i];
  }
  print("Sum: " + sum);
  sum;
`);

console.log(result); // { success: true, result: 15, logs: ["Sum: 15"] }
```

### ClawShell REPL

```bash
clawshell
```

## Addons

Enable experimental addons in configuration:

```json
{
  "clawscript": {
    "addons": ["http", "crypto", "regex", "uuid", "base64", "time", "encoding", "validation", "collection"],
    "allowNetwork": true
  }
}
```

## Documentation

See [docs/api.md](docs/api.md) for complete API documentation.

## License

MIT
