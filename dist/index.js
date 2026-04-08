// ─────────────────────────────────────────────────────────────────────────────
// src/index.ts — root export
// This is the public surface of the standalone module.
// Later, this is also the entry point of the Lix plugin.
// ─────────────────────────────────────────────────────────────────────────────
export { parseXlsx } from "./parser/index.js";
export { diffSheet } from "./diff/rowDiff.js";
export { cellSnapshotsEqual, rowSnapshotsEqual } from "./parser/cellEquality.js";
//# sourceMappingURL=index.js.map