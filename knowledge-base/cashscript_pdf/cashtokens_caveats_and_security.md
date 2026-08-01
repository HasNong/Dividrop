Topic: CashTokens Caveats & Security Rules
Source: CashScript PDF Refresher
Type: Constraints
Priority: High
Description: Security guidelines, bytecode introspection caveats, minting NFT attack vectors, endianness byte-ordering, and invisible NFT edge cases.

---

# CashTokens Caveats & Security Rules

When handling CashTokens inside CashScript smart contracts, developers must handle byte representation edge cases and covenant restrictions carefully.

## 1. Introspection Format of `tokenCategory`

The `tx.inputs[i].tokenCategory` and `tx.outputs[i].tokenCategory` introspection variables append capability bytes depending on token contents:

| UTXO Token Contents | `tokenCategory` Byte Representation | Byte Length |
| :--- | :--- | :--- |
| **Satoshis Only** | `0x` (empty byte string) | 0 bytes |
| **Fungible Tokens (FT)** | 32-byte Token ID | 32 bytes |
| **NFT (with capability)** | 32-byte Token ID + 1-byte Capability Flag | 33 bytes |

---

## 2. Extracting Category vs Capability in CashScript

To inspect an input's capability, split the 33-byte `tokenCategory` string:

```cashscript
// Extract category (32 bytes) and capability (1 byte)
bytes32 tokenCategory, bytes capability = tx.inputs[0].tokenCategory.split(32);

// Check that the input has the expected category and minting capability (0x02)
require(tokenCategory == expectedCategory);
require(capability == 0x02);

// Alternative direct concatenation check:
require(tx.inputs[0].tokenCategory == expectedCategory + 0x02);
```

---

## 3. Minting NFT Security Vector (Output Unconstrained Attack)

> [!CAUTION]
> If a smart contract accepts a **minting NFT** (`capability: 0x02`), the contract MUST explicitly account for ALL transaction outputs. If output counts are left unconstrained, an attacker can append extra outputs to mint unauthorized new NFTs or FTs.

### Defense Against Unauthorized Minting
```cashscript
// Explicitly check output limits to prevent extra minting outputs
require(tx.outputs.length <= 2, "Invalid number of outputs - extra minting outputs forbidden");

// Verify BCH change output carries no tokens
if (tx.outputs.length > 1) {
    require(tx.outputs[1].tokenCategory == 0x, "Change output must not contain tokens");
}
```

---

## 4. "Invisible" Empty NFTs Edge Case

An NFT with capability `none` (`0x00`) and an empty commitment (`0x`) does **not** append a capability byte to `tokenCategory`.

```cashscript
// CAUTION: Input 0 might carry an empty NFT alongside FTs without modifying tokenCategory!
require(tx.inputs[0].tokenCategory == expectedTokenId);
require(tx.inputs[0].tokenAmount == 10);
// Explicitly verify NFT commitment to prevent hidden NFT injection
require(tx.inputs[0].nftCommitment == 0x);
```

---

## 5. Endianness Byte-Ordering Mismatch

* **Contract Introspection**: Returns `tokenCategory` in **Little-Endian** byte order.
* **Block Explorers & Wallets**: Display token categories in **Big-Endian** hex strings.

### Client-Side Resolution
When passing a token ID hex string into a contract constructor or function argument from JavaScript/TypeScript, you MUST reverse the endianness:

```typescript
import { changeEndianness } from 'cashscript';

const contractParams = [
  funderAddress,
  changeEndianness(bigEndianTokenId), // Converts Big-Endian hex -> Little-Endian bytes
  adminPubKey
];
```
