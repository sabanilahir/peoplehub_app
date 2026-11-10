import { getTaskVariables } from '../src/lib/flowable/client.js'

async function main() {
  const t1 = await getTaskVariables('0cd65615-dc9f-11f1-b0bd-26c712b7c6bf')
  console.log('Task 1 vars:', t1.data)
  const t2 = await getTaskVariables('7bacd2ed-dc89-11f1-b0bd-26c712b7c6bf')
  console.log('Task 2 vars:', t2.data)
}

main()
