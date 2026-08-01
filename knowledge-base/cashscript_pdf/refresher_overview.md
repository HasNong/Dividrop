Topic: Bitcoin Cash & CashScript Overview
Source: CashScript PDF Refresher
Type: Learning
Priority: High
Description: Introduction to Bitcoin Cash wallet basics, UTXO model, transaction anatomy, address formats, and transaction lifecycles.

---

# Bitcoin Cash & CashScript Overview

Bitcoin Cash (BCH) utilizes a stateless Unspent Transaction Output (UTXO) architecture for value transfer and smart contract execution. CashScript is a high-level programming language that compiles human-readable smart contracts into native Bitcoin Script bytecode.

## 1. Bitcoin Cash Wallet & Address Basics

A Bitcoin Cash address is derived from public keys or script hashes and formatted using the CashAddress specification (`bitcoincash:` prefix).

### Address Encoding Formats
* **Standard BCH Address (`p2pkh` / `p2sh`)**: Starts with `bitcoincash:q...` (e.g., `bitcoincash:qryskvwcxe3gx7j5knkxaza0hgncm0whlcuzpcrg`).
* **CashToken-Capable Address**: Starts with `bitcoincash:z...` (e.g., `bitcoincash:zryskvwcxe3gx7j5knkxaza0hgncm0whlcmgjxdww`).

---

## 2. Anatomy of a Bitcoin Cash Transaction

A transaction moves satoshis and tokens between digital wallets by consuming existing UTXOs as **inputs** and creating new spendable UTXOs as **outputs**.

```
                   +----------------------------------+
                   |     BITCOIN CASH TRANSACTION     |
                   +----------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
  [TRANSACTION INPUTS]                               [TRANSACTION OUTPUTS]
  * Source of funds being spent                      * Destination addresses & satoshi amounts
  * References previous UTXO (txid + vout)           * Target locking scripts (P2PKH / P2SH)
  * Contains unlocking script (signatures, args)     * Miner fee (difference between inputs & outputs)
```

### Example Transaction Balance Sheet
* **Input 1**: 1,000,000 sats from Address A (Unlocking Script + Locking Script)
* **Input 2**: 500,000 sats from Address A (Unlocking Script + Locking Script)
* **Input 3**: 2,000,000 sats from Address B (Unlocking Script + Locking Script)
* **Total Inputs**: 3,500,000 sats
* **Output 1**: 3,000,000 sats to Address B (Locking Script)
* **Output 2**: 499,000 sats to Address C (Change output)
* **Miner Fee**: 1,000 sats
* **Total Outputs + Fee**: 3,500,000 sats

---

## 3. Transaction Lifecycle

1. **Unconfirmed (Mempool)**: The signed transaction is broadcast to the network nodes and waits in the local memory pool (`mempool`).
2. **Confirmed (Block Inclusion)**: A miner includes the transaction in a valid block. Once mined, the transaction achieves 1 or more block confirmations recorded permanently on the blockchain.

---

## 4. UTXO (Unspent Transaction Output) Structure

A UTXO represents spendable funds locked at a specific output index of a previous transaction.

### JavaScript UTXO Data Schema
```typescript
interface Utxo {
  txid: string;      // Transaction hash ID (32 bytes hex)
  vout: number;      // Output index in previous transaction
  satoshis: bigint;  // Value in satoshis (1 BCH = 100,000,000 satoshis)
  token?: {          // Optional CashToken payload
    amount: bigint;
    category: string;
  };
}
```

### JSON Data Example
```json
{
  "txid": "4d5e1bbf1b8d7690d30a9d8eb3b51b9155902d88534b115f6b82862c8b",
  "vout": 0,
  "satoshis": 1000,
  "token": null
}
```

---

## 5. Blockchain Explorers & Tools
* **Mainnet Block Explorer**: `https://bchexplorer.info`
* **Chipnet Testnet Explorer**: `https://chipnet.bchexplorer.info`
* **CashScript Playground**: `https://playground.cashscript.org`
