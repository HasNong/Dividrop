Topic: SDK Transaction Builder & Execution Flow
Source: CashScript GitHub
Type: Implementation
Priority: High
Description: Detailed analysis of TransactionBuilder, function call argument resolution, fee calculation, and transaction execution flow.

---

# SDK Transaction Builder & Execution Flow

The `TransactionBuilder` class (`packages/cashscript/src/TransactionBuilder.ts`) provides a fluent API for assembling, signing, and broadcasting Bitcoin Cash transactions.

## Transaction Assembly Sequence

```
[New TransactionBuilder Instance]
       │
       ▼
1. Add Inputs (addInput / addInputs)
   └── Specify contract UTXO + contract unlock call (e.g. contract.unlock.spend(...))
       │
       ▼
2. Add Outputs (addOutput / addOutputs)
   └── Specify destination address, satoshi amount, and optional CashTokens payload
       │
       ▼
3. Configure Options & Fees (withFee / withLocktime)
       │
       ▼
4. Build & Sign (build())
   └── Resolve arguments, sign input templates, assemble raw transaction hex
       │
       ▼
5. Broadcast (send())
   └── Broadcast transaction hex to network provider & return transaction details
```

## Core Execution Mechanics

### 1. Function Argument Resolution (`Argument.ts`)
* **Role**: Converts high-level JavaScript values into raw byte arrays matching CashScript type expectations (`bytes`, `int`, `pubkey`, `sig`, `datasig`).
* **Handling**: Automatically encodes numbers into CashScript integer byte format (little-endian with sign bit), validates byte lengths, and processes signature templates.

### 2. Input Unlocking (`contract.unlock`)
* **Mechanism**: Calling `contract.unlock.functionName(...args)` generates an `Unlocker` object.
* **Execution**: During transaction building, the `Unlocker` executes script generation, putting function arguments onto the script stack followed by the function selector index.

### 3. Output Creation & CashTokens Support
* **Standard Outputs**: Configured with `to` (CashAddress string) and `amount` (bigint / number of satoshis).
* **Token Outputs**: Supports Fungible Token amounts (`ft.amount`) and Non-Fungible Tokens (`nft.capability`, `nft.commitment`).
* **OpReturn Outputs**: Added via `addOpReturnOutput(chunks)` to embed arbitrary data on-chain.

### 4. Automated Fee Calculation & UTXO Selection
* **Fee Calculation**: Automatically estimates transaction byte size based on inputs, outputs, and signatures, computing miner fees based on sat/byte rates.
* **Manual Overrides**: Toggled via `withHardcodedFee(satoshis)` or `withFeePerByte(rate)`.
