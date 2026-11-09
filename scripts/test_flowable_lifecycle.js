const auth = Buffer.from('admin:test').toString('base64')
const { startProcess, getTasks, completeTask } = require('./src/lib/flowable/client')

async function testLifecycle() {
  console.log('Testing Flowable LeaveRequest lifecycle...')

  // 1. Start process instance
  const startRes = await startProcess('LeaveRequest', [
    { name: 'employeeId', value: '999001' },
    { name: 'employeeName', value: 'Budi Test' },
    { name: 'employeeNik', value: 'NIK-TEST' },
    { name: 'employeeDept', value: 'IT' },
    { name: 'employeePosition', value: 'Staff' },
    { name: 'leaveType', value: 'Cuti Tahunan' },
    { name: 'startDate', value: '2026-11-20' },
    { name: 'endDate', value: '2026-11-21' },
    { name: 'days', value: '2' },
    { name: 'reason', value: 'Test automated process' },
    { name: 'supervisorId', value: '300143' },
    { name: 'supervisorUsername', value: 'ODOO-576' },
  ])

  console.log('Start Process Result:', startRes.success, 'Instance ID:', startRes.data?.id)
  if (!startRes.success) return

  const procId = startRes.data.id

  // 2. Query active tasks for this process
  const tasks1 = await getTasks({ processInstanceId: procId })
  console.log('Active tasks after start:', tasks1.data?.data?.map(t => ({ id: t.id, name: t.name, assignee: t.assignee, key: t.taskDefinitionKey })))

  const supTask = tasks1.data?.data?.[0]
  if (supTask) {
    // 3. Complete supervisor task with approved = true
    console.log(`Completing supervisor task ${supTask.id}...`)
    const compRes = await completeTask(supTask.id, [
      { name: 'approved', value: true, type: 'boolean' },
      { name: 'approverName', value: 'Ronny Daeng Badjie', type: 'string' },
    ])
    console.log('Supervisor complete result:', compRes.success)

    // 4. Query active tasks again
    const tasks2 = await getTasks({ processInstanceId: procId })
    console.log('Active tasks after supervisor approve:', tasks2.data?.data?.map(t => ({ id: t.id, name: t.name, key: t.taskDefinitionKey, candidateGroups: t.candidateGroups })))

    const hrTask = tasks2.data?.data?.[0]
    if (hrTask) {
      // 5. Complete HR task with approved = true
      console.log(`Completing HR task ${hrTask.id}...`)
      const compHrRes = await completeTask(hrTask.id, [
        { name: 'approved', value: true, type: 'boolean' },
        { name: 'approverName', value: 'HR Admin', type: 'string' },
      ])
      console.log('HR complete result:', compHrRes.success)

      // 6. Check if process ended
      const tasks3 = await getTasks({ processInstanceId: procId })
      console.log('Active tasks after HR approve (should be 0):', tasks3.data?.data?.length)
    }
  }
}

testLifecycle().catch(console.error)
