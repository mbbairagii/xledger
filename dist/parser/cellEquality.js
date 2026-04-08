// ─────────────────────────────────────────────────────────────────────────────
// cellEquality.ts
// Equality checks for CellSnapshot and RowSnapshot.
// These are the comparators used by the differ.
//
// Why not just JSON.stringify and compare strings?
// Because floating point values like 0.1 + 0.2 can serialize differently
// across platforms. We handle numeric tolerance explicitly here.
// ─────────────────────────────────────────────────────────────────────────────
const FLOAT_EPSILON = 1e-10;
function numericEqual(a, b) {
    if (a === b)
        return true;
    return Math.abs(a - b) < FLOAT_EPSILON;
}
export function cellSnapshotsEqual(a, b) {
    if (a === b)
        return true;
    if (!a && !b)
        return true;
    if (!a || !b)
        return false;
    if (a.type !== b.type)
        return false;
    if (a.formula !== null || b.formula !== null) {
        if (a.formula !== b.formula)
            return false;
        return true;
    }
    if (a.format !== b.format)
        return false;
    if (a.value === null && b.value === null)
        return true;
    if (a.value === null || b.value === null)
        return false;
    if (typeof a.value === "number" && typeof b.value === "number") {
        return numericEqual(a.value, b.value);
    }
    return a.value === b.value;
}
export function rowSnapshotsEqual(a, b) {
    if (a === b)
        return true;
    if (!a && !b)
        return true;
    if (!a || !b)
        return false;
    const aKeys = Object.keys(a.cells);
    const bKeys = Object.keys(b.cells);
    const allKeys = new Set([...aKeys, ...bKeys]);
    for (const col of allKeys) {
        if (!cellSnapshotsEqual(a.cells[col], b.cells[col]))
            return false;
    }
    return true;
}
//# sourceMappingURL=cellEquality.js.map