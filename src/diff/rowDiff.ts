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

import type { NormalizedSheet, RowSnapshot, RowChange } from "../types/index.js";

function orderedRows(sheet: NormalizedSheet): Array<[string, RowSnapshot]> {
  return Object.entries(sheet).sort(([a], [b]) => {
    return parseInt(a.split("::R")[1], 10) - parseInt(b.split("::R")[1], 10);
  });
}

function hashRow(row: RowSnapshot): string {
  return Object.entries(row.cells)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([col, c]) => `${col}:${c.formula ?? ""}:${c.value}:${c.type}:${c.format ?? ""}`)
    .join("|");
}

type EditOp =
  | { op: "equal"; beforeIdx: number; afterIdx: number }
  | { op: "added"; afterIdx: number }
  | { op: "deleted"; beforeIdx: number };

function lcsDiff(
  before: Array<[string, RowSnapshot]>,
  after: Array<[string, RowSnapshot]>
): EditOp[] {
  const N = before.length;
  const M = after.length;

  const dp: number[][] = Array.from({ length: N + 1 }, () => new Array(M + 1).fill(0));
  for (let i = N - 1; i >= 0; i--) {
    for (let j = M - 1; j >= 0; j--) {
      if (hashRow(before[i][1]) === hashRow(after[j][1])) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const edits: EditOp[] = [];
  let i = 0, j = 0;

  while (i < N || j < M) {
    if (i < N && j < M && hashRow(before[i][1]) === hashRow(after[j][1])) {
      edits.push({ op: "equal", beforeIdx: i, afterIdx: j });
      i++; j++;
    } else if (j < M && (i >= N || dp[i][j + 1] >= dp[i + 1][j])) {
      edits.push({ op: "added", afterIdx: j });
      j++;
    } else {
      edits.push({ op: "deleted", beforeIdx: i });
      i++;
    }
  }

  return edits;
}

export function diffSheet(
  sheetName: string,
  beforeSheet: NormalizedSheet,
  afterSheet: NormalizedSheet
): RowChange[] {
  const beforeRows = orderedRows(beforeSheet);
  const afterRows = orderedRows(afterSheet);
  const rawEdits = lcsDiff(beforeRows, afterRows);

  const deleted = new Map<string, RowChange>();
  const added = new Map<string, RowChange>();

  for (const edit of rawEdits) {
    if (edit.op === "deleted") {
      const [entityId] = beforeRows[edit.beforeIdx];
      deleted.set(entityId, { entity_id: entityId, schema_key: "xlsx-row", kind: "deleted", snapshot: null });
    } else if (edit.op === "added") {
      const [entityId, snapshot] = afterRows[edit.afterIdx];
      added.set(entityId, { entity_id: entityId, schema_key: "xlsx-row", kind: "added", snapshot });
    }
  }

  const changes: RowChange[] = [];

  for (const [entityId, del] of deleted) {
    if (added.has(entityId)) {
      const add = added.get(entityId)!;
      changes.push({ entity_id: entityId, schema_key: "xlsx-row", kind: "modified", snapshot: add.snapshot });
      added.delete(entityId);
    } else {
      changes.push(del);
    }
  }

  for (const add of added.values()) {
    changes.push(add);
  }

  return changes.sort((a, b) =>
    parseInt(a.entity_id.split("::R")[1], 10) - parseInt(b.entity_id.split("::R")[1], 10)
  );
}