Topic: Contract Design Best Practices
Source: CashScript PDF Refresher
Type: Learning
Priority: High
Description: Security and architectural best practices for CashScript contracts, covenants, and SDK applications.

---

# Contract Design Best Practices

1. **Use Explicit Assertions**:
   * Split complex logical conditions into individual `require()` statements for clearer error messaging and stack evaluation safety.

2. **Strict Covenant Accounting**:
   * When building stateful covenants, inspect and assert output index amounts, locking bytecodes, and token categories explicitly.

3. **Dust Limit Safety**:
   * Always account for miner fees and ensure change outputs exceed the protocol dust limit (546 satoshis).

4. **Off-Chain Test Integration**:
   * Test contract unlock paths off-chain using `MockNetworkProvider` before broadcasting transactions to Mainnet or Chipnet.

5. **Token Commitment Integrity**:
   * Use immutable NFTs (`capability: 0x00`) for static proof-of-authenticity tokens, and mutable NFTs (`capability: 0x01`) for stateful contracts.
