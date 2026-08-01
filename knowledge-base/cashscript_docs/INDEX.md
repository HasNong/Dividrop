Topic: CashScript Knowledge Base Index
Source: CashScript Website
Type: Index / Navigation
Priority: High
Description: Overview and index of all CashScript documentation topics, usage categories, and AI ingestion map.

---

# CashScript AI-Friendly Knowledge Base Index

Welcome to the CashScript AI-Friendly Knowledge Base. This repository provides clean, structured, modular, and uncompressed technical documentation for CashScript smart contract development on Bitcoin Cash.

## Recommended Usage Pathways

- **Writing CashScript Contracts**:
  1. [`getting_started.md`](getting_started.md) - Language introduction & installation.
  2. [`contract_structure.md`](contract_structure.md) - Syntax, pragmas, functions, assertions.
  3. [`types_and_operators.md`](types_and_operators.md) - Data types, casting rules, bitwise and arithmetic operations.
  4. [`global_functions.md`](global_functions.md) - Built-in crypto and math functions.
  5. [`global_variables_introspection.md`](global_variables_introspection.md) - Transaction inspection (`tx.inputs`, `tx.outputs`, `tx.version`).
  6. [`covenants_guide.md`](covenants_guide.md) & [`cashtokens_guide.md`](cashtokens_guide.md) - Advanced covenants & token creation.

- **Integrating with Frontends / SDKs**:
  1. [`typescript_sdk_instantiation.md`](typescript_sdk_instantiation.md) - Connecting contracts to JS/TS.
  2. [`typescript_sdk_transaction_builder.md`](typescript_sdk_transaction_builder.md) - Building and broadcasting transactions.
  3. [`sdk_network_providers.md`](sdk_network_providers.md) - Electrum, Chaingraph & RPC providers.
  4. [`sdk_testing.md`](sdk_testing.md) - Off-chain mock testing with Jest/Mocha.

- **Security & Debugging**:
  1. [`security_and_debugging.md`](security_and_debugging.md) - Adversarial vectors (UTXO pinning, front-running) & Bitauth IDE.
  2. [`concurrency_and_optimization.md`](concurrency_and_optimization.md) - Solving UTXO contention & reducing byte size.

---

## Complete Topic Directory

| Topic | File | Priority | Description |
| :--- | :--- | :--- | :--- |
| **CashTokens Development Guide** | [`cashtokens_guide.md`](cashtokens_guide.md) | `High` | Complete guide to working with Fungible and Non-Fungible Tokens (CashTokens) on Bitcoin Cash, token commitments, categories, and minting capability. |
| **CashScript Contract Examples** | [`contract_examples.md`](contract_examples.md) | `High` | Annotated real-world CashScript contract examples including P2PKH, TransferWithTimeout, Mecenas recurring payments, and Licho's Auction. |
| **Contract Structure & Syntax** | [`contract_structure.md`](contract_structure.md) | `High` | Details CashScript contract architecture, compiler pragmas, constructors, parameters, function definitions, state assertions (require), and control flow. |
| **Bitcoin Cash Covenants Guide** | [`covenants_guide.md`](covenants_guide.md) | `High` | Comprehensive tutorial on writing covenants in CashScript, enforcing transaction output conditions, and creating stateful smart contracts. |
| **Getting Started & Installation** | [`getting_started.md`](getting_started.md) | `High` | Comprehensive guide to CashScript, including installation, setting up a CashScript project, writing contracts, and deploying your first smart contract on Bitcoin Cash. |
| **Built-in Global Functions** | [`global_functions.md`](global_functions.md) | `High` | Documentation for built-in cryptographic functions (checkSig, checkMultiSig, checkDataSig, hash160, sha256) and mathematical utility functions. |
| **Global Variables & Transaction Introspection** | [`global_variables_introspection.md`](global_variables_introspection.md) | `High` | Complete guide to CashScript global transaction inspection variables (tx.inputs, tx.outputs, tx.version, tx.locktime) and evaluation context. |
| **TypeScript SDK Code Examples** | [`sdk_code_examples.md`](sdk_code_examples.md) | `High` | Full end-to-end TypeScript examples demonstrating deployment, transaction building, token transfers, and contract spending logic. |
| **Contract Testing with MockNetworkProvider** | [`sdk_testing.md`](sdk_testing.md) | `High` | Best practices for unit testing CashScript contracts off-chain using MockNetworkProvider and popular testing frameworks like Jest or Mocha. |
| **Contract Security, Adversarial Patterns & Debugging** | [`security_and_debugging.md`](security_and_debugging.md) | `High` | Security audit guidelines covering front-running, UTXO pinning, re-entrancy, and malleability, plus debugging tools and Bitauth IDE inspection. |
| **Data Types & Operators** | [`types_and_operators.md`](types_and_operators.md) | `High` | Reference for all primitive and complex CashScript types (int, bool, string, bytes, pubkey, sig, datasig), type casting rules, and operators. |
| **TypeScript SDK Installation & Contract Instantiation** | [`typescript_sdk_instantiation.md`](typescript_sdk_instantiation.md) | `High` | Overview of the CashScript TypeScript SDK, contract instantiation, passing constructor arguments, loading artifacts, and retrieving contract addresses. |
| **SDK Transaction Builder & Function Invocation** | [`typescript_sdk_transaction_builder.md`](typescript_sdk_transaction_builder.md) | `High` | Guide to building transactions with the CashScript SDK, calling contract functions, adding transaction outputs, configuring fees, and spending UTXOs. |
| **Bitcoin Cash Smart Contract Fundamentals** | [`bitcoin_cash_basics.md`](bitcoin_cash_basics.md) | `Medium` | Explains the Bitcoin Cash (BCH) UTXO model, smart contract execution model, Script capabilities, and differences from EVM account-based blockchains. |
| **CashScript Compiler & Artifact Specification** | [`compiler_and_artifacts.md`](compiler_and_artifacts.md) | `Medium` | Covers the cashc command line compiler tool, compilation targets, JSON artifact schema, ABI representation, and bytecode generation. |
| **CashScript Language Grammar & Script Limits** | [`compiler_grammar_and_limits.md`](compiler_grammar_and_limits.md) | `Medium` | Formal ANTLR grammar specification for CashScript syntax alongside Bitcoin Cash consensus script limits (stack limits, byte sizes, opcodes). |
| **UTXO Concurrency & Bytecode Optimization** | [`concurrency_and_optimization.md`](concurrency_and_optimization.md) | `Medium` | Strategies for handling UTXO contention in multi-user smart contracts and techniques for optimizing CashScript contract size and execution efficiency. |
| **Contract Deployment, Lifecycle & Wallet Integration** | [`deployment_lifecycle_and_integrations.md`](deployment_lifecycle_and_integrations.md) | `Medium` | Instructions for deploying to Mainnet and Chipnet, managing contract lifecycles, setting up infrastructure nodes, and connecting to dApp wallets via WalletConnect. |
| **CashScript Python SDK** | [`python_sdk.md`](python_sdk.md) | `Medium` | Guide to using the community CashScript Python SDK for compiling contracts, instantiating contract instances, and executing transactions. |
| **Network Providers & Chain Communication** | [`sdk_network_providers.md`](sdk_network_providers.md) | `Medium` | Detailed explanation of network providers in CashScript SDK, including ElectrumNetworkProvider, custom providers, and Chaingraph integration. |
| **Signature Templates & Transaction Utilities** | [`sdk_signature_templates_and_utilities.md`](sdk_signature_templates_and_utilities.md) | `Medium` | Using SignatureTemplate for key management and automated transaction signing, alongside SDK unit and fee conversion helper functions. |
| **CashScript Release Notes & Migration Guides** | [`release_notes_and_migrations.md`](release_notes_and_migrations.md) | `Low` | Historical release changelogs and breaking change migration guides for CashScript language and SDK version upgrades. |
| **CashScript Ecosystem, Syntax Highlighting & Showcase** | [`showcase_and_ecosystem.md`](showcase_and_ecosystem.md) | `Low` | Overview of the CashScript ecosystem, IDE extension support (VSCode), featured applications built with CashScript, and community supporters. |
