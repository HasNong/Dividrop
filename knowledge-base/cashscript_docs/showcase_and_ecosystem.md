Topic: CashScript Ecosystem, Syntax Highlighting & Showcase
Source: CashScript Website
Type: Documentation
Priority: Low
Description: Overview of the CashScript ecosystem, IDE extension support (VSCode), featured applications built with CashScript, and community supporters.

---

### TypeScript SDK

The CashScript TypeScript SDK makes it easy to build smart contract transactions, both in browser or on the server. By offering full type-safety, developers can be confident in the quality and reliability of their applications.

### Familiar Syntax

The CashScript syntax is based on Ethereum's smart contract language Solidity, which in turn is influenced by C++, Python, and JavaScript. This should make writing CashScript contracts feel familiar even to new developers.

### Integrated Network APIs

To make it easy to get blockchain information, the CashScript SDK exports a standardized network provider to query network APIs. The primary class of network providers are the electrum servers but other network providers are also supported.

### Advanced Debug Tooling

To offer the best developer experience for debugging and automated testing, CashScript has extensive debug tooling built-in. This makes it possible to develop robust contract testing suites, and to debug your contracts with the Bitauth-IDE.

---

When developing smart contracts for CashScript it is useful to have the proper syntax highlighting in your code editor / IDE. If you use Visual Studio Code, there is a dedicated CashScript extension. For other editors it is recommended to install a Solidity highlighting plugin and associate it with `.cash` files in your editor, since the syntaxes of the two languages are very similar.

## Visual Studio Code (Recommended)

For Visual Studio Code (and derived editors like Cursor) we have an official [CashScript extension](https://marketplace.visualstudio.com/items?itemName=CashScript.cashscript-vscode). This extension works with `.cash` files and supports syntax highlighting, autocompletion, snippets and linting. Because of the first-class CashScript support, Visual Studio Code with this CashScript extension is the recommended way to develop CashScript contracts.

To have the extension automatically suggested for any developer looking at your CashScript contract in VScode, add the following configuration in a `.vscode/extensions.json` file:

~/.vscode/extensions.json

```json
{
  "recommendations": [
    "cashscript.cashscript-vscode",
  ]
}
```

## Cursor

Cursor and other VS Code forks can use the VS Code extension mentioned above. This extension should be findable in the extensions menu within the editor. If it is not, you can manually install it from the [Open VSX Registry](https://open-vsx.org/extension/CashScript/cashscript-vscode).

## Sublime Text

The most popular Solidity plugin for Sublime Text is [Ethereum](https://packagecontrol.io/packages/Ethereum). Install this plugin with [Package Control](https://packagecontrol.io/), open a `.cash` file and set Solidity as the syntax language in the Sublime menu bar:

> View -> Syntax -> Open all with current extension as ... -> Solidity

This associates `.cash` files with Solidity, and enables syntax highlighting for your CashScript files.

## Vim

The most popular Solidity plugin for Vim is [vim-solidity](https://github.com/TovarishFin/vim-solidity). Install this plugin and add the following snippet to your `.vimrc`:

.vimrc

```bash
au BufRead,BufNewFile *.cash setfiletype solidity
```

This associates `.cash` files with Solidity, and enables syntax highlighting for your CashScript files.

## GitHub

GitHub has highlighting for Solidity built in. To associate `.cash` files with Solidity highlighting, add a `.gitattributes` file to your repository with the following contents:

.gitattributes

```python
*.cash linguist-language=Solidity # GitHub
```

Unfortunately Gitlab does not have properly working Solidity highlighting through the `gitattributes` for now...

## Others

If your editor is not mentioned above, the steps are likely very similar. Try to find a Solidity syntax highlighting plugin for your editor of choice and find a method to associate `.cash` files with this Solidity highlighting.

---

See the awesome contracts and applications that people are building with CashScript!

## AnyHedge

[](https://anyhedge.com)

AnyHedge is the first DeFi project built on top of Bitcoin Cash in the form of a synthetic derivatives platform. AnyHedge allows any two parties to enter into a smart contract together and speculate on the future price of an asset. One of the parties wishes to protect themselves against price fluctuations and takes the *hedge* position, while the other party wishes to speculate and takes a leveraged *long* position.

## ParyonUSD

[](https://paryonusd.com/)

ParyonUSD is a decentralized stablecoin protocol on Bitcoin Cash that issues PUSD through over-collateralized debt positions (CDPs). The protocol consists of 26 CashScript contracts covering loans, loan keys, redemptions, a stability pool and price oracle. The [contracts are open source](https://github.com/ParyonUSD/contracts) for anyone to inspect and verify.

## Moria

[](https://moria.money/)

Moria is a decentralized stablecoin and borrowing protocol on Bitcoin Cash using CashTokens. The Moria protocol works with collateralized debt positions (CDPs) where stablecoins are issued by creating over-collateralized loans. The Moria protocol uses multiple smart contracts, all written in CashScript.

## Tapswap

[](https://tapswap.cash/)

Tapswap is the first non-custodial marketplace to trade CashTokens, both fungible token & NFTs, on Bitcoin Cash. Tapswap uses CashScript for its non-custodial token-sale offer contracts. It uses BCH WalletConnect to allow users to list tokens for sale right from their own wallet.

## Bitcats Heroes

[](https://bitcatsheroes.club/)

Bitcats Heroes is the first collectible NFT series on Bitcoin Cash. The project uses CashScript for its non-custodial minting contract. This way the NFT minting guarantees fair access and a transparent NFT launch. The minting page uses BCH WalletConnect to allow minting directly from the user's smart contract wallet.

## Cash-Ninjas

[](https://ninjas.cash/)

Cash-Ninjas is a collectible NFT project on Bitcoin Cash which focuses on building open-source tooling! The Cash-Ninjas project uses CashScript for its non-custodial, multi-threaded minting contract. The contract is open source for others to inspect and use the contract code. The Cash-Ninjas minting page uses wallet connect to allow minting directly from the user's smart contract wallet.

## BCH Guru

[](https://bch.guru/)

BCH Guru is a non-custodial price-prediction platform and a collectible NFT project. BCH Guru uses CashScript for its price-prediction smart contracts to have players commit to a secret price-prediction. The project was the first to pioneer integration with CashConnect, which allows wallets to recognize the smart contract template and understand contract details.

## CashTokens Studio

[](https://cashtokens.studio)

The CashTokens Studio is an application for creating CashTokens and for managing their metadata updates and reserved supply. The CashTokens Studio uses CashScript to lock the AuthUTXO in an AuthGuard contract to prevent accidentally spending the authority to be able to update the token's metadata or release reserved supply.

## FundMe.cash

[](https://fundme.cash/)

FundMe is a new BCH crowdfunding platform using WalletConnect. Fundme campaigns have revocable and refundable pledges through the use of CashTokens receipts. By using receipts, Fundme does not have a maximum limit on the number of participants in a campaign.

## Badgers.cash

[](https://badgers.cash/)

BadgerCoin is a fungible CashToken using a novel distribution mechanism. BadgerCoins are earned through staking Bitcoin Cash in the Badgers Smart Contract. The staking duration is predetermined, and depending on the stake amount and period you earn tokens. The website allows for anyone to invoke contract unlocks.

## Zapit P2P Exchange

[](https://zapit.io/)

The Zapit wallet has a built-in P2P Exchange which allows user to buy or sell Bitcoin Cash directly without a custodial middleman. The P2P exchange works with an escrow smart contract written in CashScript. The P2P exchange contract has already processed hundreds of BCH in volume.

## Paytaca P2P Exchange

[](https://www.paytaca.com/)

The Paytaca wallet has a built-in P2P Exchange which allows user to buy or sell Bitcoin Cash with fiat currency directly without a custodial middleman. The P2P exchange works with an escrow smart contract written in CashScript.

## BCH PUMP

[](https://bchpump.cash/)

BCH Pump is a CashTokens Launchpad inspired by the 'pump.fun' mechanism to bootstrap tokens on a bonding curve. The pools are migrated to Cauldron DEX once the bonding process is completed. The BCH Pump contracts are written with CashScript and use a multi-contract and multi-step setup in its design.

## Unspent Phi

[](https://unspent.app/)

Unspent Phi allows users to convert Bitcoin Cash they have today into a series of periodic payments over a long period of time.  It's a set of simple contracts that rely on rolling timelocks and introspection rather than signatures; meaning as long as the correct recipients are paid, anyone may build and submit transactions.