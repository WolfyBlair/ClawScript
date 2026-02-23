import { createAddonsApi, createAddonFromDefinition, type AddonDefinition } from "./addons-api.js";

export type ClawValue = 
  | string 
  | number 
  | boolean 
  | null 
  | ClawValue[] 
  | { [key: string]: ClawValue }
  | undefined;

export interface ClawFunction {
  name: string;
  params: string[];
  body: ASTNode[];
  closure: Map<string, ClawValue>;
}

export type ASTNode = 
  | { type: 'Program'; body: ASTNode[] }
  | { type: 'NumberLiteral'; value: number }
  | { type: 'StringLiteral'; value: string }
  | { type: 'BooleanLiteral'; value: boolean }
  | { type: 'NullLiteral'; value: null }
  | { type: 'ArrayLiteral'; elements: ASTNode[] }
  | { type: 'ObjectLiteral'; properties: { key: string; value: ASTNode }[] }
  | { type: 'Identifier'; name: string }
  | { type: 'BinaryExpr'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'UnaryExpr'; operator: string; argument: ASTNode }
  | { type: 'LogicalExpr'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'TernaryExpr'; test: ASTNode; consequent: ASTNode; alternate: ASTNode }
  | { type: 'CallExpr'; callee: ASTNode; arguments: ASTNode[] }
  | { type: 'MemberExpr'; object: ASTNode; property: ASTNode; computed: boolean }
  | { type: 'AssignmentExpr'; left: ASTNode; right: ASTNode; operator: string }
  | { type: 'VariableDecl'; id: string; init: ASTNode; kind: 'var' | 'let' | 'const' }
  | { type: 'BlockStmt'; body: ASTNode[] }
  | { type: 'IfStmt'; test: ASTNode; consequent: ASTNode; alternate: ASTNode | null }
  | { type: 'WhileStmt'; test: ASTNode; body: ASTNode }
  | { type: 'ForStmt'; init: ASTNode | null; test: ASTNode; update: ASTNode; body: ASTNode }
  | { type: 'ReturnStmt'; argument: ASTNode | null }
  | { type: 'BreakStmt' }
  | { type: 'ContinueStmt' }
  | { type: 'ThrowStmt'; argument: ASTNode }
  | { type: 'FunctionDecl'; name: string; params: string[]; body: ASTNode[] }
  | { type: 'TryStmt'; body: ASTNode; catchVar: string | null; catchBody: ASTNode; finallyBody: ASTNode | null };

class Lexer {
  private pos = 0;
  private tokens: { type: string; value: any }[] = [];

  constructor(private source: string) {}

  tokenize() {
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const ch = this.source[this.pos];

      if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peek(1)))) {
        this.readNumber();
      } else if (ch === '"' || ch === "'" || ch === '`') {
        this.readString(ch);
      } else if (this.isAlpha(ch) || ch === '_') {
        this.readIdentifier();
      } else {
        this.readOperator();
      }
    }
    this.tokens.push({ type: 'EOF', value: null });
    return this.tokens;
  }

  private skipWhitespace() {
    while (this.pos < this.source.length && /\s/.test(this.source[this.pos])) {
      this.pos++;
    }
    if (this.source.slice(this.pos, this.pos + 2) === '//') {
      while (this.source[this.pos] !== '\n' && this.pos < this.source.length) {
        this.pos++;
      }
      this.skipWhitespace();
    }
  }

  private peek(offset: number = 0) {
    return this.source[this.pos + offset] || '';
  }

  private isDigit(ch: string) {
    return /[0-9]/.test(ch);
  }

  private isAlpha(ch: string) {
    return /[a-zA-Z_]/.test(ch);
  }

  private isAlphaNumeric(ch: string) {
    return /[a-zA-Z0-9_]/.test(ch);
  }

  private readNumber() {
    let numStr = '';
    while (this.pos < this.source.length && (this.isDigit(this.source[this.pos]) || this.source[this.pos] === '.')) {
      numStr += this.source[this.pos++];
    }
    this.tokens.push({ type: 'Number', value: parseFloat(numStr) });
  }

  private readString(quote: string) {
    this.pos++;
    let str = '';
    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') {
        this.pos++;
        const escaped = this.source[this.pos];
        switch (escaped) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case 'r': str += '\r'; break;
          case '\\': str += '\\'; break;
          case '"': str += '"'; break;
          case "'": str += "'"; break;
          default: str += escaped;
        }
      } else {
        str += this.source[this.pos];
      }
      this.pos++;
    }
    this.pos++;
    this.tokens.push({ type: 'String', value: str });
  }

  private readIdentifier() {
    let ident = '';
    while (this.pos < this.source.length && this.isAlphaNumeric(this.source[this.pos])) {
      ident += this.source[this.pos++];
    }
    const keywords = ['var', 'let', 'const', 'function', 'if', 'else', 'while', 'for', 'return', 'break', 'continue', 'true', 'false', 'null', 'undefined', 'typeof', 'in', 'of', 'try', 'catch', 'finally', 'throw'];
    if (keywords.includes(ident)) {
      this.tokens.push({ type: ident.toUpperCase(), value: ident });
    } else {
      this.tokens.push({ type: 'Identifier', value: ident });
    }
  }

  private readOperator() {
    const ops: Record<string, string> = {
      '+': 'PLUS',
      '-': 'MINUS',
      '*': 'STAR',
      '/': 'SLASH',
      '%': 'PERCENT',
      '=': 'EQUAL',
      '<': 'LT',
      '>': 'GT',
      '!': 'BANG',
      '&': 'AMPERSAND',
      '|': 'PIPE',
      '^': 'CARET',
      '~': 'TILDE',
      '?': 'QUESTION',
      ':': 'COLON',
      ',': 'COMMA',
      ';': 'SEMICOLON',
      '(': 'LPAREN',
      ')': 'RPAREN',
      '{': 'LBRACE',
      '}': 'RBRACE',
      '[': 'LBRACKET',
      ']': 'RBRACKET',
      '.': 'DOT',
    };
    const twoChar: Record<string, string> = {
      '==': 'EQEQ',
      '!=': 'BANGEQ',
      '<=': 'LTEQ',
      '>=': 'GTEQ',
      '&&': 'AMPAMP',
      '||': 'PIPEPIPE',
      '++': 'PLUSPLUS',
      '--': 'MINUSMINUS',
      '+=': 'PLUSEQUAL',
      '-=': 'MINUSEQUAL',
      '*=': 'STAREQUAL',
      '/=': 'SLASHEQUAL',
    };
    const two = this.source.slice(this.pos, this.pos + 2);
    if (twoChar[two]) {
      this.tokens.push({ type: twoChar[two], value: two });
      this.pos += 2;
    } else if (ops[ch]) {
      this.tokens.push({ type: ops[ch], value: ch });
      this.pos++;
    } else {
      this.pos++;
    }
  }
}

class Parser {
  private pos = 0;
  private tokens: { type: string; value: any }[] = [];

  constructor(tokens: { type: string; value: any }[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    const body: ASTNode[] = [];
    while (!this.isAtEnd()) {
      body.push(this.statement());
    }
    return { type: 'Program', body };
  }

  private isAtEnd() {
    return this.peek().type === 'EOF';
  }

  private peek() {
    return this.tokens[this.pos];
  }

  private advance() {
    return this.tokens[this.pos++];
  }

  private check(type: string) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: string[]) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private previous() {
    return this.tokens[this.pos - 1];
  }

  private statement(): ASTNode {
    if (this.match('VAR', 'LET', 'CONST')) {
      const kind = this.previous().value as 'var' | 'let' | 'const';
      const name = this.advance().value;
      let init: ASTNode = { type: 'NullLiteral', value: null };
      if (this.match('EQUAL')) {
        init = this.expression();
      }
      this.match('SEMICOLON');
      return { type: 'VariableDecl', id: name, init, kind };
    }
    if (this.match('FUNCTION')) {
      const name = this.advance().value;
      this.match('LPAREN');
      const params: string[] = [];
      while (!this.check('RPAREN')) {
        if (params.length > 0) this.match('COMMA');
        params.push(this.advance().value);
      }
      this.match('RPAREN');
      this.match('LBRACE');
      const body: ASTNode[] = [];
      while (!this.check('RBRACE')) {
        body.push(this.statement());
      }
      this.match('RBRACE');
      return { type: 'FunctionDecl', name, params, body };
    }
    if (this.match('IF')) {
      this.match('LPAREN');
      const test = this.expression();
      this.match('RPAREN');
      const consequent = this.block();
      let alternate: ASTNode | null = null;
      if (this.match('ELSE')) {
        alternate = this.block();
      }
      return { type: 'IfStmt', test, consequent, alternate };
    }
    if (this.match('WHILE')) {
      this.match('LPAREN');
      const test = this.expression();
      this.match('RPAREN');
      const body = this.block();
      return { type: 'WhileStmt', test, body };
    }
    if (this.match('FOR')) {
      this.match('LPAREN');
      let init: ASTNode | null = null;
      if (!this.check('SEMICOLON')) {
        if (this.match('VAR', 'LET', 'CONST')) {
          const kind = this.previous().value as 'var' | 'let' | 'const';
          const id = this.advance().value;
          this.match('EQUAL');
          init = { type: 'VariableDecl', id, init: this.expression(), kind };
        } else {
          init = this.expression();
        }
      }
      this.match('SEMICOLON');
      const test = this.expression();
      this.match('SEMICOLON');
      const update = this.expression();
      this.match('RPAREN');
      const body = this.block();
      return { type: 'ForStmt', init, test, update, body };
    }
    if (this.match('RETURN')) {
      let arg: ASTNode | null = null;
      if (!this.check('SEMICOLON')) {
        arg = this.expression();
      }
      this.match('SEMICOLON');
      return { type: 'ReturnStmt', argument: arg };
    }
    if (this.match('THROW')) {
      const arg = this.expression();
      this.match('SEMICOLON');
      return { type: 'ThrowStmt', argument: arg };
    }
    if (this.match('BREAK')) {
      this.match('SEMICOLON');
      return { type: 'BreakStmt' };
    }
    if (this.match('CONTINUE')) {
      this.match('SEMICOLON');
      return { type: 'ContinueStmt' };
    }
    if (this.match('TRY')) {
      const body = this.block();
      let catchVar: string | null = null;
      let catchBody: ASTNode = { type: 'BlockStmt', body: [] };
      if (this.match('CATCH')) {
        if (this.match('LPAREN')) {
          catchVar = this.advance().value;
          this.match('RPAREN');
        }
        catchBody = this.block();
      }
      let finallyBody: ASTNode | null = null;
      if (this.match('FINALLY')) {
        finallyBody = this.block();
      }
      return { type: 'TryStmt', body, catchVar, catchBody, finallyBody };
    }
    if (this.match('LBRACE')) {
      this.pos--;
      const body = this.block();
      return { type: 'BlockStmt', body };
    }
    const expr = this.expression();
    this.match('SEMICOLON');
    return expr;
  }

  private block(): ASTNode {
    this.match('LBRACE');
    const body: ASTNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      body.push(this.statement());
    }
    this.match('RBRACE');
    return { type: 'BlockStmt', body };
  }

  private expression(): ASTNode {
    return this.assignment();
  }

  private assignment(): ASTNode {
    const left = this.ternary();
    if (this.match('EQUAL', 'PLUSEQUAL', 'MINUSEQUAL', 'STAREQUAL', 'SLASHEQUAL')) {
      const operator = this.previous().value;
      const right = this.assignment();
      return { type: 'AssignmentExpr', left, right, operator };
    }
    return left;
  }

  private ternary(): ASTNode {
    const left = this.logicalOr();
    if (this.match('QUESTION')) {
      const consequent = this.ternary();
      this.match('COLON');
      const alternate = this.ternary();
      return { type: 'TernaryExpr', test: left, consequent, alternate };
    }
    return left;
  }

  private logicalOr(): ASTNode {
    let left = this.logicalAnd();
    while (this.match('PIPEPIPE')) {
      const right = this.logicalAnd();
      left = { type: 'LogicalExpr', operator: '||', left, right };
    }
    return left;
  }

  private logicalAnd(): ASTNode {
    let left = this.equality();
    while (this.match('AMPAMP')) {
      const right = this.equality();
      left = { type: 'LogicalExpr', operator: '&&', left, right };
    }
    return left;
  }

  private equality(): ASTNode {
    let left = this.comparison();
    while (this.match('EQEQ', 'BANGEQ', 'IN', 'OF')) {
      const operator = this.previous().value;
      const right = this.comparison();
      left = { type: 'BinaryExpr', operator, left, right };
    }
    return left;
  }

  private comparison(): ASTNode {
    let left = this.addition();
    while (this.match('GT', 'LT', 'GTEQ', 'LTEQ')) {
      const operator = this.previous().value;
      const right = this.addition();
      left = { type: 'BinaryExpr', operator, left, right };
    }
    return left;
  }

  private addition(): ASTNode {
    let left = this.multiplication();
    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous().value;
      const right = this.multiplication();
      left = { type: 'BinaryExpr', operator, left, right };
    }
    return left;
  }

  private multiplication(): ASTNode {
    let left = this.unary();
    while (this.match('STAR', 'SLASH', 'PERCENT')) {
      const operator = this.previous().value;
      const right = this.unary();
      left = { type: 'BinaryExpr', operator, left, right };
    }
    return left;
  }

  private unary(): ASTNode {
    if (this.match('BANG', 'MINUS', 'PLUSPLUS', 'MINUSMINUS')) {
      const operator = this.previous().value;
      const argument = this.unary();
      return { type: 'UnaryExpr', operator, argument };
    }
    return this.call();
  }

  private call(): ASTNode {
    let expr = this.primary();
    while (true) {
      if (this.match('LPAREN')) {
        const args: ASTNode[] = [];
        while (!this.check('RPAREN')) {
          if (args.length > 0) this.match('COMMA');
          args.push(this.expression());
        }
        this.match('RPAREN');
        expr = { type: 'CallExpr', callee: expr, arguments: args };
      } else if (this.match('DOT')) {
        const property = { type: 'Identifier', name: this.advance().value };
        expr = { type: 'MemberExpr', object: expr, property, computed: false };
      } else if (this.match('LBRACKET')) {
        const property = this.expression();
        this.match('RBRACKET');
        expr = { type: 'MemberExpr', object: expr, property, computed: true };
      } else {
        break;
      }
    }
    return expr;
  }

  private primary(): ASTNode {
    if (this.match('NUMBER')) {
      return { type: 'NumberLiteral', value: this.previous().value };
    }
    if (this.match('STRING')) {
      return { type: 'StringLiteral', value: this.previous().value };
    }
    if (this.match('TRUE')) {
      return { type: 'BooleanLiteral', value: true };
    }
    if (this.match('FALSE')) {
      return { type: 'BooleanLiteral', value: false };
    }
    if (this.match('NULL')) {
      return { type: 'NullLiteral', value: null };
    }
    if (this.match('IDENTIFIER')) {
      return { type: 'Identifier', name: this.previous().value };
    }
    if (this.match('LPAREN')) {
      const expr = this.expression();
      this.match('RPAREN');
      return expr;
    }
    if (this.match('LBRACKET')) {
      const elements: ASTNode[] = [];
      while (!this.check('RBRACKET')) {
        if (elements.length > 0) this.match('COMMA');
        elements.push(this.expression());
      }
      this.match('RBRACKET');
      return { type: 'ArrayLiteral', elements };
    }
    if (this.match('LBRACE')) {
      const properties: { key: string; value: ASTNode }[] = [];
      while (!this.check('RBRACE')) {
        if (properties.length > 0) this.match('COMMA');
        let key: string;
        if (this.match('IDENTIFIER')) {
          key = this.previous().value;
        } else if (this.match('STRING')) {
          key = this.previous().value;
        } else {
          key = this.advance().value;
        }
        this.match('COLON');
        const value = this.expression();
        properties.push({ key, value });
      }
      this.match('RBRACE');
      return { type: 'ObjectLiteral', properties };
    }
    throw new Error(`Unexpected token: ${JSON.stringify(this.peek())}`);
  }
}

interface ClawConfig {
  maxExecutionTime?: number;
  maxMemory?: number;
  allowFilesystem?: boolean;
  allowNetwork?: boolean;
  allowShell?: boolean;
  addons?: string[];
}

export class ClawScriptInterpreter {
  private globals = new Map<string, ClawValue>();
  private scope: Map<string, ClawValue>[] = [this.globals];
  private addonManager: import("./addons.js").AddonManager | null = null;
  private config: ClawConfig;
  readonly customAddonsApi: ReturnType<typeof createAddonsApi>;

  constructor(config: ClawConfig = {}) {
    this.config = config;
    this.customAddonsApi = createAddonsApi();
    this.setupBuiltins();
    this.initAddons();
  }

  private initAddons() {
    if (!this.config.addons || this.config.addons.length === 0) return;
    try {
      const { AddonManager } = require("./addons.js");
      this.addonManager = new AddonManager(this.config.addons, {
        allowNetwork: this.config.allowNetwork,
        allowFilesystem: this.config.allowFilesystem,
        maxExecutionTime: this.config.maxExecutionTime,
        maxMemory: this.config.maxMemory,
      });
      this.addonManager.initForInterpreter(this);
      const addonValues = this.addonManager.getAddonValues(this);
      if (addonValues) {
        for (const [name, value] of addonValues) {
          this.globals.set(name, value);
        }
      }
      this.globals.set("Addons", {
        list: () => {
          const builtin = this.addonManager?.getLoadedAddons() || [];
          const custom = this.customAddonsApi.list();
          return [...builtin, ...custom];
        },
        available: () => this.addonManager?.getAvailableAddons() || [],
        isLoaded: (name: string) => this.addonManager?.isLoaded(name) || this.customAddonsApi.isEnabled(name),
        load: (name: string) => {
          if (this.addonManager?.loadAddon(name)) return true;
          if (this.customAddonsApi.isEnabled(name)) {
            const addon = this.customAddonsApi.get(name);
            if (addon) {
              this.registerAddon(addon);
              return true;
            }
          }
          return false;
        },
        unload: (name: string) => this.addonManager?.unloadAddon(name) || this.customAddonsApi.disable(name),
        api: this.customAddonsApi,
        register: (definition: AddonDefinition) => {
          this.customAddonsApi.register(definition);
          return true;
        },
      });
    } catch (err) {
      console.error("Failed to initialize addons:", err);
    }
  }

  private setupBuiltins() {
    this.globals.set('print', (...args: ClawValue[]) => {
      console.log(...args.map(a => this.stringify(a)));
      return null;
    });
    this.globals.set('println', (...args: ClawValue[]) => {
      console.log(...args.map(a => this.stringify(a)));
      return null;
    });
    this.globals.set('typeof', (val: ClawValue) => {
      if (val === null) return 'null';
      if (val === undefined) return 'undefined';
      if (Array.isArray(val)) return 'array';
      return typeof val;
    });
    this.globals.set('len', (val: ClawValue) => {
      if (Array.isArray(val)) return val.length;
      if (typeof val === 'string') return val.length;
      if (typeof val === 'object' && val !== null) return Object.keys(val).length;
      return 0;
    });
    this.globals.set('keys', (val: ClawValue) => {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return Object.keys(val);
      }
      return [];
    });
    this.globals.set('values', (val: ClawValue) => {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return Object.values(val);
      }
      return [];
    });
    this.globals.set('has', (obj: ClawValue, key: string) => {
      if (typeof obj === 'object' && obj !== null) {
        return key in obj;
      }
      return false;
    });
    this.globals.set('get', (obj: ClawValue, key: string, defaultVal?: ClawValue) => {
      if (typeof obj === 'object' && obj !== null && key in obj) {
        return (obj as Record<string, ClawValue>)[key];
      }
      return defaultVal ?? null;
    });
    this.globals.set('set', (obj: ClawValue, key: string, val: ClawValue) => {
      if (typeof obj === 'object' && obj !== null) {
        (obj as Record<string, ClawValue>)[key] = val;
      }
      return val;
    });
    this.globals.set('toString', (val: ClawValue) => this.stringify(val));
    this.globals.set('toNumber', (val: ClawValue) => {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    });
    this.globals.set('toBool', (val: ClawValue) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val !== 0;
      if (typeof val === 'string') return val.length > 0;
      if (Array.isArray(val)) return val.length > 0;
      return true;
    });
    this.globals.set('Math', {
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      sqrt: Math.sqrt,
      pow: Math.pow,
      min: Math.min,
      max: Math.max,
      random: Math.random,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      log: Math.log,
      exp: Math.exp,
      PI: Math.PI,
      E: Math.E,
    });
    this.globals.set('String', {
      upper: (s: string) => s.toUpperCase(),
      lower: (s: string) => s.toLowerCase(),
      trim: (s: string) => s.trim(),
      split: (s: string, sep: string) => s.split(sep),
      join: (arr: ClawValue[], sep: string) => Array.isArray(arr) ? arr.join(sep) : '',
      replace: (s: string, from: string, to: string) => s.replace(from, to),
      replaceAll: (s: string, from: string, to: string) => s.replaceAll(from, to),
      indexOf: (s: string, sub: string) => s.indexOf(sub),
      slice: (s: string, start: number, end?: number) => s.slice(start, end),
      substring: (s: string, start: number, end?: number) => s.substring(start, end),
      startsWith: (s: string, prefix: string) => s.startsWith(prefix),
      endsWith: (s: string, suffix: string) => s.endsWith(suffix),
      repeat: (s: string, count: number) => s.repeat(count),
      charAt: (s: string, i: number) => s.charAt(i),
      charCodeAt: (s: string, i: number) => s.charCodeAt(i),
      fromCharCode: String.fromCharCode,
      length: 0,
    });
    this.globals.set('Array', {
      push: (arr: ClawValue[], ...vals: ClawValue[]) => { arr.push(...vals); return arr.length; },
      pop: (arr: ClawValue[]) => arr.pop(),
      shift: (arr: ClawValue[]) => arr.shift(),
      unshift: (arr: ClawValue[], ...vals: ClawValue[]) => { arr.unshift(...vals); return arr.length; },
      slice: (arr: ClawValue[], start?: number, end?: number) => arr.slice(start, end),
      splice: (arr: ClawValue[], start: number, deleteCount?: number, ...items: ClawValue[]) => 
        arr.splice(start, deleteCount, ...items),
      concat: (...arrs: ClawValue[][]) => arrs.flat(),
      reverse: (arr: ClawValue[]) => [...arr].reverse(),
      sort: (arr: ClawValue[], fn?: (a: ClawValue, b: ClawValue) => number) => {
        const copy = [...arr];
        if (fn) {
          copy.sort((a, b) => fn(a, b) as number);
        } else {
          copy.sort();
        }
        return copy;
      },
      map: (arr: ClawValue[], fn: (val: ClawValue, i: number) => ClawValue) => arr.map(fn),
      filter: (arr: ClawValue[], fn: (val: ClawValue, i: number) => ClawValue) => arr.filter(fn),
      reduce: (arr: ClawValue[], fn: (acc: ClawValue, val: ClawValue, i: number) => ClawValue, init?: ClawValue) => 
        arr.reduce((a, v, i) => fn(a, v, i), init ?? 0),
      find: (arr: ClawValue[], fn: (val: ClawValue, i: number) => ClawValue) => arr.find(fn),
      findIndex: (arr: ClawValue[], fn: (val: ClawValue, i: number) => ClawValue) => arr.findIndex(fn),
      includes: (arr: ClawValue[], val: ClawValue) => arr.includes(val),
      indexOf: (arr: ClawValue[], val: ClawValue) => arr.indexOf(val),
      join: (arr: ClawValue[], sep: string) => arr.join(sep),
      flat: (arr: ClawValue[], depth?: number) => arr.flat(depth),
      fill: (arr: ClawValue[], val: ClawValue, start?: number, end?: number) => arr.fill(val, start, end),
      every: (arr: ClawValue[], fn: (val: ClawValue) => ClawValue) => arr.every(fn),
      some: (arr: ClawValue[], fn: (val: ClawValue) => ClawValue) => arr.some(fn),
    });
    this.globals.set('JSON', {
      stringify: (val: ClawValue) => JSON.stringify(val),
      parse: (str: string) => {
        try {
          return JSON.parse(str);
        } catch {
          return null;
        }
      },
    });
    this.globals.set('Date', {
      now: () => Date.now(),
      parse: (str: string) => new Date(str).getTime(),
      format: (timestamp?: number) => {
        const d = timestamp ? new Date(timestamp) : new Date();
        return d.toISOString();
      },
      year: (timestamp?: number) => {
        const d = timestamp ? new Date(timestamp) : new Date();
        return d.getFullYear();
      },
      month: (timestamp?: number) => {
        const d = timestamp ? new Date(timestamp) : new Date();
        return d.getMonth() + 1;
      },
      day: (timestamp?: number) => {
        const d = timestamp ? new Date(timestamp) : new Date();
        return d.getDate();
      },
      hour: (timestamp?: number) => {
        const d = timestamp ? new Date(timestamp) : new Date();
        return d.getHours();
      },
      minute: (timestamp?: number) => {
        const d = timestamp ? new Date(timestamp) : new Date();
        return d.getMinutes();
      },
      second: (timestamp?: number) => {
        const d = timestamp ? new Date(timestamp) : new Date();
        return d.getSeconds();
      },
    });
    this.globals.set('Object', {
      assign: (target: ClawValue, ...sources: ClawValue[]) => {
        if (typeof target === 'object' && target !== null) {
          for (const src of sources) {
            if (typeof src === 'object' && src !== null) {
              Object.assign(target as object, src as object);
            }
          }
        }
        return target;
      },
      merge: (...objs: ClawValue[]) => {
        const result: Record<string, ClawValue> = {};
        for (const obj of objs) {
          if (typeof obj === 'object' && obj !== null) {
            Object.assign(result, obj as object);
          }
        }
        return result;
      },
      clone: (obj: ClawValue) => {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
      },
    });
  }

  private stringify(val: ClawValue): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'object') {
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  }

  getGlobals(): Record<string, ClawValue> {
    return Object.fromEntries(this.globals);
  }

  getScopeVariables(): Record<string, ClawValue> {
    const scopeVars: Record<string, ClawValue> = {};
    for (const scope of this.scope) {
      for (const [key, val] of scope) {
        if (!scopeVars.hasOwnProperty(key)) {
          scopeVars[key] = val;
        }
      }
    }
    return scopeVars;
  }

  registerAddon(definition: AddonDefinition): void {
    const addon = createAddonFromDefinition(definition, {
      allowNetwork: this.config.allowNetwork,
      allowFilesystem: this.config.allowFilesystem,
    });
    const addonValues = new Map<string, ClawValue>();
    const context = {
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
    addon.init(context);
    for (const [name, value] of addonValues) {
      this.globals.set(name, value);
    }
  }

  interpret(code: string): { success: boolean; result?: ClawValue; error?: string; logs?: string[] } {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalLog(...args);
    };

    try {
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const result = this.evaluate(ast);
      console.log = originalLog;
      return { success: true, result, logs };
    } catch (err) {
      console.log = originalLog;
      return { 
        success: false, 
        error: err instanceof Error ? err.message : String(err),
        logs 
      };
    }
  }

  private evaluate(node: ASTNode): ClawValue {
    switch (node.type) {
      case 'Program':
        let result: ClawValue = null;
        for (const stmt of node.body) {
          result = this.evaluate(stmt);
        }
        return result;
      case 'NumberLiteral':
        return node.value;
      case 'StringLiteral':
        return node.value;
      case 'BooleanLiteral':
        return node.value;
      case 'NullLiteral':
        return null;
      case 'ArrayLiteral':
        return node.elements.map(el => this.evaluate(el));
      case 'ObjectLiteral':
        const obj: Record<string, ClawValue> = {};
        for (const prop of node.properties) {
          obj[prop.key] = this.evaluate(prop.value);
        }
        return obj;
      case 'Identifier':
        for (let i = this.scope.length - 1; i >= 0; i--) {
          if (this.scope[i].has(node.name)) {
            return this.scope[i].get(node.name)!;
          }
        }
        throw new Error(`Undefined variable: ${node.name}`);
      case 'BinaryExpr': {
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);
        switch (node.operator) {
          case '+':
            if (typeof left === 'string' || typeof right === 'string') {
              return this.stringify(left) + this.stringify(right);
            }
            return (left as number) + (right as number);
          case '-': return (left as number) - (right as number);
          case '*': return (left as number) * (right as number);
          case '/': return (left as number) / (right as number);
          case '%': return (left as number) % (right as number);
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return (left as number) < (right as number);
          case '>': return (left as number) > (right as number);
          case '<=': return (left as number) <= (right as number);
          case '>=': return (left as number) >= (right as number);
          case 'in': {
            if (typeof right === 'object' && right !== null) {
              if (Array.isArray(right)) {
                return right.includes(left);
              }
              return String(left) in (right as Record<string, ClawValue>);
            }
            return false;
          }
          case 'of': {
            if (Array.isArray(right)) {
              return right.includes(left);
            }
            if (typeof right === 'object' && right !== null) {
              return Object.keys(right as Record<string, ClawValue>).includes(String(left));
            }
            return false;
          }
          default: throw new Error(`Unknown operator: ${node.operator}`);
        }
      }
      case 'UnaryExpr': {
        const arg = this.evaluate(node.argument);
        switch (node.operator) {
          case '-': return -(arg as number);
          case '!': return !arg;
          case '++':
            if (node.argument.type === 'Identifier') {
              const name = node.argument.name;
              for (let i = this.scope.length - 1; i >= 0; i--) {
                if (this.scope[i].has(name)) {
                  const val = this.scope[i].get(name)! as number;
                  this.scope[i].set(name, val + 1);
                  return val + 1;
                }
              }
            }
            throw new Error('Invalid increment operand');
          case '--':
            if (node.argument.type === 'Identifier') {
              const name = node.argument.name;
              for (let i = this.scope.length - 1; i >= 0; i--) {
                if (this.scope[i].has(name)) {
                  const val = this.scope[i].get(name)! as number;
                  this.scope[i].set(name, val - 1);
                  return val - 1;
                }
              }
            }
            throw new Error('Invalid decrement operand');
          default: throw new Error(`Unknown unary operator: ${node.operator}`);
        }
      }
      case 'LogicalExpr': {
        const left = this.evaluate(node.left);
        if (node.operator === '&&') {
          return left && this.evaluate(node.right);
        }
        return left || this.evaluate(node.right);
      }
      case 'CallExpr': {
        const callee = this.evaluate(node.callee);
        const args = node.arguments.map(arg => this.evaluate(arg));
        
        if (typeof callee === 'function') {
          return callee(...args);
        }
        
        if (typeof callee === 'object' && callee !== null) {
          const fnObj = callee as Record<string, ClawValue>;
          if ('name' in fnObj && 'params' in fnObj && 'body' in fnObj && 'closure' in fnObj) {
            const fn = fnObj as ClawFunction;
            const fnScope = new Map(fn.closure);
            for (let i = 0; i < fn.params.length; i++) {
              fnScope.set(fn.params[i], args[i]);
            }
            this.scope.push(fnScope);
            try {
              let result: ClawValue = null;
              for (const stmt of fn.body) {
                result = this.evaluate(stmt);
                if (result === 'BREAK' || result === 'CONTINUE') {
                  break;
                }
              }
              return result;
            } finally {
              this.scope.pop();
            }
          }
          
          const fn = fnObj[args[0] as string];
          if (typeof fn === 'function') {
            return fn(...args.slice(1));
          }
        }
        throw new Error('Not a function');
      }
      case 'MemberExpr': {
        const obj = this.evaluate(node.object);
        if (node.computed) {
          const prop = this.evaluate(node.property);
          if (Array.isArray(obj)) {
            const idx = prop as number;
            return obj[idx < 0 ? obj.length + idx : idx];
          }
          return (obj as Record<string, ClawValue>)[String(prop)];
        } else {
          const propName = (node.property as ASTNode & { name: string }).name;
          if (Array.isArray(obj)) {
            if (propName === 'length') return obj.length;
            const idx = parseInt(propName, 10);
            if (!isNaN(idx)) return obj[idx];
          }
          return (obj as Record<string, ClawValue>)[propName];
        }
      }
      case 'AssignmentExpr': {
        const right = this.evaluate(node.right);
        if (node.left.type === 'Identifier') {
          const name = node.left.name;
          if (node.operator === '=') {
            for (let i = this.scope.length - 1; i >= 0; i--) {
              if (this.scope[i].has(name)) {
                this.scope[i].set(name, right);
                return right;
              }
            }
            this.scope[this.scope.length - 1].set(name, right);
            return right;
          }
          for (let i = this.scope.length - 1; i >= 0; i--) {
            if (this.scope[i].has(name)) {
              const current = this.scope[i].get(name)!;
              let newVal: ClawValue;
              switch (node.operator) {
                case '+=': newVal = (current as number) + (right as number); break;
                case '-=': newVal = (current as number) - (right as number); break;
                case '*=': newVal = (current as number) * (right as number); break;
                case '/=': newVal = (current as number) / (right as number); break;
                default: throw new Error(`Unknown operator: ${node.operator}`);
              }
              this.scope[i].set(name, newVal);
              return newVal;
            }
          }
          throw new Error(`Undefined variable: ${name}`);
        }
        if (node.left.type === 'MemberExpr') {
          const obj = this.evaluate(node.left.object);
          let prop: string;
          if (node.left.computed) {
            prop = String(this.evaluate(node.left.property));
          } else {
            prop = ((node.left.property as ASTNode) as { name: string }).name;
          }
          if (typeof obj === 'object' && obj !== null) {
            (obj as Record<string, ClawValue>)[prop] = right;
            return right;
          }
          throw new Error('Cannot assign to non-object');
        }
        throw new Error('Invalid assignment target');
      }
      case 'VariableDecl': {
        const value = this.evaluate(node.init);
        this.scope[this.scope.length - 1].set(node.id, value);
        return value;
      }
      case 'BlockStmt': {
        let result: ClawValue = null;
        this.scope.push(new Map());
        try {
          for (const stmt of node.body) {
            result = this.evaluate(stmt);
          }
        } finally {
          this.scope.pop();
        }
        return result;
      }
      case 'IfStmt': {
        const test = this.evaluate(node.test);
        if (test) {
          return this.evaluate(node.consequent);
        }
        if (node.alternate) {
          return this.evaluate(node.alternate);
        }
        return null;
      }
      case 'WhileStmt': {
        let result: ClawValue = null;
        while (this.evaluate(node.test)) {
          result = this.evaluate(node.body);
        }
        return result;
      }
      case 'ForStmt': {
        let result: ClawValue = null;
        this.scope.push(new Map());
        try {
          if (node.init) this.evaluate(node.init);
          while (this.evaluate(node.test)) {
            result = this.evaluate(node.body);
            this.evaluate(node.update);
          }
        } finally {
          this.scope.pop();
        }
        return result;
      }
      case 'ReturnStmt': {
        if (node.argument) {
          return this.evaluate(node.argument);
        }
        return null;
      }
      case 'BreakStmt': {
        return 'BREAK';
      }
      case 'ContinueStmt': {
        return 'CONTINUE';
      }
      case 'ThrowStmt': {
        const errorValue = node.argument ? this.evaluate(node.argument) : null;
        throw new Error(String(errorValue));
      }
      case 'TryStmt': {
        try {
          this.evaluate(node.body);
        } catch (err) {
          if (node.catchBody) {
            this.scope.push(new Map());
            if (node.catchVar) {
              this.scope[this.scope.length - 1].set(node.catchVar, err instanceof Error ? err.message : String(err));
            }
            try {
              this.evaluate(node.catchBody);
            } finally {
              this.scope.pop();
            }
          }
        } finally {
          if (node.finallyBody) {
            this.evaluate(node.finallyBody);
          }
        }
        return null;
      }
      case 'FunctionDecl': {
        const fn: ClawFunction = {
          name: node.name,
          params: node.params,
          body: node.body,
          closure: new Map(this.scope[this.scope.length - 1]),
        };
        this.scope[this.scope.length - 1].set(node.name, fn);
        return fn;
      }
      default:
        throw new Error(`Unknown node type: ${(node as ASTNode).type}`);
    }
  }
}
