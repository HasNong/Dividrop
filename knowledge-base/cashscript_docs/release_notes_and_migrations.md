Topic: CashScript Release Notes & Migration Guides
Source: CashScript Website
Type: Documentation
Priority: Low
Description: Historical release changelogs and breaking change migration guides for CashScript language and SDK version upgrades.

---

## v0.12 to v0.13

### cashc compiler

#### bounded bytes casting

To indicate that `bytes4(bytes)` casting is purely semantic (and does not offer any type safety), we have renamed it to `unsafe_bytes4(bytes)`. We have also disallowed `bytes4(int)` casting (see section *int to padded bytes casting*).

```cashscript
bytes x = 0x12345678;

// before
bytes4(x); // => 0x12345678 (correct semantic cast)
bytes5(x); // => 0x12345678 (incorrect semantic cast)

// after
// marked as unsafe to indicate that this is a purely semantic cast
unsafe_bytes4(x); // => 0x12345678 (correct semantic cast)
unsafe_bytes5(x); // => 0x12345678 (incorrect semantic cast)
```

#### int to padded bytes casting

In the past, `bytes4(int)` or `bytes(int, 4)` would perform a `NUM2BIN` operation, padding the value to 4 bytes, while `bytes4(bytes)` was a purely semantic type cast. This caused confusion, so instead you can now use the `toPaddedBytes(int, length)` function to perform the same padding (`NUM2BIN`) operation.

```cashscript
// before
bytes4(5); // => 0x05000000
bytes(5, 4); // => 0x05000000

// after
toPaddedBytes(5, 4); // => 0x05000000
```

#### bool casting

The `bool()` casting function now correctly changes the value of the argument to `true` for non-zero values and `false` for zero values, instead of only semantically treating the value as a boolean. This worked correctly when using the boolean directly inside `require` or `if` statements, but not when using it in a comparison.

```cashscript
// before
require(bool(5)); // => true
require(bool(5) == true); // => false || compiles to 0x05 0x01 OP_NUMEQUALVERIFY

// after
require(bool(5)); // => still true
require(bool(5) == true); // => true || compiles to 0x05 OP_0NOTEQUAL 0x01 OP_NUMEQUALVERIFY
```

If you want to keep the old behaviour (without added opcodes), you can use the `unsafe_bool()` casting function instead.

#### Function parameter type enforcement

Function parameter types are now strictly enforced by default. Previously, no length checks were performed on bounded bytes types like `bytes20` and `bytes32` and no value checks were performed on boolean values. That meant that you could pass arguments to functions that were not of the correct type, which could lead to runtime vulnerabilities.

We made this the new compiler default because it is more secure and more explicit. If you want to opt out of this behaviour, you can set the `enforceFunctionParameterTypes` option to `false` in the compiler options when compiling programmatically, or use the `--skip-enforce-function-parameter-types` flag when using the CLI.

Now, the compiler adds extra opcodes to the script to enforce the correct types. If you pass a byte string of an incorrect length to a function that expects e.g. a `bytes20`, the transaction will fail. If you pass in a numeric non-boolean value to a function that expects a `bool`, it will be converted to a boolean value using the `OP_0NOTEQUAL` opcode. If you pass in a non-numeric value to a function that expects a `bool`, the transaction will fail.

We added no extra checks for `int` values, because any numeric operations on a non-numeric value will automatically fail the entire transaction.

#### Locktime guard enforcement

The `enforceLocktimeGuard` option has been added to the compiler options. This option controls whether the compiler should inject a `require(tx.time >= tx.locktime)` check when `tx.locktime` is used without a `require(tx.time >= ...)` check in scope. By default, this is enabled. If you want to opt out of this behaviour, you can set the `enforceLocktimeGuard` option to `false` in the compiler options when compiling programmatically, or use the `--skip-enforce-locktime-guard` flag when using the CLI.

### CashScript SDK

The `addressType` option on the `Contract` constructor has been renamed to `contractType`.

```typescript
// Before: addressType option
const contract = new Contract(artifact, constructorArgs, { addressType: 'p2sh32' });

// After: contractType option
const contract = new Contract(artifact, constructorArgs, { contractType: 'p2sh32' });
```

### Network Provider

If you are using a custom network provider, you will need to update the code for the custom provider to implement the new `getUtxosForLockingBytecode()` method to be compatible with the new `NetworkProvider` interface.

```typescript
/**
   * Retrieve all UTXOs (confirmed and unconfirmed) for a given locking bytecode.
   * @param lockingBytecode The locking bytecode for which we wish to retrieve UTXOs.
   * @returns List of UTXOs spendable by the provided locking bytecode.
   */
  getUtxosForLockingBytecode(lockingBytecode: Uint8Array | string): Promise<Utxo[]>;
```

### FullStackNetworkProvider & BitcoinRpcNetworkProvider

The `FullStackNetworkProvider` and `BitcoinRpcNetworkProvider` have been removed from the SDK. If you were using these providers, you will need to update your code to use a different network provider.

```typescript
// Before: FullStackNetworkProvider
const provider = new FullStackNetworkProvider('mainnet', bchjs);

// After: ElectrumNetworkProvider
const provider = new ElectrumNetworkProvider('mainnet');
```

## v0.11 to v0.12

There are several breaking changes to the SDK in this release.

### CashScript SDK

#### Old Transaction Builder Removal

The most impactful breaking change is the removal of the deprecated 'Simple Transaction Builder'. See [below for steps to migrate to the new transaction builder](release_notes_and_migrations.md#sdk-transaction-builder).

#### Contract constructor

Before, the `provider` option was optional in the `Contract` constructor. This is no longer the case.

```typescript
// Before: defaults to mainnet ElectrumNetworkProvider
const contract = new Contract(artifact, constructorArgs);

// After: explicitly specify the provider
const provider = new ElectrumNetworkProvider('mainnet');
const contract = new Contract(artifact, constructorArgs, { provider });
```

#### Transaction Builder

Before, the `setMaxFee()` method was used to set the maximum fee for the transaction. This was replaced with the `maximumFeeSatoshis` option in the constructor. Additionally, the `maximumFeeSatsPerByte` option was added.

```typescript
// Before: setMaxFee() was used to set the maximum fee
const builder = new TransactionBuilder({ provider }).setMaxFee(1000n);

// After: maximumFeeSatoshis option was added to the constructor
const builder = new TransactionBuilder({ provider, maximumFeeSatoshis: 1000n });
```

Additionally, `transactionBuilder.bitauthUri()` was renamed to `transactionBuilder.getBitauthUri()` for consistency.

#### MockNetworkProvider

Before, the `updateUtxoSet` option was `false` by default for the `MockNetworkProvider`. This is now `true` by default to better match real-world network behaviour.

```typescript
// Before: updateUtxoSet is false by default
const provider = new MockNetworkProvider();

// After: updateUtxoSet is true by default, if you want to keep the old behaviour, set it to false
const provider = new MockNetworkProvider({ updateUtxoSet: false });
```

Earlier, the `MockNetworkProvider` also automatically added some test UTXOs to the provider, which is no longer the case. Make sure to add any UTXOs you need manually.

## v0.10 to v0.11

There are several breaking changes to the compiler and SDK in this release. They are listed below in their own sections.

### cashc compiler

`tx.age` was renamed to `this.age` to better reflect that it enforces a UTXO-level locktime check (*not* transaction-level). To migrate, replace all occurrences of `tx.age` with `this.age`.

### SDK: Transaction Builder

The 'Simple Transaction builder' has been marked as deprecated and the 'Advanced Transaction Builder' is now simply referred to as the CashScript `Transaction Builder`, as there is only one supported for the future.

#### Example

Since the new transaction builder is quite different from the old one, it may be useful to see an example refactored from the old way to the new way.

With the deprecated 'simple transaction builder' the API looked like this:

```typescript
import { ElectrumNetworkProvider, SignatureTemplate } from 'cashscript';

const provider = new ElectrumNetworkProvider(Network.MAINNET);

// Optionally specify the contract UTXO
const contractUtxos = await contract.getUtxos();
const selectedContractUtxo = contractUtxos[0]

// Specify Bob Utxo to add to the transaction
const bobUtxos = await provider.getUtxos(bobAddress);
const selectedUtxoBob = bobUtxos[0]

const bobSignatureTemplate = new SignatureTemplate(bobPriv)

// Start building the transaction
const txDetails = await contract.functions
  .transfer(bobSignatureTemplate)
  .from(selectedContractUtxo)
  .fromP2PKH(selectedUtxoBob, bobSignatureTemplate)
  .to('bitcoincash:qrhea03074073ff3zv9whh0nggxc7k03ssh8jv9mkx', 10000n)
  .withoutChange()
  .send();
```

With the new transaction builder the API looks like this:

```typescript
import { TransactionBuilder, ElectrumNetworkProvider, SignatureTemplate } from 'cashscript';

const provider = new ElectrumNetworkProvider(Network.MAINNET);

// Specify the contract UTXO
const contractUtxos = await contract.getUtxos();
const selectedContractUtxo = contractUtxos[0]

// Specify Bob Utxo to add to the transaction
const bobUtxos = await provider.getUtxos(bobAddress);
const selectedUtxoBob = bobUtxos[0]

const bobSignatureTemplate = new SignatureTemplate(bobPriv)

// Start building the transaction
const txDetails = await new TransactionBuilder({ provider })
  .addInput(selectedContractUtxo, contract.unlock.transfer(bobSignatureTemplate))
  .addInput(selectedUtxoBob, bobSignatureTemplate.unlockP2PKH())
  .addOutput({
    to: 'bitcoincash:qrhea03074073ff3zv9whh0nggxc7k03ssh8jv9mkx',
    amount: 10000n
  })
  .send();
```

With the new transaction builder, all inputs and outputs are explicitly specified. This means that there are no automatic change outputs added (for BCH or tokens). This means that there are also no `.withMinChange()`, `.withoutChange()`, `.withoutTokenChange()`, `withHardcodedFee()`, or `.withFeePerByte()` methods. The developer is responsible for manually adding change outputs. There is still an option to use `.setMaxFee()` as a security measure to prevent the transaction from being too expensive.

### SDK: ElectrumNetworkProvider

The underlying `electrum-cash` library has been migrated to the new `@electrum-cash/network` package. This drops support for electrum cluster functionality. We reworked the second parameter of the `ElectrumNetworkProvider` constructor to be an options object, which can contain a custom electrum client or a custom hostname.

If you were not using custom clusters, there is no need to change anything. If you were using custom clusters, you will need to update your code to use the new `@electrum-cash/network` package and use a single client instead of a cluster.

#### Example

Before:

```typescript
import { ElectrumCluster, ClusterOrder } from 'electrum-cash';
import { ElectrumNetworkProvider } from 'cashscript';

const customCluster = new ElectrumCluster('CashScript Application', '1.4.1', 2, 3, ClusterOrder.PRIORITY);
customCluster.addServer('bch.imaginary.cash', 50004, ElectrumTransport.WSS.Scheme, false);
customCluster.addServer('blackie.c3-soft.com', 50004, ElectrumTransport.WSS.Scheme, false);
customCluster.addServer('electroncash.dk', 50004, ElectrumTransport.WSS.Scheme, false);

const provider = new ElectrumNetworkProvider('mainnet', customCluster);
```

After:

```typescript
import { ElectrumClient } from '@electrum-cash/network';
import { ElectrumNetworkProvider } from 'cashscript';

const customClient = new ElectrumClient('CashScript Application', '1.4.1', 'bch.imaginary.cash');
const provider = new ElectrumNetworkProvider('mainnet', { electrum: customClient });

// or

const provider = new ElectrumNetworkProvider('mainnet', { hostname: 'bch.imaginary.cash' });
```

## v0.9 to v0.10

### CashScript SDK

The `Reason` enum + `FailedTimeCheckError` and `FailedSigCheckError` errors have been removed. If you were using these to check your transaction errors, you should now use the new error classes `FailedRequireError`, `FailedTransactionEvaluationError` and `FailedTransactionError`.

If you were using `transaction.meep()` or using the `meep` string in errors, you should now use `transaction.bitauthUri()` to get a BitAuth URI for debugging or use the `bitauthUri` string in errors.

The `Argument` type has been split into `FunctionArgument` and `ConstructorArgument` and the `encodeArgument` function has been renamed to `encodeFunctionArgument`. If you were using these types in your code, you should update your code to use the new types, depending on whether you were using them as function arguments or constructor arguments.

## v0.7 to v0.8

### cashc compiler

`cashc` is now a [Pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c). This means that you can no longer use `require` to import `cashscript`. For more information, see the [ESM documentation](https://nodejs.org/api/esm.html).

`LockingBytecodeP2SH` should be replaced with `LockingBytecodeP2SH20` to keep the same behaviour, or updated to `LockingBytecodeP2SH32` to use the recommended new `P2SH32` Address type.

### CashScript SDK

`cashscript` is now a [Pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c). This means that you can no longer use `require` to import `cashscript`. For more information, see the [ESM documentation](https://nodejs.org/api/esm.html).

#### Contract instantiation

When instantiating a `Contract` object, you now have to pass an options object as a third parameter instead of a network provider. This options object contains the network provider, as well as the address type. The address type defaults to `p2sh32` but can be changed to `p2sh20` if you want to keep the same address type as in earlier versions of the SDK.

```typescript
// old
const contract = new Contract(artifact, constructorArgs, provider);

// new
const options = { provider, addressType: 'p2sh20' };
const contract = new Contract(artifact, constructorArgs, options);
```

#### SIGHASH_UTXO

All signature templates use `SIGHASH_ALL | SIGHASH_UTXOS` now, to keep using only the previous `SIGHASH_ALL`, overwrite it in the following way:

```typescript
const sig = new SignatureTemplate(wif, HashType.SIGHASH_ALL);
```

Note that you *need* to use only `SIGHASH_ALL` if you're still using "old-style" covenants (from CashScript v0.6.0 and lower). It is recommended to upgrade to the new "native" covenants (from CashScript v0.7.0 and higher) instead.

#### bigint

You can no longer use `number` inputs for constructor arguments, function arguments, or input/output amounts. Use `bigint` instead. `contract.getBalance()` and `contract.getUtxos()` now also return `bigint` for satoshi amounts instead of `number`.

#### Name changes & removal of deprecated features

* Network options `"testnet"` and `"staging"` should be replaced with `"testnet3"` and `"testnet4"` respectively.
* `contract.getRedeemScriptHex()` should be replaced with `contract.bytecode`.
* `BitboxNetworkProvider` has been removed since Bitbox is long deprecated. Switch to modern solutions like `ElectrumNetworkProvider` instead.

## v0.6 to v0.7

### cashc compiler

The older *preimage-based* introspection/covenants have been replaced with the newly supported *native* introspection/covenants. This has significant consequences for any existing covenant contracts, but in general this native introspection makes covenants more accessible, flexible and efficient. See below for a list of changes. In some cases there is no one to one mapping between the old introspection and the new introspection methods, so the logic of the smart contracts will need to be refactored as well.

Most importantly, it is now possible to access specific data for all individual inputs and outputs, rather than e.g. working with hashes of the outputs (`tx.hashOutputs`). This offers more flexibility around the data you want to enforce. For more information about this new *native* introspection functionality, refer to the [Global covenant variables](global_variables_introspection.md#introspection-variables) section of the documentation, the [Covenants guide](covenants_guide.md) and the [Native Introspection CHIP](https://gitlab.com/GeneralProtocols/research/chips/-/blob/master/CHIP-2021-02-Add-Native-Introspection-Opcodes.md).

#### Covenant variables

* `tx.version` and `tx.locktime` used to be `bytes4`, but are now `int`.
* `tx.hashtype` has been removed and can no longer be accessed.
* `tx.hashPrevouts` and `tx.outpoint` have been removed. Instead, the outpoints of individual inputs can be accessed with `tx.inputs[i].outpointTransactionHash` and `tx.inputs[i].outpointIndex`. The index of the *active* input can be accessed with `this.activeInputIndex`.
* `tx.hashSequence` and `tx.sequence` have been removed. Instead, the sequence numbers of individual inputs can be accessed with `tx.inputs[i].sequenceNumber`. The index of the *active* input can be accessed with `this.activeInputIndex`.
* `tx.bytecode` has been renamed to `this.activeBytecode`
* `tx.value` has been removed. Instead, the value of individual inputs can be accessed with `tx.inputs[i].value`. The index of the *active* input can be accessed with `this.activeInputIndex`.
* `tx.hashOutputs` has been removed. Instead, the value and locking bytecode of individual outputs can be accessed separately with `tx.outputs[i].value` and `tx.outputs[i].lockingBytecode`.

Additionally, it is now possible to access the *number* of inputs and outputs with `tx.inputs.length` and `tx.outputs.length`. It is also possible to access individual inputs' locking bytecode and unlocking bytecode with `tx.inputs[i].lockingBytecode` and `tx.inputs[i].unlockingBytecode`. It is also no longer a requirement to have a signature check somewhere in the contract in order to use this introspection/covenant functionality.

#### Utility classes

`OutputP2PKH`, `OutputP2SH` and `OutputNullData` have been replaced by `LockingBytecodeP2PKH`, `LockingBytecodeP2SH` and `LockingBytecodeNullData` respectively. These new classes *only* produce the locking bytecode, rather than the full output (including value). This means that the locking bytecode and value of outputs need to be checked separately.

#### Other changes

Casting from `sig` to `datasig` has been removed since that was only useful for old-style covenants. If, for any reason, you do want to cast a sig to a datasig you will need to manually cut the `hashtype` off the end and update `datasig(s)` to `s.split(s.length - 1)[0]`.

#### Example

Since the new covenant functionality is very different from the existing, it may be useful to see a complex covenant contract refactored from the old way to the new way.

Mecenas.cash v0.6.0

```cashscript
pragma cashscript ^0.6.0;

contract Mecenas(bytes20 recipient, bytes20 funder, int pledge, int period) {
    function receive(pubkey pk, sig s) {
        require(checkSig(s, pk));
        require(tx.age >= period);

        int minerFee = 1000;
        int intValue = int(bytes(tx.value));

        if (intValue <= pledge + minerFee) {
            // The contract has less value than the pledge, or equal.
            // The recipient must claim all of it.

            bytes8 amount1 = bytes8(intValue - minerFee);
            bytes34 out1 = new OutputP2PKH(amount1, recipient);
            require(hash256(out1) == tx.hashOutputs);
        } else {
            // The contract has more value than the pledge. The recipient must
            // also add one change output sending the remaining coins back
            // to the contract.

            bytes8 amount1 = bytes8(pledge);
            bytes8 amount2 = bytes8(intValue - pledge - minerFee);
            bytes34 out1 = new OutputP2PKH(amount1, recipient);
            bytes32 out2 = new OutputP2SH(amount2, hash160(tx.bytecode));
            require(hash256(out1 + out2) == tx.hashOutputs);
        }
    }

    function reclaim(pubkey pk, sig s) {
        require(hash160(pk) == funder);
        require(checkSig(s, pk));
    }
}
```

Mecenas.cash 0.7.0

```cashscript
contract Mecenas(bytes20 recipient, bytes20 funder, int pledge, int period) {
    function receive() {
        require(tx.age >= period);

        // Check that the first output sends to the recipient
        bytes25 recipientLockingBytecode = new LockingBytecodeP2PKH(recipient);
        require(tx.outputs[0].lockingBytecode == recipientLockingBytecode);

        // Calculate the value that's left
        int minerFee = 1000;
        int currentValue = tx.inputs[this.activeInputIndex].value;
        int changeValue = currentValue - pledge - minerFee;

        // If there is not enough left for *another* pledge after this one,
        // we send the remainder to the recipient. Otherwise we send the
        // remainder to the recipient and the change back to the contract
        if (changeValue <= pledge + minerFee) {
            require(tx.outputs[0].value == currentValue - minerFee);
        } else {
            require(tx.outputs[0].value == pledge);
            bytes changeBytecode = tx.inputs[this.activeInputIndex].lockingBytecode;
            require(tx.outputs[1].lockingBytecode == changeBytecode);
            require(tx.outputs[1].value == changeValue);
        }
    }

    function reclaim(pubkey pk, sig s) {
        require(hash160(pk) == funder);
        require(checkSig(s, pk));
    }
}
```

## v0.5 to v0.6

### cashc compiler

The exports for library usage of `cashc` have been updated. All utility-type exports have been moved to the `@cashscript/utils` package, but they are still accessible from the `utils` export from `cashc`. Note that the recommended use of `cashc` is still the CLI, not the NPM package.

In v0.5 you could encode a string like this:

```typescript
const { Data } = require('cashc');

const encodedString = Data.encodeString('Hello World');
```

While for v0.6 you'd need to use the `utils` export or `@cashscript/utils`:

```typescript
const { utils } = require('cashc');
const { encodeString } = require('@cashscript/utils');

const encodedString = utils.encodeString('Hello World');
const encodedString = encodeString('Hello World');
```

Compilation functions used to be exported as part of the `CashCompiler` object, but are now exported as standalone functions.

In v0.5 compilation looked like this:

```typescript
const { CashCompiler } = require('cashc');

const Mecenas = CashCompiler.compileFile(path.join(__dirname, 'mecenas.cash'));
```

In v0.6, this needs to be changed to this:

```typescript
const { compileFile } = require('cashc');

const Mecenas = compileFile(path.join(__dirname, 'mecenas.cash'));
```

### CashScript SDK

The CashScript SDK no longer depends on `cashc` and no longer exports the `CashCompiler` object. This reflects the recommended usage where the CLI is used for compilation and the artifact JSON is saved. Then this artifact JSON can be imported into the CashScript SDK. If you prefer to compile your contracts from code, you need to add `cashc` as a dependency and use its compilation functionality.

## v0.4 to v0.5

### CashScript SDK

The contract instantiation flow has been refactored to enable compatibility with more BCH libraries and simplify the different classes involved.

In v0.4 a contract could be compiled or imported using `Contract.compile()` or `Contract.import()`, which returned a Contract object. On that Contract object `contract.new(...args)` could be called, which returned an Instance object. In the v0.5 release, the Contract and Instance objects have been merged and simplified, while the compilation has been extracted into its own class.

In v0.4, contract instantiation looked like this:

```typescript
const { Contract } = require('cashscript');

const Mecenas = Contract.compile(path.join(__dirname, 'mecenas.cash'), 'testnet');
const contract = Mecenas.new(alicePkh, bobPkh, 10000);
```

In v0.5, this needs to be changed to look like this:

```typescript
const { CashCompiler, ElectrumNetworkProvider, Contract } = require('cashscript');

const Mecenas = CashCompiler.compileFile(path.join(__dirname, 'mecenas.cash'));
const provider = new ElectrumNetworkProvider('testnet');
const contract = new Contract(Mecenas, [alicePkh, bobPkh, 10000], provider);
```

* Transaction object's `.send()` function now returns either a libauth Transaction or raw hex string rather than a BITBOX Transaction. If it is necessary, the raw hex string can be imported into libraries such as BITBOX to achieve similar functionality as before.
* In v0.4.1, `Sig` was deprecated in favour of `SignatureTemplate`. In v0.5.0, the deprecated class has been removed. All occurrences of `Sig` should be replaced with `SignatureTemplate`.

See the [release notes](release_notes_and_migrations.md#v050) for an overview of other new changes.

## v0.3 to v0.4

### cashc compiler

In v0.3, casting an `int` type to a `bytes` would perform an `NUM2BIN` operation, padding the value to 8 bytes. This made `bytes(10)` equivalent to `bytes8(10)`. From v0.4.0 onwards, casting to an *unbounded* `bytes` type is only a semantic cast, indicating that the `int` value should be treated as a `bytes` value.

* If you need the old behaviour, you should change all occurrences of `bytes(x)` to `bytes8(x)`.

### CashScript SDK

The entire `Transaction` flow has been refactored to a more fluent chained TransactionBuilder API.

* All occurrences of `.send(to, amount)` should be replaced with `.to(to, amount).send()`.
* All occurrences of `.send(outputs)` should be replaced with `.to(outputs).send()`. 
  
  
  * Alternatively, the list of `outputs` can be split up between several `.to()` calls.
  * If any of the outputs contain `opReturn` outputs, these should be added separately using `.withOpReturn(chunks)`
* The same transformations are applicable to all `.meep()` calls.
* The `meep()` function previously logged the meep command automatically, but now it returns the command as a string, so you should `console.log()` the command separately.
* All transaction options previously included in the `TxOptions` object should now be provided using chained functions. 
  
  
  * The `time` option should be provided using the `.withTime(time)` function.
  * The `age` option should be provided using the `.withAge(age)` function.
  * The `fee` option should be provided using the `.withHardcodedFee(fee)` function.
  * The `minChange` option should be provided using the `.withMinChange(minChange)` function.

In v0.2.2, `Contract.fromCashFile()` and `Contract.fromArtifact()` were deprecated in favour of `Contract.compile()` and `Contract.import()`. In v0.4.0, the deprecated functions have been removed.

* All occurrences of `Contract.fromCashFile()` should be replaced with `Contract.compile()`.
* All occurrences of `Contract.fromArtifact()` should be replaced with `Contract.import()`.

See the [release notes](release_notes_and_migrations.md#v040) for an overview of other new changes.

---

## v0.13.2

#### cashc compiler

* 🛠  Add source tag annotations for compiler-injected opcodes for loop condition and stack cleanup.

#### CashScript SDK

* ✨  Add `calculateTransactionFee()` method to `TransactionBuilder` class.
* 🛠  Add additional local validation when building a transaction.

## v0.13.1

#### cashc compiler

* ✨  Allow custom `CashScriptErrorListener` to be passed to the compiler.
* 🐛  Fix missing location data in tuple assignment errors.

#### CashScript SDK

* ✨  In the `MockNetworkProvider`, `addUtxo()` now returns the added UTXO.

## v0.13.0

This release contains several breaking changes, please refer to the [migration notes](release_notes_and_migrations.md) for more information.

#### cashc compiler

* ✨  Add support for `for`, `while` and `do-while` loops.
* ✨  Add support for compound assignment operators (`+=`, `-=`) and increment/decrement operators (`++`, `--`).
* ✨  Add support for bitwise and arithmetic shift operators (`<<`, `>>`) and bitwise inversion (`~`).
* ✨  Add `fingerprint` field to artifact to allow for fingerprinting of the contract bytecode.
* ✨  Add `unsafe_bool()` and `unsafe_int()` casting for semantic-only casts.
* ✨  Add support for narrowing bytes types after `x.length == N` and checks in require or if statements.
* 🛠  **BREAKING**: Automatically inject `require(tx.time >= tx.locktime)` when a function uses `tx.locktime` without a `tx.time` check in scope, ensuring the spending input is non-final so `nLockTime` is enforced. This can be disabled with the `enforceLocktimeGuard: false` compiler option (CLI: `--skip-enforce-locktime-guard`).
* 🛠  **BREAKING**: Function parameter types are now strictly enforced (bounded bytes and boolean values). This can be disabled with the `enforceFunctionParameterTypes: false` compiler option (CLI: `--skip-enforce-function-parameter-types`).
* 🛠  Add source tag annotations for compiler-injected opcodes.
* 🐛  Fix issue where casting bytes larger than `bytes8` to `int` was not allowed.
* 🐛  Fix issue where empty bytecode contracts were not properly compiled.
* 🐛  **BREAKING**: Fix issue where `bool()` casting did not change the value of the argument.
* 💥  **BREAKING**: Rename `bytes4(int)` and `bytes(int, 4)` to `toPaddedBytes(int, 4)`.
* 💥  **BREAKING**: Rename `bytes4(bytes)` to `unsafe_bytes4(bytes)`.
* 🐎  Add optimisations for negated number comparisons and boolean comparisons.

#### CashScript SDK

* ✨  Add support for loops in debug tooling.
* ✨  Add support for `p2s` contract type.
* ✨  Add `addBchChangeOutputIfNeeded()` method to `TransactionBuilder` class.
* ✨  Add `addTokenChangeOutputIfNeeded()` method to `TransactionBuilder` class for adding a fungible token change output for a specific category.
* ✨  Add `getTransactionSize` method to `TransactionBuilder` class.
* ✨  Add `lockingBytecode` property to `Contract` class.
* ✨  Add `getUtxosForLockingBytecode()` method to `ElectrumNetworkProvider` class and `MockNetworkProvider` interface.
* ✨  In the `MockNetworkProvider`, `addUtxo()` now also allows UTXOs to be added by locking bytecode.
* ✨  Add `gatherBchUtxos()` and `gatherFungibleTokenUtxos()` functions to the SDK for gathering UTXOs.
* ✨  Add specific network error classes to standardise error handling in network providers.
* ✨  Add TSDoc strings for all public classes and methods.
* 🐛  Fix issue where `FailedTransactionError` would not show underlying error if BitAuth URI generation failed.
* 💥  **BREAKING**: Remove `BitcoinRpcNetworkProvider` and `FullStackNetworkProvider` from the SDK.
* 🛠  **BREAKING**: Rename `addressType` option on `Contract` constructor to `contractType`.
* 🛠  **BREAKING**: Remove undocumented `redeemScript` property from `Contract` class.
* 🛠  **BREAKING**: Remove undocumented `buildLibauthTransaction()` method from `TransactionBuilder` class.
* 🛠  Update default VM target to `BCH_2026_05`.
* 🛠  Improve validation when adding outputs to a transaction.
* 🛠  Improve package size by tidying up dependencies.

#### Testing Suite

* 🛠  Add README.md to help guide users on how to use the testing suite.
* 🛠  Compile all contracts in the `contracts/` directory and save the artifacts in the `artifacts/` directory.
* 🛠  Compile TS artifacts as well as JSON artifacts.
* 🛠  Add key management utilities for testing.

[https://x.com/CashScriptBCH/status/2059199869261095106](https://x.com/CashScriptBCH/status/2059199869261095106)

## v0.12.2

#### cashc compiler

* ✨  Backport from v0.13.1: allow custom `CashScriptErrorListener` to be passed to the compiler.
* 🐛  Backport from v0.13.1: fix missing location data in tuple assignment errors.

## v0.12.1

#### CashScript SDK

* ✨  Add Vitest extensions for automated testing.

## v0.12.0

This release contains several breaking changes, please refer to the [migration notes](release_notes_and_migrations.md) for more information.

#### CashScript SDK

* ✨  Add `getVmResourceUsage` method to `TransactionBuilder`.
* ✨  Add `maximumFeeSatsPerByte` and `allowImplicitFungibleTokenBurn` options to `TransactionBuilder` constructor.
* ✨  Add a configurable `vmTarget` option to `MockNetworkProvider`.
* ✨  Add support for ECDSA signatures in contract unlockers for `sig` and `datasig` parameters.
* ✨  Add `signMessageHash()` method to `SignatureTemplate` to allow for signing of non-transaction messages.
* 💥  **BREAKING**: Remove deprecated "old" transaction builder (`contract.functions`).
* 💥  **BREAKING**: Make `provider` a required option in `Contract` constructor.
* 💥  **BREAKING**: Set `updateUtxoSet` to `true` by default for `MockNetworkProvider`.
* 💥  **BREAKING**: No longer seed the MockNetworkProvider with any test UTXOs.
* 💥  **BREAKING**: Replace `setMaxFee()` method on `TransactionBuilder` with `maximumFeeSatoshis` option.
* 💥  **BREAKING**: Rename `bitauthUri()` method on `TransactionBuilder` to `getBitauthUri()` for consistency.
* 🛠  Improve libauth template generation.
* 🐛  Fix bug where `SignatureTemplate` would not accept private key hex strings as a signer.

[https://x.com/CashScriptBCH/status/1973692336782876974](https://x.com/CashScriptBCH/status/1973692336782876974)

## v0.11.5

#### CashScript SDK

* ✨  Include input index in console.log statements for debugging.
* ✨  Improve type inference for function and constructor arguments in the `Contract` class.
* 🛠  Replace redundant dependencies.
* 🐛  Remove accidental dependency inclusion of `@types/node`.

## v0.11.4

#### CashScript SDK

* ✨  Add `updateUtxoSet` option to `MockNetworkProvider` to allow for updating the UTXO set after a transaction is sent.
* 🐛  Fix bug where sending P2PKH-only transactions would throw `No placeholder scenario ID or script ID found`.

## v0.11.3

#### cashc compiler

* ✨  Add `.slice(start, end)` operator for bytes and strings.
* ✨  Add bounded bytes typing and bounds checking for `.split()` (includes checking for negative indices).
* 🐎  Add optimisation for `.slice(0, x)` and `.slice(x, y.length)` (also applies to `.split(0)[1]`).
* 🐛  Disallow incorrect bounded bytes typing when using `.split()`.

#### CashScript SDK

* 🐛  Fix bug where `ElectrumNetworkProvider` would disconnect in browser on visibility change of the page.

## v0.11.2

#### CashScript SDK

* 🐛  Fix bug with new `generateWcTransactionObject()` throwing when using `placeholderP2PKHUnlocker()`.

## v0.11.1

#### CashScript SDK

* ✨  Add `generateWcTransactionObject()` method to `TransactionBuilder` to generate a `WcTransactionObject` that can be used to sign a transaction with a WalletConnect client.
* ✨  Add `placeholderSignature()`, `placeholderPublicKey()` and `placeholderP2PKHUnlocker()` helper functions to the SDK for WalletConnect usage.

[https://x.com/CashScriptBCH/status/1942513305420968238](https://x.com/CashScriptBCH/status/1942513305420968238)

## v0.11.0

This update adds CashScript support for the new BCH 2025 network upgrade. To read more about the upgrade, see [this blog post](https://blog.bitjson.com/2025-chips/).

This release also contains several breaking changes, please refer to the [migration notes](release_notes_and_migrations.md) for more information.

Thanks [kiok](https://x.com/cypherpunk_bch) for the significant contributions!

#### cashc compiler

* 🐛  Fix bug where source code in `--format ts` artifacts used incorrect quotation marks.
* 🛠  Remove warning for opcount and update warning for byte size to match new limits.
* 💥  **BREAKING**: `tx.age` was renamed to `this.age` to better reflect that it enforces a UTXO-level locktime check (*not* transaction-level).
* 💥  **BREAKING**: The entire `debug` object on the artifact is reworked to enable debugging the optimised contract bytecode.

#### CashScript SDK

* ✨  Add debugging capabilities to the `TransactionBuilder`. 
  
  
  * `transaction.debug()` & `transaction.bitauthUri()`
  * Output BitAuth IDE URI for debugging when transaction is rejected.
  * Libauth template generation and debugging for multi-contract transactions
* ✨  Debugging now supports using the optimised contract bytecode (when compiled with `cashc@0.11.0` or later).
* ✨  Add `setBlockHeight()` method to `MockNetworkProvider`
* ✨  Config-free usage of the CashScript SDK with Vite or Webpack
* 🛠  Update debug tooling to use the new `BCH_2025_05` instruction set.
* 🛠  Deprecate the simple transaction builder. You can still use the simple transaction builder with the current SDK, but this support will be removed in a future release
* 💥  **BREAKING**: the Jest utilities for automated testing are now synchronous and no longer work with the deprecated simple transaction builder 
  
  
  * `expect(transaction).toLog(message)`
  * `expect(transaction).toFailRequire()`
  * `expect(transaction).toFailRequireWith(message)`
* 💥  **BREAKING**: Remove support for custom Clusters from `ElectrumNetworkProvider` and added a configuration object to the constructor.
* 💥  **BREAKING**: Remove support for old contracts compiled with CashScript v0.6.x or earlier.
* 🐛  Fix bug where `JestExtensions` `expect().toLog()` would detect logs from different tests.
* 🐛  Fix bug where certain edge cases in require statements caused the `FailedRequireError` message to be slightly different from the original error message.

[https://x.com/CashScriptBCH/status/1935662184865890325](https://x.com/CashScriptBCH/status/1935662184865890325)

#### @cashscript/utils

* 💥  **BREAKING**: Remove `importArtifact` and `exportArtifact` helper functions. If you want to import or export artifacts, use `'fs'` to read and write files directly.

## v0.10.5

#### cashc compiler

* 🐛  Fix bug in new TypeScript typings for artifact.

## v0.10.4

#### cashc compiler

* 🐛  Fix bug in new `--format ts` option.

## v0.10.3

#### cashc compiler

* ✨  Add `--format ts` option to `cashc` CLI to generate TypeScript typings for the artifact.

#### CashScript SDK

* ✨  Add automatic TypeScript typings for `Contract` class when artifact is generated using the `cashc` CLI with the `--format ts` option.

## v0.10.2

#### cashc compiler

* ✨  Add support for using underscores in numeric literals to improve readability, e.g. `1_000_000`.
* ✨  Add support for using scientific notation in numeric literals, e.g. `1e6` or `1E6`.

#### CashScript SDK

* 🐛  Fix fee calculation when using `SignatureAlgorithm.ECDSA`.
* 🛠  Clean up dependencies.

## v0.10.1

#### CashScript SDK

* 🐛  Fix bug with `MockNetworkProvider` returning the wrong `Network` type (now returns `Network.MOCKNET` / `"mocknet"`).
* 🐛  Fix bug in debug tooling where incorrect placeholder keys were used when evaluating transactions with P2PKH inputs.

## v0.10.0

In this version we added proper debugging support for transactions and integration with the BitAuth IDE.

Thanks [mainnet_pat](https://x.com/mainnet_pat) for the initiative and significant contributions!

#### cashc compiler

* ✨  Add `console.log()` statements for debugging.
* ✨  Extend `require()` statements to allow custom error messages for debugging.
* 🛠  Update artifact format to allow for new debugging features.
* 🛠  Update dependencies to new major versions.

#### CashScript SDK

* ✨  Add support for transaction evaluation and debugging using libauth templates. 
  
  
  * `transaction.debug()` & `transaction.bitauthUri()`
  * Output BitAuth IDE URI for debugging when transaction is rejected.
* ✨  Add `MockNetworkProvider` to simulate network interaction for debugging and testing. 
  
  
  * Add `randomUtxo()`, `randomToken()` and `randomNft()` functions to generate dummy UTXOs for testing.
* ✨  Add CashScript Jest utilities for automated testing. 
  
  
  * `await expect(transaction).toLog(message)`
  * `await expect(transaction).toFailRequire()`
  * `await expect(transaction).toFailRequireWith(message)`
* 🐛  Fix bug with type exports.
* 🛠  Update visibility of several classes. 
  
  
  * Make `artifact`, `networkProvider`, `addressType` and `encodedConstructorArgs` public on `Contract` class.
  * Make `contract`, `abiFunction`, `encodedFunctionArgs`, `inputs` and `outputs` public on `Transaction` class.
  * Make `networkProvider`, `inputs` and `outputs` public on `TransactionBuilder` class.
  * Make `privateKey` public on `SignatureTemplate` class and add `getSignatureAlgorithm()` method.
* 🛠  Improve some error messages.
* 🛠  Add new `FailedRequireError`, `FailedTransactionEvaluationError` and `FailedTransactionError` classes.
* 💥  **BREAKING**: Remove exported transaction error `Reason` enum + `FailedTimeCheckError` and `FailedSigCheckError` classes in favour of the new error classes.
* 💥  **BREAKING**: Remove all deprecated references to `meep` including `meep` strings from errors and `transaction.meep()`.
* 💥  **BREAKING**: Separate the `Argument` type into `FunctionArgument` and `ConstructorArgument` and rename `encodeArgument` to `encodeFunctionArgument`.

[https://x.com/CashScriptBCH/status/1833454128426615174](https://x.com/CashScriptBCH/status/1833454128426615174)

## v0.9.3

#### cashc compiler

* 🛠  Migrate from antlr4ts to ANTLR's official TypeScript target to remove circular dependency issues.

## v0.9.2

#### CashScript SDK

* 🐛  Fix bug where UTXOs would be needlessly retrieved from the network during `build()` calls.
* 🐛  Fix off-by-one fee calculation error with transactions that have many outputs.
* 🐛  Fix bug where no error was thrown when invalid NFT commitment or token category were provided.
* 🛠  Export all interfaces from CashScript's `interfaces.ts`.
* 🛠  Merge duplicate code between Transaction.ts and TransactionBuilder.ts.

## v0.9.1

#### CashScript SDK

* 🐛  Fix TransactionBuilder export bug.

## v0.9.0

#### CashScript SDK

* ✨  Add new `TransactionBuilder` class that allows combining UTXOs from multiple different smart contracts and P2PKH UTXOs in a single transaction.
* 🛠  Deprecate all `meep` functionality. Meep has been unmaintained for years and does not support many new CashScript features. Meep functionality will be removed in a future release.

[https://x.com/CashScriptBCH/status/1713928572677583023](https://x.com/CashScriptBCH/status/1713928572677583023)

## v0.8.2

#### CashScript SDK

* 🐛  Fix bug with Vite build.
* ✨  Expose `ElectrumNetworkProvider#performRequest` to allow raw Electrum requests if needed.

## v0.8.1

#### CashScript SDK

* 🐛  Fix bug where a different property order of NFT inputs/outputs would cause errors.

## v0.8.0

⚠️  From v0.8.0 onwards, CashScript is a [Pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c). This means that you can no longer use `require()` to import `cashscript` or `cashc`.

This release also contains several breaking changes, please refer to the [migration notes](release_notes_and_migrations.md) for more information.

#### cashc compiler

* ✨  Add support for the new CashTokens introspection functionality (`tokenCategory`, `nftCommitment` and `tokenAmount` for both in- and outputs).
* ✨  Add `LockingBytecodeP2SH32` to generate the new P2SH32 standard locking script.
* 🐛  Fix optimisation bug that caused `OP_0NOTEQUAL` to be applied to non-integer values.
* 💥  **BREAKING**: Move to Pure ESM.
* 💥  **BREAKING**: Rename `LockingBytecodeP2SH` to `LockingBytecodeP2SH20` - but it is recommended to change over to the new P2SH32 for security reasons.

#### CashScript SDK

* ✨  Add support for CashTokens. 
  
  
  * `.to()` now takes a `token` parameter that can be used to send CashTokens.
  * UTXOs that are retrieved with `contract.getUtxos()` include a `token` field if they are token UTXOs.
  * UTXOs that are passed into `.from()` can also include this `token` field to send tokens.
  * Add `.withoutTokenChange()` to disable automatic token change outputs.
  * Note that only the `ElectrumNetworkProvider` supports CashTokens at this time.
  * Note that NFTs do not support automatic UTXO selection
* ✨  Add `contract.tokenAddress` to get the token-enabled address of a contract.
* ✨  Add `fromP2PKH()` to add P2PKH inputs to a smart contract transaction. 
  
  
  * Note: this was in the SDK before as `experimentalFromP2PKH()`. It has now been released as an official feature.
* 💥  **BREAKING**: Move to Pure ESM.
* 💥  **BREAKING**: Remove `"testnet"` & `"staging"` network options.
* 💥  **BREAKING**: `contract.address` returns `p2sh32` address by default, this can be configured to be `p2sh20` on contract initialization.
* 💥  **BREAKING**: Move the configuration of the network provider to an options object on contract initialization.
* 💥  **BREAKING**: Use `bigint` rather than `number` for all instances of "script numbers" (e.g. function arguments) and satoshi amounts.
* 💥  **BREAKING**: Replace `contract.getRedeemScriptHex()` with `contract.bytecode`.
* 💥  **BREAKING**: Remove `BitboxNetworkProvider`.
* 💥  **BREAKING**: All signature templates use  `SIGHASH_ALL | SIGHASH_UTXOS` now, this new default can be overwritten in the constructor of the `SignatureTemplate`.

[https://x.com/CashScriptBCH/status/1662092546372255744](https://x.com/CashScriptBCH/status/1662092546372255744)

## v0.7.5

#### CashScript SDK

* 🐛  Fix a bug with chipnet connection

## v0.7.4

#### cashc compiler

* 🛠  Internal refactoring

#### CashScript SDK

* 🐛  Fix a bug with ESM exports

## v0.7.3

#### CashScript SDK

* ✨  Add `"chipnet"` network option to ElectrumNetworkProvider, used to connect to the May 2023 testnet.

* 🛠  Renamed network options `"testnet"` & `"staging"` to `"testnet3"` and `"testnet4"` respectively. Old options will be removed in a future release.

## v0.7.2

#### cashc compiler

* 🐛  Fix bug where contracts using `checkMultiSig()` were unspendable.

#### CashScript SDK

* ✨  Add `signatureAlgorithm` parameter to `SignatureTemplate` to allow ECDSA signatures.

## v0.7.1

#### @cashscript/utils

* 🐛  Fix bug where 64bit integers could not be decoded.

## v0.7.0

#### cashc compiler

* ✨  Add destructuring assignments, e.g. `bytes2 left, bytes1 right = 0x123456.split(2)`
* ✨  Add constant keyword, e.g. `int constant x = 10;`
* ✨  Add multiplication, e.g. `int x = 5 * 5`
* ✨  Add *native* introspection/covenants
* 💥  **BREAKING**: Remove all old introspection/covenant functionality (`tx.version`, `tx.hashPrevouts`, `tx.hashSequence`, `tx.outpoint`, `tx.bytecode`, `tx.value`, `tx.sequence`, `tx.hashOutputs`, `tx.locktime`, `tx.hashtype`, `OutputP2PKH`, `OutputP2SH`, `OutputNullData`) 
  
  
  * See the [migration notes](release_notes_and_migrations.md#v06-to-v07) for details on migrating from the old introspection to the new *native* introspection methods.
* 💥  **BREAKING**: Remove `sig` to `datasig` casting since this was only useful for *old* covenants
* 🐛  Fix ESM build

#### CashScript SDK

* ✨  Add `"staging"` network option to ElectrumNetworkProvider, used to connect to the May 2022 testnet
* 🛠  Deprecate old introspection/covenant functionality. You can still use pre-0.7 contracts with the new SDK, but this support will be removed in a future release.
* 💥  **BREAKING**: arguments of type `datasig` must be 64 bytes in length, effectively enforcing Schnorr
* 🐛  Fix ESM build
* 🐛  Small fixes

[https://x.com/RoscoKalis/status/1529072055756414976](https://x.com/RoscoKalis/status/1529072055756414976)

## v0.6.5

#### cashc compiler

* 🐛  Fix `cashc` version

## v0.6.4

#### cashc compiler

* ✨  Add `byte` type alias for `bytes1`

## v0.6.3

* 🛠  Use ES2015 for the "module" output for better compatibility

## v0.6.2

#### CashScript SDK

* 🐛  Fix typing issue with BitcoinRpcNetworkProvider

## v0.6.1

#### CashScript SDK

* 🐛  Fix bug with incorrect fee calculation when providing custom fee per byte

## v0.6.0

#### cashc compiler

* ✨  Add date literal (gets converted to int timestamp)
* 🛠  Update ParseError messages
* 🐛  The final statement in a contract now MUST be a require statement (in all branches)
* 🐛  Empty contracts and functions are now considered invalid
* 🐛  Fix bug where certain covenants could become unspendable due to incorrect bytesize calculation 
  
  
  * 💥  **BREAKING**: Covenants using `tx.bytecode` now include a placeholder `OP_NOP` that gets replaced when constructor arguments are provided in the CashScript SDK. If you're not using the CashScript SDK, refer to the [`replaceBytecodeNop()` function](https://github.com/CashScript/cashscript/blob/v0.6.0/packages/utils/src/script.ts#L130) to see the steps required to do so manually.
* 💥  **BREAKING**: Remove `--args` parameter from the CLI, since this is too error prone with the recent changes in mind
* 💥  **BREAKING**: Restructure exports

#### CashScript SDK

* ✨  Add BitcoinRpcNetworkProvider that connects to a BCH node RPC
* 💥  **BREAKING**: Remove dependency on `cashc` and remove `CashCompiler` export

[https://x.com/RoscoKalis/status/1371896417443282956](https://x.com/RoscoKalis/status/1371896417443282956)

## v0.5.7

#### cashc compiler

* 🐛  Better error reporting for parsing/lexing errors

## v0.5.6

#### cashc compiler

* 🐛  Make compiler fail early when encountering lexing/parsing errors, rather than performing error recovery
* 🐛  Allow empty hex literals (i.e. `0x`)

## v0.5.5

#### CashScript SDK

* ✨  Add `'regtest'` as a possible network for NetworkProviders.

## v0.5.4

* 📦  Add dual build system (CommonJS and ES Modules) to accommodate tree-shaking.

## v0.5.3

#### CashScript SDK

* ✨  Add `getRedeemScriptHex()` function to the `Contract` class.
* 🐛  Fix a bug where transaction locktime could not specifically be set to 0.
* 🐛  Fix a bug where signature buffers were not checked for size.

## v0.5.2

#### cashc compiler

* 🐛  Fix a bug where an incorrect error message was displayed in Firefox when an incompatible pragma version was used.

## v0.5.1

#### CashScript SDK

* ✨  The `.send()` function now returns a `TransactionDetails` object. This extends the libauth `Transaction` with added `txid` and `hex` fields. 
  
  
  * Because it extends the previous return type, this is backwards compatible.
  * Since this now returns the transaction hex as a field, using `.send(true)` to return the transaction hex is deprecated and will be removed in a future release.
* 🐛  Improve reliability of the `ElectrumNetworkProvider` when sending multiple concurrent requests.

[https://x.com/RoscoKalis/status/1301521593399685121](https://x.com/RoscoKalis/status/1301521593399685121)

## v0.5.0

#### CashScript SDK

CashScript used to be very tightly coupled with BITBOX. This proved to be problematic after maintenance for BITBOX was stopped. The main objective of this update is to allow CashScript to be used with many different BCH libraries.

* ✨  Add `withoutChange()` function to disable change outputs for a transaction.
* ✨  `SignatureTemplate` can now be used with BITBOX keypairs, `bitcore-lib-cash` private keys, WIF strings, and raw private key buffers, rather than *only* BITBOX.
* 💥  Remove `Sig` alias for `SignatureTemplate` that was deprecated in v0.4.1.
* 💥  **BREAKING**: Refactor contract instantiation flow 
  
  
  * A contract is now instantiated by providing a compiled artifact, constructor arguments and an optional network provider.
  * Anyone can implement the NetworkProvider interface to create a custom provider. The CashScript SDK offers three providers out of the box: one based on electrum-cash (default), one based on FullStack.cash' infrastructure, and one based on BITBOX. See the [NetworkProvider docs](sdk_network_providers.md) for details.
  * See the [migration notes](release_notes_and_migrations.md#v04-to-v05) for details on migrating from the old contract instantiation flow.
* 💥  **BREAKING**: Remove the artifacts `'networks'` field and `.deployed()` functionality, This proved to be confusing and is better suited to be handled outside of the CashScript SDK.
* 💥  **BREAKING**: `.send()` now returns a libauth Transaction instead of a BITBOX Transaction object. Alternatively a `raw` flag can be passed into the function to return a raw hex string.
* 🛠  Removed BITBOX as a dependency in favour of libauth for utility functions.

[https://x.com/RoscoKalis/status/1298645699559596033](https://x.com/RoscoKalis/status/1298645699559596033)

## v0.4.4

#### cashc compiler

* 🐛  Fix a bug where covenants would not always get verified correctly when the first `require(checkSig(...))` statement was inside a branch.

## v0.4.3

#### cashc compiler

* 🐎  Add compiler optimisations.

## v0.4.2

* Re-add README files to NPM that were accidentally removed in the v0.4.0 release.

## v0.4.1

#### cashc compiler

* 🐎  Add optimisations to bitwise operators.
* 🐚  New CLI arguments. 
  
  
  * Add `--opcount|-c` flag that displays the number of opcodes in the compiled bytecode.
  * Add `--size|-s` flag that displays the size in bytes of the compiled bytecode.
* 🔣  Add trailing comma support.

#### CashScript SDK

* 📛  Rename `Sig` to `SignatureTemplate` to better convey its meaning. 
  
  
  * `Sig` still exists for backward compatibility, but is deprecated and will be removed in a later release.

[https://x.com/RoscoKalis/status/1267440143624884227](https://x.com/RoscoKalis/status/1267440143624884227)

## v0.4.0

#### cashc compiler

* ✨  Add `.reverse()` member function to `bytes` and `string` types.
* ✨  Add bitwise operators `&`, `^`, `|`.
* ✨  Allow casting `int` to variable size `bytes` based on `size` parameter.
* 💥  **BREAKING**: Casting from `int` to unbounded `bytes` type now does not perform `OP_NUM2BIN`. Instead it is a purely semantic cast to signal that an integer value should be treated as a bytes value.
* 🏇  Compiler optimisations. 
  
  
  * Use `NUMEQUALVERIFY` for the final function in a contract.
  * Only drop the final `VERIFY` if the remaining stack size is less than 5.
  * Pre-calculate `OutputNullData` argument size.
* 🐛  Fix a bug where return type of `sha1` was incorrectly marked as `bytes32`.
* 🐛  `Data.decodeBool` only treated numerical zero as false, now any zero-representation is considered false (e.g. 0x0000, -0, ...).

#### CashScript SDK

* ✨  Add ability to provide hardcoded inputs to the transaction rather than use CashScript's coin selection.
* 💥  **BREAKING**: Refactor the transaction flow to a fluent API 
  
  
  * Remove the `TxOptions` argument and other arguments to the Transaction `send()` function.
  * Instead these parameters are passed in through fluent functions `from()`, `to()`, `withOpReturn()`, `withAge()`, `withTime()`, `withHardcodedFee()`, `withFeePerByte()` and `withMinChange()`.
  * After specifying at least one output with either `to()` or `withOpReturn()`the transaction is ready. From here the transaction can be sent to the network with the `send()` function, the transaction hex can be returned with the `build()` function, or the meep debugging command can be returned with the `meep()` function.
* 💥  Remove `Contract.fromCashFile()` and `Contract.fromArtifact()` which were deprecated in favour of `Contract.compile()` and `Contract.import()` in v0.2.2.

#### Migration

This update contains several breaking changes. See the [migration notes](release_notes_and_migrations.md#v03-to-v04) for a full migration guide.

[https://x.com/RoscoKalis/status/1264921879346917376](https://x.com/RoscoKalis/status/1264921879346917376)

## v0.3.3

#### cashc compiler

* 🐛  Fix bug where variables could not reliably be used inside `OutputNullData` instantiation.

[https://x.com/RoscoKalis/status/1224389493769342979](https://x.com/RoscoKalis/status/1224389493769342979)

## v0.3.2

#### cashc compiler

* ✨  Add `OutputNullData(bytes[] chunks)`, an output type to enforce `OP_RETURN` outputs.
* 🐚  CLI improvements 
  
  
  * The `--output|-o` flag is now optional, if it is omitted or manually set to `-`, the artifact will be written to stdout rather than a file.
  * Add `--asm|-A` flag that outputs only Script in ASM format instead of a full JSON artifact.
  * Add `--hex|-h` flag that outputs only Script in hex format instead of a full JSON artifact.
  * Add `--args|-a` flag that allows you to specify constructor arguments that are added to the generated bytecode. 
    
    
    * ⚠️  The CLI **does not** perform type checking on these arguments, so it is recommended to use the CashScript SDK for type safety.
* 🐛  Fix a compilation bug that allowed compilation of "unverified covenants" (#56).
* 🐛  Fix a compilation bug that allowed compilation of `OutputP2PKH(...)` without `new` keyword (#57).

#### CashScript SDK

* 🌐  Browser support! You can now use CashScript inside web projects. Filesystem-based functionality such as compilation from file are not supported due to the nature of web, so CashScript files have to be read in a different way (e.g. Fetch API) and then passed into the CashScript SDK.
* 👛  Add `minChange` to transaction options. If this `minChange` is not reached, the change will be added to the transaction fee instead.

[https://x.com/RoscoKalis/status/1223280232343515136](https://x.com/RoscoKalis/status/1223280232343515136)

## v0.3.1

#### cashc compiler

* ⚠️  Add warnings when a contract exceeds 201 opcodes or 520 bytes.
* 🐛  Fix a bug where an incorrect number of items were dropped from the stack after execution of a branch.

#### CashScript SDK

* ✨  Improve error handling. 
  
  
  * Further specified `FailedTransactionError` into `FailedRequireError`, `FailedSigCheckError`, `FailedTimeCheckError` and a general fallback `FailedTransactionError`.
  * Add `Reason` enum with all possible reasons for a Script failure - can be used to catch specific errors.
* 🔍  Add `instance.opcount` and `instance.bytesize` fields to all contract instances.
* 🐛  Fix a bug where the size of a preimage was not accounted for in fee calculation for covenants.

[https://x.com/RoscoKalis/status/1217101473743544320](https://x.com/RoscoKalis/status/1217101473743544320)

## v0.3.0

#### cashc compiler

* ✨  Covenants abstraction! All individual preimage fields can be accessed without manual decoding, passing, and verification. 
  
  
  * Available fields: `tx.version`, `tx.hashPrevouts`, `tx.hashSequence`, `tx.outpoint`, `tx.bytecode`, `tx.value`, `tx.sequence`, `tx.hashOutputs`, `tx.locktime`, `tx.hashtype`.
  * When any of these fields is used inside a function, this function is marked `covenant: true`, and requires a preimage as parameter (automatically passed by CashScript SDK).
  * The correct fields are efficiently cut out of the preimage and made available.
  * The first occurrence of `require(checkSig(sig, pubkey));` is identified, and preimage verification is inserted using the same sig/pubkey. **Important**: if you have multiple `checkSig` statements, keep in mind that the first will be used for verification.
  * Automatically cuts off VarInt from `scriptCode`, so `tx.bytecode` contains the actual contract bytecode.
* ✨  Output instantiation! Automatically construct output formats for covenant transactions. 
  
  
  * `new OutputP2PKH(bytes8 amount, bytes20 pkh)`
  * `new OutputP2SH(bytes8 amount, bytes20 scriptHash)`
* 🐛  Fix bug with invalid output when the final statement in a contract is an if-statement.

#### CashScript SDK

* ✨  Add `fee` option to TransactionOptions. This allows you to specify a hardcoded fee for your transaction.
* ✨  Automatically pass in sighash preimage into covenant functions. **Important**: uses the hashtype of the first signature in the parameters for generation of this preimage.
* 💫  Better fee estimation for transactions with many inputs.

[https://x.com/RoscoKalis/status/1204765863062188033](https://x.com/RoscoKalis/status/1204765863062188033)

## v0.2.3

#### cashc compiler

* 🐛  Fix a bug where unequal bytes types (e.g. `bytes3` & `bytes8`) could not be concatenated together, as they were considered different types.

[https://x.com/RoscoKalis/status/1202220857566908416](https://x.com/RoscoKalis/status/1202220857566908416)

## v0.2.2

#### CashScript SDK

* 🐛  Remove minimaldata encoding in `OP_RETURN` outputs that caused incompatibility with SLP.
* 📛  Renamed `Contract.fromCashFile` to `Contract.compile`. 
  
  
  * The new function allows to pass in a path to a `.cash` file, or a string of the contract source code.
  * `Contract.fromCashFile` still exists for backward compatibility, but is deprecated and will be removed in a later release.
* 📛  Renamed `Contract.fromArtifact` to `Contract.import`. 
  
  
  * The new function allows to pass in a path to a `.json` artifact file, or a JSON object of the artifact.
  * `Contract.fromArtifact` still exists for backward compatibility, but is deprecated and will be removed in a later release.
* 🛠  `instance.export`'s `file` argument is now optional. 
  
  
  * If it is provided, the artifact is written to the file, if not, it is returned as an object.

[https://x.com/RoscoKalis/status/1192900277105389568](https://x.com/RoscoKalis/status/1192900277105389568)

## v0.2.1

#### cashc compiler

* ✨  Support `bytes` types with bounded size, e.g. `bytes1`, `bytes13`, `bytes32`.
* 🐛  Fix bug in bytecode optimisation

#### CashScript SDK

* ✨  Support `bytes` types with bounded size, e.g. `bytes1`, `bytes13`, `bytes32`.
* 🐦  Automatically output meep command on failed transaction error.
* 🔨   Make the `hashtype` parameter in signature placeholders optional.

[https://x.com/RoscoKalis/status/1186554051720167424](https://x.com/RoscoKalis/status/1186554051720167424)

## v0.2.0

#### cashc compiler

* 🐎  Implement compiler optimisations 
  
  
  * For the final use of a variable, it is retrieved with `OP_ROLL` rather than `OP_PICK`. This removes the need to clean the stack at the end of a contract.
  * Final `OP_VERIFY OP_TRUE` is removed as there is an implicit `OP_VERIFY` at the end of a Script.
  * `OP_VERIFY` is merged with preceding opcode where applicable.
  * Shallow `OP_PICK` and `OP_ROLL` are replaced by hardcoded opcodes (e.g. `OP_SWAP`, `OP_DUP`).
  * Several other bytecode optimisations.
* ✨  Add `pragma` keyword to specify intended compiler version. 
  
  
  * Example: `pragma cashscript ^0.2.0;`
  * Contract fails to compile when compiler version does not satisfy constraints.
* 🚨  Add CashProof for all individual bytecode optimisations and for example contracts from 0.1.2 to 0.2.0.
* 🐛  Add "default case" for function selection that fixes a vulnerability where people could spend funds by not calling any function.
* ⬆️  Update dependencies.

#### CashScript SDK

* ⬆️  Update `cashc` and other dependencies.

[https://x.com/RoscoKalis/status/1178843657069154305](https://x.com/RoscoKalis/status/1178843657069154305)

## v0.1.2

#### CashScript SDK

* ✨  Add support for `OP_RETURN` outputs.
* 🐛  Improved error handling.
* 🐛  Poll for transaction details to make sure it's available.
* 🔥  Enable optional mainnet - **NOT RECOMMENDED**
* 🔨  UTXO selection refactor
* 🚨  Improve Transaction testing

[https://x.com/RoscoKalis/status/1174910060691984385](https://x.com/RoscoKalis/status/1174910060691984385)

## v0.1.1

#### CashScript SDK

* 🐛  Bug fixes with incorrect parameter encoding for string/bool/int types.

## v0.1.0

* 🎉  Initial release.