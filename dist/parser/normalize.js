// ─────────────────────────────────────────────────────────────────────────────
// normalize.ts
// Takes a raw SheetJS worksheet and returns a NormalizedSheet (row-level map).
// This is the core transformation layer. The output is deterministic — same
// xlsx bytes always produce the same NormalizedSheet, which is required for
// Lix's change detection to be reliable.
// ─────────────────────────────────────────────────────────────────────────────
import { utils } from "xlsx";
function parseAddress(address) {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match)
        return null;
    return { col: match[1], row: parseInt(match[2], 10) };
}
function resolveCellType(cell) {
    if (cell.f)
        return "formula";
    switch (cell.t) {
        case "n": return "number";
        case "s": return "string";
        case "b": return "boolean";
        case "e": return "error";
        default: return "empty";
    }
}
function normalizeCell(cell) {
    return {
        value: cell.v !== undefined ? cell.v : null,
        formula: cell.f ?? null,
        type: resolveCellType(cell),
        format: cell.z != null ? String(cell.z) : null,
    };
}
export function normalizeWorksheet(sheet, sheetName) {
    const result = {};
    const range = utils.decode_range(sheet["!ref"] ?? "A1:A1");
    for (let R = range.s.r; R <= range.e.r; R++) {
        const rowCells = {};
        let hasContent = false;
        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = utils.encode_cell({ r: R, c: C });
            const cell = sheet[address];
            if (!cell || cell.t === "z")
                continue; // stub/empty — skip
            const colLetter = utils.encode_col(C);
            rowCells[colLetter] = normalizeCell(cell);
            hasContent = true;
        }
        if (!hasContent)
            continue;
        const entityId = `${sheetName}::R${R + 1}`;
        result[entityId] = { cells: rowCells };
    }
    return result;
}
//# sourceMappingURL=normalize.js.map