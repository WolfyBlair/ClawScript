# ClawScript Extension API Documentation

## Overview

ClawScript is a custom scripting language plugin for OpenClaw that provides a full interpreted language with variables, control flow, functions, and built-in libraries. It supports experimental addons for extended functionality.

---

## Table of Contents

1. [Installation & Configuration](#installation--configuration)
2. [Language Reference](#language-reference)
3. [Built-in Functions](#built-in-functions)
4. [Built-in Objects](#built-in-objects)
5. [Addons System](#addons-system)
6. [Plugin API](#plugin-api)
7. [ClawShell REPL](#clawshell-repl)

---

## Installation & Configuration

### Plugin Configuration

Add to your OpenClaw configuration:

```json
{
  "plugins": {
    "clawscript": {
      "maxExecutionTime": 5000,
      "maxMemory": 128,
      "allowFilesystem": false,
      "allowNetwork": false,
      "addons": ["crypto", "regex", "uuid", "base64", "time", "encoding", "validation", "collection"]
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxExecutionTime` | number | 5000 | Maximum execution time in milliseconds |
| `maxMemory` | number | 128 | Maximum memory in MB |
| `allowFilesystem` | boolean | false | Enable filesystem operations |
| `allowNetwork` | boolean | false | Enable network operations (requires addons.http) |
| `addons` | string[] | [] | Experimental addons to enable |

---

## Language Reference

### Variables

```clawscript
var x = 10;           // Mutable variable
let y = "hello";      // Block-scoped mutable
const z = 100;        // Constant
```

### Data Types

```clawscript
var num = 42;                    // Number
var str = "Hello";               // String
var bool = true;                 // Boolean
var arr = [1, 2, 3];             // Array
var obj = { name: "John", age: 30 }; // Object
var nil = null;                  // Null
var undef = undefined;           // Undefined
```

### Operators

**Arithmetic:**
```clawscript
+   -   *   /   %   // Basic math
+=  -=  *=  /=       // Compound assignment
++  --              // Increment/decrement
```

**Comparison:**
```clawscript
==  !=  <  >  <=  >=   // Standard comparison
in  of                  // Membership testing
```

**Logical:**
```clawscript
&&  ||  !              // AND, OR, NOT
```

**Ternary:**
```clawscript
var result = condition ? "yes" : "no";
```

### Control Flow

**If/Else:**
```clawscript
if (x > 10) {
  print("big");
} else if (x > 5) {
  print("medium");
} else {
  print("small");
}
```

**While:**
```clawscript
var i = 0;
while (i < 5) {
  print(i);
  i = i + 1;
}
```

**For:**
```clawscript
for (var i = 0; i < 10; i = i + 1) {
  print(i);
}
```

### Functions

```clawscript
function greet(name) {
  return "Hello, " + name;
}

function add(a, b) {
  return a + b;
}

// Arrow-style usage
var result = add(5, 3);
```

### Exception Handling

```clawscript
try {
  var x = dangerousOperation();
} catch (e) {
  print("Error: " + e);
} finally {
  print("Done");
}

throw "Something went wrong";
```

---

## Built-in Functions

### Core Functions

| Function | Description | Example |
|----------|-------------|---------|
| `print(...args)` | Print to console | `print("Hello", 42)` |
| `println(...args)` | Print with newline | `println(x)` |
| `typeof(val)` | Get type of value | `typeof("hello")` |
| `len(val)` | Get length | `len([1,2,3])` |
| `has(obj, key)` | Check if key exists | `has(obj, "name")` |
| `get(obj, key, default)` | Get with default | `get(obj, "x", 0)` |
| `set(obj, key, val)` | Set property | `set(obj, "x", 5)` |
| `keys(obj)` | Get object keys | `keys({a:1})` |
| `values(obj)` | Get object values | `values({a:1})` |
| `toString(val)` | Convert to string | `toString(123)` |
| `toNumber(val)` | Convert to number | `toNumber("42")` |
| `toBool(val)` | Convert to boolean | `toBool("text")` |

### Type Conversion

```clawscript
var str = toString(123);     // "123"
var num = toNumber("42");     // 42
var bool = toBool("hello");   // true
```

---

## Built-in Objects

### Math

```clawscript
Math.abs(-5)        // 5
Math.floor(3.7)     // 3
Math.ceil(3.2)      // 4
Math.round(3.5)     // 4
Math.sqrt(16)       // 4
Math.pow(2, 8)      // 256
Math.min(1, 2, 3)   // 1
Math.max(1, 2, 3)   // 3
Math.random()       // 0.0 to 1.0
Math.sin(0)         // 0
Math.cos(0)         // 1
Math.PI             // 3.14159...
Math.E              // 2.71828...
```

### String

```clawscript
String.upper("hello")        // "HELLO"
String.lower("HELLO")        // "hello"
String.trim("  hi  ")        // "hi"
String.split("a,b,c", ",")   // ["a","b","c"]
String.join(["a","b"], "-")  // "a-b"
String.replace("hello", "l", "x")  // "hexxo"
String.replaceAll("aaa", "a", "b") // "bbb"
String.indexOf("hello", "l")  // 2
String.slice("hello", 1, 4)  // "ell"
String.startsWith("hello", "he")  // true
String.endsWith("hello", "lo")    // true
String.repeat("ha", 3)       // "hahaha"
String.length               // Property (always 0, use len())
```

### Array

```clawscript
var arr = [1, 2, 3];
Array.push(arr, 4, 5);       // [1,2,3,4,5], returns new length
Array.pop(arr);              // Removes last element
Array.shift(arr);            // Removes first element
Array.unshift(arr, 0);       // Adds to beginning
Array.slice(arr, 1, 3);      // [2,3]
Array.splice(arr, 1, 1, 9);  // Modify in place
Array.concat([1,2], [3,4]);  // [1,2,3,4]
Array.reverse(arr);          // [3,2,1]
Array.sort(arr);             // Sort ascending
Array.map(arr, (x) => x * 2);
Array.filter(arr, (x) => x > 2);
Array.reduce(arr, (sum, x) => sum + x);
Array.find(arr, (x) => x > 1);
Array.includes(arr, 2);      // true
Array.indexOf(arr, 2);       // 1
Array.join(arr, "-");        // "1-2-3"
Array.every(arr, (x) => x > 0);
Array.some(arr, (x) => x > 5);
```

### JSON

```clawscript
JSON.stringify({a: 1});      // '{"a":1}'
JSON.parse('{"a":1}');       // {a:1}
```

### Date

```clawscript
Date.now();         // Current timestamp
Date.parse("2024-01-01");  // Parse to timestamp
Date.format();      // ISO string
Date.year();        // Current year
Date.month();       // Current month (1-12)
Date.day();         // Current day
Date.hour();        // Current hour
Date.minute();      // Current minute
Date.second();      // Current second
```

### Object

```clawscript
Object.assign(target, source);
Object.merge({a:1}, {b:2});  // {a:1,b:2}
Object.clone(obj);            // Deep clone
```

---

## Addons System

### Available Addons

Addons are experimental features that must be explicitly enabled in configuration.

#### http

Requires `allowNetwork: true`

```clawscript
var response = Http.get("https://api.example.com/data");
var response = Http.post("https://api.example.com", { key: "value" });
var response = Http.put("https://api.example.com/1", { data: "test" });
var response = Http.delete("https://api.example.com/1");
var response = Http.patch("https://api.example.com/1", { update: true });
var response = Http.head("https://api.example.com");

// Response object
print(response.status);      // 200
print(response.ok);          // true
print(response.body);        // Response data
print(response.headers);     // Response headers
```

#### crypto

```clawscript
Crypto.md5("hello");
Crypto.sha1("hello");
Crypto.sha256("hello");
Crypto.sha512("hello");
Crypto.base64Encode("hello");  // "aGVsbG8="
Crypto.base64Decode("aGVsbG8=");  // "hello"
Crypto.hexEncode("hello");
Crypto.hexDecode("68656c6c6f");
Crypto.randomBytes(16);
Crypto.randomUUID();
Crypto.hmac("sha256", "data", "key");
Crypto.timingSafeEqual("a", "b");
```

#### regex

```clawscript
Regex.match("\\d+", "abc123def", "g");  // ["123"]
Regex.replace("\\d+", "abc123def", "X"); // "abcXdef"
Regex.replaceAll("a", "babab", "c");    // "bcbcb"
Regex.split("\\s+", "hello world");     // ["hello","world"]
Regex.test("\\d+", "abc123");           // true
Regex.search("\\d+", "abc123");          // 3
Regex.exec("\\d+", "abc123");           // ["123"]
Regex.isValid("[");                      // false
Regex.escape("a.b*c");                   // "a\\.b\\*c"
```

#### uuid

```clawscript
UUID.v4();          // "550e8400-e29b-41d4-a716-446655440000"
UUID.v4Hex();       // "550e8400e29b41d4a716446655440000"
UUID.isValid(id);
UUID.parse(id);     // { timeLow, timeMid, timeHiAndVersion, clockSeqHiAndReserved, clockSeqLow, node }
```

#### base64

```clawscript
Base64.encode("hello");     // "aGVsbG8="
Base64.decode("aGVsbG8=");  // "hello"
Base64.encodeUrl("hello");   // "aGVsbG8"
Base64.decodeUrl("aGVsbG8");  // "hello"
```

#### time

```clawscript
Time.now();                    // Current timestamp (ms)
Time.epoch();                  // Current timestamp (seconds)
Time.sleep(1000);               // Sleep for 1 second (async)
Time.format(null, "YYYY-MM-DD HH:mm:ss");
Time.parse("2024-01-01");
Time.add(Date.now(), 1, "days");   // Add 1 day
Time.add(Date.now(), 2, "hours");
Time.add(Date.now(), 30, "minutes");
```

#### encoding

```clawscript
Encoding.utf8ToBytes("hi");       // [104, 105]
Encoding.bytesToUtf8([104, 105]);  // "hi"
Encoding.hexToBytes("6869");       // [104, 105]
Encoding.bytesToHex([104, 105]);   // "6869"
Encoding.latin1ToBytes("hi");
Encoding.bytesToLatin1([104, 105]);
```

#### validation

```clawscript
Validate.email("test@example.com");      // true
Validate.url("https://example.com");     // true
Validate.ip("192.168.1.1");               // true
Validate.ipv4("192.168.1.1");             // true
Validate.ipv6("::1");                     // true
Validate.uuid("550e8400-e29b-41d4-a716-446655440000"); // true
Validate.hex("deadbeef");                 // true
Validate.numeric("12345");                // true
Validate.alpha("abc");                    // true
Validate.alphaNumeric("abc123");          // true
Validate.mobile("+1234567890");           // true
Validate.creditCard("1234-5678-9012-3456"); // true
```

#### collection

```clawscript
var q = Queue();
q.enqueue(1, 2, 3);
q.dequeue();    // 1
q.peek();       // 2
q.size();       // 2
q.isEmpty();    // false
q.clear();

var s = Stack();
s.push(1, 2, 3);
s.pop();       // 3
s.peek();      // 2
s.size();      // 2

var st = Set(1, 2, 3);
st.add(4);
st.has(2);     // true
st.delete(1);
st.size();
st.clear();
st.toArray();

var m = Map();
m.set("key", "value");
m.get("key");
m.has("key");
m.delete("key");
m.keys();
m.values();
m.entries();
m.size();
```

---

## Plugin API

### Addons API

Programmatic addon management from within ClawScript:

```clawscript
// List all loaded addons
Addons.list();

// List available built-in addons
Addons.available();

// Check if addon is loaded
Addons.isLoaded("crypto");

// Load an addon
Addons.load("crypto");

// Unload an addon
Addons.unload("crypto");
```

### Custom Addon Registration

```clawscript
// Create a custom addon definition
var myaddon = Addons.api.create("myaddon")
  .description("My custom addon")
  .version("1.0.0")
  .function("greet", function(name) {
    return "Hello, " + name;
  })
  .function("add", function(a, b) {
    return a + b;
  })
  .object("utils", {
    "double": function(x) { return x * 2; },
    "triple": function(x) { return x * 3; }
  })
  .build();

// Register the addon
Addons.register(myaddon);

// Enable it
Addons.load("myaddon");

// Now use it
print(greet("World"));    // Hello, World
print(utils.double(5));   // 10
```

### AddonsApi Methods

| Method | Description |
|--------|-------------|
| `Addons.api.create(name, def)` | Create addon builder |
| `Addons.api.register(addon)` | Register addon |
| `Addons.api.unregister(name)` | Remove addon |
| `Addons.api.list()` | List all custom addons |
| `Addons.api.get(name)` | Get addon definition |
| `Addons.api.enable(name)` | Enable addon |
| `Addons.api.disable(name)` | Disable addon |
| `Addons.api.isEnabled(name)` | Check if enabled |

---

## ClawShell REPL

Interactive shell for ClawScript development.

### Starting ClawShell

```bash
clawshell
# or
openclaw clawshell
```

### Shell Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `help` | `h` | Show help |
| `exit` | `q, quit` | Exit shell |
| `clear` | `cls` | Clear screen |
| `vars` | `v` | List variables |
| `set <n> <v>` | - | Set variable |
| `unset <n>` | - | Unset variable |
| `run <file>` | `.` | Execute file |
| `load <code>` | `e` | Execute code |
| `fun <n> <args> <code>` | - | Define function |
| `funcs` | `f` | List functions |
| `reset` | - | Reset state |
| `info` | `i` | Show info |
| `math <expr>` | `calc` | Quick math |

### Shell Examples

```bash
clawshell> var x = 5
clawshell> print(x * 2)
10
clawshell> math 2 + 2
4
clawshell> run script.claw
clawshell> fun greet name 'print("Hello " + name)'
clawshell> greet "World"
Hello World
```

---

## Examples

### Fibonacci

```clawscript
function fib(n) {
  if (n <= 1) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

for (var i = 0; i < 10; i = i + 1) {
  print(fib(i));
}
```

### Array Manipulation

```clawscript
var numbers = [5, 3, 8, 1, 9, 2, 7, 4, 6];

var doubled = Array.map(numbers, function(x) {
  return x * 2;
});

var filtered = Array.filter(numbers, function(x) {
  return x > 5;
});

var sum = Array.reduce(numbers, function(acc, x) {
  return acc + x;
});

print("Doubled: " + Array.join(doubled, ", "));
print("Filtered: " + Array.join(filtered, ", "));
print("Sum: " + sum);
```

### HTTP Request

```clawscript
// Requires allowNetwork: true and addons: ["http"]
var response = Http.get("https://jsonplaceholder.typicode.com/todos/1");
print(response.status);
print(response.body);
```

### Custom Addon

```clawscript
// Create and register a math utilities addon
var mathutils = Addons.api.create("mathutils")
  .description("Custom math functions")
  .function("factorial", function(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  })
  .function("fibonacci", function(n) {
    if (n <= 1) return n;
    var a = 0;
    var b = 1;
    for (var i = 2; i <= n; i = i + 1) {
      var temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  })
  .build();

Addons.register(mathutils);
Addons.load("mathutils");

print(factorial(5));    // 120
print(fibonacci(10));   // 55
```

---

## Error Handling

```clawscript
function safeDivide(a, b) {
  try {
    if (b == 0) {
      throw "Division by zero";
    }
    return a / b;
  } catch (e) {
    print("Error: " + e);
    return 0;
  } finally {
    print("Operation complete");
  }
}

print(safeDivide(10, 2));
print(safeDivide(10, 0));
```

---

## Performance Notes

- Maximum execution time: 5 seconds (configurable)
- Maximum memory: 128MB (configurable)
- Recursive functions may hit stack limits
- Large arrays consume proportional memory

---

## Limitations

- No classes (use objects for OOP patterns)
- No modules/imports (single file execution)
- No bitwise operators
- No async/await syntax (use callbacks)
- Addons are experimental and may change
