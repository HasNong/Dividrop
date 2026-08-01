Topic: Development & Build Workflow
Source: CashScript GitHub
Type: Implementation
Priority: Medium
Description: Comprehensive guide to the build process, test suites, package scripts, and development workflow.

---

# Development & Build Workflow

The CashScript monorepo uses Yarn Workspaces and Lerna to manage cross-package dependencies and build artifact outputs.

## Build Pipeline

### Root Commands (`package.json`)
* **`yarn`**: Installs dependencies across all workspace packages and runs Lerna bootstrap.
* **`yarn build`**: Compiles TypeScript files across all packages (`packages/utils`, `packages/cashc`, `packages/cashscript`).
* **`yarn lint`**: Runs ESLint across all packages to enforce code style.
* **`yarn spellcheck`**: Runs cspell spelling checks across the repository.

### Cross-Package Build Propagation
Because `cashscript` and `cashc` depend on `@cashscript/utils`, modifying code in `packages/utils` requires running `yarn build` at the root directory so updated declaration files and JS outputs propagate to dependent packages.

## Test Workflow

### Running Unit & End-to-End Tests
* **`yarn test`**: Executes test suites across all packages using Vitest.
* **`yarn vitest run <file>`**: Runs a single test file directly.
* **`yarn test -t '<pattern>'`**: Runs specific tests matching a string pattern in `describe` / `it` blocks.

### Network Testing Modes
* **Local Simulated Network (`mocknet`)**: Default test runner mode using `MockNetworkProvider` for fast, offline unit testing.
* **Live Chipnet Testnet**: Set `TESTS_USE_CHIPNET=true yarn test` to execute end-to-end integration tests against the live Bitcoin Cash Chipnet testnet.

## ANTLR Grammar Generation
When modifying the parser grammar file in `packages/cashc/src/grammar/CashScript.g4`:
```bash
cd packages/cashc
yarn antlr
```
This regenerates `CashScriptLexer.ts`, `CashScriptParser.ts`, and associated visitor tokens.
