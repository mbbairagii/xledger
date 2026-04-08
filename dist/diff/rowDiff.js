// ─────────────────────────────────────────────────────────────────────────────
// rowDiff.ts
// Row-level Myers diff for a single sheet.
//
// Why Myers diff at the row level (not cell level)?
// If someone inserts a row in the middle of a 1000-row sheet, naive cell
// comparison would mark every row below the insertion as "modified" because
// their row numbers shifted. Myers diff detects the insertion as one "added"
// event, leaving all shifted rows unchanged.
//
// This is the same insight that docx plugin uses for paragraphs — stable IDs
// require structure-aware diffing, not position-based comparison.
//
// The Myers algorithm runs on row *content hashes*, not positions.
// ─────────────────────────────────────────────────────────────────────────────
import { rowSnapshotsEqual } from "../parser/cellEquality.js";
function orderedRows(sheet) {
    return Object.entries(sheet).sort(([a], [b]) => {
        const rowA = parseInt(a.split("::R")[1], 10);
        const rowB = parseInt(b.split("::R")[1], 10);
        return rowA - rowB;
    });
}
function hashRow(row) {
    const cells = Object.entries(row.cells)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([col, cell]) => `${col}:${cell.formula ?? ""}:${cell.value}:${cell.type}`)
        .join("|");
    return cells;
}
function myersDiff(before, after) {
    const N = before.length;
    const M = after.length;
    const MAX = N + M;
    if (MAX === 0)
        return [];
    const V = new Array(2 * MAX + 1).fill(0);
    const trace = [];
    outer: for (let D = 0; D <= MAX; D++) {
        trace.push([...V]);
        for (let k = -D; k <= D; k += 2) {
            const idx = k + MAX;
            let x;
            if (k === -D || (k !== D && V[idx - 1] < V[idx + 1])) {
                x = V[idx + 1]; // move down
            }
            else {
                x = V[idx - 1] + 1; // move right
            }
            let y = x - k;
            while (x < N && y < M && hashRow(before[x][1]) === hashRow(after[y][1])) {
                x++;
                y++;
            }
            V[idx] = x;
            if (x >= N && y >= M)
                break outer;
        }
    }
    const edits = [];
    let x = N;
    let y = M;
    for (let D = trace.length - 1; D > 0; D--) {
        const Vprev = trace[D - 1];
        const k = x - y;
        const idx = k + MAX;
        let prevK;
        if (k === -D || (k !== D && Vprev[idx - 1] < Vprev[idx + 1])) {
            prevK = k + 1; // came from above (insert)
        }
        else {
            prevK = k - 1; // came from left (delete)
        }
        const prevX = Vprev[prevK + MAX];
        const prevY = prevX - prevK;
        while (x > prevX + 1 && y > prevY + 1) {
            x--;
            y--;
            edits.unshift({ op: "equal", before: before[x], after: after[y] });
        }
        if (D > 0) {
            if (x === prevX + 1 && y === prevY + 1) {
                x--;
                y--;
                edits.unshift({ op: "equal", before: before[x], after: after[y] });
            }
            else if (prevK === k - 1) {
                x--;
                edits.unshift({ op: "deleted", before: before[x] });
            }
            else {
                y--;
                edits.unshift({ op: "added", after: after[y] });
            }
        }
    }
    return edits;
}
export function diffSheet(sheetName, beforeSheet, afterSheet) {
    const beforeRows = orderedRows(beforeSheet);
    const afterRows = orderedRows(afterSheet);
    const edits = myersDiff(beforeRows, afterRows);
    const changes = [];
    for (const edit of edits) {
        switch (edit.op) {
            case "added":
                changes.push({
                    entity_id: edit.after[0],
                    schema_key: "xlsx-row",
                    kind: "added",
                    snapshot: edit.after[1],
                });
                break;
            case "deleted":
                changes.push({
                    entity_id: edit.before[0],
                    schema_key: "xlsx-row",
                    kind: "deleted",
                    snapshot: null,
                });
                break;
            case "equal":
                if (!rowSnapshotsEqual(edit.before[1], edit.after[1])) {
                    changes.push({
                        entity_id: edit.after[0],
                        schema_key: "xlsx-row",
                        kind: "modified",
                        snapshot: edit.after[1],
                    });
                }
                break;
        }
    }
    return changes;
}
//# sourceMappingURL=rowDiff.js.map