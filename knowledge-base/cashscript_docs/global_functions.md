Topic: Built-in Global Functions
Source: CashScript Website
Type: Documentation
Priority: High
Description: Documentation for built-in cryptographic functions (checkSig, checkMultiSig, checkDataSig, hash160, sha256) and mathematical utility functions.

---

CashScript has several built-in functions for things like cryptographic and arithmetic applications, and it includes many common arithmetic and other operators that you would expect in a programming language.

## Arithmetic functions

### abs()

```cashscript
int abs(int a)
```

Returns the absolute value of argument `a`.

### min()

```cashscript
int min(int a, int b)
```

Returns the minimum value of arguments `a` and `b`.

### max()

```cashscript
int max(int a, int b)
```

Returns the maximum value of arguments `a` and `b`.

### within()

```cashscript
bool within(int x, int lower, int upper)
```

Returns `true` if and only if `x >= lower && x < upper`.

## Hashing functions

### ripemd160()

```cashscript
bytes20 ripemd160(any x)
```

Returns the RIPEMD-160 hash of argument `x`.

### sha1()

```cashscript
bytes20 sha1(any x)
```

Returns the SHA-1 hash of argument `x`.

### sha256()

```cashscript
bytes32 sha256(any x)
```

Returns the SHA-256 hash of argument `x`.

### hash160()

```cashscript
bytes20 hash160(any x)
```

Returns the RIPEMD-160 hash of the SHA-256 hash of argument `x`.

### hash256()

```cashscript
bytes32 hash256(any x)
```

Returns the double SHA-256 hash of argument `x`.

## Signature checking functions

> [!WARNING]
> All signature checking functions must comply with the [NULLFAIL](https://github.com/bitcoin/bips/blob/master/bip-0146.mediawiki) rule which only allows `0x` as an invalid signature — any other invalid signature will **immediately fail** the entire script.

#### Nullfail example

The `NULLFAIL` rule means passing an invalid signature to `checkSig()` does not return `false` — it fails the script. To safely return `false` on a signature check, use an empty `0x` signature instead, as shown below:

```cashscript
// this script will immediately fail
// because userSig will be invalid for either the 'seller' or the 'referee'
require(checkSig(userSig, seller) || checkSig(userSig, referee));

// instead, use 2 different signatures
// set the unused signature to 0x so 'checkSig' returns false
require(checkSig(sellerSig, seller) || checkSig(userSig, referee));
```

### checkSig()

```cashscript
bool checkSig(sig s, pubkey pk)
```

Checks that transaction signature `s` is valid for the current transaction and matches with public key `pk`.

### checkMultiSig()

```cashscript
bool checkMultiSig(sig[] sigs, pubkey[] pks)
```

Performs a multi-signature check using a list of transaction signatures and public keys.

> [!NOTE]
> While this function can be used inside your smart contracts, it is not supported by the TypeScript SDK, so it is recommended not to use it. Instead a `checkMultiSig()` call can be simulated using multiple `checkSig()` calls.

### checkDataSig()

```cashscript
bool checkDataSig(datasig s, bytes msg, pubkey pk)
```

Checks that sig `s` is a valid signature for message `msg` and matches with public key `pk`.

## Other functions

### toPaddedBytes()

```cashscript
bytes toPaddedBytes(int value, int length)
```

Pads the integer `value` with zeros to the specified `length`. This is most useful when storing integer values in local state (see [local state guide](covenants_guide.md#keeping-local-state-in-nfts)).

> [!TIP]
> Using `bytes20 placeholderPkh = toPaddedBytes(0, 20)` will generate a 20 byte zero-array at runtime, whereas
> `bytes20 placeholderPkh = 0x0000000000000000000000000000000000000000` will actually take 20 bytes of space in your contract.