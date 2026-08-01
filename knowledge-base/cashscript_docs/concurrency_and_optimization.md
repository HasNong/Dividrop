Topic: UTXO Concurrency & Bytecode Optimization
Source: CashScript Website
Type: Documentation
Priority: Medium
Description: Strategies for handling UTXO contention in multi-user smart contracts and techniques for optimizing CashScript contract size and execution efficiency.

---

In the UTXO model, a UTXO can only be spent once. When a public covenant has a single UTXO and two users try to interact with it at the same time, only one transaction propagates and the other is discarded as a conflict. This is called **UTXO contention** and it's the core scalability challenge for Bitcoin Cash smart contracts. This guide covers practical, permissionless design patterns to enable concurrent contract usage.

## The Problem: Single-UTXO Bottleneck

Consider a simple minting contract with one UTXO. User A and User B both want to mint an NFT at the same time. Both build a transaction spending the same contract UTXO. Due to the [first-seen rule](deployment_lifecycle_and_integrations.md#first-seen-rule), only one transaction propagates through the network and the other is rejected.

```text
User A ─── tx spending UTXO #1 ──→ ✓ Accepted (first-seen)
User B ─── tx spending UTXO #1 ──→ ✗ Rejected (conflict)
```

This means a single-UTXO contract can only process one interaction every few seconds without running into conflicts. For any contract with public usage, this can degrade the user experience.

> [!TIP]
> As covered in the [Transaction Lifecycle](deployment_lifecycle_and_integrations.md) guide, Bitcoin Cash supports unlimited unconfirmed transaction chains. In theory, users could take turns chaining transactions on the same UTXO. In practice, coordinating this is fragile and doesn't scale.

## Solution: Peer-to-Peer Contracts

The simplest way to avoid UTXO contention is to avoid shared UTXOs entirely. In a **peer-to-peer contract**, each contract instance is created between specific participants with predetermined terms. Only those participants can spend the UTXO, so there is no public competition for it and no concurrency problem.

Many common contract types are naturally peer-to-peer: escrows, vaults, multisig wallets, and derivatives contracts. These don't need threading — each instance is independent by design. For example, [AnyHedge](https://anyhedge.com) is a derivatives protocol where two parties agree on terms, lock BCH into a shared contract UTXO, and settle based on an oracle price at maturity — thousands of these contracts can exist simultaneously without any contention because each is a private UTXO between two specific parties.

Peer-to-peer contracts are the right choice when:

* The contract involves a **fixed set of participants** known at creation time.
* There is **no shared resource** (like a liquidity pool) that many users need to access concurrently.
* The contract's terms are **predetermined** — users agree on parameters before funding.

When a contract *does* need to serve arbitrary public users against shared state, peer-to-peer design won't work and you need the threading patterns described below.

## Solution: Multi-Threaded Contracts

The key insight is to create **multiple identical contract UTXOs**, each acting as an independent "thread". Users interact with different threads in parallel without conflicts.

```text
Thread 0  ──→  User A mints here
Thread 1  ──→  User B mints here
Thread 2  ──→  User C mints here
Thread 3  ──→  (available)
Thread 4  ──→  (available)
```

Each thread is a separate UTXO locked to the same contract. Because they are independent UTXOs, spending one does not affect the others. This is the UTXO-model equivalent of concurrent processing.

### Stateless vs Stateful Threads

How you design threads depends on whether your contract carries state. As is common when working with concurrency, it is easier to leverage it when you have a stateless system. Most of the complexity in concurrent systems comes from the stateful parts.

**Stateless threads** are the simplest case. The contract enforces rules but doesn't track any evolving state. You create multiple identical UTXOs and any of them can service any request.

**Stateful threads** carry state in the NFT commitment field. Each thread tracks its own state independently. The state across threads may drift and the system must be designed to tolerate this — see [Managing State Drift](#managing-state-drift) below.

Thread UTXOs are created during the [genesis transaction](deployment_lifecycle_and_integrations.md). Each thread gets its own UTXO (and optionally an NFT with distinct state in its commitment field), all created in one atomic transaction. See the [Contract Deployment](deployment_lifecycle_and_integrations.md) guide for details on setting up genesis transactions with multiple outputs.

## Random UTXO Selection

When a client needs to pick a thread, deterministic selection (always picking the first UTXO) defeats the purpose of having multiple threads since all users would contend for the same one. Instead, **randomly select** from available contract UTXOs:

```typescript
const contractUtxos = await contract.getUtxos();

// Filter for the relevant UTXOs (e.g. minting capability)
const availableThreads = contractUtxos.filter(
  utxo => utxo.token?.nft?.capability === 'minting'
);

// Randomly select a thread
const randomIndex = Math.floor(Math.random() * availableThreads.length);
const selectedThread = availableThreads[randomIndex];
```

This distributes concurrent transactions across threads, minimizing the chance of collisions. When collisions do happen, they result in [competing transactions](deployment_lifecycle_and_integrations.md#competing-transactions) where only one can be included — the other silently disappears.

> [!TIP]
> Random selection is the simplest approach and works well for client-side applications. For applications with a backend, you can implement smarter strategies like round-robin or least-recently-used.

### Handling Collisions

Even with random selection, collisions will occasionally happen. When they do, the network provider returns an error indicating the selected UTXO was already spent by another transaction. Your application needs to detect this specific error and distinguish it from other failures like insufficient fees or invalid transactions, in order to retry the transaction. The key detail is that the entire transaction must be rebuilt on retry — re-fetching UTXOs from the network gives you a fresh set where the conflicting UTXO is no longer available.

This retry pattern applies when the dapp or server broadcasts the transaction directly. In a [WalletConnect](deployment_lifecycle_and_integrations.md) setup with `broadcast: true`, the user's wallet handles broadcasting and will encounter the mempool conflict error instead. The dapp cannot catch and retry automatically — the user would need to retry the action, at which point the dapp should re-fetch UTXOs and select a new thread.

## Modular Contract Functions

The [modular contract design](concurrency_and_optimization.md#modular-contract-design) pattern from the optimization guide also has significant concurrency benefits. By separating contract logic into independent function contracts (each identified by an NFT commitment), users only contend on the main covenant when they need to modify shared state. The function contract UTXOs can each be duplicated independently, so different operation types can run in parallel without blocking each other.

> [!NOTE]
> This pattern is most valuable for complex contracts with many functions. For simpler contracts like a minting contract, putting all logic in one contract is perfectly fine.

## Choosing the Number of Threads

The number of threads depends on how many concurrent users you are realistically designing for. More threads means less contention, but more threads adds complexity to deployment and increases ongoing costs for stateful threads.

Consider these factors when deciding:

* **Stateless contracts** can have more threads freely, since there is no state drift concern and threads are interchangeable.
* **Stateful contracts** benefit from fewer threads, since each thread evolves its state independently and users or the application must keep them in sync.
* **Contracts with shared resources** like a liquidity pool present a trade-off: splitting into persistent threads fragments the resource across them.

For contracts with shared resources, this fragmentation can be significant. [Cauldron](https://www.cauldron.quest), a BCH DEX, illustrates the tension well: each liquidity provider creates their own independent contract UTXO ("micro-pool"), which looks like natural threading. But to get good price execution, a swap transaction needs to aggregate many of these micro-pools as inputs in a single transaction — so two concurrent swaps will still conflict on shared inputs, and the separate UTXOs don't actually help with concurrency.

This is a fundamental trade-off for DEX designs: combining liquidity for better execution works against splitting UTXOs for concurrency. The [accumulate-and-merge](#accumulate-and-merge-threading) model is one approach that addresses this by periodically merging threads back together for batch settlement.

> [!WARNING]
> Depending on your contract design, the number of threads may be fixed at deployment and cannot be changed later. Plan your thread count carefully based on realistic usage estimates before deploying.

### Cost Considerations

The one-time cost of creating thread UTXOs (dust amount per output) is negligible. The real cost to consider is **ongoing transaction fees for stateful threads that require regular updates**. Each stateful thread UTXO needs its own transaction to update its state, and these fees multiply with the number of threads.

For example, a price oracle contract that updates every 10 minutes results in ~52,560 update transactions per year, per thread. With 5 price oracle threads, that's over 260,000 transactions annually. While individual Bitcoin Cash transaction fees are very low, this adds up and should factor into your thread count decision.

Stateless threads have no ongoing cost — they only incur fees when users interact with them, and those fees are typically paid by the user. The cost consideration primarily applies to stateful threads that a service must keep up to date.

## Managing State Drift

When stateful contracts have multiple threads, each thread's state evolves independently. Consider whether state drift is acceptable for your use case — if it isn't, threading may not be the right approach. When it is acceptable, there are strategies to minimize it:

* **User incentive to update**: If users benefit from having the latest state (e.g., they avoid paying extra fees by updating), they will naturally keep threads current.
* **Lazy updates**: Allow any user to update a thread's state as part of their transaction. The contract validates the update is correct but doesn't require it to happen on a specific schedule. This serves as a useful fallback, but you should not rely on external users to keep your system in sync — a dedicated transaction service is typically needed to ensure threads stay up to date.

> [!WARNING]
> State drift is the most dangerous aspect of concurrent contract design. Analyze how likely drift is to occur, what happens when a thread's state lags behind, and ensure the contract logic remains safe in that scenario.

## Accumulate-and-Merge Threading

The [Jedex](https://github.com/bitjson/jedex) spec (Joint-Execution Decentralized Exchange) demonstrates a different concurrency model where threads are **ephemeral rather than persistent**. Instead of threads operating independently forever, multiple thread covenants collect user orders in parallel during an accumulation phase. At the end of a tick period, any user can trigger a lifecycle transaction that merges all threads back into a single covenant for batch settlement, and new threads are created for the next cycle.

```text
┌─── Thread 0 ──── orders ───┐
Users ───┤─── Thread 1 ──── orders ───┤──→ Merge ──→ Settle ──→ Recreate threads
         ├─── Thread 2 ──── orders ───┤
         └─── Thread 3 ──── orders ───┘
```

This model introduces a few ideas that are useful beyond DEX design. **Offloading state to users**: rather than tracking per-user data in the covenant, users receive receipt NFTs with their order details in the commitment. The settlement covenant can compute what each user is owed from just the receipt and the settlement price. **Ephemeral child covenants**: instead of maintaining historical data, a new payout covenant is spawned per settlement period. Users redeem their receipts against it at any time, and the main covenant never accumulates unbounded state.

> [!TIP]
> Accumulate-and-merge suits systems that must reconcile against shared state (like a liquidity pool). For systems where threads stay independent, persistent threads are simpler.

## Real-World Examples

The [CashNinjas minting contract](https://github.com/cashninjas/minting-contract) is an open-source production example of the multi-threaded minting pattern. It uses interleaved numbering across configurable threads (5 by default), with each thread tracking its mint count in the NFT commitment field. The contract is only 163 bytes of bytecode, demonstrating that the threading pattern adds minimal overhead to the contract itself — the complexity lives in the setup and client-side thread selection rather than in the on-chain logic.

## Putting It Together

A well-designed concurrent contract system combines these patterns:

1. **Identify bottlenecks**: Which contracts will see concurrent usage? Which must be single-threaded?
2. **Split into threads**: Create multiple UTXOs for parallel contracts during deployment.
3. **Separate concerns**: Use modular function contracts to maximize the parallel surface area.
4. **Random selection**: Clients randomly pick from available threads to distribute load.
5. **Manage drift**: Analyze and mitigate the impact of state drift across stateful threads.

```text
┌─── Thread 0 ───┐
         random  ──→  ├─── Thread 1 ───┤──→ All produce valid,
Users ── select  ──→  ├─── Thread 2 ───┤    independent results
                      ├─── Thread 3 ───┤
                      └─── Thread 4 ───┘
```

These patterns have been proven in production systems handling concurrent interactions on Bitcoin Cash. The UTXO model's explicit state makes reasoning about concurrency straightforward: if two transactions don't share any inputs, they cannot conflict.

For adversarial considerations around multi-threaded systems — such as intentional double-spends or targeted contention attacks — see the [Adversarial Analysis](security_and_debugging.md) guide.

---

CashScript contracts are transpiled from the high-level CashScript code to [BCH Script](https://reference.cash/protocol/blockchain/script) by the `cashc` compiler. BCH Script is the low-level language used for the Bitcoin Cash Virtual Machine (BCH VM) to evaluate contracts.

Because transaction fees are based on the bytesize of a transaction, it may be useful to optimize the compiled size of your smart contract by tweaking your CashScript code.

## Example Workflow

When optimizing your contract, you will need to continuously compare the contract size to see if the changes have a positive impact.
With the compiler CLI, you can easily check the bytesize and opcode count directly from the generated contract artifact.

```bash
cashc ./contract.cash --size --opcount
```

The compiler calculates the size from the contract's bytecode without constructor arguments. For the `opcount` this is not a problem but the `bytesize` output will be an underestimate, as the contract hasn't been initialized with contract arguments.
The compiler `bytesize` output is still helpful to compare the effect of changes, given that the contract constructor arguments stay the same.

> [!TIP]
> To get the exact contract bytesize including constructor parameters, initialise the contract with the TypScript SDK and check the value of `contract.bytesize`.

## Optimization Tips

The `cashc` compiler does some optimisations automatically. By writing your CashScript code in a specific way, the compiler is better able to optimise it.

### 1. Declare variables

Declare variables instead of hardcoding the same values in multiple places:

Example CashScript code

```cashscript
// do this
    bytes tokenId = 0x8473d94f604de351cdee3030f6c354d36b257861ad8e95bbc0a06fbab2a2f9cf;
    require(tx.outputs[0].tokenCategory == tokenId);
    require(tx.outputs[1].tokenCategory == tokenId);

    // not this
    require(tx.outputs[0].tokenCategory == 0x8473d94f604de351cdee3030f6c354d36b257861ad8e95bbc0a06fbab2a2f9cf);
    require(tx.inputs[1].tokenCategory == 0x8473d94f604de351cdee3030f6c354d36b257861ad8e95bbc0a06fbab2a2f9cf);
```

Also declare variables when re-using certain common introspection items to avoid duplicate expressions:

Example CashScript code

```cashscript
// do this
    bytes tokenIdContract = tx.inputs[0].tokenCategory.split(32)[0];
    require(tx.inputs[1].tokenCategory == tokenIdContract);
    require(tx.outputs[1].tokenCategory == tokenIdContract);

    // not this
    require(tx.inputs[1].tokenCategory == tx.inputs[0].tokenCategory.split(32)[0]);
    require(tx.outputs[1].tokenCategory == tx.inputs[0].tokenCategory.split(32)[0]);
```

### 2. Consume stack items

It's best to "consume" values (i.e. their final use in the contract) as soon as possible. This frees up space on the stack.
Use/consume values as close to their declaration as possible, both for variables and for parameters. This avoids having to do deep stack operations. This [example](https://gitlab.com/GeneralProtocols/anyhedge/contracts/-/blob/development/contracts/v0.11/contract.cash#L61-72) from AnyHedge illustrates consuming values immediately.

### 3. Parse efficiently

When using `.split()` to use both sides of a `bytes` element, declare both parts immediately to save on opcodes parsing the byte array.

Example CashScript code

```cashscript
// do this
    bytes firstPart, bytes secondPart = tx.inputs[0].nftCommitment.split(10);

    // not this
    bytes firstPart = tx.inputs[0].nftCommitment.split(10)[0];
    bytes secondPart = tx.inputs[0].nftCommitment.split(10)[1];
```

### 4. Avoid if-else

Avoid if-statements when possible. Instead, try to "inline" them. This is because the compiler cannot know which branches will be taken, and therefore cannot optimise those branches as well. This [example](https://gitlab.com/GeneralProtocols/anyhedge/contracts/-/blob/development/contracts/v0.11/contract.cash#L128-130) from AnyHedge illustrates inlining flow control:

AnyHedge CashScript code

```cashscript
// do this
    bool onOrAfterMaturity = settlementTimestamp >= maturityTimestamp;
    bool priceOutOfBounds = !within(clampedPrice, lowLiquidationPrice + 1, highLiquidationPrice);
    require(onOrAfterMaturity || priceOutOfBounds);

    // not this
    if(!(settlementTimestamp >= maturityTimestamp)){
        bool priceOutOfBounds = !within(clampedPrice, lowLiquidationPrice + 1, highLiquidationPrice);
        require(priceOutOfBounds);
    }
```

### 5. Trial & Error

When the contract logic is finished, that is a great time to revisit the order of the contract's constructor argument, the different contract functions and even the contract parameters. Currently the compiler does not change/optimize the user-defined order, so in addition to the guidelines above, it can still be helpful to trial and error different ordering for the items.

## Avoid Many Functions

When a contract has many different functions or has a lot duplicate code shared across two functions, this can be a natural indication that contract optimization is possible. There's a different optimization strategy for each:

### Modular Contract Design

Modular contract design avoids the added size of having many functions, instead the contract logic is separated out in to different components which we will call 'function contracts'.
By only adding the function contract you are actually using in the transaction, and not all the other unused functions, you can drastically shrink the size of your contracts used in a transaction.

The concept of having NFT functions was first introduced by the [Jedex demo](https://github.com/bitjson/jedex#demonstrated-concepts) and was first implemented in a CashScript contract by the [FexCash DEX](https://github.com/fex-cash/fex/blob/main/whitepaper/fex_whitepaper.md). The concept is that by authenticating NFTs, you can make each function a separate contract with the same tokenId. This way, you can offload logic from the main contract. One function NFT contract is attached to the main contract during spending, while the other contract functions exist as unused UTXOs, separate from the transaction.

> [!TIP]
> By using function NFTs you can use a modular contract design where the contract functions are offloaded to different UTXOs, each identifiable by the main contract by using the same tokenId.

### Combining Functions

If there is a lot of duplicate code across different functions in your contract, you could consider combining the functions into one, where the logic of the different functions are conditionally executed based on the function arguments, removing duplicate code.

The difficulty with this approach is that CashScript functions expect a fixed number of arguments for each function. So when trying to combine two functions into one it might prove very difficult due to the different arguments they each expect. There is no notion of optional arguments or function overloading in CashScript currently.

> [!WARNING]
> This optimization is considered advanced, as it steps away from the CashScript abstraction for contract structure and often requires workarounds.

Example CashScript code

```cashscript
contract Example(){
  function Main(){
    // logic applying to all if/else branches
    if(conditionFunction1){
       // logic function1
    } else if(conditionFunction2){
       // logic function2
    } else {
      // logic applying to function 3 & 4
      if(conditionFunction3){
        // logic function3
      } else {
        // logic function4
      }
    }
  }
}
```

In Cashscript, when defining multiple functions, a `selectorIndex` parameter is added under-the-hood to select which of the contract's functions you want to use, this wraps your functions in big `if-else` cases. However when combining multiple functions in one cases you will have to think about the function conditions and `if-else` branching yourself.

## Advanced: Hand-optimizing Bytecode

You can still use the CashScript TypeScript SDK while using a hand-optimized or hand-written contract, although this is considered advanced functionality.

There's two ways to go about this, either you create a custom `Artifact` so you can still use the `Contract` class or you create a custom `Unlocker` to use in the transaction building directly.

### Note on Premature Optimizations

It's worth considering whether hand-optimizing the contract is necessary at all. If the contract works and there is no glaring inefficiency in the bytecode, perhaps the best optimization is to not to obsess prematurely about the transaction size with Bitcoin Cash's negligible fees.

> We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%.

### Optimizing with the BitauthIDE

When optimizing the bytecode of your contract to ensure it is the smallest possible bytesize you'll likely want to use the [BitauthIDE](https://ide.bitauth.com) so you can see the stack changes for each executed OpCode. Low-level understanding can also give good intuition about the [optimization tips](#optimization-tips) for the CashScript code.

### Method 1) Custom Artifact

To manually optimize a CashScript contract's bytecode, you need to overwrite the `bytecode` key of your contract artifact.

If you manually overwrite the `bytecode` in the artifact, the auto generated 2-way-mapping generated by the compiler becomes obsolete. You are no longer compiling high-level CashScript code into BCH script, instead you are writing BCH script by hand.
This causes the link of the BCH opcodes to your original CashScript code will be entirely lost for debugging.

```typescript
interface Artifact {
  bytecode: string // Compiled Script without constructor parameters added (in ASM format)
  // remove the 'debug' property as the info becomes obsoleted
}
```

> [!WARNING]
> If you use hand-optimized `bytecode` in your Contract's artifact, the `debug` info on your artifact will become obsolete and should be removed.

> [!TIP]
> You can create an `Artifact` for a fully hand-written contract so it becomes possible to use the contract with the nice features of the CashScript SDK! An example of this is the [unofficial Cauldron Swap SDK](https://github.com/mr-zwets/Cauldron-Swap-SDK), which uses `Artifact bytecode` not produced by `cashc` at all but still uses the CashScript SDK.

### Method 2) Custom Unlockers

In the [addInput() method](typescript_sdk_transaction_builder.md#addinput) on the TransactionBuilder you can provide a custom `Unlocker`

```typescript
transactionBuilder.addInput(utxo: Utxo, unlocker: Unlocker, options?: InputOptions): this
```

the `Unlocker` interface is the following:

```typescript
interface Unlocker {
  generateLockingBytecode: () => Uint8Array;
  generateUnlockingBytecode: (options: GenerateUnlockingBytecodeOptions) => Uint8Array;
}

interface GenerateUnlockingBytecodeOptions {
  transaction: Transaction;
  sourceOutputs: LibauthOutput[];
  inputIndex: number;
}
```