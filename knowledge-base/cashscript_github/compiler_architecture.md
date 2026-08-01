Topic: Compiler Architecture & Core Modules
Source: CashScript GitHub
Type: Implementation
Priority: High
Description: Architecture overview of packages/cashc/src/ including compiler.ts, cashc-cli.ts, Errors.ts, and utils.ts.

---

# Compiler Architecture & Core Modules

The `packages/cashc` package houses the CashScript compiler engine and command-line execution entry points.

## Core Module Analysis (`packages/cashc/src/`)

### 1. `compiler.ts` (Main API Entry Point)
* **Role**: Primary API export for compiling CashScript code programmatically.
* **Key Functions**:
  * `compileString(code: string, options?: CompileOptions): Artifact`: Compiles in-memory string source code into a completed `Artifact` object.
  * `compileFile(filePath: string, options?: CompileOptions): Artifact`: Reads `.cash` source from disk and delegates to `compileString`.
* **Configuration**: Accepts `CompilerOptions` to toggle parameters (e.g. `enforceFunctionParameterTypes`, `enforceLocktimeGuard`).

### 2. `cashc-cli.ts` (Command Line Interface)
* **Role**: CLI binary executable (`cashc`) built with Commander.js.
* **Key Features**:
  * Input argument parsing (`<source_file>`)
  * Flag options:
    * `-o, --output`: Output file destination (`.json` or `.ts`).
    * `-f, --format`: Output format selector (`json` | `ts`).
    * `-h, --hex`: Output raw compiled bytecode in hexadecimal format.
    * `-A, --asm`: Output compiled bytecode in readable Assembly (ASM) format.
    * `-c, --opcount`: Output compiled bytecode opcode count.
    * `-s, --size`: Output compiled bytecode size in bytes.
* **CLI Output**: Compiles source code, handles errors gracefully, and writes output files or prints metrics to stdout.

### 3. `Errors.ts` (Error Hierarchy & Reporting)
* **Role**: Strongly-typed compiler error classes for reporting syntax, type, and semantic violations.
* **Key Error Classes**:
  * `CashScriptError`: Base class containing error messages, line numbers, column numbers, and source context snippets.
  * `SyntaxError`: Thrown on syntax or grammatical invalidity.
  * `ParseError`: Thrown on parsing failures.
  * `TypeError`: Thrown on illegal type assignments or operation type mismatches.
  * `RedeclarationError`: Thrown when a variable or parameter is declared twice in the same scope.
  * `UndefinedReferenceError`: Thrown when referencing undeclared variables or methods.

### 4. `utils.ts` (Compiler Helper Utilities)
* **Role**: Helper functions supporting string manipulation, formatting, and file path processing within the compiler.
