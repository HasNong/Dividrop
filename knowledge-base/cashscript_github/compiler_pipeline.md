Topic: Compiler Pipeline
Source: CashScript GitHub
Type: Implementation
Priority: High
Description: Detailed step-by-step breakdown of the CashScript compiler pipeline from raw text parsing to optimized bytecode artifacts.

---

# CashScript Compiler Pipeline

The `cashc` compiler transforms high-level `.cash` contract source strings into structured JSON artifacts containing Bitcoin Cash bytecode, ABI signatures, and source mapping metadata.

## Step-by-Step Compilation Sequence

```
[Raw .cash String]
       │
       ▼
1. Lexing & Parsing (ANTLR4)
       │
       ▼
2. AST Construction (AstBuilder)
       │
       ▼
3. Semantic Analysis & Validation (Visitors)
   ├── SymbolTableTraversal
   ├── TypeCheckTraversal
   ├── EnsureFinalRequireTraversal
   └── InjectLocktimeGuardTraversal
       │
       ▼
4. Target Code Generation (GenerateTargetTraversal)
       │
       ▼
5. Bytecode Peephole Optimization (optimiseBytecode)
       │
       ▼
6. Artifact Assembly (generateArtifact)
       │
       ▼
[Final JSON Artifact]
```

## Detailed Pipeline Phases

### Phase 1: Lexing & Parsing
* **Module**: `antlr4`, `CashScriptLexer`, `CashScriptParser`
* **Process**: Accepts raw `.cash` source code and converts characters into lexical tokens and a Concrete Syntax Tree (CST).
* **Error Handling**: Custom `CashScriptErrorListener` intercepts parsing errors and formats line/column numbers.

### Phase 2: AST Construction
* **Module**: `AstBuilder.ts`
* **Process**: Traverses the CST and builds a strongly-typed Abstract Syntax Tree (AST) representing contract declarations, function parameters, statements, expressions, and primitive types.

### Phase 3: Semantic Analysis & Validation
* **Module**: `src/semantic/`
* **Process**: Executes four sequential AST visitor passes:
  1. `SymbolTableTraversal`: Resolves identifier scopes, variable declarations, and function parameter bindings.
  2. `TypeCheckTraversal`: Verifies type compatibility across assignments, operations, binary expressions, and function arguments.
  3. `EnsureFinalRequireTraversal`: Ensures contract functions terminate with valid state assertions or require checks.
  4. `InjectLocktimeGuardTraversal`: Automatically injects `tx.time` / `tx.age` consensus guards when locktime introspection is accessed.

### Phase 4: Target Code Generation
* **Module**: `GenerateTargetTraversal.ts`
* **Process**: Translates validated AST nodes into sequences of Bitcoin Script opcodes, source location tags, console log statements, and assertion checks.

### Phase 5: Bytecode Peephole Optimization
* **Module**: `packages/utils/src/script.ts` (`optimiseBytecode`)
* **Process**: Applies algebraic simplifications and stack opcode reductions (e.g. eliminating redundant `OP_NOP`, combining stack rotations) while updating source maps and location tags.

### Phase 6: Artifact Assembly
* **Module**: `src/artifact/Artifact.ts` (`generateArtifact`)
* **Process**: Packages optimized bytecode, ABI method definitions, constructor parameter schemas, compiler metadata, and bytecode fingerprints into a final JSON artifact.
