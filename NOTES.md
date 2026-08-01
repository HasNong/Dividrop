# Notes

## BCH vs Tokens vs Shares — 2026-08-02

BCH (Bitcoin Cash) is the native currency of the blockchain — used to pay transaction fees, like postage stamps. Custom tokens (CashTokens) are assets created ON the BCH blockchain — like printing your own tickets. In the Stock Dividends project, ACME and GLBX tokens represent company shares. BCH pays the fees, tokens are the stock certificates.

> BCH = gas money for transactions. Tokens = the stock shares being tracked.

## Chipnet (Testnet) — 2026-08-02

Chipnet is an exact copy of the Bitcoin Cash network but with fake money. Same rules, same smart contracts, zero cost. Used for testing before deploying to mainnet. Think of it as a staging server for blockchain apps.

> Test everything on chipnet first, switch one setting (`Network.MAINNET`) to go live.

## Block Explorer — 2026-08-02

A block explorer is just a website that reads data from the blockchain and displays it. It does NOT store or validate transactions — the blockchain does that. Transactions exist on chain whether or not an explorer shows them. Like Google Maps showing a building that already exists.

> Explorers are viewers, not validators. The blockchain is the source of truth.

## Why Dividends Could Not Mint New Tokens — 2026-08-02

Bitcoin Cash consensus enforces fungible token conservation: `sum(output tokens) <= sum(input tokens)`. A minting NFT only authorizes creating new **NFTs** within a category — NOT new fungible tokens. The fix was to put all fungible tokens on the vault during genesis, then `distribute()` moves them from vault to holders.

> Minting NFT ≠ minting fungible tokens. Vault must hold the supply; distribute just moves it.

## Genesis Transaction — 2026-08-02

The genesis transaction creates a new token category on the blockchain. It must spend a `vout:0` UTXO (whose txid becomes the token ID). The vault gets the minting NFT + all fungible tokens. Holders start with zero and receive tokens via `distribute()` calls.

> Genesis creates the token category. Vault holds all supply. Distribute sends tokens to holders.

## Chipnet is a Network, tBCH is the Fee Currency — 2026-08-02

Chipnet is a **blockchain network** (the test copy of Bitcoin Cash). Wallets live on this network. The test currency is called **tBCH** (test Bitcoin Cash). Every action (creating tokens, sending dividends) costs a small tBCH fee. This fee pays the miners/computers running the network — without fees, there's no network to host your tokens. The fee (tBCH) is just the postage stamp to deliver the actual message (your stock tokens). On chipnet, tBCH is free and infinite from faucets. On mainnet, BCH costs real money (fractions of a cent).

> Chipnet = test blockchain network. tBCH = fake stamps to pay for transaction delivery. The tokens (stocks) are what you actually care about — the fees are just infrastructure.

