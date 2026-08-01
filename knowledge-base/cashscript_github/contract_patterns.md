Topic: Smart Contract Architectural Patterns
Source: CashScript GitHub
Type: Implementation
Priority: High
Description: Analysis of smart contract design patterns extracted from reference contracts in examples/ (Mecenas, HodlVault, TransferWithTimeout, P2PKH).

---

# Smart Contract Architectural Patterns

The reference contracts in `examples/` demonstrate fundamental CashScript contract design patterns on Bitcoin Cash's UTXO execution model.

## Core Contract Patterns

### 1. Pay-to-Public-Key-Hash Pattern (`p2pkh.cash`)
* **Pattern**: Standard single-key ownership.
* **Mechanism**: Verifies that the spending transaction provides a signature and public key matching the contract's stored public key hash.
* **Key Opcodes / Functions**: `hash160(pk) == pkh`, `checkSig(s, pk)`.

### 2. Price Oracle & Timelock Vault Pattern (`hodl_vault.cash`)
* **Pattern**: Data-signed oracle verification combined with absolute time constraints.
* **Mechanism**:
  * Requires a signed price message from a trusted oracle (`checkDataSig`).
  * Enforces that the oracle block height matches or exceeds `minBlock`.
  * Checks relative time constraints via `tx.time >= blockHeight`.
  * Verifies current price exceeds `priceTarget` before releasing funds.
* **Key Logic**: `checkDataSig(oracleSig, oracleMessage, oraclePk)` + `require(tx.time >= blockHeight)`.

### 3. Covenant & Recurring Payment Pattern (`mecenas.cash`)
* **Pattern**: Stateful UTXO covenant for automated recurring pledges.
* **Mechanism**:
  * Checks that UTXO age meets or exceeds a target period (`this.age >= period`).
  * Restricts transaction to a single input (`tx.inputs.length == 1`).
  * Inspects `tx.outputs[0]` to enforce recipient receiving pledged amount.
  * Enforces sending the remaining UTXO balance back to the contract's own locking bytecode (`tx.outputs[1].lockingBytecode == changeBytecode`), resetting the age counter for the next period.
* **Key Logic**: `tx.inputs[this.activeInputIndex].lockingBytecode == tx.outputs[1].lockingBytecode`.

### 4. Escrow & Timelocked Fallback Pattern (`transfer_with_timeout.cash`)
* **Pattern**: Dual-path conditional execution (Primary transfer path vs Time-locked refund path).
* **Mechanism**:
  * **Path 1 (`transfer`)**: Recipient can claim funds immediately by signing with `recipientPk`.
  * **Path 2 (`timeout`)**: Sender can reclaim funds after expiry time using `senderPk` combined with `tx.time >= timeout`.
* **Key Logic**: Separate public contract functions providing distinct spending conditions.
