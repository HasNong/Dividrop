Topic: Repository Structure
Source: CashScript GitHub
Type: Implementation
Priority: High
Description: Overview of the CashScript monorepo directory layout, package organization, and module responsibilities.

---

# CashScript Monorepo Repository Structure

The CashScript codebase is structured as a **Yarn Workspaces + Lerna monorepo**, decoupling the compiler engine, client SDK, shared bytecode utilities, and end-to-end contract examples.

## High-Level Folder Layout

```
GITHUB.REPO/
├── packages/
│   ├── cashc/              # Standalone CashScript compiler & CLI
│   ├── cashscript/         # High-level TypeScript SDK for web/node applications
│   └── utils/              # Shared AST, bytecode optimization rules, & source map utilities
├── examples/               # End-to-end reference contracts (.cash) and TS spending scripts (.ts)
├── .github/                # GitHub Actions CI/CD workflows and issue templates
├── DEVELOPMENT.md          # Internal setup, build commands, and release protocols
├── AGENTS.md / CLAUDE.md   # Architectural guidelines for AI assistants & contributors
├── package.json            # Monorepo workspace configuration & root scripts
├── lerna.json              # Versioning & package publication config
└── vitest.config.ts        # Monorepo-wide test runner configuration
```

## Major Directory Purposes

### 1. `packages/cashc` (Compiler System)
* **Purpose**: Compiles `.cash` smart contract source files into standard `.json` (or `.ts`) artifact files.
* **Key Components**:
  * ANTLR4 grammar parser (`src/grammar/CashScript.g4`)
  * AST Builder & AST Traversal Visitors (`src/ast/`, `src/semantic/`)
  * Opcode code generator (`src/generation/`)
  * CLI executable (`src/cashc-cli.ts`)

### 2. `packages/cashscript` (Client SDK System)
* **Purpose**: High-level TypeScript library for frontend and backend applications to instantiate contracts, build transactions, sign inputs, and broadcast to BCH nodes.
* **Key Components**:
  * `Contract` class for loading artifacts and calculating addresses (`src/Contract.ts`)
  * `TransactionBuilder` fluent transaction construction engine (`src/TransactionBuilder.ts`)
  * Network providers (`ElectrumNetworkProvider`, `MockNetworkProvider`)
  * Key management & signature creation (`SignatureTemplate.ts`)

### 3. `packages/utils` (Shared Utilities)
* **Purpose**: Shared types, data structures, and script manipulators used by both compiler and SDK.
* **Key Components**:
  * JSON Artifact type definitions (`src/artifact.ts`)
  * Bytecode peephole optimization rules (`src/optimisations.ts`, `src/script.ts`)
  * Source map encoders/decoders (`src/source-map.ts`)
  * BitAuth human-readable script formatters (`src/bitauth-script.ts`)

### 4. `examples/` (Reference Applications)
* **Purpose**: Production-ready smart contract templates (`.cash`) paired with complete TypeScript execution scripts (`.ts`).
* **Key Examples**:
  * P2PKH standard payments
  * HodlVault price oracle contract
  * Mecenas recurring payment covenant
  * TransferWithTimeout time-locked payments
