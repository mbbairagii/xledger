// ─────────────────────────────────────────────────────────────────────────────
// parser/index.ts
// Public API for the parser module.
// This is the only file that touches SheetJS directly.
// Everything else works with the normalized types.
//
// Usage:
//   import { parseXlsx } from "./parser/index.js"
//   const workbook = parseXlsx(uint8array)
// ─────────────────────────────────────────────────────────────────────────────
import { read } from "xlsx";
import { normalizeWorksheet } from "./normalize.js";
export function parseXlsx(data) {
    const workbook = read(data, {
        type: "array",
        cellFormula: true,
        cellNF: true,
        cellDates: false,
        dense: false,
    });
    const result = {};
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet)
            continue;
        result[sheetName] = normalizeWorksheet(sheet, sheetName);
    }
    return result;
}
//# sourceMappingURL=index.js.map