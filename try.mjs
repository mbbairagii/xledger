import { readFileSync } from "fs"
import { diffWorkbooks } from "./dist/diff/workbookDiff.js"

const v1 = new Uint8Array(readFileSync("./formulas.xlsx"))
const v2 = new Uint8Array(readFileSync("./formulas-v2.xlsx"))

const changes = diffWorkbooks(v1, v2)

console.log("Total changes:", changes.length)
console.log()

for (const change of changes) {
    console.log(`${change.kind.toUpperCase()} — ${change.entity_id}`)
    if (change.snapshot) {
        for (const [col, cell] of Object.entries(change.snapshot.cells)) {
            console.log(`  ${col}: value=${cell.value} formula=${cell.formula} type=${cell.type}`)
        }
    }
    console.log()
}