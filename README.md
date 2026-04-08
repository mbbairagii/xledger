# xledger — xlsx parser/normalizer

Standalone SheetJS parser and row-level differ.
This is the standalone module that will wire directly into the Lix xlsx plugin's `detectChanges` function.

## Architecture

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

## How this maps to Lix

```ts
// When Lix v0.6 lands, your plugin looks like this:
const plugin: LixPlugin = {
  key: "plugin-xlsx",
  detectChangesGlob: "*.xlsx",

  detectChanges: async ({ before, after }) => {
    // ← THIS is what you've already built
    return diffWorkbooks(before.data, after.data)
  },

  applyChanges: async ({ file, changes }) => {
    // ← TODO: reconstruct xlsx from RowChange[] using XLSX.write
  }
}
```

## Entity ID format

`"SheetName::R{rowNumber}"` — 1-indexed, matches Excel row numbers.

Example: cell B4 in Sheet1 lives in entity `"Sheet1::R4"` under key `"B"`.

## Install

```bash
npm install
npm run build
npm test
```
