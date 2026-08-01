Topic: Common Developer Mistakes
Source: CashScript PDF Refresher
Type: Learning
Priority: High
Description: Analysis of common security vulnerabilities, byte-order bugs, division-by-zero risks, and unconstrained outputs.

---

# Common Developer Mistakes

Below is a breakdown of recurring developer errors and security pitfalls in CashScript smart contracts:

## 1. Endianness Byte-Order Mismatch
* **Symptom**: Contract fails execution when passing a token ID or hash argument.
* **Root Cause**: Explorer token hex strings are Big-Endian, whereas CashScript contract introspection evaluates in Little-Endian.
* **Fix**: Use `changeEndianness(tokenIdHex)` before passing token IDs into contract arguments.

## 2. Unconstrained Outputs on Minting NFTs
* **Symptom**: Unauthorized users mint extra tokens from a covenant.
* **Root Cause**: Failing to validate `tx.outputs.length` or change output token categories when handling `capability == 0x02`.
* **Fix**: Enforce `require(tx.outputs.length <= maxAllowedOutputs)` and verify change outputs carry `0x` token category.

## 3. Division by Zero
* **Symptom**: Contract script evaluation immediately fails and voids transaction.
* **Root Cause**: Using `/` or `%` with dynamic denominator values without zero checks.
* **Fix**: Add `require(denominator > 0)` prior to arithmetic division.

## 4. Short-Circuiting Operator Assumptions
* **Symptom**: Unexpected side-effects or failed assertions in logical expressions.
* **Root Cause**: CashScript `&&` and `||` operators do **not** short-circuit; both expressions are always evaluated on the stack.
* **Fix**: Separate assertions into multiple explicit `require()` statements.
