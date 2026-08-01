Topic: Source Code Index
Source: CashScript GitHub
Type: Implementation
Priority: Medium
Description: Index of key files across packages/cashc, packages/cashscript, packages/utils, and examples mapping file paths to roles.

---

# Source Code Index

Index of primary files across the CashScript monorepo mapping each file path to its architectural role.

## Compiler Package (`packages/cashc/`)

* [`packages/cashc/src/compiler.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashc/src/compiler.ts) → Programmatic entry point (`compileString`, `compileFile`).
* [`packages/cashc/src/cashc-cli.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashc/src/cashc-cli.ts) → Command-line interface tool (`cashc`).
* [`packages/cashc/src/Errors.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashc/src/Errors.ts) → Compiler error classes (`SyntaxError`, `TypeError`, `CashScriptError`).
* [`packages/cashc/src/ast/AstBuilder.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashc/src/ast/AstBuilder.ts) → Builds typed AST from ANTLR parse tree.
* [`packages/cashc/src/semantic/SymbolTableTraversal.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashc/src/semantic/SymbolTableTraversal.ts) → Identifier resolution and symbol scope validation.
* [`packages/cashc/src/semantic/TypeCheckTraversal.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashc/src/semantic/TypeCheckTraversal.ts) → Static type checking and casting validation.
* [`packages/cashc/src/generation/GenerateTargetTraversal.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashc/src/generation/GenerateTargetTraversal.ts) → Opcode generation and source map tagging.
* [`packages/cashc/src/grammar/CashScript.g4`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashc/src/grammar/CashScript.g4) → ANTLR4 formal grammar specification.

## SDK Package (`packages/cashscript/`)

* [`packages/cashscript/src/Contract.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashscript/src/Contract.ts) → Contract loading, address computation, and method mapping.
* [`packages/cashscript/src/TransactionBuilder.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashscript/src/TransactionBuilder.ts) → Fluent API for transaction building and broadcasting.
* [`packages/cashscript/src/SignatureTemplate.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashscript/src/SignatureTemplate.ts) → Key management and automated transaction signing.
* [`packages/cashscript/src/ElectrumNetworkProvider.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashscript/src/ElectrumNetworkProvider.ts) → Network provider connecting to Electrum / Fulcrum servers.
* [`packages/cashscript/src/MockNetworkProvider.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashscript/src/MockNetworkProvider.ts) → Offline simulated network provider for unit testing.
* [`packages/cashscript/src/Argument.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/cashscript/src/Argument.ts) → ABI argument encoding into bytecode values.

## Shared Utilities Package (`packages/utils/`)

* [`packages/utils/src/artifact.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/utils/src/artifact.ts) → JSON Artifact type definitions and ABI interfaces.
* [`packages/utils/src/script.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/utils/src/script.ts) → Low-level script manipulation and peephole optimization engine.
* [`packages/utils/src/optimisations.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/utils/src/optimisations.ts) → Algebraic bytecode optimization rules.
* [`packages/utils/src/source-map.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/utils/src/source-map.ts) → Source map location encoder/decoder.
* [`packages/utils/src/bitauth-script.ts`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/packages/utils/src/bitauth-script.ts) → BitAuth script generator for visual debugging.

## Reference Examples (`examples/`)

* [`examples/p2pkh.cash`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/examples/p2pkh.cash) → Standard Pay-to-Public-Key-Hash contract.
* [`examples/hodl_vault.cash`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/examples/hodl_vault.cash) → Oracle price-locked vault contract.
* [`examples/mecenas.cash`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/examples/mecenas.cash) → Recurring subscription covenant contract.
* [`examples/transfer_with_timeout.cash`](file:///d:/Space/Hackathon/BlockchainArmy/GITHUB.REPO/examples/transfer_with_timeout.cash) → Timelocked transfer with refund fallback.
