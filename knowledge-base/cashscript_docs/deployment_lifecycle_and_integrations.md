Topic: Contract Deployment, Lifecycle & Wallet Integration
Source: CashScript Website
Type: Documentation
Priority: Medium
Description: Instructions for deploying to Mainnet and Chipnet, managing contract lifecycles, setting up infrastructure nodes, and connecting to dApp wallets via WalletConnect.

---

Not every CashScript contract needs a deployment transaction. In the UTXO model, many UTXOs can live on the same contract address and use the same spending rules. For contracts like multisig wallets, vaults, and escrows, you can compile the contract, share the address, and send funds to it. The contract is ready to use as soon as you know its address.

Deployment is only needed for **stateful contract systems** where CashTokens authenticate contract state. In these systems, a genesis transaction creates one or more token categories and initializes the contract UTXOs with the right token amounts, NFT capabilities, and NFT commitments.

> [!TIP]
> If your contract only enforces spending conditions, use the contract address directly. Deployment is for systems where CashTokens identify and track contract state.

## Preparing a Deployment

Before constructing the genesis transaction, you need to know which constructor arguments, token IDs, setup UTXOs, initial state, and permanent addresses the deployment will use.

### Contract Addresses

CashScript contract addresses are deterministic. They are derived from the compiled artifact and the constructor arguments. Given the same artifact and arguments, the SDK produces the same address every time.

```typescript
import { Contract } from 'cashscript';
import artifact from './my_contract.artifact.js';

const constructorArgs = [oraclePublicKey, startBlockHeight] as const;
const contract = new Contract(artifact, [...constructorArgs], { provider });

console.log(contract.address);      // same inputs produce the same address
console.log(contract.tokenAddress); // CashToken-aware address
```

This means you can reconstruct a contract address on any machine without querying the blockchain, as long as you have the artifact and constructor arguments. This property is essential for [verifying deployments](#verifying-a-deployment).

### Constructor Arguments

Some constructor arguments are simple constants. Others need to be prepared before deployment:

* **Token IDs from other categories**: multi-contract systems often pass other token category IDs as constructor arguments.
* **Locking bytecodes from other contracts**: one contract may authenticate another by locking bytecode. Instantiate the referenced contract first, then pass its `lockingBytecode` to the dependent contract.
* **Public keys**: oracle or owner checks often require a public key or public key hash that must be derived before deployment.

```typescript
import { swapEndianness } from '@bitauth/libauth';
import { Contract } from 'cashscript';

// when using a standard encoded tokenId, swap the endianness of the hex before using it in your contract
const argsA = [swapEndianness(tokenIdX), swapEndianness(tokenIdY)] as const;
const contractA = new Contract(artifactA, [...argsA], { provider });

// Pass contractA's locking bytecode to a dependent contract.
const argsB = [contractA.lockingBytecode, oraclePublicKey, startBlockHeight] as const;
const contractB = new Contract(artifactB, [...argsB], { provider });
```

> [!WARNING]
> Double-check all constructor arguments before deploying. Some values, such as fee destination addresses or authority keys, may be permanent once the contract system is live.

### Token IDs and vout0 UTXOs

On Bitcoin Cash, a new token category can be created by spending a UTXO at output index `0`. The token ID equals the txid of that UTXO. If you know which `vout: 0` UTXO will be used for the genesis transaction, you already know the token ID that transaction can create.

For deployments with multiple token categories, prepare one `vout: 0` UTXO per token category. This lets you know every token ID before instantiating contracts that reference those IDs. Once the setup UTXOs are prepared, the genesis transactions can be broadcast in parallel if they do not spend from each other.

### Setup Wallet

Use a funded setup wallet to create the `vout: 0` UTXOs and broadcast the genesis transaction. Each contract output also needs enough BCH for dust, commonly 1000 sats.

The setup wallet may already have suitable `vout: 0` UTXOs. If not, send BCH from the setup wallet back to itself as the only output of a transaction. Since it is the only output, it will be at index `0`.

```typescript
import { TransactionBuilder, SignatureTemplate, ElectrumNetworkProvider } from 'cashscript';
import type { Utxo } from 'cashscript';

// Create a vout0 UTXO by sending BCH to yourself.
async function createVout0(
  provider: ElectrumNetworkProvider,
  address: string,
  utxos: Utxo[],
  template: SignatureTemplate,
): Promise<Utxo> {
  const selectedUtxo = utxos.find(utxo => utxo.vout !== 0 && !utxo.token);
  if (!selectedUtxo) throw new Error('No eligible UTXO available');

  const amount = selectedUtxo.satoshis - 500n;
  const txBuilder = new TransactionBuilder({ provider });
  txBuilder.addInput(selectedUtxo, template.unlockP2PKH());
  txBuilder.addOutput({ to: address, amount });

  const txDetails = await txBuilder.send();
  return { satoshis: amount, txid: txDetails.txid, vout: 0 };
}
```

> [!TIP]
> Test the full deployment flow on chipnet before mainnet. This validates your transaction structure, constructor arguments, and state encoding before anything has permanent value.

## Genesis Transaction

The genesis transaction creates the CashToken category and sends the initial token outputs to the relevant contract addresses. It can include:

* **Fungible tokens**: the initial token supply.
* **Minting NFTs**: authority for contracts that need to create new NFTs later.
* **Mutable NFTs**: updatable contract state stored in NFT commitments.
* **Immutable NFTs**: fixed identifying data.

> [!NOTE]
> When fungible token supply will be locked inside covenants, it is common to mint the maximum possible amount (`9223372036854775807`). This is only safe when the covenants strictly enforce the actual circulating supply.

```typescript
import { TransactionBuilder, SignatureTemplate } from 'cashscript';

const template = new SignatureTemplate(privateKey);
const tokenId = genesisUtxo.txid;

const txBuilder = new TransactionBuilder({ provider });
txBuilder.addInput(genesisUtxo, template.unlockP2PKH());
txBuilder.addOutput({
  to: contractA.tokenAddress,
  amount: 1000n,
  token: { category: tokenId, amount: 9223372036854775807n },
});
txBuilder.addOutput({
  to: contractB.tokenAddress,
  amount: 1000n,
  token: {
    category: tokenId,
    amount: 0n,
    nft: { capability: 'minting', commitment: initialStateHex },
  },
});
// Add more outputs as needed.
txBuilder.addBchChangeOutputIfNeeded({ to: changeAddress, feeRate: 1.0 });

const txDetails = await txBuilder.send();
```

### Initial State

NFT commitments are commonly used to encode the initial state of a contract at deployment. For example, a contract might store a starting counter, block height, or configuration value in the NFT commitment.

Use the same encoding that your contract expects. For VM number values, use `@cashscript/utils` and `@bitauth/libauth` helpers to avoid mismatches.

```typescript
import { binToHex } from '@bitauth/libauth';
import { encodeIntAsFixedBytes } from '@cashscript/utils';

// Encode initial state as 4-byte counter + 4-byte block height.
function encodeInitialState(counter: bigint, blockHeight: bigint): string {
  const encodedCounter = encodeIntAsFixedBytes(counter, 4);
  const encodedBlockHeight = encodeIntAsFixedBytes(blockHeight, 4);
  return binToHex(encodedCounter) + binToHex(encodedBlockHeight);
}
```

### Duplicate Contract UTXOs

For systems expecting [concurrent usage](concurrency_and_optimization.md), create multiple identical contract UTXOs in the genesis transaction. Each duplicate sits at the same contract address with the same token type, allowing independent transactions to spend different UTXOs without conflicting.

When duplicating UTXOs that hold fungible tokens, distribute the total supply exactly across them:

```typescript
const supplyPerUtxo = MAX_TOKEN_SUPPLY / BigInt(numberOfDuplicates);
const remainder = MAX_TOKEN_SUPPLY % BigInt(numberOfDuplicates);
const supplyLastUtxo = supplyPerUtxo + remainder;
```

### BCMR Metadata

The [Bitcoin Cash Metadata Registry (BCMR)](https://cashtokens.org/docs/bcmr/chip/) is the standard for associating metadata with CashToken categories, such as name, ticker, decimals, and icon. Wallets and indexers resolve this metadata through an authchain.

To start the authchain during deployment, include a dust output at index `0` to a designated authchain address. This output becomes the starting point for metadata resolution.

```typescript
// Include a dust output for the BCMR authchain.
txBuilder.addOutput({ to: bcmrAuthchainAddress, amount: 1000n });
```

Metadata can be published in the genesis transaction with an `OP_RETURN` output containing the BCMR protocol identifier, registry hash, and registry URL. It can also be published later in an authchain transaction. See the [CashTokens guide](cashtokens_guide.md#cashtokens-bcmr-metadata) for more on BCMR metadata and tooling.

> [!NOTE]
> A two-step deployment can avoid a follow-up authchain update: prepare the `vout: 0` UTXO first, publish the BCMR registry, then broadcast the genesis transaction with the registry hash in the `OP_RETURN`.

## After Deployment

Once the genesis transaction is broadcast:

* **Save the deployment configuration**: persist token IDs, constructor arguments, network, artifact version, and other parameters.
* **Verify BCMR indexing**: check that a BCMR indexer resolves your token metadata correctly.
* **Verify the deployment**: run a standalone verification script against the live deployment.
* **Set up infrastructure**: see the [infrastructure guide](deployment_lifecycle_and_integrations.md) for storing contract details and setting up transaction servers.

## Deployment Configuration

Capture deployment parameters in a typed configuration object. This makes deployments reproducible and easy to reference from application code, verification scripts, and tests.

```typescript
interface MyDeployment {
  name: string;
  network: 'mainnet' | 'chipnet';
  contractVersion: string;
  tokenIds: {
    myTokenId: string;
  };
  contractParams: {
    oraclePublicKey: string;
    startBlockHeight: bigint;
    // Add other params here.
  };
}
```

Use your deployment configuration as the single source of truth for verification scripts, application code, and documentation.

> [!TIP]
> Maintaining named deployment objects lets you keep production, staging, and testing deployments side by side. This makes it easy to use different parameters, such as testing oracles, while iterating before a mainnet deployment.

## Verifying a Deployment

A contract system is only trustless if its deployment can be independently verified. Deployment scripts may not be open source, and even if they are, users still need a way to verify what exists on-chain.

Since contract addresses are deterministic, verification works by reconstructing every expected address from the artifacts and deployment parameters, then comparing the result against the genesis transaction outputs.

```typescript
import { Contract } from 'cashscript';
import artifact from './my_contract.artifact.js';

const constructorArgs = [
  deployment.contractParams.oraclePublicKey,
  deployment.contractParams.startBlockHeight,
] as const;

const contract = new Contract(artifact, [...constructorArgs], { provider });
const expectedAddress = contract.tokenAddress;
```

> [!WARNING]
> Provide verification scripts as part of your project, not bundled into the deployment script itself. They should be runnable independently by anyone with the contract artifacts and deployment configuration.

### What to Verify

Verification should inspect every output of the genesis transaction, not just the outputs you expect. If tokens are sent to an unexpected address, such as a regular P2PKH address, that address may hold authority over the token category.

Check at least the following:

1. **Token outputs**: every token output goes to a known contract address or expected authchain address.
2. **Token category**: each token output uses the expected token ID.
3. **NFT capability**: each NFT has the expected capability, such as `minting`, `mutable`, or `none`.
4. **NFT commitment**: commitments contain the expected initial state.
5. **Fungible token amount**: total supply is distributed correctly.
6. **Genesis input**: the first input's previous txid matches the expected token ID.

```typescript
const expectedAddresses = new Set([
  contractA.tokenAddress,
  contractB.tokenAddress,
  // Add all expected contract addresses.
]);

for (const output of genesisTxOutputs) {
  if (output.tokenData && !expectedAddresses.has(output.address)) {
    throw new Error(`Unexpected token output to address: ${output.address}`);
  }

  // Validate capability, commitment, and amount for each known address.
}
```

---

This guide will explain the "transaction lifecycle" of a Bitcoin Cash transaction. We'll talk about what the mempool is and how block inclusion works. Further we'll discuss the possibility of unconfirmed transaction chains and conflicting transactions to cover the full transaction lifecycle!

## Block Inclusion

Bitcoin Cash has a block-time of 10 minutes, meaning that on average every 10 minutes a new block is found which adds a collection of transactions to the ledger. On Bitcoin Cash it is standard for transactions to be included in the very next mined block.

> [!TIP]
> Commonly BCH miners are configured to accept transactions paying a minimum of 1 sat/byte, meaning a transaction of 500 bytes has to pay at least 500 satoshis in mining fee.

Miners choose which transactions to include in their block. Some miners might set a higher minimum fee or mine empty blocks so transactions can remain pending in the mempool even though a new block was mined. Under normal circumstances, a 1 sat/byte fee rate will be included in the next block but this is not guaranteed.

> [!NOTE]
> Even if a miner sets a higher minimum fee for inclusion in his own blocks, 1 sat/byte is the standard minimum fee for nodes to relay your transaction around the network. This way it will get into the mempool of nodes across the BCH network.

## Mempool

Before transactions are included in a block they are waiting for block inclusion in the mempool of the full nodes. Because transactions in the mempool are "seen" but not included in the blockchain yet, the latest state of the blockchain of who owns what is somewhat fuzzy.

In a normal scenario it's only a matter of time before a BCH transaction in the mempool gets included in a block. Where things get more complex however is if there are **competing unconfirmed transactions**. In this scenario it is **not** necessarily clear that a transaction is destined to be included in the blockchain. In other words, the latest state of the blockchain is still undecided.

> [!TIP]
> This is why many BCH indexers will allow you to query UTXOs with the option to include or exclude unconfirmed transactions. By default indexers will include unconfirmed UTXOs/unconfirmed transactions in the query result.

## First-Seen Rule

The "first-seen rule" is a default mempool inclusion and relay rule for full nodes which says that for any UTXO the first seen spending transaction is the one that gets included in the node's mempool and relayed. The default relay policies on Bitcoin Cash have been designed in such a way to maximally enable "0-conf" transactions meaning transactions with zero confirmations but which can still be considered reasonably secure.

> [!NOTE]
> On BTC the mempool node default policy got changed to replace-by-fee, and tooling to submit your non-standard transaction directly to mining pools has become commonplace with ordinals.

The first-seen rule is subjective based on time, because of this different parts of the network might enforce this rule for conflicting transactions in case of a race condition. For P2PKH transactions a trustless notification system was developed called [double-spend-proofs](https://docs.bitcoincashnode.org/doc/dsproof-implementation-notes/) (DSPs). However DSPs unfortunately do not work for smart contract transactions.

## Unconfirmed Transaction Chains

Unconfirmed transactions can be chained after one another meaning that even an output of an unconfirmed transaction can already be spent in a new transaction. This means you can have competing unconfirmed transaction **chains** where child transactions are chained to an unconfirmed parent. A competing transaction for any of the chained unconfirmed transactions then presents a cancellation of the whole chain of dependent child transactions.

There is no maximum to the length of an unconfirmed transaction chain on BCH, software of full nodes has been upgraded to allow for arbitrary length unconfirmed tx chains. This is very important for public covenants which might have many users interacting and transacting with the same smart contract UTXO.

> [!TIP]
> On BCH it's possible to design smart contracts which use long unconfirmed transaction chains, avoiding the need to wait for blockchain confirmations.

## Competing Transactions

When there are competing transactions (double spends) being propagated on the network, only one of the conflicting transactions can be included, the other transactions will in effect be cancelled. In the case of an unconfirmed transaction chain, any competing transaction for one of the transactions in this newly formed chain then presents a cancellation of all child transactions dependent on this parent transaction with a conflict.

> [!NOTE]
> Unlike on Ethereum, on Bitcoin Cash you can never have a transaction which has to pay fees but does not get included in the blockchain. Either it gets included and the fee is paid, or it's like it never happened.

### Accidental Race-Conditions

In open contract systems competing transactions can happen organically and by accident, when 2 different users who might be on different sides of the world, interact with your on-chain system at roughly the same time. This situation can be called "UTXO contention" because 2 users simultaneously try to spend the same anyone-can-spend covenant.

> [!TIP]
> To design around UTXO-contention it is smart to always create multiple duplicate UTXOs for public covenants. This way each of the UTXOs represents a distinct "thread" in a multi-threaded system enabling simultaneous interactions.

### Intentional Double-Spends

However, it is also possible double-spends are created intentionally. For example in the case of a DEX naively updating its price state, a rational economic actor might be incentivized to ignore the latest unconfirmed transaction chain and to **intentionally** create a competing unconfirmed transaction chain. This way they can interact with the smart contract at an earlier (more advantageous) price.

> [!WARNING]
> Smart contract developers developing applications at scale should consider the game-theoretic interaction of advanced, rational economic actors who might benefit from competing against instead of cooperating on building a transaction chain.

Refer to [the adversarial analysis guide](security_and_debugging.md) for a more in-depth guide covering the adversarial cases of intentional double spends and miner bribes.

## Chain Reorgs

A "Chain Reorganization" or reorg for short is when the full nodes discard the current chain tip of the blockchain and adopt a new longest chain. Because a chain reorg causes different blocks to be part of the canonical blockchain, it might be that different transactions got included than what was initially expected.

> [!TIP]
> A great resource to learn more details about reorgs is the ['Chain Reorganization'](https://learnmeabitcoin.com/technical/blockchain/chain-reorganization/) page on the info website learn-me-a-bitcoin.

> [!NOTE]
> 2-block reorganisations are already super rare occurrences, so having 2+ confirmations is often enough for all practical purposes.
> Many exchanges however use a 6-block confirmation policy for Bitcoin Cash deposits.

Chain reorgs don't always include all the same transactions, so some transactions can get un-included from the blockchain with a reorg. In this scenario, if no competing transaction was mined then the un-included transaction will just return to the mempool waiting for inclusion in a next block.

---

When creating a smart contract application on Bitcoin Cash you'll need to investigate whether you need surrounding contract infrastructure.
Below we'll discuss the 2 types of contract infrastructure you might run into: the need to store contract details and the need for a transaction server.

## Storing Contract Details

Because of the `pay-to-scripthash` (`P2SH`) standard for smart contracts on BCH, the details of the script are hidden after creating a contract UTXO. This means you need to store the full contract script to ensure you can spend from your smart contract later.

> [!WARNING]
> Smart contract developers need to consider whether their contracts require storing contract details unique to each user.

For single instance contracts where there is only one smart contract address for a long-running contract, the full script information is available on-chain after the first contract interaction so doesn't require much extra thought.

When users are allowed to provide their own `constructor` arguments when creating a BCH smart contract, each contract creation will have a unique smart contract address. Because of this it becomes a requirement to store the unique contract details so this requires careful consideration!

Only the constructor arguments in the contract bytecode are variable, the rest of the bytecode for a contract is static. So the constructor arguments for user contracts are essential to store in a secure way.
Also the static part of the contract needs to be stored but this is the same across the different contract instances so is not unique for each user.

> [!NOTE]
> To construct the full contract script you need both the `constructor` arguments and static contract bytecode (either the contract source file or the `Artifact`) to be available.

### Off-chain storage

To store the contract details off-chain, you will need to run a database server which stores the specific constructor arguments for each contract, this will translate into their respective smart contract addresses. This is crucial data for users to spend from BCH locked in such a smart contract. So this approach does introduce a single point of failure.

> [!WARNING]
> When using off-chain storage, it is the crucial responsibility of the smart contract service to keep track of the contract details making up the `P2SH` contract, as user-wallets currently aren't capable of keeping track of contract details and are fully reliant on the app server to store this critical info.

### On-chain storage

To avoid introducing a single point of failure, different applications like Tapswap and Cauldron have started posting the `constructor` arguments with a contract-identifier to an `OP_RETURN` output during the contract creation. This way the contract details are available on-chain in a decentralized and recoverable way.

> [!TIP]
> To store contract details on-chain, start the `OP_RETURN` data with an easily recognizable identifier, this way you can find all your smart contract UTXOs by checking the transactions including that identifier in the `OP_RETURN`.

> [!NOTE]
> The `OP_RETURN` data has a maximum standardness size of 220 bytes which might be limiting for contracts with many large `constructor` arguments. You can read more about the [BCH transaction limits here](compiler_grammar_and_limits.md).

## Transaction server

When your smart contracts depend on "automatic settlement" or any events where transactions are invoked without the user being involved, you will need a transaction server to create and broadcast those transactions. Smart contracts on BCH are never self-executing, someone is always needed to invoke functionality on a smart contract by creating a transaction.

There are 3 main types of events which might need a transaction server to trigger a smart contract transaction: time-related events, contract-related events and oracle-related events.

### Time-related events

Time-related events are when your smart contract uses absolute or relative locktimes, which require a waiting period before certain transactions can happen. However, if you want those transactions to 'automatically' happen when this locktime is reached, then you will need to create a transaction server to monitor the block height on an ongoing basis.

> [!TIP]
> Both the `Electrum` and `Chaingraph` indexers allow you to create websocket subscriptions to listen for block height updates.

### Contract-related events

Contract-related events are when you want to update the server state to reflect changes on-chain, for example new contracts being created or existing contracts changing their state in an important way. So contract related events often don't trigger an on-chain transaction directly, but they update the information about the contracts tracked for time/oracle events by the server.

> [!TIP]
> With `Electrum` you can create subscriptions to transactions for a specific (contract) address, with `Chaingraph` you can create subscriptions to arbitrary on-chain events.

### Oracle-related events

Oracle-related events are when your smart contract uses an oracle to listen for outside information, where some transactions can only happen if the oracle publishes certain information. However, if you want those transactions to 'automatically' happen when the oracle triggers this condition, then you will need to create a transaction server to monitor the oracle for triggers on an ongoing basis.

---

CashScript can prepare transactions for both BCH WalletConnect and WizardConnect. For smart contract dapps, the main differences are that BCH WalletConnect is a single-address wallet protocol with transaction and message signing, while WizardConnect is HD-wallet-aware and can support custom extensions but does not provide a generic message-signing method.

## BCH WalletConnect

The BCH WalletConnect spec lays out a BCH-specific API for how Bitcoin Cash dapps can communicate with BCH wallets. BCH WalletConnect uses the generic WalletConnect transport layer, but the messages being exchanged are Bitcoin Cash-specific.

The standard is supported in multiple wallets and dapps. You can find a list of Bitcoin Cash dapps supporting WalletConnect on [Tokenaut.cash](https://tokenaut.cash/dapps?filter=walletconnect).

> [!TIP]
> The specification is called [`wc2-bch-bcr`](https://github.com/mainnet-pat/wc2-bch-bcr) and has extra discussion on the [BCH research forum](https://bitcoincashresearch.org/t/wallet-connect-v2-support-for-bitcoincash/).

### signTransaction Interface

Most relevant for smart contract usage is the BCH WalletConnect `signTransaction` interface.

```typescript
signTransaction: (wcTransactionObj: WcTransactionObject) => Promise<SignedTxObject | undefined>;
```

```typescript
interface WcTransactionObject {
  // the spec also allows for a tx hex string but CashScript returns the libauth transaction object
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

interface SignedTxObject {
  signedTransaction: string;
  signedTransactionHash: string;
}
```

CashScript `TransactionBuilder` has a `generateWcTransactionObject()` method for creating the `WcTransactionObject`.

### Spending User Inputs

Use `placeholderP2PKHUnlocker(userAddress)` for P2PKH inputs that should be signed by the connected wallet.

```typescript
import { TransactionBuilder, placeholderP2PKHUnlocker } from "cashscript";

async function proposeWcTransaction(userAddress: string) {
  // Use a placeholder unlocker which will be replaced by the user's wallet
  const placeholderUnlocker = placeholderP2PKHUnlocker(userAddress);

  // Use the CashScript SDK to construct a transaction
  const transactionBuilder = new TransactionBuilder({ provider });
  transactionBuilder.addInputs(userInputUtxos, placeholderUnlocker);
  transactionBuilder.addOpReturnOutput(opReturnData);
  transactionBuilder.addOutput(contractOutput);
  if (changeAmount > 550n) transactionBuilder.addOutput(changeOutput);

  // Generate a WalletConnect transaction object with custom broadcast and prompt options
  const wcTransactionObj = transactionBuilder.generateWcTransactionObject({
    broadcast: true,
    userPrompt: "Create HODL Contract",
  });

  // Pass wcTransactionObj to the WalletConnect client
  // See the signWcTransaction implementation below
  const signResult = await signWcTransaction(wcTransactionObj);

  // Handle signResult success / failure
}
```

### Spending From A User Contract

Use `placeholderSignature()` and `placeholderPublicKey()` for contract arguments that should be filled in by the wallet.

```typescript
import { TransactionBuilder, placeholderSignature, placeholderPublicKey } from "cashscript";

async function unlockHodlVault() {
  // Use placeholder arguments which will be filled in by the user's wallet
  const placeholderSig = placeholderSignature();
  const placeholderPubKey = placeholderPublicKey();

  // Use the CashScript SDK to construct a transaction
  const transactionBuilder = new TransactionBuilder({ provider });

  transactionBuilder.setLocktime(currentBlockHeight);
  transactionBuilder.addInputs(contractUtxos, hodlContract.unlock.spend(placeholderPubKey, placeholderSig));
  transactionBuilder.addOutput(reclaimOutput);

  // Generate a WalletConnect transaction object with custom broadcast and prompt options
  const wcTransactionObj = transactionBuilder.generateWcTransactionObject({
    broadcast: true,
    userPrompt: "Reclaim HODL Value",
  });

  // Pass wcTransactionObj to the WalletConnect client
  // See the signWcTransaction implementation below
  const signResult = await signWcTransaction(wcTransactionObj);

  // Handle signResult success / failure
}
```

### Wallet Interaction

To send the `WcTransactionObject` to the user's wallet, use `@walletconnect/sign-client`.

See [the Hodl Vault source code](https://github.com/mr-zwets/bch-hodl-dapp/blob/main/src/store/store.ts#L60) for how to initialize the `signClient` and for details about the `connectedChain` and `session`.

```typescript
import SignClient from "@walletconnect/sign-client";
import { stringify } from "@bitauth/libauth";
import { type WcTransactionObject } from "cashscript";

interface SignedTxObject {
  signedTransaction: string;
  signedTransactionHash: string;
}

async function signWcTransaction(wcTransactionObj: WcTransactionObject): Promise<SignedTxObject | undefined> {
  try {
    const result = await signClient.request({
      chainId: connectedChain,
      topic: session.topic,
      request: {
        method: "bch_signTransaction",
        params: JSON.parse(stringify(wcTransactionObj)),
      },
    });
    return result;
  } catch (error) {
    return undefined;
  }
}
```

## WizardConnect

WizardConnect is an HD-wallet-aware signing protocol. For the transaction itself it reuses the BCH WalletConnect transaction object, but it additionally requires HD path metadata called `inputPaths`. This tells the wallet which HD key should sign each input.

> [!TIP]
> See the [WizardConnect documentation](https://docs.riftenlabs.com/wizardconnect/) and [WizardConnect GitLab repository](https://gitlab.com/riftenlabs/lib/wizardconnect) for the protocol details.

The only difference from BCH WalletConnect is this extra `inputPaths` list, so CashScript does not add a separate WizardConnect abstraction. You build the transaction object with the existing `generateWcTransactionObject()` method and attach `inputPaths` yourself before sending the request to the wallet.

The WizardConnect sign request has the following shape:

```typescript
interface SignTransactionRequest {
  // The same object returned by generateWcTransactionObject()
  transaction: WcTransactionObject;
  // One entry per input the wallet must sign
  inputPaths: InputPath[];
}

// [inputIndex, pathName, addressIndex]
type InputPath = [number, string, number];
```

Each `inputPaths` entry maps a transaction input to an HD key:

* `inputIndex`: the input's position in the transaction's input list.
* `pathName`: the WizardConnect path name, such as `"receive"`, `"change"` or `"defi"`.
* `addressIndex`: the child index on that path.

The wallet derives the key for each listed input index, and uses it both to sign P2PKH user inputs and to fill placeholder signatures or public keys inside contract inputs. Inputs the wallet does not need to sign, such as contract inputs with complete unlocking bytecode, are left out of `inputPaths`.

### Spending User Inputs

Build the transaction with `placeholderP2PKHUnlocker()`, exactly as with BCH WalletConnect. Then construct `inputPaths` for the user inputs, matching the order in which you added them.

```typescript
import { TransactionBuilder, placeholderP2PKHUnlocker } from "cashscript";

async function proposeWizardTransaction() {
  // Use placeholder unlockers which will be replaced by the user's wallet
  const transactionBuilder = new TransactionBuilder({ provider });

  // Input 0: a UTXO on the receive path at address index 5
  transactionBuilder.addInput(userReceiveUtxo, placeholderP2PKHUnlocker(userReceiveAddress));
  // Input 1: a UTXO on the change path at address index 2
  transactionBuilder.addInput(userChangeUtxo, placeholderP2PKHUnlocker(userChangeAddress));

  transactionBuilder.addOutput(contractOutput);
  if (changeAmount > 550n) transactionBuilder.addOutput(changeOutput);

  // Build the standard WalletConnect transaction object
  const transaction = transactionBuilder.generateWcTransactionObject({
    broadcast: false,
    userPrompt: "Create Contract",
  });

  // Attach the HD path metadata for each user input, matching the input order above
  const inputPaths: [number, string, number][] = [
    [0, "receive", 5],
    [1, "change", 2],
  ];

  // Pass the request to the WizardConnect client
  // See the signWizardTransaction implementation below
  const signResult = await signWizardTransaction({ transaction, inputPaths });

  // Handle signResult success / failure
}
```

Because the `inputPaths` indices reference the final transaction input order, construct them after deciding the input order.

### Spending From A User Contract

Contract inputs that use `placeholderSignature()` and `placeholderPublicKey()` work too, for example reclaiming from a Hodl Vault or withdrawing from a Cauldron pool. Add an `inputPaths` entry for the contract input's index and the wallet fills the placeholder signature and public key using the HD key for that path.

```typescript
import { TransactionBuilder, placeholderSignature, placeholderPublicKey } from "cashscript";

async function unlockHodlVault() {
  // Use placeholder arguments which will be filled in by the user's wallet
  const placeholderSig = placeholderSignature();
  const placeholderPubKey = placeholderPublicKey();

  const transactionBuilder = new TransactionBuilder({ provider });
  transactionBuilder.setLocktime(currentBlockHeight);
  // Input 0: the contract UTXO, whose sig and pubkey placeholders the wallet fills in
  transactionBuilder.addInput(contractUtxo, hodlContract.unlock.spend(placeholderPubKey, placeholderSig));
  transactionBuilder.addOutput(reclaimOutput);

  // Build the standard WalletConnect transaction object
  const transaction = transactionBuilder.generateWcTransactionObject({
    broadcast: false,
    userPrompt: "Reclaim HODL Value",
  });

  // Point input 0 at the user's receive key at address index 5
  const inputPaths: [number, string, number][] = [
    [0, "receive", 5],
  ];

  // Pass the request to the WizardConnect client
  const signResult = await signWizardTransaction({ transaction, inputPaths });

  // Handle signResult success / failure
}
```

> [!NOTE]
> Filling `sig` and `pubkey` placeholders inside a contract input comes from the underlying BCH WalletConnect transaction format, not from the WizardConnect spec itself. The spec only describes `inputPaths` as selecting the HD key for inputs that need wallet signing, so this behaviour is wallet-dependent. It is implemented in wallets such as Paytaca, but confirm support with your target wallet.

> [!TIP]
> WizardConnect covers transaction signing only. For arbitrary message signing, use BCH WalletConnect or a WizardConnect custom extension.

### Wallet Interaction

Send the request to your WizardConnect dapp client. Its `signTransaction` method takes the `transaction` and `inputPaths` and returns the signed transaction.

```typescript
import { type WcTransactionObject } from "cashscript";

interface SignTransactionRequest {
  transaction: WcTransactionObject;
  inputPaths: [number, string, number][];
}

async function signWizardTransaction(
  request: SignTransactionRequest,
): Promise<string | undefined> {
  try {
    const result = await dappConnectionManager.signTransaction(request);
    return result.signedTransaction;
  } catch (error) {
    return undefined;
  }
}
```

See the [WizardConnect documentation](https://docs.riftenlabs.com/wizardconnect/) for how to set up the `dappConnectionManager` and establish a connection with the user's wallet.