# Merkle Root Notes — 2026-08-02

## What is a Merkle Proof?

A Merkle proof is a cryptographic way to prove that a specific piece of data (like Alice's 300 shares) is part of a larger dataset (like the entire shareholder snapshot), without revealing everyone else's data. You only need a few supporting hashes.

---

## How it works (family tree analogy)

```
                    ┌─────────────────┐
                    │  Root Hash       │  ← Everyone agrees this is the "root"
                    │  = hash(AB+CDE) │     (permanently stored on blockchain)
                    └────────┬────────┘
               ┌─────────────┴─────────────┐
          ┌────┴────┐                 ┌────┴────┐
          │ Hash AB │                 │ Hash CDE│
          │ h(A+B)  │                 │ h(C+DE) │
          └──┬───┬──┘                 └──┬───┬──┘
        ┌────┘   └────┐            ┌────┘   └────┐
   ┌────┴───┐    ┌────┴───┐   ┌────┴───┐    ┌────┴───┐
   │Alice   │    │Bob     │   │Charlie │    │D+E     │
   │ h(300) │    │ h(250) │   │ h(200) │    │ h(150+ │
   └────────┘    └────────┘   └────────┘    │ h(100))│
                                            └────┬───┘
                                           ┌─────┴─────┐
                                      ┌────┴───┐   ┌───┴────┐
                                      │Diana   │   │Eve     │
                                      │h(150)  │   │h(100)  │
                                      └────────┘   └────────┘
```

---

## What Alice can prove

Alice only needs **3 pieces of information** to prove she was counted:

| # | What | Value |
|---|------|-------|
| 1 | Her own leaf | `Alice: 300 shares` |
| 2 | Bob's hash (right sibling) | `h("Bob:250") = 187f35...` |
| 3 | Hash CDE (right sibling) | `h("Charlie:200" + "D+E") = 534545...` |

With just those 3 pieces, she can **recompute the root herself**:

```
Step 1: Start with her own leaf
        hash("Alice:300") = a1b2c3...

Step 2: Combine with sibling (right)
        hash(a1b2c3... + 187f35...) = hash("AB") = 8f7e6d...

Step 3: Combine with next sibling (right)
        hash(8f7e6d... + 534545...) = hash("ABCDE") = 8e0474...

Step 4: Does 8e0474... match the root on the blockchain? → YES, VERIFIED ✓
```

---

## Why this is impossible to fake

```
If the company tries to cheat and say Alice had 200 shares instead of 300:

  Step 1: hash("Alice:200") = completely different hash
  Step 2: combine with Bob → different hash
  Step 3: combine further → different hash
  Step 4: DOES NOT match the root stored on blockchain → REJECTED ✗
```

**Change ANY number in ANY leaf → the root changes.** The root uniquely fingerprints the entire tree. Once the root is on the blockchain, the snapshot is frozen forever.

---

## The proof in plain English

> "I, Alice, can prove I was credited with exactly 300 shares in this dividend without revealing anyone else's balances. I just need 3 supporting hashes and the root. You don't need to trust me or the company — you just need the root, which is permanently stored on the Bitcoin Cash blockchain."

---

## Why this matters for the hackathon

The problem statement asks for **"verifiable ownership records."** This Merkle proof delivers exactly that:

| Without Merkle | With Merkle |
|----------------|-------------|
| "Trust us, Alice had 300 shares" | "Here's cryptographic proof Alice had 300 shares — verify it yourself against the blockchain" |
| Centralized registry | Mathematically verifiable by anyone |
| No way to audit a dividend | Any shareholder can independently prove they were counted correctly |
| Company can alter records | Changing any data breaks the root hash |

---

## Key takeaway

> Merkle proofs let anyone independently verify their dividend share count against a single hash permanently stored on the blockchain. No trust required — just math.
