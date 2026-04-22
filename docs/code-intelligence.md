# Code Intelligence Pipeline

## Overview

Zayvora now uses an internal codebase library as part of the RETRIEVE and SYNTHESIZE flow:

1. User request enters workspace.
2. Code retrieval queries the indexed corpus.
3. Pattern extraction identifies reusable design patterns.
4. Synthesis composes a new module artifact.
5. Generated artifact is shown in workspace and can be downloaded/exported/published.

## Indexing and Metadata

`zayvora/codebase/codebase-registry.json` stores repository records and code entries.
Each file is indexed with:

- `file_path`
- `language`
- `module_type`
- `functions`
- `imports`
- `tags`

`zayvora/codebase/codebase-indexer.js` supports incremental indexing with file hashing and lazy usage through in-memory index loading.

## Parsing and Analysis

Language support (initial): JavaScript, Python, Rust.

- `code-parser.js` identifies language and metadata.
- `function-extractor.js` extracts functions and classes.
- `dependency-mapper.js` maps imports/uses.

The parser also emits a lightweight call graph for discovered symbols.

## Search and Pattern Extraction

- `code-search/search-index.js` scores records by query relevance.
- `code-search/search-query.js` exposes search helpers.
- `code-patterns/pattern-extractor.js` maps query results onto pattern templates.

Pattern families:

- game loops
- API handlers
- data pipelines
- simulation engines

## Code Synthesis

- `code-synthesis/code-composer.js` combines extracted patterns with prompt intent.
- `code-synthesis/module-builder.js` creates JavaScript module artifacts.

Example generation target: `voxel terrain generator`.

## Workspace Integration

A new **Code Intelligence** panel is available in workspace:

- Search internal code library
- View matched patterns
- Generate a module
- Download / export / publish artifact

Generated artifacts are tracked in local storage and seeded with an example in:
`workspace/generated-code/voxel-terrain-generator.js`.
