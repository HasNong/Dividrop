Topic: CashScript Syntax & Introspection
Source: CashScript PDF Refresher
Type: Learning
Priority: High
Description: Overview of CashScript language features, transaction introspection variables, timelocks, global math/crypto functions, and loop controls.

---

# CashScript Syntax & Introspection

CashScript is a strongly-typed, stateless smart contract language for Bitcoin Cash. Every contract execution depends solely on the current transaction inputs and outputs.

## 1. Transaction Introspection Variables

CashScript provides native introspection variables to inspect the spending transaction context.

### Amount & Length Introspection
```cashscript
int inputValue = tx.inputs[i].value;       // Satoshis in input i
int outputValue = tx.outputs[i].value;     // Satoshis in output i

int inputCount = tx.inputs.length;         // Total input count
int outputCount = tx.outputs.length;       // Total output count
```

### Script & Bytecode Introspection
```cashscript
bytes inputScript = tx.inputs[i].lockingBytecode;   // Input locking script
bytes outputScript = tx.outputs[i].lockingBytecode; // Output locking script
```

### CashTokens Introspection
```cashscript
int inputTokenAmount = tx.inputs[i].tokenAmount;    // FT amount in input i
int outputTokenAmount = tx.outputs[i].tokenAmount;  // FT amount in output i

bytes inputCategory = tx.inputs[i].tokenCategory;   // Token category + capability
bytes outputCategory = tx.outputs[i].tokenCategory;

bytes inputNftCommitment = tx.inputs[i].nftCommitment;  // NFT commitment data
bytes outputNftCommitment = tx.outputs[i].nftCommitment;
```

---

## 2. Timelocks (Absolute & Relative)

### Absolute Timelocks (`tx.time` / `tx.locktime`)
Enforces that the transaction cannot be mined before a specific block height or UNIX timestamp:
```cashscript
require(tx.time >= 800000); // Block height or timestamp guard
int locktime = tx.locktime;
```

### Relative Timelocks (`this.age` / `sequenceNumber`)
Enforces that the contract UTXO must have been mined a minimum number of blocks ago:
```cashscript
require(this.age >= 30); // UTXO must be at least 30 blocks old
int sequence = tx.inputs[this.activeInputIndex].sequenceNumber;
```

---

## 3. Global Utility & Cryptographic Functions

### Comparison & Math Functions
```cashscript
int absVal = abs(-10);                     // Returns 10
int minVal = min(a, b);                    // Returns minimum
int maxVal = max(a, b);                    // Returns maximum
bool isWithin = within(x, low, high);      // Checks if low <= x < high
```

### Cryptographic Hash Functions
```cashscript
bytes20 pkh = ripemd160(pubkeyBytes);
bytes32 shaHash = sha256(rawBytes);
bytes20 hash160Val = hash160(pubkeyBytes); // ripemd160(sha256(x))
bytes32 hash256Val = hash256(rawBytes);    // sha256(sha256(x))
```

### Signature Verification
```cashscript
bool validSig = checkSig(sig s, pubkey pk);
bool validMultiSig = checkMultiSig([sig1, sig2], [pk1, pk2, pk3]);
bool validDataSig = checkDataSig(datasig s, bytes msg, pubkey pk);
```

---

## 4. Control Flow & Loops

CashScript supports bounded iteration via `for`, `while`, and `do-while` loops.

```cashscript
// For loop verifying no inputs carry tokens
for (int i = 0; i < tx.inputs.length; i++) {
    require(tx.inputs[i].tokenCategory == 0x);
}

// While loop accumulating output values
int totalPaid = 0;
int i = 0;
while (totalPaid < minPayout) {
    totalPaid = totalPaid + tx.outputs[i].value;
    i = i + 1;
}
```
