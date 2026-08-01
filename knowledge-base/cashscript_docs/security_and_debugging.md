Topic: Contract Security, Adversarial Patterns & Debugging
Source: CashScript Website
Type: Documentation
Priority: High
Description: Security audit guidelines covering front-running, UTXO pinning, re-entrancy, and malleability, plus debugging tools and Bitauth IDE inspection.

---

In this guide we'll dive into "adversarial analysis" for smart contract systems. Adversarial analysis means to analyze your system from the point of a potential malicious 3rd party which might want to hamper or attack your system. This guide will build further on knowledge from the [transaction lifecycle guide](deployment_lifecycle_and_integrations.md).

## The Happy Case

As long as all Bitcoin Cash miners follow the first-seen rule then you can count on the idea that competing transaction chains can only occur due to accidental race conditions caused by simultaneous users. In the case of an attempted double spend, full nodes on the BCH network won't relay the transaction, and even if the transaction reaches the mempool of a miner, they would discard the transaction because of the first seen rule.

> [!TIP]
> The "happy case" scenario is currently the standard lifecycle for transactions on the Bitcoin Cash network, also for DeFi transactions interacting with on-chain DEXes.

## The Adversarial Case

The adversarial case is where 3rd parties intentionally double spend unconfirmed transactions in the contract system with the goal to extract value or to disrupt the experience for normal users.

> [!WARNING]
> In an adversarial environment where double spends occur, user-created transactions interacting with public are not certain to be confirmed. This means waiting for block confirmations is required to be sure the transaction isn't cancelled.

There are 2 categories to consider for adversarial double spends:

1. Race-condition double spends (no miner help required)
2. Late double spends (miner help required)

### Race-condition Double Spends

The first scenario of race-condition double spends do not benefit the adversarial 3rd party, instead the goal would just be griefing: to disrupt the flow for normal users. The double spend can cause the user-transaction to be cancelled even though from the user point-of-view it already looked like the transaction went through and achieved its goal.

> [!NOTE]
> For an adversarial attack to pull off this time-sensitive attack, he would require extensive monitoring on the p2p network and quickly be able to generate and broadcast competing double spend transactions.

### Late Double Spends

In the case of a late double spend (which does not try to exploit a race condition) the adversarial actor needs help from a miner.
Either the adversarial actor needs to convince the miners to abandon their first seen rule or he needs to be mining himself to be able to construct his own block.

> [!WARNING]
> Both race-condition and late double spends can be used to grief the experience for normal users, however only late double spends can be used to extract economic value.

To convince existing miners to include the double spend transaction instead of the original, the malicious attacker will include a significantly higher mining fee than the original transaction. This can be seen as a 'miner bribe' being paid to discard the first-seen rule and to accept the double spend instead of the original.

> [!NOTE]
> Attempting a double spend in this way does not incur risk to the adversarial party, either their transaction is not included and they don't pay any fee, or they successfully perform the double spend and they pay the high fee "miner bribe".

## Economic Value Extraction

We will now consider what motive the adversarial actor might have to perform these bribes. The two classes of motives are either the profit motive for an economically motivated actor or causing on-chain disruption for a maliciously motivated actor.

### Stale-state arbitrage

If DEXes don't cleverly aggregate their prices across blocks, then it can be economical for adversarial actors to instead of building on the latest transaction in the unconfirmed transaction chain of a smart contract, to instead create a competing transaction chain building on an older state. By strategically creating a competing transaction chain they might be able to take advantage of an older price state/ratio which has not yet been confirmed in the blockchain.

Because having a more advantageous (older) price state or ratio might be very profitable, it is worth it for the adversarial actor to pay the high fee "miner bribe" to attempt this double spend transaction.

> [!TIP]
> We list some possible mitigations which smart contract systems can implement in the section on ['Avoiding MEV'](#mev-avoidance-strategies)

## Miner-Extractable-Value (MEV)

Miner-Extractable-Value (MEV) refers to the value (either in dollars or in BCH) which miners can "extract" by having the ability to decide transaction inclusion and the ability to prioritize or insert their own transactions in their new block.

> [!NOTE]
> On Ethereum the acronym was changed to mean "Maximum-Extractable-Value" because ETH is now a proof-of-stake system and does not have miners. The modified concept still applies to the ETH block proposers (validators).

### MEV Differences from ETH

MEV works quite differently on a UTXO-model blockchain than on an account-based chain. So even if you are very familiar with the MEV mechanisms on Ethereum it will still be helpful to consider how they do - or do not - apply to Bitcoin Cash.

What is not possible to do on UTXO chains is a "sandwich" strategy where a miner would insert a transaction in the middle of a valid transaction chain. In UTXO each transaction explicitly consumes inputs of a previous transaction and creates outputs. Because of this it is not possible to "insert" a transaction in the middle of an unconfirmed chain and thus sandwich strategies are not possible.

### Controlling Block-Construction

The reason why block producers are better positioned than other economic actors such as on-chain traders or arbitrageurs is that they can prioritize their own transactions even if conflicting transactions exist in the mempool.

Other actors who construct double spend transactions will face great difficulty in getting their transaction to propagate and in having to pay high mining fees to bribe miners to accept their double spend over the original transaction.

## Expected Evolution of MEV

Below we will extend the adversarial analysis by extrapolating the evolution of MEV on Bitcoin cash based on the example of more mature DeFi ecosystems like Ethereum. As mentioned at the start, the "happy case" scenario is currently the standard lifecycle for transactions on BCH. The analysis below is speculatively extrapolating how this could evolve in a mature DeFi ecosystem.

### Abandoning First-Seen

If over time "bribe" double spends start happening on BCH then we can expect over time that some miners will deflect from the convention and use custom transaction selection software to extract MEV from bribe transactions. Over time we can expect miners not just to prefer bribes when available but to actively build transactions to extract from or create value for DeFi protocols.

> [!TIP]
> Adversarial analysis should take into account that "first-seen rule" is just a convention and a way to play nice, however it is not economically maximizing when double spends include miner bribes.

### Specialized Block-Builders

As described in the section on "stale-state arbitrage" economic actors may be incentivized to strategically create a competing transaction chain which takes advantage of an older price state/ratio which has not yet been confirmed in the blockchain. Although miners are not specialized in the optimal construction of DeFi transactions in a block, miners would over time be likely to team up with teams/companies creating this type of software for them.

> [!NOTE]
> Ethereum with its large amount of MEV has already seen the emergence of specialized 'block builder' as a new class of relevant economic actors separate from the block proposer (who signs the block).

## MEV Avoidance Strategies

There's a few strategies which dapps can employ to avoid introducing unwanted MEV:

### Batching Same-Block Trades

For DEXes the solution to the 'stale-state arbitrage' problem is introducing a batching mechanism for same-block trades so they all execute at the same price. The drawback is that this mechanism requires extra contract complexity and careful design. The benefit of including such a MEV avoidance mechanism is that even at scale with many adversarial actors, economic extraction with double spends is not possible.

> [!TIP]
> This strategy of batching same-block trades (or "joint-execution") is the key concept demonstrated by the [Jedex contract prototype](https://github.com/bitjson/jedex#demonstrated-concepts).

### Centralized Co-signing

For contract systems relying on a continuously updated on-chain oracle price feed, the problem of 'stale-state arbitrage' reappears.
However in this context the only known solution to adversarial actors exploiting stale state with a late double spend is to require centralized co-signing in the contract system.

The drawback of this approach is that it introduces a central party to enforce honest, sequential actions to prevent late double spends. The approach introduces the need for interactivity and assumes that the central signing service does not collude or cannot be bribed, additionally it also introduces new possible security concerns.

### Avoid Bounty Transactions

Having anyone-can-claim bounty transactions in a smart contract system directly encourages the development of double spending technology, whether it is race-condition double spends, miner bribe double spends or miner-involved double spends.

> [!TIP]
> To not incentivize the development of double-spending technologies, it is best to avoid anyone-can-claim bounty transactions in your smart contract system.

---

Debugging is no walk in the park. This is especially true for debugging complex smart contracts. Luckily there are strategies that can make it easier for developers to discover bugs in their contracts.

## Categories of Bugs

There are 2 broad categories of smart contract bugs:

### 1. Bug in Transaction Building

The first category of bugs is a bug in the transaction building meaning the 'invocation' of your smart contracts fails. This means the bug is in the usage of the CashScript Transaction builder and you need to carefully review the shape of your transaction and whether it matches the requirements imposed by the smart contract UTXOs.

### 2. Bug in Contract Logic

The second category of bugs is a bug in the smart contract logic which prohibits valid spending, this results in the shape of the Transaction builder not matching with the contracts simply because there is a coding error in the contract! Carefully review the logic in the failing line and if needed check the documentation so you are sure about the functionality of your CashScript contract code.

Whatever category your bug falls into, the first step of debugging is understanding what line in your CashScript contract is making your transaction get rejected. Afterwards, investigation needs to start whether it's a transaction building bug or a bug in contract logic.

## Debugging Tools

The [Transaction Builder](typescript_sdk_transaction_builder.md) has deep integration with libauth to enable local transaction evaluation, without actual interaction with the Bitcoin Cash network. This allows for fully integrated debugging functionality.

### Error messages

If a CashScript transaction is evaluated with `.debug()` or is sent to a network and rejected, then the transaction will be evaluated locally using libauth to provide the failure reason and debug information. Here is an example of what a CashScript error message looks like:

```bash
HodlVault.cash:23 Require statement failed at input 0 in contract HodlVault.cash at line 23.
Failing statement: require(price >= priceTarget)
Bitauth IDE: [link]
```

Read the error message to see which line in the CashScript contract causes the transaction validation to fail. Investigate whether the contract function invocation is the issue (on the TypeScript SDK side) or whether the issue is in the CashScript contract itself (so you'd need to update your contract and recompile the artifact). If it is not clear **why** the CashScript contract is failing on that line, then you can use the following two strategies: console logging & Bitauth IDE stack trace.

### Console Logging

To help with debugging you can add `console.log` statements to your CashScript contract file to log variables. This way you investigate whether the variables have the expected values when they get to the failing `require` statement in the CashScript file. After adding the `console.log` statements, recompile your contract so they are added to your contract's Artifact.

### Bitauth IDE

Whenever a transaction fails, there will be a link in the console to open your smart contract transaction in the BitAuth IDE. This will allow you to inspect the transaction in detail, and see exactly why the transaction failed. In the BitAuth IDE you will see the raw BCH Script mapping to each line in your CashScript contract. Find the failing line and investigate the failing OpCode. You can break up the failing line, one opcode at a time, to see how the stack evolves and ends with your `require` failure.

It's also possible to export the transaction for step-by-step debugging in the BitAuth IDE without failure. To do so, you can call the `getBitauthUri()` function on the transaction. This will return a URI that can be opened in the BitAuth IDE.

```typescript
const uri = transactionBuilder.getBitauthUri();
```

> [!WARNING]
> It is unsafe to debug transactions on mainnet using the BitAuth IDE as private keys will be exposed to BitAuth IDE and transmitted over the network.

The Bitauth IDE will show you the two-way mapping between the CashScript contract code generated opcodes. Here is [a Bitauth IDE link](https://ide.bitauth.com/import-template/eJzFWAtv2zYQ_isCN2BJ4drUW8raAK3jNkbSJEvcFUMdGBR1stXakidRWYIg--07SrIk23LgDhlGBKEiHu-7x3fUMY_k55TPYMHIEZkJsUyPer3Qh64XCpaJWZfHi558gEiEnIkwjl4LWCznTMDrO9ot9na_pXFEOsSHlCfhUkqhuuFiGScCfCVI4oXCWTorVlEwYgtAiT6-u8nfKR8hgoRJ6RPwsuk0jKbKqATCDWm2LJSRo6_kff90olHNnFCT3HbIHSRpjkg7RJopQkjJ0SMZJSxKA0i-hGI2ChcQZ2ISRstM0MmSJWiBwI1ScN3sfhyJhHGh8ARyhxUWoQ9ZxPM_GlsrP1qQlIMcSvmJHkrzc_2pNL7NqnnMv6NU25JYNzyLclnpNUtC5s0LV1OIfEhuwum2O-N6cUxq65U4qH0akxJmTGqnap0dIh6W8tUZPJCnTrmyG2oTR8zCVOFlWDcBau1f2HwO4oQJJkES4OEyxHy24VSLe0LVynaglf63YVWh2QtppWgHzirkmE8f7rfhymqoMpOLKSJW4B54lpdCCbShqRUPR4N77RXRTjAUXrI0hZ2U3dgGd2yeyVK93YxEWyHgaq_XZF1beY2jNxUF5TkTxUkyScNpxESWQBfdnOBeVJ1O5HMm7uP0WEG9KDOOxhE-bYQxjKqEofL1AOY7w0gob5U36vFYnmZFKNL2-i5q9qm9aFchlDMeZKMiM0stnenas6fGVoRaZDBavDqi4igVScZFnKxHroxs0yt671KfUh2de1PVQy6wzLzv8FDIUN0JTNM0HN8OdF91dA6e5wDYNtWtAMAzqBMYzKQ6DTzDsWzVtkzX81zDCMDEZX5cJW5buaY6vqFalmq5mouPGlcD29JBM3QwPNPjuh84oOIyZcw1dU-1mQVUc6lmaWbg0uMys96DAB77MI6U_UbvlbJM2HTBGh8i5W_aVdUu_XVPHc3xqvcj0C86fgy64koLlQ7K5BTp6qxyVbGjk3On5NKh8vgvvMZcXcOfWZhArfaXVKnqWJ5tCyb4bB-vL68muoK_rob9MzlT-evi86fBb5_fncvn4YcGdFX9ovT8AFFrK_BYkS7tMUpoQyJcX56fF_NITv3TQf_sZvhxw2s5ksLtA-yQ-HcEO2gid2o7Dg-f4V8JfTG8UramwfnNYDvgT_t4tK_Xe4r-vwzPp5pmq--OnCW7PMk8hlnw80au4PpOCjZptsq12qTZ74Pr4Yc_GtA1zcqikiyrvlx7UmwX9M2Xd1dNnpXoz9Gsgu6UVjxLsDXoNbTzy_7ZaPhpUDvcDHgTWtx382Afv63Oiv2P1BJaO7m-vCqCvXP8FwyXdXRxUpwbzwyEfjHYFfSeoi9fXKRoCyHCK0S8b2NYdXgoXjYwg_JV26dFaW3_1pvddxG2tQzveKCU2mUZ_TUDWZOyvS4_00XvW3SHsiftSk2ywUVTVo1AfQtCxS_RaZC1Kwh5ic6INO4ZZNWOke1LAVFlY8mzJEHs97KJPIVwOsNd2vprGWtypNqGhViaa3QIfr7zhC6T8A4zc1b-2bgfEstwLddjhqepaJvuO6pl2hq1uUZdz0HjTUvXLIeCYXsAGmO2a_HA9j3K8YfbJL9V5N9UxotMPpI8yfKy8EhkUx5j3zAsnEGjVm9G9Z5TbMLQFgBuBa5lqrYWcNc3HGrqAQ-Au6aqqtRmjgm6r_nUU33VBWmyjUmjlu5z3fAC2S_jIQQRh4ts4cnkGxgH17LzaBQdPHbg7yuWfCXpPBbk9gkvKnJR5CHUTIqjsHTlx9ZWYlvMVQ1HM1Xug61xmfvA9wPbMTBArmcyZpgOhs-2ASzHYTLjkthww0ScIqMxWdRFpKfmvy00WY1xlnC4fA5-ZXmbSsNxnm4xL_8AUE0PwQ==) for the basic `TransferWithTimeout` contract as an example:

```typescript
// "TransferWithTimeout" contract constructor parameters
<timeout> // int = <0x90d003>
<recipient> // pubkey = <0x038f55548d7f3d183cebb8ee77036feeb408f4a5030fb486717659bb944fe5eb4c>
<sender> // pubkey = <0x0218d4166169298d42c1f763e243e4b5bc3df8e11690aa953b17a6e02902625f90>

// bytecode
                                       /* pragma cashscript ~0.11.0;                                                   */
                                       /*                                                                              */
                                       /* contract TransferWithTimeout(pubkey sender, pubkey recipient, int timeout) { */
                                       /*     // Require recipient's signature to match                                */
OP_3 OP_PICK OP_0 OP_NUMEQUAL OP_IF    /*     function transfer(sig recipientSig) {                                    */
OP_4 OP_ROLL OP_ROT OP_CHECKSIG        /*         require(checkSig(recipientSig, recipient));                          */
OP_NIP OP_NIP OP_NIP OP_ELSE           /*     }                                                                        */
                                       /*                                                                              */
                                       /*     // Require timeout time to be reached and sender's signature to match    */
OP_3 OP_ROLL OP_1 OP_NUMEQUALVERIFY    /*     function timeout(sig senderSig) {                                        */
OP_3 OP_ROLL OP_SWAP OP_CHECKSIGVERIFY /*         require(checkSig(senderSig, sender));                                */
OP_SWAP OP_CHECKLOCKTIMEVERIFY         /*         require(tx.time >= timeout);                                         */
OP_2DROP OP_1                          /*     }                                                                        */
OP_ENDIF                               /* }                                                                            */
```