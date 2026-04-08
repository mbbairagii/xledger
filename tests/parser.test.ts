// ─────────────────────────────────────────────────────────────────────────────
// parser.test.ts
// Tests for the parser/normalizer and the differ.
// Run with: npm test
//
// We generate fixture xlsx files in-memory using SheetJS itself.
// No binary files committed to the repo.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "@jest/globals";
import { utils, write } from "xlsx";
import { parseXlsx } from "../src/parser/index.js";
import { cellSnapshotsEqual, rowSnapshotsEqual } from "../src/parser/cellEquality.js";
import { diffWorkbooks } from "../src/diff/workbookDiff.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a Uint8Array xlsx fixture from an array-of-arrays */
function makeXlsx(rows: unknown[][], sheetName = "Sheet1"): Uint8Array {
  const ws = utils.aoa_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);
  return new Uint8Array(write(wb, { type: "array", bookType: "xlsx" }));
}

// ── parseXlsx ────────────────────────────────────────────────────────────────

describe("parseXlsx", () => {
  it("returns a NormalizedWorkbook with one key per sheet", () => {
    const data = makeXlsx([["Name", "Score"], ["Alice", 42]]);
    const wb = parseXlsx(data);
    expect(Object.keys(wb)).toEqual(["Sheet1"]);
  });

  it("normalizes row 1 correctly", () => {
    const data = makeXlsx([["Name", "Score"], ["Alice", 42]]);
    const wb = parseXlsx(data);
    const row1 = wb["Sheet1"]["Sheet1::R1"];

    expect(row1).toBeDefined();
    expect(row1.cells["A"].value).toBe("Name");
    expect(row1.cells["A"].type).toBe("string");
    expect(row1.cells["B"].value).toBe("Score");
  });

  it("normalizes numeric cells correctly", () => {
    const data = makeXlsx([["Alice", 42]]);
    const wb = parseXlsx(data);
    const row1 = wb["Sheet1"]["Sheet1::R1"];

    expect(row1.cells["B"].value).toBe(42);
    expect(row1.cells["B"].type).toBe("number");
    expect(row1.cells["B"].formula).toBeNull();
  });

  it("skips entirely empty rows", () => {
    const data = makeXlsx([["Alice"], [], ["Bob"]]);
    const wb = parseXlsx(data);
    const sheet = wb["Sheet1"];

    // Row 2 is empty — should not be in the output
    expect(sheet["Sheet1::R2"]).toBeUndefined();
    expect(sheet["Sheet1::R1"]).toBeDefined();
    expect(sheet["Sheet1::R3"]).toBeDefined();
  });

  it("handles boolean cells", () => {
    const data = makeXlsx([[true, false]]);
    const wb = parseXlsx(data);
    const row = wb["Sheet1"]["Sheet1::R1"];

    expect(row.cells["A"].type).toBe("boolean");
    expect(row.cells["A"].value).toBe(true);
  });
});

// ── cellSnapshotsEqual ───────────────────────────────────────────────────────

describe("cellSnapshotsEqual", () => {
  it("returns true for identical cells", () => {
    const cell = { value: 42, formula: null, type: "number" as const, format: null };
    expect(cellSnapshotsEqual(cell, { ...cell })).toBe(true);
  });

  it("returns false when values differ", () => {
    const a = { value: 42,  formula: null, type: "number" as const, format: null };
    const b = { value: 100, formula: null, type: "number" as const, format: null };
    expect(cellSnapshotsEqual(a, b)).toBe(false);
  });

  it("treats near-identical floats as equal (epsilon check)", () => {
    const a = { value: 0.1 + 0.2, formula: null, type: "number" as const, format: null };
    const b = { value: 0.3,       formula: null, type: "number" as const, format: null };
    expect(cellSnapshotsEqual(a, b)).toBe(true);
  });

  it("compares formula strings, not formula values", () => {
    const a = { value: 6,   formula: "=A1+B1", type: "formula" as const, format: null };
    const b = { value: 999, formula: "=A1+B1", type: "formula" as const, format: null };
    // Same formula, different cached value → still equal
    expect(cellSnapshotsEqual(a, b)).toBe(true);
  });

  it("detects a changed formula", () => {
    const a = { value: 6, formula: "=A1+B1",  type: "formula" as const, format: null };
    const b = { value: 6, formula: "=A1*B1",  type: "formula" as const, format: null };
    expect(cellSnapshotsEqual(a, b)).toBe(false);
  });

  it("handles undefined gracefully", () => {
    expect(cellSnapshotsEqual(undefined, undefined)).toBe(true);
    const cell = { value: 1, formula: null, type: "number" as const, format: null };
    expect(cellSnapshotsEqual(cell, undefined)).toBe(false);
  });
});

// ── diffWorkbooks ────────────────────────────────────────────────────────────

describe("diffWorkbooks", () => {
  it("returns empty array when files are identical", () => {
    const data = makeXlsx([["Alice", 42], ["Bob", 100]]);
    const changes = diffWorkbooks(data, data);
    expect(changes).toHaveLength(0);
  });

  it("detects a modified cell value in a row", () => {
    const before = makeXlsx([["Alice", 42], ["Bob", 100]]);
    const after  = makeXlsx([["Alice", 99], ["Bob", 100]]); // changed 42 → 99

    const changes = diffWorkbooks(before, after);

    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe("modified");
    expect(changes[0].entity_id).toBe("Sheet1::R1");
    expect(changes[0].snapshot?.cells["B"].value).toBe(99);
  });

  it("detects an added row", () => {
    const before = makeXlsx([["Alice", 42]]);
    const after  = makeXlsx([["Alice", 42], ["Bob", 100]]); // added row 2

    const changes = diffWorkbooks(before, after);

    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe("added");
    expect(changes[0].entity_id).toBe("Sheet1::R2");
  });

  it("detects a deleted row", () => {
    const before = makeXlsx([["Alice", 42], ["Bob", 100]]);
    const after  = makeXlsx([["Alice", 42]]); // removed row 2

    const changes = diffWorkbooks(before, after);

    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe("deleted");
    expect(changes[0].snapshot).toBeNull();
  });

  it("detects insertion in the middle without marking shifted rows as changed", () => {
    const before = makeXlsx([["Alice"], ["Bob"], ["Carol"]]);
    const after  = makeXlsx([["Alice"], ["NEW"], ["Bob"], ["Carol"]]); // insert at row 2

    const changes = diffWorkbooks(before, after);

    // Only one change: the inserted row. Alice, Bob, Carol are all still equal.
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe("added");
    expect(changes[0].snapshot?.cells["A"].value).toBe("NEW");
  });

  it("detects changes across multiple sheets", () => {
    const ws1 = utils.aoa_to_sheet([["Alice"]]);
    const ws2 = utils.aoa_to_sheet([["Old"]]);
    const wbBefore = utils.book_new();
    utils.book_append_sheet(wbBefore, ws1, "People");
    utils.book_append_sheet(wbBefore, ws2, "Config");

    const ws1After = utils.aoa_to_sheet([["Alice"]]);
    const ws2After = utils.aoa_to_sheet([["New"]]);  // Config changed
    const wbAfter = utils.book_new();
    utils.book_append_sheet(wbAfter, ws1After, "People");
    utils.book_append_sheet(wbAfter, ws2After, "Config");

    const before = new Uint8Array(write(wbBefore, { type: "array", bookType: "xlsx" }));
    const after  = new Uint8Array(write(wbAfter,  { type: "array", bookType: "xlsx" }));

    const changes = diffWorkbooks(before, after);

    expect(changes).toHaveLength(1);
    expect(changes[0].entity_id).toBe("Config::R1");
  });
});
