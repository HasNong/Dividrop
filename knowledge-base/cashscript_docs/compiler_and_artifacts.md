Topic: CashScript Compiler & Artifact Specification
Source: CashScript Website
Type: Documentation
Priority: Medium
Description: Covers the cashc command line compiler tool, compilation targets, JSON artifact schema, ABI representation, and bytecode generation.

---

The CashScript compiler is called `cashc` and is used to compile CashScript `.cash` contract files into `.json` (or `.ts`) artifact files.
These artifact files can be used to instantiate a CashScript contract with the help of the CashScript SDK. For more information on this artifact format refer to [Artifacts](compiler_and_artifacts.md).

> [!NOTE]
> Because of the separation of the compiler and the SDK, CashScript contracts can be integrated into other programming languages in the future.

## Command Line Interface

The `cashc` command line interface is used to compile CashScript `.cash` files into `.json` (or `.ts`) artifact files.

### Installation

You can use `npm` to install the `cashc` command line tool globally.

```bash
npm install -g cashc
```

### CLI Usage

The `cashc` CLI tool can be used to compile `.cash` files to JSON (or `.ts`) artifact files.

```bash
Usage: cashc [options] <source_file>

Arguments:
  source_file                                  The source file to compile.

Options:
  -V, --version                                Output the version number.
  -o, --output <path>                          Specify a file to output the generated artifact.
  -h, --hex                                    Compile the contract to hex format rather than a full artifact.
  -A, --asm                                    Compile the contract to ASM format rather than a full artifact.
  -c, --opcount                                Display the number of opcodes in the compiled bytecode.
  -s, --size                                   Display the size in bytes of the compiled bytecode.
  -S, --skip-enforce-function-parameter-types  Do not enforce function parameter types.
  -L, --skip-enforce-locktime-guard            Do not inject a tx.time guard when tx.locktime is used.
  -f, --format <format>                        Specify the format of the output. (choices: "json", "ts", default: "json")
  -?, --help                                   Display help
```

> [!TIP]
> To have the best TypeScript integration, we recommend generating the artifact in the `.ts` format and importing it into your TypeScript project from that `.ts` file.

#### Example

```bash
cashc ./Contract.cash --output ./artifact.ts --format ts
```

```bash
cashc ./Contract.cash --size --opcount
```

> [!NOTE]
> The size outputs of the `cashc` compiler are based on the bytecode without constructor arguments. This means they are always an underestimate, as the contract hasn't been initialized with contract arguments.

## JavaScript Compilation

Generally CashScript contracts are compiled to an Artifact JSON file using the CLI compiler. As an alternative to this, CashScript contracts can be compiled from within JavaScript apps using the `cashc` package. This package exports two compilation functions.

```bash
npm install cashc
```

### compileFile()

```typescript
compileFile(sourceFile: PathLike, compilerOptions?: CompilerOptions): Artifact
```

Compiles a CashScript contract from a source file. This compile method is handy when using Node.js with the contract source file available but you are doing quick compilations (for example for contract size comparisons) and you don't need the contract artifact file to be generated.

> [!NOTE]
> `compileFile()` only works from a Node.js context because it uses the file-system so it's not available in browser setting.

#### Example

```typescript
const P2PKH = compileFile(new URL('p2pkh.cash', import.meta.url));
```

### compileString()

```typescript
compileString(sourceCode: string, compilerOptions?: CompilerOptions): Artifact
```

Compiles a CashScript contract from a source code string. This compile method is handy in a browser compilation setting like the [CashScript Playground](https://playground.cashscript.org/) where testing contracts can be quickly compiled and discarded. The method is also useful if no source file is locally available (e.g. the source code is retrieved with a REST API).

```typescript
const baseUrl = 'https://raw.githubusercontent.com/CashScript/cashscript'
const result = await fetch(`${baseUrl}/master/examples/p2pkh.cash`);
const source = await result.text();

const P2PKH = compileString(source);
```

### Compiler Options

```typescript
interface CompilerOptions {
  enforceFunctionParameterTypes?: boolean;
  enforceLocktimeGuard?: boolean;
}
```

#### enforceFunctionParameterTypes

The `enforceFunctionParameterTypes` option is used to enforce function parameter types, such as byte length of `bytes20` or `bytes32` types and `bool` values. By default, it is set to `true`.

If set to `false`, the compiler will not enforce function parameter types. This means that it is possible for `bytes20` values to have a different length at runtime than the expected 20 bytes. Or that `bool` values are not actually booleans, but integers.

This option is useful if you are certain that passing in incorrect function parameter types will not cause runtime vulnerabilities, and you want to save on the extra opcodes that are added to the script to enforce the types.

#### enforceLocktimeGuard

The `enforceLocktimeGuard` option controls whether the compiler injects a `require(tx.time >= tx.locktime)` check when `tx.locktime` is used in a function without a `require(tx.time >= ...)` (or in some cases, `require(this.age >= ...)`) check already in scope. By default, it is set to `true`.

If set to `false`, the compiler will not inject this guard. Without a guard, the value of `tx.locktime` is not guaranteed to be enforced by the network, which makes any comparison against `tx.locktime` meaningless and can bypass time-based restrictions in the contract.

---

Compiled contracts can be represented by so-called artifacts. These artifacts contain all information that is needed to interact with the smart contracts on-chain. Artifacts are stored in `.json` (or `.ts`) files so they can be shared and stored for later usage without having to recompile the contract.

> [!TIP]
> Artifacts allow any third-party SDKs to be developed, since these SDKs only need to import and use an artifact file, while the compilation of the contract is left to the official `cashc` compiler.

## Artifact specification

```typescript
interface Artifact {
  contractName: string // Contract name
  constructorInputs: AbiInput[] // Arguments required to instantiate a contract
  abi: AbiFunction[] // functions that can be called
  bytecode: string // Compiled Script without constructor parameters added (in ASM format)
  source: string // Source code of the CashScript contract
  compiler: {
    name: string // Compiler used to compile this contract
    version: string // Compiler version used to compile this contract
    options?: CompilerOptions // Compiler options used to compile this contract
  }
  debug?: {
    bytecode: string // unlike `bytecode` property above, this is a hex-encoded binary string
    sourceMap: string // see documentation for `generateSourceMap`
    logs: LogEntry[] // log entries generated from `console.log` statements
    requires: RequireStatement[] // messages for failing `require` statements
    sourceTags?: string // semantic tags for opcodes (e.g. loop update/condition ranges)
  }
  updatedAt: string // Last datetime this artifact was updated (in ISO format)
  fingerprint?: string // SHA256 of the normalized bytecode pattern (BCH bytecode fingerprinting standard)
}

interface AbiInput {
  name: string // Input name
  type: string // Input type (see language documentation)
}

interface AbiFunction {
  name: string // Function name
  inputs: AbiInput[] // Function inputs / parameters
}

interface LogEntry {
  ip: number; // instruction pointer
  line: number; // line in the source code
  data: Array<StackItem | string>; // data to be logged
}

interface StackItem {
  type: string; // Type of the variable
  stackIndex: number; // Index of the variable on the stack
  ip: number; // Instruction pointer at which we can access the logged variable
  transformations?: string; // Transformations needed to obtain the logged item
}

interface RequireStatement {
  ip: number; // instruction pointer
  line: number; // line in the source code
  message?: string; // custom message for failing `require` statement
}

interface CompilerOptions {
  enforceFunctionParameterTypes?: boolean; // Enforce function parameter types (default: true)
  enforceLocktimeGuard?: boolean; // Enforce the tx.locktime guard (default: true)
}
```