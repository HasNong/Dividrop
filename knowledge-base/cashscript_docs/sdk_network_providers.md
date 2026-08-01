Topic: Network Providers & Chain Communication
Source: CashScript Website
Type: Documentation
Priority: Medium
Description: Detailed explanation of network providers in CashScript SDK, including ElectrumNetworkProvider, custom providers, and Chaingraph integration.

---

The CashScript SDK needs to connect to the BCH network to perform certain operations, like retrieving the contract's balance, or sending transactions. The recommended network provider to use blockchain network functionality is the `ElectrumNetworkProvider`, however for local development it is recommended to use a `MockNetworkProvider`.

> [!TIP]
> CashScript NetworkProviders have a standardized interface, this allows different network providers to be used by the SDK and makes it easy to swap out dependencies.

## Interface NetworkProvider

### Network

```typescript
type Network = 'mainnet' | 'chipnet' | 'mocknet' | 'testnet3' | 'testnet4' | 'regtest';
```

The network parameter can be one of 6 different options.

#### Example

```typescript
const connectedNetwork = provider.network;
```

### getUtxos()

```typescript
async provider.getUtxos(address: string): Promise<Utxo[]>;
```

Returns all UTXOs on specific address. Both confirmed and unconfirmed UTXOs are included.

```typescript
interface Utxo {
  txid: string;
  vout: number;
  satoshis: bigint;
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
const userUtxos = await provider.getUtxos(userAddress)
```

### getUtxosForLockingBytecode()

```typescript
async provider.getUtxosForLockingBytecode(lockingBytecode: Uint8Array | string): Promise<Utxo[]>;
```

Returns all UTXOs for a specific locking bytecode. Both confirmed and unconfirmed UTXOs are included.

#### Example

```typescript
const utxos = await provider.getUtxosForLockingBytecode(lockingBytecode)
```

### getBlockHeight()

```typescript
async provider.getBlockHeight(): Promise<number>;
```

Get the current blockHeight.

#### Example

```typescript
const currentBlockHeight = await provider.getBlockHeight()
```

### getRawTransaction()

```typescript
async provider.getRawTransaction(txid: string): Promise<string>;
```

Retrieve the Hex transaction details for a given transaction ID.

#### Example

```typescript
const rawTransaction = await provider.getRawTransaction(txid)
```

### sendRawTransaction()

```typescript
async provider.sendRawTransaction(txHex: string): Promise<string>;
```

Broadcast a raw hex transaction to the network.

#### Example

```typescript
const txId = await provider.sendRawTransaction(txHex)
```

## Custom NetworkProviders

A big strength of the NetworkProvider setup is that it allows you to implement custom providers. So if you want to use a new or different BCH indexer for network information, it is simple to add support for it by creating your own `NetworkProvider` adapter by implementing the [NetworkProvider interface](https://github.com/CashScript/cashscript/blob/master/packages/cashscript/src/network/NetworkProvider.ts).

You can create a PR to add your custom `NetworkProvider` to the CashScript codebase to share this functionality with others. It is required to have basic automated tests for any new `NetworkProvider`.

### Error Handling

A custom `NetworkProvider` should throw the following error types when an error occurs while broadcasting a transaction:

 | Error | Description |
 | --- | --- |
 | NetworkProviderMissingInputsError | Transaction inputs are missing or already spent |
 | NetworkProviderMempoolConflictError | Transaction conflicts with an unconfirmed transaction in the mempool |
 | NetworkProviderTransactionAlreadySubmittedError | Transaction has already been submitted |
 | NetworkProviderAbsoluteTimelockError | Transaction is not yet final (nLockTime not satisfied) |
 | NetworkProviderRelativeTimelockError | BIP68 sequence lock not satisfied |
 | NetworkProviderError | Generic fallback network provider error |

## Provider-Specific functionality

Beyond the standardized `NetworkProvider` interface each provider can have its own provider-specific functionality. This can either be done by extending the `NetworkProvider` interface or by providing a more full-featured networking client to create the `NetworkProvider`.

## Limitations

If you look at the [Transaction Lifecycle](deployment_lifecycle_and_integrations.md) guide then you'll see there are blockchain edge cases like chain re-organisations or double spends. Ideally the `NetworkProvider` interface would be able to provide more detailed `Utxo` chain information like whether the UTXO is unconfirmed or confirmed, the number of confirmations and the block-hash of the block which included the transaction creating the UTXO.

Currently however the `NetworkProvider` interface does not include the details needed to understand whether blockchain state is confirmed, pending or ended up getting reversed. This means that in the case something does end up being reversed your application might not correctly be in sync with the actual network state.

---

The CashScript SDK needs to connect to the BCH network to perform certain operations, like retrieving the contract's balance, or sending transactions. The recommended network provider is the `ElectrumNetworkProvider`.

## Creating an ElectrumNetworkProvider

The ElectrumNetworkProvider uses [@electrum-cash/network](https://www.npmjs.com/package/@electrum-cash/network) library to connect to the configured electrum server. The connection uses a single, trusted electrum server so it does not have any fallback logic and does not validate SPV proofs for chain inclusion.

By default the `ElectrumNetworkProvider` creates a short-lived connection only when requests are pending. To configure this see the section on '[Manual Connection Management](#manual-connection-management)'.

### Constructor

Both `network` and `options` parameters are optional, and they default to `mainnet` with the `bch.imaginary.cash` electrum server.

```typescript
new ElectrumNetworkProvider(network?: Network, options?: Options)
```

Using the `network` parameter, you can specify the network to connect to. There's 4 networks supported by the `ElectrumNetworkProvider`:

```typescript
type Network = 'mainnet' | 'chipnet' | 'testnet3' | 'testnet4';
```

Using the `options` parameter, you can specify a custom electrum client or hostname, and enable manual connection management.

```typescript
type Options = OptionsBase | CustomHostNameOptions | CustomElectrumOptions;

interface OptionsBase {
  manualConnectionManagement?: boolean;
}

interface CustomHostNameOptions extends OptionsBase {
  hostname: string;
}

interface CustomElectrumOptions extends OptionsBase {
  electrum: ElectrumClient<ElectrumClientEvents>;
}
```

#### Example

```typescript
import { ElectrumNetworkProvider } from 'cashscript';

const hostname = 'chipnet.bch.ninja';
const provider = new ElectrumNetworkProvider('chipnet', { hostname });
```

## ElectrumNetworkProvider Methods

### getUtxos()

```typescript
async provider.getUtxos(address: string): Promise<Utxo[]>;
```

Returns all UTXOs on specific address. Both confirmed and unconfirmed UTXOs are included.

```typescript
interface Utxo {
  txid: string;
  vout: number;
  satoshis: bigint;
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
const userUtxos = await provider.getUtxos(userAddress)
```

### getUtxosForLockingBytecode()

```typescript
async provider.getUtxosForLockingBytecode(lockingBytecode: Uint8Array | string): Promise<Utxo[]>;
```

Returns all UTXOs for a specific locking bytecode. Both confirmed and unconfirmed UTXOs are included.

#### Example

```typescript
const utxos = await provider.getUtxosForLockingBytecode(lockingBytecode)
```

### getBlockHeight()

```typescript
async provider.getBlockHeight(): Promise<number>;
```

Get the current blockHeight.

#### Example

```typescript
const currentBlockHeight = await provider.getBlockHeight()
```

### getRawTransaction()

```typescript
async provider.getRawTransaction(txid: string): Promise<string>;
```

Retrieve the Hex transaction details for a given transaction ID.

#### Example

```typescript
const rawTransaction = await provider.getRawTransaction(txid)
```

### sendRawTransaction()

```typescript
async provider.sendRawTransaction(txHex: string): Promise<string>;
```

Broadcast a raw hex transaction to the network.

#### Example

```typescript
const txId = await provider.sendRawTransaction(txHex)
```

### performRequest()

Perform an arbitrary electrum request, refer to the docs at [electrum-cash-protocol](https://electrum-cash-protocol.readthedocs.io/en/latest/).

#### Example

```typescript
const verbose = true // get parsed transaction as json result
const txId = await provider.performRequest('blockchain.transaction.get', txid, verbose)
```

### Manual Connection Management

By default, the ElectrumNetworkProvider will automatically connect and disconnect to the electrum client as needed. However, you can enable manual connection management by setting the `manualConnectionManagement` option to `true`. This can be useful if you are passing a custom electrum client and are using that client for other purposes, such as subscribing to events.

```typescript
const provider = new ElectrumNetworkProvider('chipnet', { manualConnectionManagement: true });
```

> [!TIP]
> If you're providing an `ElectrumClient` and using it to subscribe to address or block header events, you need to enable `manualConnectionManagement` to overwrite the default of connecting and disconnecting for each separate request.

#### connect()

```typescript
provider.connect(): Promise<void>;
```

Connects to the electrum client.

#### disconnect()

```typescript
provider.disconnect(): Promise<boolean>;
```

Disconnects from the electrum client, returns `true` if the client was connected, `false` if it was already disconnected.

## Using electrum-cash functionality

To use more of the electrum-specific functionality which is not exposed in the `ElectrumNetworkProvider` you can simply call the methods on the electrum Client itself.

### Custom Electrum Client

When initializing an `ElectrumNetworkProvider` you have the option in the constructor to provide a custom electrum client. This way you can use one and the same indexer server for blockchain information but use it through two different interfaces. This allows you to access all underlying functionality of the [@electrum-cash/network](https://www.npmjs.com/package/@electrum-cash/network) library like address and blockHeight subscriptions.

If intending to use electrum-cash subscriptions, make sure to set `manualConnectionManagement` to true, so the `ElectrumNetworkProvider` does not disconnect after each request.

#### Example

```typescript
import { ElectrumClient } from '@electrum-cash/network';
import { ElectrumNetworkProvider } from 'cashscript';

const electrum = new ElectrumClient('CashScript Application', '1.4.1', 'chipnet.bch.ninja');
const provider = new ElectrumNetworkProvider('chipnet', {
  electrum, manualConnectionManagement: true
});
await electrum.connect();
```

## Error Handling

The `ElectrumNetworkProvider` can throw the following errors when broadcasting a transaction:

 | Error | Description |
 | --- | --- |
 | NetworkProviderMissingInputsError | Transaction inputs are missing or already spent |
 | NetworkProviderMempoolConflictError | Transaction conflicts with an unconfirmed transaction in the mempool |
 | NetworkProviderTransactionAlreadySubmittedError | Transaction has already been submitted |
 | NetworkProviderAbsoluteTimelockError | Transaction is not yet final (nLockTime not satisfied) |
 | NetworkProviderRelativeTimelockError | BIP68 sequence lock not satisfied |
 | NetworkProviderError | Generic fallback network provider error |

---

The CashScript SDK needs to connect to the BCH network to perform certain operations, like retrieving the contract's balance, or sending transactions.

## MockNetworkProvider

```typescript
new MockNetworkProvider(options?: MockNetworkProviderOptions)
```

The `MockNetworkProvider` is a special network provider that allows you to evaluate transactions locally without interacting with the Bitcoin Cash network. This is useful when writing automated tests for your contracts, or when debugging your contract locally.

The `MockNetworkProvider` has extra methods to enable this local emulation such as `.addUtxo()` and `.setBlockHeight()`.
You can read more about the `MockNetworkProvider` and automated tests on the [testing setup](sdk_testing.md) page.

```typescript
interface MockNetworkProviderOptions {
  updateUtxoSet?: boolean;
  vmTarget?: VmTarget;
}

interface MockNetworkProvider extends NetworkProvider {
  options: MockNetworkProviderOptions;
  vmTarget: VmTarget;

  constructor(options?: Partial<MockNetworkProviderOptions>) {}

  // Hardcode the block height
  setBlockHeight(newBlockHeight: number): void;

  // Add a UTXO to the UTXO set of the mock network
  addUtxo(addressOrLockingBytecode: string, utxo: Utxo): Utxo;

  // Reset the UTXO set and transaction list of the mock network
  reset(): void;
}
```

The `updateUtxoSet` option is used to determine whether the UTXO set should be updated after a transaction is sent. If `updateUtxoSet` is `true` (default), the UTXO set will be updated to reflect the new state of the mock network. If `updateUtxoSet` is `false`, the UTXO set will not be updated.

The `vmTarget` option defaults to the current VM of `BCH_2026_05`, but this can be changed to test your contract against different BCH virtual machine targets.

#### Example

```typescript
const provider = new MockNetworkProvider();
const newUtxo = provider.addUtxo(contractAddress, randomUtxo({ satoshis: 10_000n }));
```

The network type of the `MockNetworkProvider` is `'mocknet'`.

## Other NetworkProviders

Third parties can implement their own alternative network providers by implementing the `NetworkProvider` interface and publishing them as a package.