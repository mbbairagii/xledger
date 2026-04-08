# xledger

A parser and differ for `.xlsx` files that actually understands what changed.

Most tools treat spreadsheets as binary blobs. Git shows `Binary files differ`.
Excel's built-in compare is a GUI nightmare. This module reads two `.xlsx` files
and tells you exactly which rows changed, what the old values were, and what the
new ones are — in plain JSON you can work with.

---

## What it does

Feed it two versions of an `.xlsx` file:

```js
import { diffWorkbooks } from "./dist/diff/workbookDiff.js"
import { readFileSync } from "fs"

const v1 = new Uint8Array(readFileSync("./budget-march.xlsx"))
const v2 = new Uint8Array(readFileSync("./budget-april.xlsx"))

console.log(diffWorkbooks(v1, v2))
```

Get back a clean list of what changed:

```json
[
  {
    "entity_id": "Sheet1::R4",
    "kind": "modified",
    "schema_key": "xlsx-row",
    "snapshot": {
      "cells": {
        "A": { "value": "Marketing", "formula": null, "type": "string" },
        "B": { "value": 12000, "formula": null, "type": "number" }
      }
    }
  }
]
```

`kind` is one of `added`, `deleted`, or `modified`. `snapshot` is the new state
of the row (null if deleted). Every cell carries its value, formula if there is
one, and type.

---

## Why row-level and not cell-level

If someone inserts a row at position 50 in a 1000-row sheet, cell-level diffing
marks every row below the insertion as changed because the row numbers shifted.
Row-level diffing with LCS understands that the rows just moved — only the
actually inserted row shows up as a change.

---

## Project structure

```
src/
├── types/index.ts          ← CellSnapshot, RowSnapshot, NormalizedWorkbook, RowChange
├── parser/
│   ├── index.ts            ← parseXlsx(Uint8Array) → NormalizedWorkbook
│   ├── normalize.ts        ← SheetJS → row-keyed entity map
│   └── cellEquality.ts     ← deep equality (epsilon-safe, formula-aware)
└── diff/
    ├── rowDiff.ts          ← Myers diff at the row level
    └── workbookDiff.ts     ← orchestrates across all sheets → RowChange[]
```


---

## Setup

```bash
npm install
npm run build
npm test
```

Requires Node 18+.

---

## Where this is going

This module will become the `detectChanges` half of a Lix xlsx plugin.
[Lix](https://github.com/opral/lix) is a version control system built on SQLite
that tracks changes at the entity level instead of line-by-line. Once their v0.6
API stabilises, the plugin wrapper is essentially:

```ts
detectChanges: async ({ before, after }) => {
  return diffWorkbooks(before.data, after.data)
}
```

Everything in this repo feeds directly into that without modification.