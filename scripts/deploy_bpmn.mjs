import { deployProcess } from '../src/lib/flowable/client.js'
import { LEAVE_REQUEST_BPMN_XML } from '../src/lib/flowable/definitions/leaveRequestBpmn.js'

async function main() {
  console.log('Deploying updated Multi-Tier LeaveRequest BPMN definition...')
  const result = await deployProcess(LEAVE_REQUEST_BPMN_XML, 'LeaveRequest_v3.bpmn20.xml', 'LeaveRequest')
  console.log('Deployment Result:', result)
}

main()
