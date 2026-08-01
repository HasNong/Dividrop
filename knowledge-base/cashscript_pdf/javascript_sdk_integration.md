Topic: JavaScript SDK Integration
Source: CashScript PDF Refresher
Type: Learning
Priority: High
Description: Overview of integrating CashScript contracts into JavaScript/TypeScript applications using Contract, NetworkProviders, and TransactionBuilder.

---

# JavaScript SDK Integration

The CashScript SDK enables web applications and backend servers to instantiate contracts, query network state, build transactions, and execute smart contract functions.

## 1. Contract Instantiation

```typescript
import { Contract, ElectrumNetworkProvider } from 'cashscript';
import artifact from './MyContract.json' with { type: 'json' };

const provider = new ElectrumNetworkProvider('chipnet');

const contract = new Contract(
  artifact,
  [constructorArg1, constructorArg2],
  {
    provider,
    addressType: 'p2sh20' // or 'p2sh32'
  }
);

console.log('Contract Address:', contract.address);
```

---

## 2. Querying Contract UTXOs & Balances

```typescript
// Fetch active UTXOs locked by the contract
const utxos = await contract.getUtxos();

// Query total contract satoshi balance
const balance = await contract.getBalance();
```

---

## 3. TransactionBuilder Execution Flow

The `TransactionBuilder` constructs and signs multi-input, multi-output transactions.

```typescript
import { TransactionBuilder, SignatureTemplate } from 'cashscript';

// Initialize transaction builder
const txBuilder = new TransactionBuilder({ provider });

// 1. Add Contract Input
txBuilder.addInput(
  utxos[0],
  contract.unlock.spendFunction(pubKey, new SignatureTemplate(keypair))
);

// 2. Add Transaction Outputs
txBuilder.addOutput({
  to: 'bitcoincash:qzw3tw58pw45mwllhl0m99v3gyn...',
  amount: 50000n
});

// 3. Set Optional Parameters & Broadcast
const txDetails = await txBuilder
  .setLocktime(800000)
  .send();

console.log('Transaction Broadcasted! TxID:', txDetails.txid);
```

---

## 4. Handling Batch Inputs & Outputs

```typescript
// Adding multiple inputs at once
txBuilder.addInputs(utxos, contract.unlock.spendFunction(...args));

// Adding multiple outputs at once
txBuilder.addOutputs([
  { to: recipient1, amount: 10000n },
  { to: recipient2, amount: 20000n }
]);
```
