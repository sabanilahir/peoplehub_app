import { getTasksWithIdentityLinks } from '../src/lib/flowable/client.js'

async function main() {
  const tasks = await getTasksWithIdentityLinks({ size: 100 })
  console.log('Flowable Engine Tasks count:', tasks.data?.data?.length)
  for (const t of tasks.data?.data || []) {
    console.log({
      id: t.id,
      name: t.name,
      taskDefinitionKey: t.taskDefinitionKey,
      assignee: t.assignee,
      candidateGroups: t.candidateGroups,
      processInstanceId: t.processInstanceId,
      variables: t.variables?.map(v => `${v.name}=${v.value}`),
    })
  }
}

main()
