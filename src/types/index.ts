export type CellType = "number" | "string" | "boolean" | "formula" | "error" | "empty";

export interface CellSnapshot {
  value: string | number | boolean | null;
  formula: string | null;
  type: CellType;
  format?: string | null;       
}

export interface RowSnapshot {
  cells: Record<string, CellSnapshot>;
}

export type NormalizedSheet = Record<string, RowSnapshot>;


export type NormalizedWorkbook = Record<string, NormalizedSheet>;

export type ChangeKind = "added" | "modified" | "deleted";

export interface RowChange {
  entity_id: string;           // e.g. "Sheet1::R4"
  schema_key: "xlsx-row";
  kind: ChangeKind;
  snapshot: RowSnapshot | null; // null = deleted
}
