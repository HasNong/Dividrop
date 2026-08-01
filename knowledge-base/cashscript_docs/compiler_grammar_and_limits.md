Topic: CashScript Language Grammar & Script Limits
Source: CashScript Website
Type: Documentation
Priority: Medium
Description: Formal ANTLR grammar specification for CashScript syntax alongside Bitcoin Cash consensus script limits (stack limits, byte sizes, opcodes).

---

```antlr4
grammar CashScript;

sourceFile
    : pragmaDirective* contractDefinition EOF
    ;

pragmaDirective
    : 'pragma' pragmaName pragmaValue ';'
    ;

pragmaName
    : 'cashscript'
    ;

pragmaValue
    : versionConstraint versionConstraint?
    ;

versionConstraint
    : versionOperator? VersionLiteral
    ;

versionOperator
    : '^' | '~' | '>=' | '>' | '<' | '<=' | '='
    ;

contractDefinition
    : 'contract' Identifier parameterList '{' functionDefinition* '}'
    ;

functionDefinition
    : 'function' Identifier parameterList functionBody
    ;

functionBody
    : '{' statement* '}'
    ;

parameterList
    : '(' (parameter (',' parameter)* ','?)? ')'
    ;

parameter
    : typeName Identifier
    ;

block
    : '{' statement* '}'
    | statement
    ;

statement
    : controlStatement
    | nonControlStatement ';'
    ;

nonControlStatement
    : variableDefinition
    | tupleAssignment
    | assignStatement
    | timeOpStatement
    | requireStatement
    | consoleStatement
    ;

controlStatement
    : ifStatement
    | loopStatement
    ;

variableDefinition
    : typeName modifier* Identifier '=' expression
    ;

tupleAssignment
    : typeName Identifier ',' typeName Identifier '=' expression
    ;

assignStatement
    : Identifier op=('=' | '+=' | '-=') expression
    | Identifier op=('++' | '--')
    ;

timeOpStatement
    : 'require' '(' TxVar '>=' expression (',' requireMessage)? ')'
    ;

requireStatement
    : 'require' '(' expression (',' requireMessage)? ')'
    ;

consoleStatement
    : 'console.log' consoleParameterList
    ;

ifStatement
    : 'if' '(' expression ')' ifBlock=block ('else' elseBlock=block)?
    ;

loopStatement
    : doWhileStatement
    | whileStatement
    | forStatement
    ;

doWhileStatement
    : 'do' block 'while' '(' expression ')' ';'
    ;

whileStatement
    : 'while' '(' expression ')' block
    ;

forStatement
    : 'for' '(' forInit ';' expression ';' assignStatement ')' block
    ;

forInit
    : variableDefinition
    | assignStatement
    ;

requireMessage
    : StringLiteral
    ;

consoleParameter
    : Identifier
    | literal
    ;

consoleParameterList
    : '(' (consoleParameter (',' consoleParameter)* ','?)? ')'
    ;

functionCall
    : Identifier expressionList // Only built-in functions are accepted
    ;

expressionList
    : '(' (expression (',' expression)* ','?)? ')'
    ;

expression
    : '(' expression ')' # Parenthesised
    | typeCast '(' castable=expression ','? ')' # Cast
    | functionCall # FunctionCallExpression
    | 'new' Identifier expressionList #Instantiation
    | expression '[' index=NumberLiteral ']' # TupleIndexOp
    | scope='tx.outputs' '[' expression ']' op=('.value' | '.lockingBytecode' | '.tokenCategory' | '.nftCommitment' | '.tokenAmount') # UnaryIntrospectionOp
    | scope='tx.inputs' '[' expression ']' op=('.value' | '.lockingBytecode' | '.outpointTransactionHash' | '.outpointIndex' | '.unlockingBytecode' | '.sequenceNumber' | '.tokenCategory' | '.nftCommitment' | '.tokenAmount') # UnaryIntrospectionOp
    | expression op=('.reverse()' | '.length') # UnaryOp
    | left=expression op='.split' '(' right=expression ')' # BinaryOp
    | element=expression '.slice' '(' start=expression ',' end=expression ')' # Slice
    | op=('!' | '-' | '~') expression # UnaryOp
    | left=expression op=('*' | '/' | '%') right=expression # BinaryOp
    | left=expression op=('+' | '-') right=expression # BinaryOp
    | left=expression op=('>>' | '<<') right=expression # BinaryOp
    | left=expression op=('<' | '<=' | '>' | '>=') right=expression # BinaryOp
    | left=expression op=('==' | '!=') right=expression # BinaryOp
    | left=expression op='&' right=expression # BinaryOp
    | left=expression op='^' right=expression # BinaryOp
    | left=expression op='|' right=expression # BinaryOp
    | left=expression op='&&' right=expression # BinaryOp
    | left=expression op='||' right=expression # BinaryOp
    | '[' (expression (',' expression)* ','?)? ']' # Array
    | NullaryOp # NullaryOp
    | Identifier # Identifier
    | literal # LiteralExpression
    ;

modifier
    : 'constant'
    ;

literal
    : BooleanLiteral
    | numberLiteral
    | StringLiteral
    | DateLiteral
    | HexLiteral
    ;

numberLiteral
    : NumberLiteral NumberUnit?
    ;

typeName
    : PrimitiveType
    | BoundedBytes
    | UnboundedBytes
    ;

typeCast
    : PrimitiveType
    | UnboundedBytes
    | UnsafeCast
    ;

VersionLiteral
    : [0-9]+ '.' [0-9]+ '.' [0-9]+
    ;

BooleanLiteral
    : 'true' | 'false'
    ;

NumberUnit
    : 'satoshis' | 'sats' | 'finney' | 'bits' | 'bitcoin'
    | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks'
    ;

NumberLiteral
    : '-'? NumberPart ExponentPart?
    ;

NumberPart
    : [0-9]+ ('_' [0-9]+)*
    ;

ExponentPart
    : [eE] NumberPart
    ;

PrimitiveType
    : 'int'
    | 'bool'
    | 'string'
    | 'pubkey'
    | 'sig'
    | 'datasig'
    ;

UnboundedBytes
    : 'bytes'
    ;

BoundedBytes
    : 'bytes' Bound | 'byte'
    ;

Bound
    : [1-9] [0-9]*
    ;

StringLiteral
    : '"' ('\\"' | ~["\r\n])*? '"'
    | '\'' ('\\\'' | ~['\r\n])*? '\''
    ;

DateLiteral
    : 'date(' StringLiteral ')'
    ;

HexLiteral
    : '0' [xX] [0-9A-Fa-f]*
    ;

TxVar
    : 'this.age'
    | 'tx.time'
    ;

UnsafeCast
    : 'unsafe_int'
    | 'unsafe_bool'
    | 'unsafe_bytes' Bound?
    | 'unsafe_byte'
    ;

NullaryOp
    : 'this.activeInputIndex'
    | 'this.activeBytecode'
    | 'tx.inputs.length'
    | 'tx.outputs.length'
    | 'tx.version'
    | 'tx.locktime'
    ;

Identifier
    : [a-zA-Z] [a-zA-Z0-9_]*
    ;

WHITESPACE
    : [ \t\r\n\u000C]+ -> skip
    ;

COMMENT
    : '/*' .*? '*/' -> channel(HIDDEN)
    ;

LINE_COMMENT
    : '//' ~[\r\n]* -> channel(HIDDEN)
    ;
```

---

Bitcoin Cash imposes various constraints on scripts and transactions to ensure efficient contract execution and network stability. We'll categorize these limits into 2 types: 'Contract-related limits' and 'General transaction limits'.

> [!NOTE]
> Some of the limits below are hard BCH consensus rules, others are standardness relay rules which still present significant practical barriers. These relay rules however are only enforced on network propagation. You can read more about the [BCH standardness rules here](https://documentation.cash/protocol/blockchain/transaction-validation/network-level-validation-rules#standard-transactions.html).

## Contract-related limits

### Maximum contract size (P2SH)

The limit on Bitcoin Cash for contract bytecode for P2SH outputs is **10,000 bytes** by the BCH consensus rules. Technically this limit is the 'maximum unlocking bytecode length' because for P2SH outputs the full script is provided in the **unlocking bytecode**.

### Maximum contract size (P2S)

The limit on Bitcoin Cash for contract bytecode for P2S outputs is **201 bytes** by the BCH consensus rules. Technically this limit is the 'maximum locking bytecode length' because for P2S outputs the script is provided directly in the **locking bytecode**.

### NFT commitment length limit

NFT commitments can store up to **128 bytes** of data as local state. This 128-bytes limit on commitment length is of practical importance for contract authors, as workarounds are needed to keep more data in local state.

If your local state grows larger than the allowed maximum, one option is to hash the full state and store only the hash in the commitment data. Later, when using the local state, the full state must be provided and validated against the stored state hash.

### Operation cost limit

Bitcoin Cash enforces an operation cost limit (op-cost) per transaction input. This determines the computational budget available for operations in a contract. The op-cost is based on script length: longer input scripts allow for a higher compute budget.

#### Buying compute budget

Since longer input scripts allow for a larger compute budget, some contracts use zero-padding (adding non-functional bytes) to "buy" more computation power without changing logic. You can find the exact op-cost per operation in the [op-cost-table](https://github.com/bitjson/bch-vm-limits/blob/master/operation-costs.md).

```typescript
function maxOperationCost(unlockingBytecodeLength) {
  return (41n + unlockingBytecodeLength) * 800n;
}
```

### Other contract-related limits

* Signature operation count (SigChecks): Limits the number of signature verifications (`OP_CHECKSIG`, `OP_CHECKDATASIG`) per transaction to ensure efficient validation.
* Hashing limit: Limits the number of hashing operations (`OP_SHA256`, `OP_HASH160`) allowed per transaction to prevent excessive resource usage.
* Stack element byte length: stack elements have a maximum length of 10,000 bytes.

## General transaction limits

In addition to contract-related limits, Bitcoin Cash also enforces general transaction limits.

### Maximum transaction size

Bitcoin Cash transactions must not exceed 100,000 bytes (100KB) to be considered standard. Transactions above this size won't be relayed by most nodes. The consensus limit for the maximum transaction size is 1MB.

### Data output size limit

Bitcoin Cash allows multiple OP_RETURN outputs, but the total size of all data outputs in a transaction must not exceed 220 bytes of data payload (223 bytes total). Transactions with larger data outputs won't be relayed by most nodes. You can read more about the [BCH standardness rules here](https://documentation.cash/protocol/blockchain/transaction/locking-script.html).

### Dust threshold

Bitcoin Cash defines a "dust" threshold for output value. Outputs below this threshold are considered dust and will not be relayed by standard nodes. Provably unspendable outputs (OP_RETURN outputs) are exempt from this rule.

The dust threshold for output value is calculated as:

```typescript
function calculateDust(outputSize: number): number {
  const dustThreshold = 444 + outputSize * 3;
  return dustThreshold;
}
```

Before CashTokens `546` sats was often used as dust default value, however with tokenData outputs have become larger in size, which affects the dust value calculation.
For ease of development, it is standard practice to use `1,000` satoshis as dust to outputs.

> [!NOTE]
> The standard practice of 1,000 satoshis as dust amount for outputs is for the `P2PKH`, `P2SH20` and `P2SH32` output types.
> For custom locking bytecode outputs a higher dust limit may be required, you can [find more info here](https://bitcoincashresearch.org/t/friday-night-challenge-worst-case-dust/1181/2).

### Minimum Relay Fee

The Bitcoin Cash protocol does not strictly enforce minimum fees for transactions, minimum transaction fees are enforced as a standardness rule on the relay level. The minimum relay fee for BCH transactions is 1sat/byte (1000sats/kb). This is also the standard minimum fee set by most miners on the network.

## Summary table

 | Limit type | Constraint |
 | --- | --- |
 | Max contract size | 10,000 bytes (consensus) |
 | NFT commitment length | 128 bytes (consensus) |
 | Operation cost limit | Based on script length (consensus) |
 | Max stack element size | 10,000 bytes (consensus) |
 | Max transaction size | 100,000 bytes for standardness (1MB for consensus) |
 | Output locking bytecode size | 201 bytes (standardness) |
 | Max OP_RETURN data size | 220 bytes data payload (standardness) |
 | Dust threshold | based on output size (standardness) - commonly 1,000 sats is used as dust |
 | Minimum relay fee | 1sat/byte (standardness) |

For further details on transaction validation and standardness rules, see the [documentation on BCH transaction validation](https://documentation.cash/protocol/blockchain/transaction-validation/network-level-validation-rules#standard-transactions.html).