// scripts/test_workflow_form_builder.mjs
async function main() {
  const payload = {
    name: 'Pengajuan Cuti Karyawan',
    key: 'leave-request-process',
    xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1"><bpmn:process id="leave-request-process" isExecutable="true"/></bpmn:definitions>',
    forms: {
      start_leave: {
        title: 'Formulir Pengajuan Cuti Karyawan',
        decisionType: 'none',
        fields: [
          { id: 'f_leave_type', label: 'Tipe Cuti', type: 'dropdown', required: true, options: 'Tahunan, Sakit, Melahirkan' },
          { id: 'f_start_date', label: 'Tanggal Mulai', type: 'date', required: true },
          { id: 'f_end_date', label: 'Tanggal Selesai', type: 'date', required: true },
        ],
      },
      task_manager_review: {
        title: 'Review Persetujuan Manager Divisi',
        decisionType: 'approval',
        fields: [
          { id: 'f_mgr_note', label: 'Catatan Manager', type: 'textarea', required: false },
          { id: 'f_urgent', label: 'Status Prioritas', type: 'dropdown', required: true, options: 'Normal, Penting, Mendesak' },
        ],
      },
    },
  }

  const res = await fetch('http://localhost:3000/api/workflow/definitions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await res.json()
  console.log('Result Status:', res.status)
  console.log('Response:', JSON.stringify(result, null, 2))
}

main().catch(console.error)

async function testDeploy() {
  const payload = {
    name: 'Pengajuan Cuti Karyawan',
    key: 'leave-request-process',
    xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1"><bpmn:process id="leave-request-process" isExecutable="true"/></bpmn:definitions>',
    forms: {
      task_manager_review: {
        title: 'Review Persetujuan Manager Divisi',
        fields: [{ id: 'f1', label: 'Catatan', type: 'text' }],
      },
    },
  }

  const res = await fetch('http://localhost:3000/api/flowable/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await res.json()
  console.log('Deploy Status:', res.status)
  console.log('Deploy Response:', JSON.stringify(result, null, 2))
}

testDeploy().catch(console.error)
