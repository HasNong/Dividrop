Topic: SDK Core Classes & Abstractions
Source: CashScript GitHub
Type: Implementation
Priority: High
Description: Analysis of the CashScript SDK core classes in packages/cashscript/src/ including Contract, NetworkProviders, and SignatureTemplate.

---

# SDK Core Classes & Abstractions

The `packages/cashscript` package provides high-level JavaScript/TypeScript primitives for instantiating smart contracts and interacting with Bitcoin Cash nodes.

## Core Abstractions (`packages/cashscript/src/`)

### 1. `Contract` Class (`Contract.ts`)
* **Role**: Main entry point for interacting with a compiled CashScript contract.
* **Key Responsibilities**:
  * **Instantiation**: Receives a compiled `Artifact`, constructor arguments, and network provider options.
  * **Address Derivation**: Automatically calculates contract bytecode, redeem script, P2SH address, and CashAddress representation.
  * **Unlock Object Mapping**: Dynamically maps ABI function definitions from the artifact into callable unlock functions (`contract.unlock.<functionName>(...args)`).
  * **UTXO Retrieval**: Provides `getUtxos()` to fetch active UTXOs locked under the contract address.
  * **Balance Queries**: Provides `getBalance()` to inspect total satoshis held by the contract.

### 2. Network Providers (`NetworkProvider.ts`, `ElectrumNetworkProvider.ts`, `MockNetworkProvider.ts`)
* **Role**: Interface abstraction for interacting with the Bitcoin Cash blockchain.
* **Implementations**:
  * `ElectrumNetworkProvider`: Connects to live Fulcrum / Electrum Cash servers (Mainnet / Chipnet) to fetch UTXOs, query raw transaction hexes, and broadcast signed transactions.
  * `MockNetworkProvider`: In-memory simulated network provider for fast, deterministic, off-chain unit tests without external node dependencies.

### 3. `SignatureTemplate` Class (`SignatureTemplate.ts`)
* **Role**: Key management and automated transaction signing abstraction.
* **Key Features**:
  * Accepts private keys (hex, Uint8Array, WIF) or ECPair objects.
  * Supports custom hashtype configurations (`hashtype` flags like `SIGHASH_ALL`, `SIGHASH_SINGLE`, `SIGHASH_ANYONECANPAY`).
  * Generates ECDSA or Schnorr signatures during transaction evaluation.
