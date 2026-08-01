Topic: CashTokens Fundamentals
Source: CashScript PDF Refresher
Type: Learning
Priority: High
Description: Explanation of CashTokens protocol, Fungible Tokens (FT), Non-Fungible Tokens (NFT), token commitments, capabilities, genesis transactions, and BCMR metadata.

---

# CashTokens Fundamentals

CashTokens (CT) are native digital assets created and managed on the Bitcoin Cash network without requiring virtual machine execution or smart contract deployments.

## 1. Types of CashTokens

CashTokens are stored directly within UTXOs and fall into two primary categories:

### A. Fungible Tokens (FT)
Tokens where every unit is identical and interchangeable.
* **Fields**:
  * `amount`: BigInt representing token quantity.
  * `category`: 32-byte hex string representing the unique Token ID.

### B. Non-Fungible Tokens (NFT)
Unique digital assets containing custom state data or capabilities.
* **Fields**:
  * `category`: Token ID.
  * `commitment`: Arbitrary data payload stored inside the token (up to 40 bytes).
  * `capability`: NFT authority level controlling token mutation and minting.

#### NFT Capability Types
| Capability | Hex Byte | Behavior |
| :--- | :--- | :--- |
| **`none`** | `0x00` | **Immutable NFT**: The commitment payload cannot be modified. |
| **`mutable`** | `0x01` | **Mutable NFT**: The commitment payload (and capability) can be updated in downstream transactions. |
| **`minting`** | `0x02` | **Minting NFT**: Authorized to mint new FTs or NFTs within the same token category. |

---

## 2. CashToken UTXO Data Structure

```typescript
interface CashTokenUtxo {
  txid: string;
  vout: number;
  satoshis: bigint;
  token?: {
    amount: bigint;
    category: string;
    nft?: {
      capability: "none" | "mutable" | "minting";
      commitment: string; // Up to 40 bytes hex payload
    };
  };
}
```

---

## 3. CashTokens Genesis Transaction

A Genesis transaction creates a brand new category of CashTokens on Bitcoin Cash.

* **Requirement**: The transaction must spend a UTXO with output index **`vout: 0`**.
* **Token Category ID**: The `txid` of the `vout: 0` UTXO being spent permanently becomes the 32-byte `category` (Token ID) for all tokens issued in that category.

---

## 4. Bitcoin Cash Metadata Registry (BCMR)

BCMR is an authenticated JSON standard for publishing user-facing token metadata (such as name, icon, symbol, decimals, and description).

### Example BCMR Token Metadata
```json
{
  "name": "Paytaca LIFT Token",
  "description": "The LIFT token (Leveraging Incentives for Financial Transactions)",
  "token": {
    "symbol": "LIFT",
    "category": "5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc",
    "decimals": 2
  },
  "uris": {
    "web": "https://www.paytaca.com/token",
    "icon": "ipfs://bafybeictwoxb4ma2ywxl545dhuvqqufiwyhacvauygc"
  }
}
```

### Useful Token Tools
* **BCMR Token Explorer**: `https://tokenexplorer.cash`
* **BCMR Metadata Indexer**: `https://bcmr.paytaca.com`
* **No-Code Creation Studio**: `https://cashtokens.studio`
