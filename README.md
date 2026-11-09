<p align="center">
  <img src="assets/noxy.png" alt="Pooka mascot" width="280" />
</p>

# tree-sitter-pooka

A [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for [Pooka](https://github.com/peregrinefinch/Pooka), a statically typed language for the BEAM.

This grammar provides editor-oriented parsing for `.pooka` source files and `.spec.pooka` test files. It is designed for incremental parsing in editors and syntax tooling. Semantic checks such as scope, exhaustiveness, and type compatibility belong to the Pooka compiler and language tooling, not to this grammar.

## Features

The grammar covers core Pooka syntax, including:

- Module and import declarations
- Functions, tests, and blocks
- Classes (including concise field syntax), actors, interfaces, enums, `external` declarations, and `native` declarations
- Type annotations, generic/applied types, tuple types, and function types
- Pattern matching, guards, loops, `Result` propagation (`?`), and control expressions
- Lists, tuples, bit arrays, strings, numbers, booleans, `Nil`, `self`, and `super`
- Comments, doc comments (`///`), and module comments (`////`)
- Editor recovery behavior suitable for in-progress code

## File types

- `*.pooka`

> Pooka test sources use the `.spec.pooka` naming convention in Pooka projects. Editor integrations may associate both patterns with this grammar depending on their configuration.

## Repository layout

| Path | Description |
| --- | --- |
| `grammar.js` | Tree-sitter grammar definition. |
| `src/` | Generated parser source (`parser.c`, node types, Tree-sitter headers). |
| `queries/` | Highlight, indentation, bracket, and outline queries. |
| `test/corpus/` | Tree-sitter corpus tests. |
| `test/fixtures/` | Pooka syntax fixtures used by the local checker. |
| `check.py` | Additional local validation script (see below). |
| `tree-sitter.json` | Tree-sitter grammar metadata. |

## Development

### Prerequisites

- [Tree-sitter CLI](https://tree-sitter.github.io/tree-sitter/creating-parsers/1-getting-started.html)
- Python 3 (for `check.py`)

### Generate the parser

After changing `grammar.js`:

```sh
tree-sitter generate
```

### Run Tree-sitter tests

```sh
tree-sitter test
```

### Parse fixtures

```sh
tree-sitter parse -q test/fixtures/*.pooka
```

### Validate highlight queries

```sh
tree-sitter query queries/highlights.scm test/fixtures/native.pooka
```

## `check.py`

`check.py` runs additional checks, including corpus tests, fixture parsing, query compilation, indentation boundary checks, and private/native declaration assertions.

```sh
python3 check.py
```

The standard Tree-sitter commands above are the primary workflow for grammar development. If `check.py` does not fit your local setup, use `tree-sitter test`, `tree-sitter parse`, and `tree-sitter query` directly.

## Editor integration

This grammar can be used by editors and tools that support Tree-sitter. Highlight queries live in `queries/highlights.scm`. Indentation, bracket, and outline queries are also included in `queries/`. The checker runs without a separate editor-extension checkout.

## Contributing

When changing the grammar:

1. Update `grammar.js`.
2. Regenerate parser files with `tree-sitter generate`.
3. Add or update corpus tests and fixtures.
4. Run `tree-sitter test` and the relevant query/parse checks.
5. Keep editor syntax permissive where users type incomplete code, while avoiding parser acceptance of syntax the Pooka compiler does not support.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
