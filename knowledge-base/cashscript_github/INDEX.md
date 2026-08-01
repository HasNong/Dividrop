Topic: CashScript GitHub Knowledge Base Index
Source: CashScript GitHub
Type: Index / Navigation
Priority: High
Description: Complete index and navigation map for the CashScript GitHub codebase knowledge base in /cashscript_github/.

---

# CashScript GitHub Codebase Knowledge Base Index

This directory (`/cashscript_github/`) provides structured, high-level, AI-friendly architectural documentation for the CashScript open-source codebase (`GITHUB.REPO/`).

## Knowledge Base Navigation Map

| Document | Topic | Priority | Description |
| :--- | :--- | :--- | :--- |
| [`repo_structure.md`](repo_structure.md) | **Repository Structure** | `High` | High-level monorepo directory layout and package responsibilities. |
| [`compiler_pipeline.md`](compiler_pipeline.md) | **Compiler Pipeline** | `High` | Step-by-step compilation sequence from lexing to artifact output. |
| [`compiler_architecture.md`](compiler_architecture.md) | **Compiler Architecture** | `High` | Analysis of `compiler.ts`, `cashc-cli.ts`, `Errors.ts`, and compiler modules. |
| [`sdk_core_classes.md`](sdk_core_classes.md) | **SDK Core Classes** | `High` | Analysis of `Contract`, network providers, and `SignatureTemplate`. |
| [`sdk_transaction_flow.md`](sdk_transaction_flow.md) | **SDK Transaction Flow** | `High` | `TransactionBuilder` execution, input/output assembly, and argument encoding. |
| [`contract_patterns.md`](contract_patterns.md) | **Smart Contract Patterns** | `High` | Architectural patterns extracted from reference contracts (Mecenas, Vault, P2PKH). |
| [`example_walkthroughs.md`](example_walkthroughs.md) | **Example Walkthroughs** | `High` | End-to-end integration walkthroughs linking `.cash` contracts with `.ts` SDK scripts. |
| [`dev_workflow.md`](dev_workflow.md) | **Development Workflow** | `Medium` | Build setup, testing execution, Vitest runner, and package scripts. |
| [`code_index.md`](code_index.md) | **Source Code Index** | `Medium` | Comprehensive index mapping core files across all packages to their roles. |
