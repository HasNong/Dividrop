Topic: End-to-End Example Walkthroughs
Source: CashScript GitHub
Type: Implementation
Priority: High
Description: Walkthrough of how contract templates (.cash) pair with TypeScript SDK scripts (.ts) in examples/.

---

# End-to-End Example Walkthroughs

This document traces the interaction between `.cash` contract templates and their corresponding TypeScript interaction scripts in `examples/`.

## 1. P2PKH Walkthrough (`p2pkh.cash` + `p2pkh.ts`)

* **Contract Logic (`p2pkh.cash`)**:
  ```cashscript
  contract P2PKH(bytes20 pkh) {
      function spend(pubkey pk, sig s) {
          require(hash160(pk) == pkh);
          require(checkSig(s, pk));
      }
  }
  ```
* **SDK Interaction (`p2pkh.ts`)**:
  1. Compiles or imports `p2pkh.json` artifact.
  2. Derives public key hash (`pkh = hash160(publicKey)`).
  3. Instantiates `new Contract(P2PKH, [pkh], { provider })`.
  4. Calls `new TransactionBuilder({ provider })` adding input unlocked with `contract.unlock.spend(pk, new SignatureTemplate(keypair))`.
  5. Sends funds to destination address.

## 2. HodlVault Walkthrough (`hodl_vault.cash` + `hodl_vault.ts` + `PriceOracle.ts`)

* **Contract Logic (`hodl_vault.cash`)**:
  * Accepts `ownerPk`, `oraclePk`, `minBlock`, `priceTarget`.
  * Splices `oracleMessage` to extract `blockHeight` and `price`.
  * Validates `blockHeight >= minBlock`, `tx.time >= blockHeight`, `price >= priceTarget`.
  * Asserts `checkDataSig(oracleSig, oracleMessage, oraclePk)` and `checkSig(ownerSig, ownerPk)`.
* **SDK Interaction (`hodl_vault.ts`)**:
  1. Uses `PriceOracle.ts` helper to generate a signed oracle price payload.
  2. Instantiates contract with owner public key, oracle public key, minimum block, and target price.
  3. Constructs spending transaction passing oracle signature, oracle payload, and owner signature template.

## 3. Licho's Mecenas Walkthrough (`mecenas.cash` + `mecenas.ts`)

* **Contract Logic (`mecenas.cash`)**:
  * Accepts `recipient`, `funder`, `pledge`, `period`.
  * Enforces `this.age >= period` and `tx.inputs.length == 1`.
  * Compares `tx.outputs[0]` recipient locking bytecode and pledged satoshi amount.
  * Enforces change output (`tx.outputs[1]`) sending change satoshis back to `tx.inputs[this.activeInputIndex].lockingBytecode`.
* **SDK Interaction (`mecenas.ts`)**:
  1. Instantiates contract with recipient pkh, funder pkh, pledge satoshis, and period days.
  2. Calls `contract.unlock.receive()` to trigger recurring pledge withdrawal.
