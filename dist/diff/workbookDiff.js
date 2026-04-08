// ─────────────────────────────────────────────────────────────────────────────
// workbookDiff.ts
// Orchestrates diffing across all sheets.
// This is the function body of detectChanges when wired into Lix.
// ─────────────────────────────────────────────────────────────────────────────
import { parseXlsx } from "../parser/index.js";
import { diffSheet } from "./rowDiff.js";
export function diffWorkbooks(before, after) {
    const beforeWb = parseXlsx(before);
    const afterWb = parseXlsx(after);
    const allSheets = new Set([
        ...Object.keys(beforeWb),
        ...Object.keys(afterWb),
    ]);
    const changes = [];
    for (const sheetName of allSheets) {
        const beforeSheet = beforeWb[sheetName] ?? {};
        const afterSheet = afterWb[sheetName] ?? {};
        const sheetChanges = diffSheet(sheetName, beforeSheet, afterSheet);
        changes.push(...sheetChanges);
    }
    return changes;
}
//# sourceMappingURL=workbookDiff.js.map