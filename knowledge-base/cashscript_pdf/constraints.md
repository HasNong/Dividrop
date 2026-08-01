Topic: System & Protocol Constraints
Source: CashScript PDF Refresher
Type: Constraints
Priority: Medium
Description: Resource limits, Script limits, max payload sizes, and execution bounds for CashScript smart contracts.

---

# System & Protocol Constraints

Smart contract execution on Bitcoin Cash operates within strict protocol and virtual machine boundaries.

## Key Protocol Constraints

### 1. NFT Commitment Payload Limit
* **Limit**: Maximum **40 bytes** per NFT commitment payload.
* **Usage**: Storing hashes, state variables, or compact metadata directly inside the UTXO.

### 2. Transaction Output Bounds
* **Minting NFTs**: Contracts interacting with minting NFTs must explicitly constrain `tx.outputs.length` to avoid unauthorized token creation vectors.

### 3. Dust Satoshi Threshold
* **Minimum Value**: Outputs carrying CashTokens must contain at least the protocol dust limit (typically 546 satoshis) to remain spendable by network nodes.

### 4. Stateless Execution Boundary
* Contracts cannot retain internal storage across transactions. All persistent state must be stored in:
  1. Output amounts (`tx.outputs[i].value`)
  2. NFT commitments (`tx.outputs[i].nftCommitment`)
  3. Covenants enforcing output locking scripts (`tx.outputs[i].lockingBytecode`)
