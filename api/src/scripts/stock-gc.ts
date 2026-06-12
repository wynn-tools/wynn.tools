import { gcOrphanBlobs } from '../services/stock-gc'

async function main() {
  const r = await gcOrphanBlobs()
  console.log(`stock-gc: deleted ${r.deleted} orphan blob(s)`)
}
void main()
