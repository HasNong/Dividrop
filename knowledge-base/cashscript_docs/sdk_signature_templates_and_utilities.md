Topic: Signature Templates & Transaction Utilities
Source: CashScript Website
Type: Documentation
Priority: Medium
Description: Using SignatureTemplate for key management and automated transaction signing, alongside SDK unit and fee conversion helper functions.

---

When a contract function has a `sig` parameter, it needs a cryptographic signature from a private key for the spending transaction.
In place of a signature, a `SignatureTemplate` can be passed, which will generate the correct signature when the transaction is built.

> [!TIP]
> `SignatureTemplate` can be used with a `Contract` as function argument to generate a signature automatically, or can be used in the `TransactionBuilder` to create an `Unlocker` for a P2PKH UTXO.

## SignatureTemplate

### Constructor

```typescript
new SignatureTemplate(
  signer: Keypair | Uint8Array | string,
  hashtype?: HashType,
  signatureAlgorithm?: SignatureAlgorithm
)
```

In place of a signature, a `SignatureTemplate` can be passed, which will generate the correct signature using the `signer` parameter. This signer can be any representation of a private key, including [WIF strings](https://en.bitcoin.it/wiki/Wallet_import_format), [BCHJS' `ECPair`](https://bchjs.fullstack.cash/#api-ECPair), [bitcore-lib-cash' `PrivateKey`](https://github.com/bitpay/bitcore/blob/master/packages/bitcore-lib-cash/docs/privatekey.md), or binary private keys represented as `Uint8Array`. This ensures that `SignatureTemplate` can be used with any BCH library.

#### Example

```typescript
const aliceWif = 'L4vmKsStbQaCvaKPnCzdRArZgdAxTqVx8vjMGLW5nHtWdRguiRi1';
const aliceSignatureTemplate = new SignatureTemplate(aliceWif)

const transferDetails = await new TransactionBuilder({ provider })
  .addInput(selectedContractUtxo, contract.unlock.transfer(aliceSignatureTemplate))
  .addOutput({
    to: 'bitcoincash:qrhea03074073ff3zv9whh0nggxc7k03ssh8jv9mkx',
    amount: 10000n
  })
  .send();
```

The `hashtype` and `signatureAlgorithm` options are covered under ['Advanced Usage'](sdk_signature_templates_and_utilities.md#advanced-usage).

## SignatureTemplate Methods

### unlockP2PKH()

Importantly the `SignatureTemplate` can also be used to generate the `Unlocker` for a P2PKH UTXO in the following way:

```typescript
signatureTemplate.unlockP2PKH(): Unlocker
```

#### Example

```typescript
import { aliceTemplate, aliceAddress, transactionBuilder } from './somewhere.js';

const aliceUtxos = await provider.getUtxos(aliceAddress);
transactionBuilder.addInput(aliceUtxos[0], aliceTemplate.unlockP2PKH());
```

### getPublicKey()

The `SignatureTemplate` also has a helper method to get the matching PublicKey in the following way:

```typescript
signatureTemplate.getPublicKey(): Uint8Array
```

#### Example

```typescript
import { aliceTemplate } from './somewhere.js';

const alicePublicKey = aliceTemplate.getPublicKey()
```

### signMessageHash()

The `SignatureTemplate` also has a helper method to sign a message hash, which can be used to sign non-transaction messages. This is useful for generating `datasig` signatures for smart contract use cases.

```typescript
signatureTemplate.signMessageHash(message: Uint8Array): Uint8Array
```

#### Example

```typescript
import { aliceTemplate } from './somewhere.js';
import { sha256 } from '@cashscript/utils';
import { hexToBin } from '@bitauth/libauth';

const signature = aliceTemplate.signMessageHash(sha256(hexToBin('0000000000000000000000')));
```

## Advanced Usage

### HashType

The default `hashtype` is `HashType.SIGHASH_ALL | HashType.SIGHASH_UTXOS` because this is the most secure option for smart contract use cases.

```typescript
export enum HashType {
  SIGHASH_ALL = 0x01,
  SIGHASH_NONE = 0x02,
  SIGHASH_SINGLE = 0x03,
  SIGHASH_UTXOS = 0x20,
  SIGHASH_ANYONECANPAY = 0x80,
}
```

#### Example

```typescript
const wif = 'L4vmKsStbQaCvaKPnCzdRArZgdAxTqVx8vjMGLW5nHtWdRguiRi1';

const signatureTemplate = new SignatureTemplate(
  wif, HashType.SIGHASH_ALL | HashType.SIGHASH_UTXOS
);

const configuredHashType = signatureTemplate.getHashType()
```

### SignatureAlgorithm

The `signatureAlgorithm` parameter determines the cryptographic algorithm used for signing. By default, the modern and compact Schnorr algorithm is used.

```typescript
export enum SignatureAlgorithm {
  ECDSA = 0x00,
  SCHNORR = 0x01,
}
```

#### Example

```typescript
const wif = 'L4vmKsStbQaCvaKPnCzdRArZgdAxTqVx8vjMGLW5nHtWdRguiRi1';

const hashType = HashType.SIGHASH_ALL | HashType.SIGHASH_UTXOS
const signatureAlgorithm = SignatureAlgorithm.SCHNORR
const signatureTemplate = new SignatureTemplate(wif, hashType,signatureAlgorithm);

const configuredSignatureAlgorithm = signatureTemplate.getSignatureAlgorithm()
```

---

When building transactions using the CashScript SDK, there are certain actions that are not directly involved with transaction building, but are still useful to have available. This is the purpose of the Transaction Utilities.

## Gathering UTXOs

Often when building transactions, you need to gather UTXOs from a list of UTXOs until the required (token or BCH) amount is reached. This is the purpose of the `gatherBchUtxos()` and `gatherFungibleTokenUtxos()` functions.

### interface GatherUtxosResult

```typescript
interface GatherUtxosResult {
  utxos: Utxo[];
  totalAmount: bigint;
}
```

### gatherBchUtxos()

```typescript
gatherBchUtxos(utxos: Utxo[], amount: bigint): GatherUtxosResult
```

Gathers BCH UTXOs from a list of UTXOs until the required amount is reached.

#### Example

```typescript
const { utxos, totalAmount } = gatherBchUtxos(utxos, 100000n);
```

### gatherFungibleTokenUtxos()

```typescript
gatherFungibleTokenUtxos(utxos: Utxo[], tokenCategory: string, amount: bigint): GatherUtxosResult
```

Gathers fungible token UTXOs from a list of UTXOs until the required amount is reached.

#### Example

```typescript
const { utxos, totalAmount } = gatherFungibleTokenUtxos(utxos, tokenCategory, 1000n);
```