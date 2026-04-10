import { readFileSync } from "fs"
import { diffWorkbooks } from "./dist/diff/workbookDiff.js"

const v1 = new Uint8Array(readFileSync("./G L Bajaj - Phase 2 Submission Details .xlsx"))
const v2 = new Uint8Array(readFileSync("./G L Bajaj - Phase 2 Submission Details  (2).xlsx"))

const changes = diffWorkbooks(v1, v2)

console.log("Total changes:", changes.length)
console.log()

for (const change of changes) {
    console.log(`${change.kind.toUpperCase()} — ${change.entity_id}`)
    if (change.snapshot) {
        const values = Object.values(change.snapshot.cells).map(c => c.value)
        console.log("  →", values)
    }
    console.log()
}