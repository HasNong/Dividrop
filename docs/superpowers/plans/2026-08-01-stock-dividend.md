# Stock Dividend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Build a working Stock Dividend system with a CashScript minting vault that mints and distributes additional share tokens to shareholders when the company owner triggers a dividend.

**Architecture:** CashScript contract holds minting NFT (capability 0x02), verifies owner signature, mints new fungible tokens per shareholder allocation, returns minting NFT to self. Tests use MockNetworkProvider.

**Tech Stack:** CashScript ^0.13.0, TypeScript SDK, MockNetworkProvider, Node.js

## Global Constraints

- CashScript pragma ^0.13.0
- Node.js v22+ required
- Use MockNetworkProvider for all tests (no real BCH needed)
- Contracts compiled via cashc CLI
- ESM modules (CashScript is pure ESM)
- tokenCategory introspection returns `category + capability` — must split(32)

---

### Task 1: Initialize Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

**Interfaces:**
- Produces: npm project with cashscript dependency, ESM module config

- [ ] **Step 1: Create package.json**

```json
{
  "name": "stock-dividend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "compile": "cashc contract/StockDividendVault.cash --output contract/StockDividendVault.artifact.json",
    "test": "node --experimental-vm-modules node_modules/.bin/vitest run",
    "deploy": "npx tsx scripts/deploy.ts"
  },
  "devDependencies": {
    "cashc": "^0.13.0",
    "cashscript": "^0.13.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json
git commit -m "chore: scaffold project with cashscript dependencies"
```

---

### Task 2: Write the StockDividendVault CashScript Contract

**Files:**
- Create: `contract/StockDividendVault.cash`

**Interfaces:**
- Produces: `contract StockDividendVault(bytes20 companyOwner, bytes32 shareTokenId)` with function `distribute(pubkey pk, sig s, int totalMintAmount)`

- [ ] **Step 1: Create contract file**

The contract must:
1. Verify company owner signature (P2PKH style)
2. Verify vault UTXO is at input index 0 with minting NFT (capability 0x02)
3. Verify vault output (index 0) gets minting NFT back
4. Verify shareholder outputs (index 1..N) receive correct fungible token amounts summing to `totalMintAmount`
5. Cap max outputs to prevent unauthorized minting

```cashscript
pragma cashscript ^0.13.0;

// Minting Vault for Stock Dividends.
// Holds the minting NFT for the share token category.
// The company owner can trigger a stock dividend distribution,
// which mints new fungible tokens and sends them directly
// to shareholder wallet addresses in a single batch transaction.
contract StockDividendVault(
    bytes20 companyOwner,
    bytes32 shareTokenId
) {
    function distribute(
        pubkey pk,
        sig s
    ) {
        // Only the company owner can trigger distribution
        require(hash160(pk) == companyOwner);
        require(checkSig(s, pk));

        // Vault must be at input 0 with minting NFT
        require(this.activeInputIndex == 0);
        bytes32 category, bytes capability = tx.inputs[0].tokenCategory.split(32);
        require(category == shareTokenId);
        require(capability == 0x02);

        // Vault output (index 0) keeps the minting NFT
        require(tx.outputs[0].lockingBytecode == tx.inputs[0].lockingBytecode);
        require(tx.outputs[0].tokenCategory == tx.inputs[0].tokenCategory);
    }
}
```

- [ ] **Step 2: Compile contract**

Run: `npx cashc contract/StockDividendVault.cash --output contract/StockDividendVault.artifact.json`

- [ ] **Step 3: Commit**

```bash
git add contract/StockDividendVault.cash contract/StockDividendVault.artifact.json
git commit -m "feat: add StockDividendVault smart contract"
```

---

### Task 3: Write Tests with MockNetworkProvider

**Files:**
- Create: `test/StockDividendVault.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: `contract/StockDividendVault.artifact.json`
- Tests: owner can distribute, non-owner fails, minting NFT preserved, token amounts correct

- [ ] **Step 1: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 2: Write test file — "only owner can distribute"**

```typescript
import artifact from '../contract/StockDividendVault.artifact.json' with { type: 'json' };
import { Contract, MockNetworkProvider, SignatureTemplate, TransactionBuilder, randomUtxo, randomToken, randomNFT } from 'cashscript';
import { hash160, hexToBin, generatePrivateKey, instantiateSha256, encodeCashAddress, decodeCashAddress, Secp256k1 } from '@bitauth/libauth';
import { describe, it, expect, beforeAll } from 'vitest';
import 'cashscript/vitest';

// Helper: create a P2PKH address and keys
async function createWallet() {
  const sha256 = await instantiateSha256();
  const secp256k1 = new Secp256k1(sha256);
  const privKey = generatePrivateKey(() => secp256k1.generatePrivateKey());
  const pubKey = secp256k1.derivePublicKeyCompressed(privKey).slice(1); // strip prefix
  const pkh = hash160(pubKey);
  const address = encodeCashAddress('chipnet', 0, pkh); // P2PKH
  return { privKey, pubKey, pkh, address };
}

describe('StockDividendVault', () => {
  let provider: MockNetworkProvider;
  let contract: Contract;
  let ownerPubkey: Uint8Array;
  let ownerPrivKey: Uint8Array;
  let ownerPkh: Uint8Array;
  let ownerAddress: string;
  let shareTokenId: string;
  let vaultUtxo: any;

  beforeAll(async () => {
    const wallet = await createWallet();
    ownerPubkey = wallet.pubKey;
    ownerPrivKey = wallet.privKey;
    ownerPkh = wallet.pkh;
    ownerAddress = wallet.address;
  });
```

- [ ] **Step 3: Add test for successful distribution**

- [ ] **Step 4: Add test for unauthorized caller**

- [ ] **Step 5: Run tests and verify they pass**

Run: `npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add test/StockDividendVault.test.ts vitest.config.ts
git commit -m "test: add StockDividendVault tests"
```

---

### Task 4: Create Deploy Script

**Files:**
- Create: `scripts/deploy.ts`

Write a script that deploys the contract to chipnet (BCH testnet) using ElectrumNetworkProvider.

- [ ] **Step 1: Write deploy script**

- [ ] **Step 2: Verify script compiles**

Run: `npx tsx --no-warnings scripts/deploy.ts`

- [ ] **Step 3: Commit**

```bash
git add scripts/deploy.ts
git commit -m "feat: add deploy script for chipnet"
```
