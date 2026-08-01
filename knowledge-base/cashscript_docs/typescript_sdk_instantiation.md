Topic: TypeScript SDK Installation & Contract Instantiation
Source: CashScript Website
Type: Documentation
Priority: High
Description: Overview of the CashScript TypeScript SDK, contract instantiation, passing constructor arguments, loading artifacts, and retrieving contract addresses.

---

CashScript offers a TypeScript SDK, which makes it easy to build smart contract transactions, both in browser or on the server.
The CashScript SDK enables advanced debugging tooling for CashScript contracts, standardized network providers to get BCH blockchain information and a simple API for transaction building when using smart contracts.

The TypeScript SDK has [full TypeScript integration](#full-typescript-integration) with the CashScript smart contract language.
The full type-safety enables clear APIs which communicate info about the expected arguments to each function and method.
This in turn speeds up development time and allows for higher code quality with better safety guarantees.

> [!NOTE]
> The SDK can also be used easily in vanilla JavaScript codebases, although the benefits of the type-safety will be lost.

## When to use the SDK

The CashScript TypeScript SDK is designed to make it as easy as possible to create smart contract transactions for contracts written in CashScript (the smart contract language). So we highly recommend using the SDK when using CashScript to write your smart contracts.

If you are not using the CashScript contract language, you can still use the CashScript SDK for transaction building and BCH networking functionality! This can be especially useful if you are familiar with the CashScript classes and want manual control over the input and outputs in a transaction. The SDK makes it easy to spend from P2PKH inputs and send to different types of outputs, including OP_RETURN data outputs.

It's also possible to use the CashScript SDK for hand-optimized contracts **not** written with the CashScript contract language, but this is considered [advanced usage](#advanced-non-cashscript-contracts).

## The 4 SDK Classes

The CashScript SDK consists of 4 classes, together they form one cohesive structure to build BCH smart contract applications.
The documentation also follows the structure of these 4 classes:

* the `Contract` class
* the `TransactionBuilder` class
* the `NetworkProvider` class
* the `SignatureTemplate` class

## SDK usage

The usage of the 4 classes in your code is as follows: before using the SDK you create one or multiple contract artifacts compiled by `cashc`. Then to start using the SDK, you instantiate a `NetworkProvider`, which you then provide to instantiate a `Contract` from an `Artifact`. Once you have a `Contract` instance, you can use it in the `TransactionBuilder`. During transaction building you might need to generate a signature, in which case you would instantiate a `SignatureTemplate`.

For a more complete example of the SDK flow, refer to the [SDK Example](sdk_code_examples.md).

#### Example

```typescript
import { Contract, ElectrumNetworkProvider, TransactionBuilder, SignatureTemplate } from 'cashscript';
import { P2pkhArtifact } from './artifact';
import { contractArguments, aliceWif } from './somewhere';

const provider = new ElectrumNetworkProvider('chipnet');

const contract = new Contract(P2pkhArtifact, contractArguments, { provider });

const aliceSignatureTemplate = new SignatureTemplate(aliceWif);
const unlocker = contract.unlock.transfer(aliceSignatureTemplate)

const transactionBuilder = new TransactionBuilder({ provider });

// then use the transactionBuilder to actually spend a UTXO with the contract unlocker
```

## Full TypeScript Integration

The constructor of the `Contract` class takes in an `Artifact`, this is the output of the `cashc` compiler and can be configured to either output a JSON or TS file. To have the best TypeScript integration, we recommend generating the artifact in the `.ts` format and importing it into your TypeScript project from that `.ts` file. The type benefits are explained in more detail in the documentation for the [Contract](typescript_sdk_instantiation.md#constructor) class.

## Advanced: non-CashScript Contracts

You can also use the CashScript SDK without relying on the CashScript contract language and compiler. This way you can still leverage a lot of the tooling while having full control over the raw BCH script so this can be hand-written or hand-optimized.

There's two ways to go about this, either you create a custom `Artifact` so you can still use the `Contract` class or you create a custom `Unlocker` to use in the transaction building directly. These two methods for using hand optimized contract bytecode are discussed in the [optimization guide](concurrency_and_optimization.md#advanced-hand-optimizing-bytecode).

---

Before interacting with a smart contract on the BCH network, the CashScript SDK needs to instantiate a `Contract` object. This is done by providing the contract's information and constructor arguments. After this instantiation, the CashScript SDK can interact with the BCH contract.

## Creating a Contract

The `Contract` class is used to represent a CashScript contract in a JavaScript object. These objects can be used to retrieve information such as the contract's address and balance. Contract objects can be used to interact with the contract by generating an `Unlocker` by calling the contract's unlocker functions.

### Constructor

```typescript
new Contract(
  artifact: Artifact,
  constructorArgs: ConstructorArgument[],
  options : {
    provider: NetworkProvider,
    contractType?: 'p2sh20' | 'p2sh32' | 'p2s',
  }
)
```

A CashScript contract can be instantiated by providing an `Artifact` object, a list of constructor arguments, and optionally an options object configuring `NetworkProvider` and `contractType`.

An `Artifact` object is the result of compiling a CashScript contract. Compilation can be done using the standalone [`cashc` CLI](compiler_and_artifacts.md) or programmatically with the `cashc` NPM package (see [CashScript Compiler](compiler_and_artifacts.md#javascript-compilation)).

> [!TIP]
> If compilation is done using the `cashc` CLI with the `--format ts` option to output TypeScript Artifacts, you will get explicit types and type checking for the constructor arguments and function arguments of the `Contract` class.

The `NetworkProvider` option is used to manage network operations for the CashScript contract. By default, a mainnet `ElectrumNetworkProvider` is used, but the network providers can be configured. See the docs on [NetworkProvider](sdk_network_providers.md).

The `contractType` option is used to choose between a `p2sh20`, `p2sh32` or `p2s` contract type for the CashScript contract. By default `p2sh32` is used because it has increased cryptographic security over `p2sh20` — but it is not yet supported by all wallets. `p2s` is a new contract type where the contract code is not hidden behind a hash. This has some benefits for public visibility of the contract code.

> [!WARNING]
> p2sh32 was introduced because p2sh20 is cryptographically insecure for a large subset of smart contracts. For contracts holding large sums of BCH this provides an incentive to find a hash collision and hack the contract.

#### Example

```typescript
import { Contract, ElectrumNetworkProvider } from 'cashscript';
import { compileFile } from 'cashc';

// Import the artifact JSON
import P2PKH from './p2pkh.json' with { type: 'json' };

// Or compile a contract file
const P2PKH = compileFile(new URL('p2pkh.cash', import.meta.url));

const contractArguments = [alicePkh]

const provider = new ElectrumNetworkProvider('chipnet');
const options = { provider, contractType: 'p2sh20' }
const contract = new Contract(P2PKH, contractArguments, options);
```

## Contract Properties

### address

```typescript
contract.address: string
```

A contract's regular address (without token-support) can be retrieved through the `address` member field.

> [!NOTE]
> Wallets will not allow you to send CashTokens to this address. For that you must use the [tokenAddress](#tokenaddress) below. Wallets which have not upgraded might not recognize this new address type.

> [!NOTE]
> If you are using a `p2s` contract, the `address` member field does not exist on the contract object.

#### Example

```typescript
console.log(contract.address)
```

### tokenAddress

```typescript
contract.tokenAddress: string
```

A contract's token-supporting address can be retrieved through the `tokenAddress` member field.

> [!NOTE]
> If you are using a `p2s` contract, the `tokenAddress` member field does not exist on the contract object.

#### Example

```typescript
console.log(contract.tokenAddress)
```

### lockingBytecode

```typescript
contract.lockingBytecode: string
```

Returns the contract's locking bytecode encoded as a hex string. This exists for all contract types, including `p2s`.

#### Example

```typescript
console.log(contract.lockingBytecode)
```

### bytecode

```typescript
contract.bytecode: string
```

Returns the contract's bytecode encoded as a hex string.

#### Example

```typescript
console.log(contract.bytecode)
```

### bytesize

```typescript
contract.bytesize: number
```

The size of the contract's bytecode in bytes can be retrieved through the `bytesize` member field. This is useful to ensure that the contract is not too big, since Bitcoin Cash smart contracts can be 10,000 bytes at most for P2SH contracts and 201 bytes for P2S contracts. See the [Script & Transaction Limits](compiler_grammar_and_limits.md) page for more information.

> [!NOTE]
> Using `contract.bytesize` is the best way to get the size of contract bytecode, as it includes the constructor arguments.
> The size outputs of the `cashc` compiler are based on the bytecode without constructor arguments so are always an underestimate.

#### Example

```typescript
// make sure the contract bytesize is within standardness limits
assert(contract.bytesize <= 10_000)
```

### opcount

```typescript
contract.opcount: number
```

The number of opcodes in the contract's bytecode can be retrieved through the `opcount` member field.

#### Example

```typescript
console.log(contract.opcount)
```

## Contract Methods

### getBalance()

```typescript
async contract.getBalance(): Promise<bigint>
```

Returns the total balance of the contract in satoshis. Both confirmed and unconfirmed balance is included in this figure.

#### Example

```typescript
const contractBalance = await contract.getBalance()
```

### getUtxos()

```typescript
async contract.getUtxos(): Promise<Utxo[]>
```

Returns all UTXOs that can be spent by the contract. Both confirmed and unconfirmed UTXOs are included.

```typescript
interface Utxo {
  txid: string;
  vout: number;
  satoshis: bigint;
  token?: TokenDetails;
}
```

#### Example

```typescript
const utxos = await contract.getUtxos()
```

### Contract unlockers

```typescript
contract.unlock.<functionName>(...args: FunctionArgument[]): Unlocker
```

Once a smart contract has been instantiated, you can invoke a contract function on a smart contract UTXO to use the '[Transaction Builder](typescript_sdk_transaction_builder.md)' by calling the function name under the `unlock` member field of a contract object.
To call these functions successfully, the provided parameters must match the function signature defined in the CashScript code.

> [!TIP]
> When using a TypeScript contract Artifact, you will get explicit types and type checking for the function name and arguments.

These contract functions return an incomplete `transactionBuilder` object, which needs to be completed by providing outputs of the transaction. For more information see the [transaction-builder](typescript_sdk_transaction_builder.md) page.

```typescript
import { contract, transactionBuilder } from './somewhere.js';

const contractUtxos = await contract.getUtxos();

transactionBuilder.addInput(contractUtxos[0], contract.unlock.spend());
```