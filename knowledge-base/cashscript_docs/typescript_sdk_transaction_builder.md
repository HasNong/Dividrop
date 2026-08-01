Topic: SDK Transaction Builder & Function Invocation
Source: CashScript Website
Type: Documentation
Priority: High
Description: Guide to building transactions with the CashScript SDK, calling contract functions, adding transaction outputs, configuring fees, and spending UTXOs.

---

The CashScript Transaction Builder generalizes transaction building to allow for complex transactions combining multiple different smart contracts within a single transaction or to create basic P2PKH transactions. The Transaction Builder works by adding inputs and outputs to fully specify the transaction shape.

> [!NOTE]
> Defining the inputs and outputs requires careful consideration because the difference in Bitcoin Cash value between in- and outputs is what's paid in transaction fees to the miners.

## Instantiating a transaction builder

```typescript
new TransactionBuilder(options: TransactionBuilderOptions)
```

To start, you need to instantiate a transaction builder and pass in a `NetworkProvider` instance and other options.

```typescript
interface TransactionBuilderOptions {
  provider: NetworkProvider;
  maximumFeeSatoshis?: bigint;
  maximumFeeSatsPerByte?: number;
  allowImplicitFungibleTokenBurn?: boolean;
}
```

#### Example

```typescript
import { ElectrumNetworkProvider, TransactionBuilder, Network } from 'cashscript';

const provider = new ElectrumNetworkProvider(Network.MAINNET);
const transactionBuilder = new TransactionBuilder({ provider });
```

### Constructor Options

#### provider

The `provider` option is used to specify the network provider to use when sending the transaction.

#### maximumFeeSatoshis

The `maximumFeeSatoshis` option is used to specify the maximum fee for the transaction in satoshis. If this fee is exceeded, an error will be thrown when building the transaction.

#### maximumFeeSatsPerByte

The `maximumFeeSatsPerByte` option is used to specify the maximum fee per byte for the transaction. If this fee is exceeded, an error will be thrown when building the transaction.

#### allowImplicitFungibleTokenBurn

The `allowImplicitFungibleTokenBurn` option is used to specify whether implicit burning of fungible tokens is allowed (default: `false`). If this is set to `true`, the transaction builder will not throw an error when burning fungible tokens.

## Transaction Building

### addInput()

```typescript
transactionBuilder.addInput(utxo: Utxo, unlocker: Unlocker, options?: InputOptions): this
```

Adds a single input UTXO to the transaction that can be unlocked using the provided unlocker. The unlocker can be derived from a `SignatureTemplate` or a `Contract` instance's spending functions. The `InputOptions` object can be used to specify the sequence number of the input. The default sequence number is `0xfffffffe` (non-final sequence number).

> [!NOTE]
> It is possible to create custom unlockers by implementing the `Unlocker` interface. Most use cases however are covered by the `SignatureTemplate` and `Contract` classes.

#### Example

```typescript
import { contract, aliceTemplate, aliceAddress, transactionBuilder } from './somewhere.js';

const contractUtxos = await contract.getUtxos();
const aliceUtxos = await provider.getUtxos(aliceAddress);

transactionBuilder.addInput(contractUtxos[0], contract.unlock.spend());
transactionBuilder.addInput(aliceUtxos[0], aliceTemplate.unlockP2PKH());
```

### addInputs()

```typescript
transactionBuilder.addInputs(utxos: Utxo[], unlocker: Unlocker, options?: InputOptions): this
transactionBuilder.addInputs(utxos: UnlockableUtxo[]): this
```

```typescript
interface UnlockableUtxo extends Utxo {
  unlocker: Unlocker;
  options?: InputOptions;
}
```

Adds a list of input UTXOs, either with a single shared unlocker or with individual unlockers for each UTXO. The `InputOptions` object can be used to specify the sequence number of the inputs. The default sequence number is `0xfffffffe` (non-final sequence number).

#### Example

```typescript
import { contract, aliceTemplate, aliceAddress, transactionBuilder } from './somewhere.js';

const contractUtxos = await contract.getUtxos();
const aliceUtxos = await provider.getUtxos(aliceAddress);

// Use a single unlocker for all inputs you're adding at a time
transactionBuilder.addInputs(contractUtxos, contract.unlock.spend());
transactionBuilder.addInputs(aliceUtxos, aliceTemplate.unlockP2PKH());

// Or combine the UTXOs with their unlockers in an array
const unlockableUtxos = [
  { ...contractUtxos[0], unlocker: contract.unlock.spend() },
  { ...aliceUtxos[0], unlocker: aliceTemplate.unlockP2PKH() },
];
transactionBuilder.addInputs(unlockableUtxos);
```

### addOutput() & addOutputs()

```typescript
transactionBuilder.addOutput(output: Output): this
transactionBuilder.addOutputs(outputs: Output[]): this
```

Adds a single output or a list of outputs to the transaction. The `to` field in an output can be a string representing a cash address, or a `Uint8Array` representing a locking bytecode. For `P2PKH`, `P2SH20` and `P2SH32` outputs, it is easiest to use the cash address string. For `P2S` outputs, you need to use the locking bytecode.

```typescript
interface Output {
  to: string | Uint8Array;
  amount: bigint;
  token?: TokenDetails;
}

interface TokenDetails {
  amount: bigint;
  category: string;
  nft?: {
    capability: 'none' | 'mutable' | 'minting';
    commitment: string;
  };
}
```

#### Example

```typescript
import { aliceAddress, bobAddress, transactionBuilder, tokenCategory } from './somewhere.js';

transactionBuilder.addOutput({
  to: aliceAddress,
  amount: 100_000n,
  token: {
    amount: 1000n,
    category: tokenCategory,
  }
});

transactionBuilder.addOutputs([
  { to: aliceAddress, amount: 50_000n },
  { to: bobAddress, amount: 50_000n },
]);
```

### addOpReturnOutput()

```typescript
transactionBuilder.addOpReturnOutput(chunks: string[]): this
```

Adds an OP_RETURN output to the transaction with the provided data chunks in string format. If the string is `0x`-prefixed, it is treated as a hex string. Otherwise it is treated as a UTF-8 string.

#### Example

```typescript
// Post "Hello World!" to memo.cash
transactionBuilder.addOpReturnOutput(['0x6d02', 'Hello World!']);
```

### addBchChangeOutputIfNeeded()

```typescript
transactionBuilder.addBchChangeOutputIfNeeded(changeOutputOptions: BchChangeOutputOptions): this
```

Adds a change output to the transaction if the transaction has enough funds to cover the transaction fee rate. The `changeOutputOptions` object can be used to specify the fee rate for the change output. Note that this is only for BCH change. Use `addTokenChangeOutputIfNeeded()` to add a fungible token change output.

After a BCH change output has been added, no more inputs or outputs can be added to the transaction. This is enforced by the SDK to prevent accidentally invalidating the change calculation.

```typescript
interface BchChangeOutputOptions {
  to: string | Uint8Array;
  feeRate: number;
}
```

### addTokenChangeOutputIfNeeded()

```typescript
transactionBuilder.addTokenChangeOutputIfNeeded(changeOutputOptions: TokenChangeOutputOptions): this
```

For the configured fungible token category, adds a single change output to the configured token address. The change output is given the dust-minimum BCH amount, so this method should be called before `addBchChangeOutputIfNeeded()`. NFT inputs are not handled by this method; if you need to keep an NFT, add an explicit output for it.

After a token change output for a category has been added, no more inputs or outputs with that token category can be added to the transaction. This is enforced by the SDK to prevent accidentally invalidating the change calculation.

```typescript
interface TokenChangeOutputOptions {
  category: string;
  to: string | Uint8Array;
}
```

### setLocktime()

```typescript
transactionBuilder.setLocktime(locktime: number): this
```

Sets the locktime for the transaction to set a transaction-level absolute timelock (see [Timelock documentation](https://en.bitcoin.it/wiki/Timelock) for more information). The locktime can be set to a specific block height or a unix timestamp.

#### Example

```typescript
// Set locktime one day from now
transactionBuilder.setLocktime((Date.now() / 1000) + 24 * 60 * 60);
```

### getTransactionSize()

```typescript
transactionBuilder.getTransactionSize(): bigint
```

Returns the size of the transaction in bytes.

#### Example

```typescript
const transactionSize = transactionBuilder.getTransactionSize();
console.log(`Transaction size: ${transactionSize} bytes`);
```

### calculateTransactionFee()

```typescript
transactionBuilder.calculateTransactionFee(): { feeSats: bigint, feeSatsPerByte: number }
```

Calculates the transaction fee in satoshis and the fee per byte.

#### Example

```typescript
const { feeSats, feeSatsPerByte } = transactionBuilder.calculateTransactionFee();
console.log(`Transaction fee: ${feeSats} satoshis (${feeSatsPerByte} sats/byte)`);
```

## Completing the Transaction

### send()

```typescript
async transactionBuilder.send(): Promise<TransactionDetails>
```

After completing a transaction, the `send()` function can be used to send the transaction to the BCH network. An incomplete transaction cannot be sent.

```typescript
interface TransactionDetails {
  inputs: Uint8Array[];
  locktime: number;
  outputs: Uint8Array[];
  version: number;
  txid: string;
  hex: string;
}
```

#### Example

```typescript
import { aliceTemplate, aliceAddress, bobAddress, contract, provider } from './somewhere.js';

const contractUtxos = await contract.getUtxos();
const aliceUtxos = await provider.getUtxos(aliceAddress);
const maximumFeeSatoshis = 1000n;

const txDetails = await new TransactionBuilder({ provider, maximumFeeSatoshis })
  .addInput(contractUtxos[0], contract.unlock.spend(aliceTemplate, 1000n))
  .addInput(aliceUtxos[0], aliceTemplate.unlockP2PKH())
  .addOutput({ to: bobAddress, amount: 100_000n })
  .addOpReturnOutput(['0x6d02', 'Hello World!'])
  .send()
```

### build()

```typescript
transactionBuilder.build(): string
```

After completing a transaction, the `build()` function can be used to build the entire transaction and return the signed transaction hex string. This can then be imported into other libraries or applications as necessary.

#### Example

```typescript
import { aliceTemplate, aliceAddress, bobAddress, contract, provider } from './somewhere.js';

const contractUtxos = await contract.getUtxos();
const aliceUtxos = await provider.getUtxos(aliceAddress);
const maximumFeeSatoshis = 1000n;

const txHex = new TransactionBuilder({ provider, maximumFeeSatoshis })
  .addInput(contractUtxos[0], contract.unlock.spend(aliceTemplate, 1000n))
  .addInput(aliceUtxos[0], aliceTemplate.unlockP2PKH())
  .addOutput({ to: bobAddress, amount: 100_000n })
  .addOpReturnOutput(['0x6d02', 'Hello World!'])
  .build()
```

### debug()

```typescript
transactionBuilder.debug(): DebugResults
```

If you want to debug a transaction locally instead of sending it to the network, you can call the `debug()` function on the transaction. This will return intermediate values and the final result of the transaction. It will also show any logged values and `require` error messages.

### getBitauthUri()

```typescript
transactionBuilder.getBitauthUri(): string
```

If you prefer a lower-level debugging experience, you can call the `getBitauthUri()` function on the transaction. This will return a URI that can be opened in the BitAuth IDE. This URI is also displayed in the console whenever a transaction fails.
You can read more about debugging transactions on the [debugging page](security_and_debugging.md).

> [!WARNING]
> It is unsafe to debug transactions on mainnet using the BitAuth IDE as private keys will be exposed to BitAuth IDE and transmitted over the network.

### getVmResourceUsage()

```typescript
transactionBuilder.getVmResourceUsage(verbose: boolean = false): Array<VmResourceUsage>
```

The `getVmResourceUsage()` function allows you to get the VM resource usage for the transaction. This can be useful for debugging and optimization. The VM resource usage is calculated for each input individually so the result is an array of `VmResourceUsage` results corresponding to each of the transaction inputs.

```typescript
interface VmResourceUsage {
  arithmeticCost: number;
  definedFunctions: number;
  hashDigestIterations: number;
  maximumOperationCost: number;
  maximumHashDigestIterations: number;
  maximumSignatureCheckCount: number;
  densityControlLength: number;
  operationCost: number;
  signatureCheckCount: number;
}
```

The verbose mode also logs the VM resource usage for each input as a table to the console.

```text
VM Resource usage by inputs:
┌─────────┬─────────────────────────────────────────────────┬─────┬──────────────────────────┬───────────┬──────────┐
│ (index) │ Contract - Function                             │ Ops │ Op Cost Budget Usage     │ SigChecks │ Hashes   │
├─────────┼─────────────────────────────────────────────────┼─────┼──────────────────────────┼───────────┼──────────┤
│ 0       │ 'SingleFunction - test_require_single_function' │ 7   │ '1,155 / 36,000 (3%)'    │ '0 / 1'   │ '2 / 22' │
│ 1       │ 'ZeroHandling - test_zero_handling'             │ 13  │ '1,760 / 40,800 (4%)'    │ '0 / 1'   │ '2 / 25' │
│ 2       │ 'P2PKH Input'                                   │ 7   │ '28,217 / 112,800 (25%)' │ '1 / 3'   │ '7 / 70' │
└─────────┴─────────────────────────────────────────────────┴─────┴──────────────────────────┴───────────┴──────────┘
```

### generateWcTransactionObject()

```typescript
transactionBuilder.generateWcTransactionObject(options?: WcTransactionOptions): WcTransactionObject
```

Generates a `WcTransactionObject` that can be used to sign a transaction with a WalletConnect client. It accepts an optional `WcTransactionOptions` object to customize the transaction object with custom `broadcast` and `userPrompt` properties.

```typescript
import type { TransactionCommon, Input, Output } from '@bitauth/libauth';
import type { AbiFunction, Artifact } from 'cashscript';

interface WcTransactionOptions {
  broadcast?: boolean;
  userPrompt?: string;
}

interface WcTransactionObject {
  transaction: TransactionCommon;
  sourceOutputs: WcSourceOutput[];
  broadcast?: boolean;
  userPrompt?: string;
}

type WcSourceOutput = Input & Output & WcContractInfo;

interface WcContractInfo {
  contract?: {
    abiFunction: AbiFunction;
    redeemScript: Uint8Array;
    artifact: Partial<Artifact>;
  }
}
```

> [!TIP]
> See the [WalletConnect guide](deployment_lifecycle_and_integrations.md) for more information on how to use the `WcTransactionObject` with a WalletConnect client.

#### Example

```typescript
import { aliceAddress, contract, provider, signWcTransaction } from './somewhere.js';
import { TransactionBuilder, placeholderP2PKHUnlocker, placeholderPublicKey, placeholderSignature } from 'cashscript';

const contractUtxos = await contract.getUtxos();
const aliceUtxos = await provider.getUtxos(aliceAddress);

// Use placeholder variables which will be replaced by the user's wallet when signing the transaction with WalletConnect
const placeholderUnlocker = placeholderP2PKHUnlocker(aliceAddress);
const placeholderPubKey = placeholderPublicKey();
const placeholderSig = placeholderSignature();

// use the CashScript SDK to construct a transaction
const transactionBuilder = new TransactionBuilder({ provider })
  .addInput(contractUtxos[0], contract.unlock.spend(placeholderPubKey, placeholderSig))
  .addInput(aliceUtxos[0], placeholderUnlocker)
  .addOutput({ to: aliceAddress, amount: 100_000n });

// Generate WalletConnect transaction object with custom 'broadcast' and 'userPrompt' options
const wcTransactionObj = transactionBuilder.generateWcTransactionObject({
  broadcast: true,
  userPrompt: "Example Contract transaction",
});

// Pass wcTransactionObj to WalletConnect client (see WalletConnect guide for more details)
const signResult = await signWcTransaction(wcTransactionObj);
```

## Transaction errors

When sending a transaction, the CashScript SDK will throw an error if the transaction fails. If you are using an artifact compiled with `cashc@0.10.0` or later, the error will be of the type `FailedRequireError` or `FailedTransactionEvaluationError`. In case of a `FailedRequireError`, the error will refer to the corresponding `require` statement in the contract code so you know where your contract failed. If you want more information about the underlying error, you can check the `libauthErrorMessage` property of the error.

```typescript
interface FailedRequireError {
  message: string;
  artifact: Artifact;
  failingInstructionPointer: number;
  requireStatement: { ip: number, line: number, message?: string };
  inputIndex: number;
  bitauthUri: string;
  libauthErrorMessage?: string;
}
```

If you are using an artifact compiled with an older version of `cashc`, the error will always be of the type `FailedTransactionError`. In this case, you can use the `reason` property of the error to determine the reason for the failure.

---

> [!WARNING]
> This is the documentation for the old 'Simple Transaction Builder' which operated on a single contract. This API was **removed in v0.12** and is no longer available in the SDK.
> It is strongly recommended to migrate over to the new default transaction builder [using the migration notes](release_notes_and_migrations.md).

When calling a contract function of a Contract object's `functions`, an incomplete Transaction object is returned. This transaction can be completed by providing a number of outputs using the [`to()`](typescript_sdk_transaction_builder.md#to) or [`withOpReturn()`](typescript_sdk_transaction_builder.md#withopreturn) functions. Other chained functions are included to set other transaction parameters.

Most of the available transaction options are only useful in very specific use cases, but the functions [`to()`](typescript_sdk_transaction_builder.md#to), [`withOpReturn()`](typescript_sdk_transaction_builder.md#withopreturn) and [`send()`](typescript_sdk_transaction_builder.md#send) are commonly used. [`withHardcodedFee()`](typescript_sdk_transaction_builder.md#withhardcodedfee) is also commonly used with covenant contracts.

## Transaction options

### to()

```typescript
transaction.to(to: string, amount: bigint, token?: TokenDetails): this
transaction.to(outputs: Array<Recipient>): this
```

The `to()` function allows you to add outputs to the transaction. Either a single pair `to/amount` pair can be provided, or a list of them. This function can be called any number of times, and the provided outputs will be added to the list of earlier added outputs. Tokens can be sent by providing a `TokenDetails` object as the third parameter, or including it in your array of outputs with the `.token` property.

```typescript
interface Recipient {
  to: string;
  amount: bigint;
  token?: TokenDetails;
}

interface TokenDetails {
  amount: bigint;
  category: string;
  nft?: {
    capability: 'none' | 'mutable' | 'minting';
    commitment: string;
  };
}
```

> [!NOTE]
> The CashScript SDK supports automatic UTXO selection for BCH and fungible CashTokens. However, if you want to send Non-Fungible CashTokens, you will need to do manual UTXO selection using `from()`.

#### Example

```typescript
.to('bitcoincash:qrhea03074073ff3zv9whh0nggxc7k03ssh8jv9mkx', 500000n)
```

### withOpReturn()

```typescript
transaction.withOpReturn(chunks: string[]): this
```

The `withOpReturn()` function allows you to add `OP_RETURN` outputs to the transaction. The `chunks` parameter can include regular UTF-8 encoded strings, or hex strings prefixed with `0x`. This function can be called any number of times, and the provided outputs will be added to the list of earlier added outputs.

#### Example

```typescript
.withOpReturn(['0x6d02', 'Hello World!'])
```

### from()

```typescript
transaction.from(inputs: Utxo[]): this
```

The `from()` function allows you to provide a hardcoded list of contract UTXOs to be used in the transaction. This overrides the regular UTXO selection performed by the CashScript SDK, so **no further selection will be performed** on the provided UTXOs. This function can be called any number of times, and the provided UTXOs will be added to the list of earlier added UTXOs.

> [!TIP]
> The built-in UTXO selection is generally sufficient. But there are specific use cases for which it makes sense to use a custom selection algorithm.

#### Example

```typescript
.from(await instance.getUtxos())
```

### fromP2PKH()

```typescript
transaction.fromP2PKH(input: Utxo, template: SignatureTemplate): this;
transaction.fromP2PKH(inputs: Utxo[], template: SignatureTemplate): this;
```

The `fromP2PKH()` function allows you to provide a list of P2PKH UTXOs to be used in the transaction. The passed `SignatureTemplate` is used to sign these UTXOs. This function can be called any number of times, and the provided UTXOs will be added to the list of earlier added UTXOs.

#### Example

```typescript
import { bobAddress, bobPrivateKey } from './somewhere';
import { ElectrumNetworkProvider, SignatureTemplate } from 'cashscript';

const provider = new ElectrumNetworkProvider();
const bobUtxos = await provider.getUtxos(bobAddress);

.fromP2PKH(bobUtxos, new SignatureTemplate(bobPrivateKey))
```

### withFeePerByte()

```typescript
transaction.withFeePerByte(feePerByte: number): this
```

The `withFeePerByte()` function allows you to specify the fee per per bytes for the transaction. By default the fee per bytes is set to 1.0 satoshis, which is nearly always enough to be included in the next block. So it's generally not necessary to change this.

#### Example

```typescript
.withFeePerByte(2.3)
```

### withHardcodedFee()

```typescript
transaction.withHardcodedFee(hardcodedFee: bigint): this
```

The `withHardcodedFee()` function allows you to specify a hardcoded fee to the transaction. By default the transaction fee is automatically calculated by the CashScript SDK, but there are certain use cases where the smart contract relies on a hardcoded fee.

> [!TIP]
> If you're not building a covenant contract, you probably do not need a hardcoded transaction fee.

#### Example

```typescript
.withHardcodedFee(1000n)
```

### withMinChange()

```typescript
transaction.withMinChange(minChange: bigint): this
```

The `withMinChange()` function allows you to set a threshold for including a change output. Any remaining amount under this threshold will be added to the transaction fee instead.

> [!TIP]
> This is generally only useful in specific covenant use cases.

#### Example

```typescript
.withMinChange(1000n)
```

### withoutChange()

```typescript
transaction.withoutChange(): this
```

The `withoutChange()` function allows you to disable the change output. The remaining amount will be added to the transaction fee instead. This is equivalent to `withMinChange(Number.MAX_VALUE)`.

> [!WARNING]
> Be sure to check that the remaining amount (sum of inputs - sum of outputs) is not too high. The difference will be added to the transaction fee and cannot be reclaimed.

#### Example

```typescript
.withoutChange()
```

### withoutTokenChange()

```typescript
transaction.withoutTokenChange(): this
```

The `withoutTokenChange()` function allows you to disable the change output for tokens.

> [!WARNING]
> Be sure to check that the remaining amount (sum of inputs - sum of outputs) is not too high. The difference will be burned and cannot be reclaimed.

#### Example

```typescript
.withoutTokenChange()
```

### withAge()

```typescript
transaction.withAge(age: number): this
```

The `withAge()` function allows you to specify the minimum age of the transaction inputs. This is necessary if you want to use the `tx.age` CashScript functionality. The `age` parameter passed into this function will be the value of `tx.age` inside the smart contract. For more information, refer to [BIP68](https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki).

#### Example

```typescript
.withAge(10)
```

### withTime()

```typescript
transaction.withTime(time: number): this
```

The `withTime()` function allows you to specify the minimum block number that the transaction can be included in. The `time` parameter will be the value of `tx.time` inside the smart contract.

> [!TIP]
> By default, the transaction's `time` variable is set to the most recent block number, which is the most common use case. So you should only override this in specific use cases.

#### Example

```typescript
.withTime(700000)
```

## Transaction building

### send()

```typescript
async transaction.send(): Promise<TransactionDetails>
```

After completing a transaction, the `send()` function can be used to send the transaction to the BCH network. An incomplete transaction cannot be sent.

```typescript
interface TransactionDetails {
  inputs: Uint8Array[];
  locktime: number;
  outputs: Uint8Array[];
  version: number;
  txid: string;
  hex: string;
}
```

#### Example

```typescript
import { alice } from './somewhere';

const txDetails = await instance.functions
  .transfer(new SignatureTemplate(alice))
  .withOpReturn(['0x6d02', 'Hello World!'])
  .to('bitcoincash:qrhea03074073ff3zv9whh0nggxc7k03ssh8jv9mkx', 200000n)
  .to('bitcoincash:qqeht8vnwag20yv8dvtcrd4ujx09fwxwsqqqw93w88', 100000n)
  .withHardcodedFee(1000n)
  .send()
```

### build()

```typescript
async transaction.build(): Promise<string>
```

After completing a transaction, the `build()` function can be used to build the entire transaction and return the signed transaction hex string. This can then be imported into other libraries or applications as necessary.

#### Example

```typescript
const txHex = await instance.functions
  .transfer(new SignatureTemplate(alice))
  .to('bitcoincash:qrhea03074073ff3zv9whh0nggxc7k03ssh8jv9mkx', 500000n)
  .withAge(10)
  .withFeePerByte(10)
  .build()
```

### debug() & bitauthUri()

If you want to debug a transaction locally instead of sending it to the network, you can call the `debug()` function on the transaction. This will return intermediate values and the final result of the transaction. It will also show any logged values and `require` error messages.

If you prefer a lower-level debugging experience, you can call the `bitauthUri()` function on the transaction. This will return a URI that can be opened in the BitAuth IDE. This URI is also displayed in the console whenever a transaction fails.

You can read more about debugging transactions on the [debugging page](security_and_debugging.md).

> [!WARNING]
> It is unsafe to debug transactions on mainnet using the BitAuth IDE as private keys will be exposed to BitAuth IDE and transmitted over the network.

## Transaction errors

When sending a transaction, the CashScript SDK will throw an error if the transaction fails. If you are using an artifact compiled with `cashc@0.10.0` or later, the error will be of the type `FailedRequireError` or `FailedTransactionEvaluationError`. In case of a `FailedRequireError`, the error will refer to the corresponding `require` statement in the contract code so you know where your contract failed. If you want more information about the underlying error, you can check the `libauthErrorMessage` property of the error.

```typescript
interface FailedRequireError {
  message: string;
  contractName: string;
  requireStatement: { ip: number, line: number, message: string };
  inputIndex: number,
  libauthErrorMessage?: string,
  bitauthUri?: string;
}
```

If you are using an artifact compiled with an older version of `cashc`, the error will always be of the type `FailedTransactionError`. In this case, you can use the `reason` property of the error to determine the reason for the failure.