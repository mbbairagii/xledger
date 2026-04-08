// ─────────────────────────────────────────────────────────────────────────────
// workbookDiff.ts
// Orchestrates diffing across all sheets.
// This is the function body of detectChanges when wired into Lix.
// ─────────────────────────────────────────────────────────────────────────────

import { parseXlsx } from "../parser/index.js";
import { diffSheet } from "./rowDiff.js";
import type { RowChange } from "../types/index.js";

export function diffWorkbooks(before: Uint8Array, after: Uint8Array): RowChange[] {
  const beforeWb = parseXlsx(before);
  const afterWb = parseXlsx(after);

  const allSheets = new Set([
    ...Object.keys(beforeWb),
    ...Object.keys(afterWb),
  ]);

  const changes: RowChange[] = [];

  for (const sheetName of allSheets) {
    const beforeSheet = beforeWb[sheetName] ?? {};
    const afterSheet = afterWb[sheetName] ?? {};

    const sheetChanges = diffSheet(sheetName, beforeSheet, afterSheet);
    changes.push(...sheetChanges);
  }

  return changes;
}
