# Stock Dividend System - Design Spec

## Overview
Automated stock dividend distribution on Bitcoin Cash using CashScript + CashTokens. Companies issue share tokens, declare stock dividends (%), and the system automatically mints and distributes additional share tokens to all shareholders via a minting vault smart contract.

## Architecture
- **Minting Vault** (CashScript): Holds minting NFT, verifies owner, mints new fungible tokens
- **Indexer/Relayer** (Node.js): Reads shareholder balances from BCH, builds batch mint transactions
- **Web Dashboard** (future): UI for owner to declare dividends, shareholders to view balances

## Core Components
1. StockDividendVault.cash - Smart contract with `distribute()` function
2. deploy.ts - Deploy contract with minting NFT on BCH testnet
3. Tests - MockNetworkProvider based tests

## Tech Stack
- CashScript ^0.13.0
- TypeScript SDK
- MockNetworkProvider (testing)
- ElectrumNetworkProvider (deployment)
