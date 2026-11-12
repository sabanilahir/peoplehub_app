'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import BpmnPropertiesPanel from './BpmnPropertiesPanel'

import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'

export const DEFAULT_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:flowable="http://flowable.org/bpmn"
                  id="Definitions_1" targetNamespace="http://flowable.org/bpmn">
  <bpmn:process id="Process_1" name="New Process" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Mulai"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="160" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

export const LEAVE_REQUEST_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:flowable="http://flowable.org/bpmn"
                  id="Definitions_Leave" targetNamespace="http://flowable.org/bpmn">
  <bpmn:process id="leave-request-process" name="Pengajuan Cuti Karyawan" isExecutable="true">
    <bpmn:startEvent id="StartEvent_Leave" name="Pengajuan Cuti (ESS)"/>
    <bpmn:sequenceFlow id="Flow_Start_To_Gateway" sourceRef="StartEvent_Leave" targetRef="Gateway_EntryCheck"/>
    <bpmn:exclusiveGateway id="Gateway_EntryCheck" name="Cek Approver Operasional"/>
    <bpmn:sequenceFlow id="Flow_To_ApproverTask" name="Ada Matriks Approver" sourceRef="Gateway_EntryCheck" targetRef="Task_Approver">
      <bpmn:conditionExpression>\${noOperationalApprovers != true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_Direct_To_HR_Start" name="Direct to HR (Tanpa Atasan)" sourceRef="Gateway_EntryCheck" targetRef="Task_HRApproval">
      <bpmn:conditionExpression>\${noOperationalApprovers == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:userTask id="Task_Approver" name="\${currentStepLabel}"
                   flowable:assignee="\${currentApproverUsername}"
                   flowable:candidateGroups="superadmin">
      <bpmn:documentation>Persetujuan tingkat operasional bertingkat (Level 1, Level 2, Level 3, dst.) sesuai matriks approval karyawan.</bpmn:documentation>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_App_To_Decision" sourceRef="Task_Approver" targetRef="Gateway_Decision"/>

    <bpmn:exclusiveGateway id="Gateway_Decision" name="Keputusan Approver"/>
    <bpmn:sequenceFlow id="Flow_App_Approved" name="Disetujui" sourceRef="Gateway_Decision" targetRef="Gateway_HasMore">
      <bpmn:conditionExpression>\${approved == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_App_Rejected" name="Ditolak" sourceRef="Gateway_Decision" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:exclusiveGateway id="Gateway_HasMore" name="Ada Tingkat Lanjutan?"/>
    <bpmn:sequenceFlow id="Flow_Loop_Next_Approver" name="Next Level (Loop)" sourceRef="Gateway_HasMore" targetRef="Task_Approver">
      <bpmn:conditionExpression>\${hasMoreApprovers == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_All_Approved_To_HR" name="Semua Level Selesai" sourceRef="Gateway_HasMore" targetRef="Task_HRApproval">
      <bpmn:conditionExpression>\${hasMoreApprovers != true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:userTask id="Task_HRApproval" name="Verifikasi &amp; Persetujuan HR"
                   flowable:candidateGroups="hr,hr_manager,superadmin">
      <bpmn:documentation>Persetujuan akhir oleh HR Team untuk validasi kuota cuti dan sinkronisasi ke modul payroll.</bpmn:documentation>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_HR_To_Gw" sourceRef="Task_HRApproval" targetRef="Gateway_HR"/>

    <bpmn:exclusiveGateway id="Gateway_HR" name="Keputusan HR"/>
    <bpmn:sequenceFlow id="Flow_HR_Approved" name="Disetujui HR" sourceRef="Gateway_HR" targetRef="End_Approved">
      <bpmn:conditionExpression>\${approved == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_HR_Rejected" name="Ditolak HR" sourceRef="Gateway_HR" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:endEvent id="End_Approved" name="Selesai Disetujui (Payroll Sync)"/>
    <bpmn:endEvent id="End_Rejected" name="Pengajuan Cuti Ditolak"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Leave">
    <bpmndi:BPMNPlane id="BPMNPlane_Leave" bpmnElement="leave-request-process">
      <bpmndi:BPMNShape id="StartEvent_Leave_di" bpmnElement="StartEvent_Leave">
        <dc:Bounds x="120" y="162" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_EntryCheck_di" bpmnElement="Gateway_EntryCheck" isMarkerVisible="true">
        <dc:Bounds x="210" y="155" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Approver_di" bpmnElement="Task_Approver">
        <dc:Bounds x="320" y="140" width="160" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Decision_di" bpmnElement="Gateway_Decision" isMarkerVisible="true">
        <dc:Bounds x="540" y="155" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_HasMore_di" bpmnElement="Gateway_HasMore" isMarkerVisible="true">
        <dc:Bounds x="650" y="155" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_HRApproval_di" bpmnElement="Task_HRApproval">
        <dc:Bounds x="770" y="140" width="160" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_HR_di" bpmnElement="Gateway_HR" isMarkerVisible="true">
        <dc:Bounds x="990" y="155" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Approved_di" bpmnElement="End_Approved">
        <dc:Bounds x="1110" y="162" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Rejected_di" bpmnElement="End_Rejected">
        <dc:Bounds x="780" y="322" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Start_To_Gateway_di" bpmnElement="Flow_Start_To_Gateway">
        <di:waypoint x="156" y="180"/>
        <di:waypoint x="210" y="180"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_To_ApproverTask_di" bpmnElement="Flow_To_ApproverTask">
        <di:waypoint x="260" y="180"/>
        <di:waypoint x="320" y="180"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Direct_To_HR_Start_di" bpmnElement="Flow_Direct_To_HR_Start">
        <di:waypoint x="235" y="155"/>
        <di:waypoint x="235" y="60"/>
        <di:waypoint x="850" y="60"/>
        <di:waypoint x="850" y="140"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_App_To_Decision_di" bpmnElement="Flow_App_To_Decision">
        <di:waypoint x="480" y="180"/>
        <di:waypoint x="540" y="180"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_App_Approved_di" bpmnElement="Flow_App_Approved">
        <di:waypoint x="590" y="180"/>
        <di:waypoint x="650" y="180"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_App_Rejected_di" bpmnElement="Flow_App_Rejected">
        <di:waypoint x="565" y="205"/>
        <di:waypoint x="565" y="340"/>
        <di:waypoint x="780" y="340"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Loop_Next_Approver_di" bpmnElement="Flow_Loop_Next_Approver">
        <di:waypoint x="675" y="205"/>
        <di:waypoint x="675" y="260"/>
        <di:waypoint x="400" y="260"/>
        <di:waypoint x="400" y="220"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_All_Approved_To_HR_di" bpmnElement="Flow_All_Approved_To_HR">
        <di:waypoint x="700" y="180"/>
        <di:waypoint x="770" y="180"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_HR_To_Gw_di" bpmnElement="Flow_HR_To_Gw">
        <di:waypoint x="930" y="180"/>
        <di:waypoint x="990" y="180"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_HR_Approved_di" bpmnElement="Flow_HR_Approved">
        <di:waypoint x="1040" y="180"/>
        <di:waypoint x="1110" y="180"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_HR_Rejected_di" bpmnElement="Flow_HR_Rejected">
        <di:waypoint x="1015" y="205"/>
        <di:waypoint x="1015" y="340"/>
        <di:waypoint x="816" y="340"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

export const REIMBURSEMENT_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:flowable="http://flowable.org/bpmn"
                  id="Definitions_Reimb" targetNamespace="http://flowable.org/bpmn">
  <bpmn:process id="expense-reimbursement" name="Klaim Reimbursement" isExecutable="true">
    <bpmn:startEvent id="start_reimb" name="Input Klaim"/>
    <bpmn:sequenceFlow id="f1" sourceRef="start_reimb" targetRef="t_spv"/>
    <bpmn:userTask id="t_spv" name="Persetujuan Supervisor" flowable:candidateGroups="supervisors"/>
    <bpmn:sequenceFlow id="f2" sourceRef="t_spv" targetRef="t_fin"/>
    <bpmn:userTask id="t_fin" name="Verifikasi Finance &amp; Disbursement" flowable:candidateGroups="finance"/>
    <bpmn:sequenceFlow id="f3" sourceRef="t_fin" targetRef="end_reimb"/>
    <bpmn:endEvent id="end_reimb" name="Klaim Dibayar"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Reimb">
    <bpmndi:BPMNPlane id="BPMNPlane_Reimb" bpmnElement="expense-reimbursement">
      <bpmndi:BPMNShape id="start_reimb_di" bpmnElement="start_reimb">
        <dc:Bounds x="150" y="110" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="t_spv_di" bpmnElement="t_spv">
        <dc:Bounds x="240" y="88" width="130" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="t_fin_di" bpmnElement="t_fin">
        <dc:Bounds x="420" y="88" width="150" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_reimb_di" bpmnElement="end_reimb">
        <dc:Bounds x="620" y="110" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="f1_di" bpmnElement="f1">
        <di:waypoint x="186" y="128"/>
        <di:waypoint x="240" y="128"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="f2_di" bpmnElement="f2">
        <di:waypoint x="370" y="128"/>
        <di:waypoint x="420" y="128"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="f3_di" bpmnElement="f3">
        <di:waypoint x="570" y="128"/>
        <di:waypoint x="620" y="128"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

export const DEFAULT_LEAVE_FORMS = {
  StartEvent_Leave: {
    elementId: 'StartEvent_Leave',
    elementName: 'Pengajuan Cuti (ESS)',
    elementType: 'bpmn:StartEvent',
    title: 'Formulir Pengajuan Cuti Karyawan',
    description: 'Diisi oleh karyawan pemohon cuti melalui portal ESS',
    decisionType: 'none',
    fields: [
      { id: 'f_leave_type', label: 'Tipe Cuti', type: 'dropdown', required: true, options: 'Tahunan, Sakit, Melahirkan, Menikah, Izin Khusus' },
      { id: 'f_start_date', label: 'Tanggal Mulai', type: 'date', required: true },
      { id: 'f_end_date', label: 'Tanggal Selesai', type: 'date', required: true },
      { id: 'f_reason', label: 'Alasan Cuti', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan pengajuan cuti...' },
      { id: 'f_attachment', label: 'Surat Keterangan / Resep Dokter', type: 'file', required: false },
    ],
  },
  Task_Approver: {
    elementId: 'Task_Approver',
    elementName: 'Persetujuan Operasional Dinamis (N-Tier)',
    elementType: 'bpmn:UserTask',
    title: 'Persetujuan Tingkat Operasional Dinamis',
    description: 'Pemeriksaan beban kerja tim dan persetujuan bertingkat (Level 1, Level 2, dst.) sesuai matriks persetujuan karyawan',
    decisionType: 'approval',
    fields: [
      { id: 'f_approver_comment', label: 'Catatan Approver', type: 'textarea', required: false, placeholder: 'Catatan atau arahan untuk pemohon...' },
      { id: 'f_handover_ok', label: 'Delegasi & Handover Tugas Sudah Terpenuhi', type: 'checkbox', required: false },
    ],
  },
  Task_HRApproval: {
    elementId: 'Task_HRApproval',
    elementName: 'Verifikasi & Persetujuan HR',
    elementType: 'bpmn:UserTask',
    title: 'Verifikasi & Validasi HR Department',
    description: 'Pengecekan kuota cuti tahunan, validasi kepatuhan, dan integrasi modul payroll',
    decisionType: 'approval',
    fields: [
      { id: 'f_hr_comment', label: 'Catatan HR Verifikator', type: 'textarea', required: false, placeholder: 'Catatan verifikasi final HR...' },
      { id: 'f_quota_deducted', label: 'Kuota Cuti Mencukupi & Telah Divalidasi', type: 'checkbox', required: true },
    ],
  },
  // Backward compatibility aliases
  start_leave: {
    elementId: 'start_leave',
    elementName: 'Pengajuan Cuti',
    elementType: 'bpmn:StartEvent',
    title: 'Formulir Pengajuan Cuti Karyawan',
    description: 'Diisi oleh karyawan pemohon cuti melalui portal ESS',
    decisionType: 'none',
    fields: [
      { id: 'f_leave_type', label: 'Tipe Cuti', type: 'dropdown', required: true, options: 'Tahunan, Sakit, Melahirkan, Menikah, Izin Khusus' },
      { id: 'f_start_date', label: 'Tanggal Mulai', type: 'date', required: true },
      { id: 'f_end_date', label: 'Tanggal Selesai', type: 'date', required: true },
      { id: 'f_reason', label: 'Alasan Cuti', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan pengajuan cuti...' },
      { id: 'f_attachment', label: 'Surat Keterangan / Resep Dokter', type: 'file', required: false },
    ],
  },
  task_manager_review: {
    elementId: 'task_manager_review',
    elementName: 'Persetujuan Manager',
    elementType: 'bpmn:UserTask',
    title: 'Review Persetujuan Manager Divisi',
    description: 'Pemeriksaan beban kerja tim dan persetujuan pengajuan cuti anggota',
    decisionType: 'approval',
    fields: [
      { id: 'f_mgr_comment', label: 'Catatan Manager', type: 'textarea', required: false, placeholder: 'Catatan atau arahan untuk pemohon...' },
      { id: 'f_handover_ok', label: 'Delegasi & Handover Tugas Sudah Terpenuhi', type: 'checkbox', required: false },
    ],
  },
  task_hr_approval: {
    elementId: 'task_hr_approval',
    elementName: 'Verifikasi HR',
    elementType: 'bpmn:UserTask',
    title: 'Verifikasi & Validasi HR Department',
    description: 'Pengecekan kuota cuti tahunan dan input sistem payroll',
    decisionType: 'approval',
    fields: [
      { id: 'f_hr_comment', label: 'Catatan HR Verifikator', type: 'textarea', required: false, placeholder: 'Catatan verifikasi...' },
      { id: 'f_quota_deducted', label: 'Kuota Cuti Mencukupi & Telah Divalidasi', type: 'checkbox', required: true },
    ],
  },
}

export const DEFAULT_REIMBURSEMENT_FORMS = {
  start_reimb: {
    elementId: 'start_reimb',
    elementName: 'Input Klaim',
    elementType: 'bpmn:StartEvent',
    title: 'Formulir Klaim Reimbursement Biaya Operasional',
    description: 'Diisi oleh karyawan untuk pengajuan pengembalian biaya',
    decisionType: 'none',
    fields: [
      { id: 'f_category', label: 'Kategori Pengeluaran', type: 'dropdown', required: true, options: 'Transportasi, Operasional Kantor, Medis, Hotel, Konsumsi' },
      { id: 'f_amount', label: 'Nominal Klaim (Rp)', type: 'number', required: true, placeholder: '500000' },
      { id: 'f_invoice_no', label: 'No. Kuitansi / Faktur', type: 'text', required: true, placeholder: 'INV-2026-...' },
      { id: 'f_description', label: 'Deskripsi Keperluan Dinas', type: 'textarea', required: true },
      { id: 'f_receipt_file', label: 'Bukti Nota Pembayaran / Transfer', type: 'file', required: true },
    ],
  },
  t_spv: {
    elementId: 't_spv',
    elementName: 'Persetujuan Supervisor',
    elementType: 'bpmn:UserTask',
    title: 'Validasi Keperluan oleh Supervisor',
    description: 'Memastikan pengeluaran relevan dengan tugas kedinasan',
    decisionType: 'approval',
    fields: [
      { id: 'f_spv_comment', label: 'Catatan Supervisor', type: 'textarea', required: false, placeholder: 'Catatan persetujuan...' },
    ],
  },
  t_fin: {
    elementId: 't_fin',
    elementName: 'Verifikasi Finance & Disbursement',
    elementType: 'bpmn:UserTask',
    title: 'Audit Keuangan & Pembayaran Finance',
    description: 'Pengecekan keabsahan bukti struk dan pencairan dana',
    decisionType: 'approval',
    fields: [
      { id: 'f_fin_comment', label: 'Catatan Finance Auditor', type: 'textarea', required: false },
      { id: 'f_payment_ref', label: 'No. Referensi Transfer Pencairan', type: 'text', required: false, placeholder: 'TRF-...' },
    ],
  },
}

export { OVERTIME_REQUEST_BPMN, DEFAULT_OVERTIME_FORMS } from '@/lib/flowable/definitions/overtimeRequestBpmn'

const BpmnDesigner = forwardRef(function BpmnDesigner(
  {
    initialXml = DEFAULT_BPMN,
    initialForms = DEFAULT_LEAVE_FORMS,
    onSave,
    onDeploy,
    onFormsChange,
    height = '600px',
  },
  ref
) {
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const modelerRef = useRef(null)
  const [xml, setXml] = useState(initialXml)
  const [forms, setForms] = useState(initialForms || {})
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedElement, setSelectedElement] = useState(null)
  const [showProperties, setShowProperties] = useState(true)

  // Update form schema for a specific node/task
  const handleUpdateTaskForm = (elementId, formSchema) => {
    const updated = {
      ...forms,
      [elementId]: formSchema,
    }
    setForms(updated)
    setHasChanges(true)
    if (onFormsChange) onFormsChange(updated)
  }

  // Expose modeler controls to parent via ref
  useImperativeHandle(ref, () => ({
    getXml: async () => {
      if (!modelerRef.current) return xml
      const result = await modelerRef.current.saveXML({ format: true })
      return result.xml
    },
    getForms: () => forms,
    setForms: (newForms) => setForms(newForms || {}),
    loadXml: (newXml, newForms = null) => {
      if (!modelerRef.current) return
      modelerRef.current
        .importXML(newXml)
        .then(() => {
          setTimeout(() => {
            try {
              modelerRef.current?.get('canvas').zoom('fit-viewport')
            } catch {}
          }, 60)
          setXml(newXml)
          if (newForms !== null) {
            setForms(newForms)
            if (onFormsChange) onFormsChange(newForms)
          }
          setHasChanges(false)
        })
        .catch((err) => console.error('Failed to import BPMN XML:', err))
    },
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const modeler = new BpmnModeler({
      container: containerRef.current,
    })
    modelerRef.current = modeler

    modeler
      .importXML(initialXml)
      .then(() => {
        setTimeout(() => {
          try {
            modeler.get('canvas').zoom('fit-viewport')
          } catch {}
        }, 60)
      })
      .catch((err) => console.error('Failed to initialize BPMN:', err))

    modeler.on('commandStack.changed', async () => {
      setHasChanges(true)
      try {
        const result = await modeler.saveXML({ format: true })
        setXml(result.xml)
      } catch (err) {
        console.error(err)
      }
    })

    // Listen to element selection
    modeler.on('selection.changed', (e) => {
      const selection = e.newSelection
      if (selection && selection.length === 1) {
        const el = selection[0]
        const bo = el.businessObject
        const attrs = bo?.$attrs || {}
        setSelectedElement({
          id: el.id,
          type: el.type,
          name: bo?.name || '',
          candidateGroups: attrs['flowable:candidateGroups'] || '',
          assignee: attrs['flowable:assignee'] || '',
          formKey: attrs['flowable:formKey'] || '',
          condition: bo?.conditionExpression?.body || '',
        })
      } else {
        setSelectedElement(null)
      }
    })

    return () => modeler.destroy()
  }, [])

  const handleApplyProperties = (props) => {
    if (!modelerRef.current || !selectedElement) return
    const elementRegistry = modelerRef.current.get('elementRegistry')
    const modeling = modelerRef.current.get('modeling')
    const moddle = modelerRef.current.get('moddle')
    const el = elementRegistry.get(selectedElement.id)
    if (!el) return

    const bo = el.businessObject
    bo.$attrs = bo.$attrs || {}

    const updates = {}
    if (props.name !== undefined) {
      updates.name = props.name
    }

    if (el.type.includes('Task') || el.type.includes('StartEvent')) {
      if (props.candidateGroups && el.type.includes('Task')) bo.$attrs['flowable:candidateGroups'] = props.candidateGroups
      else delete bo.$attrs['flowable:candidateGroups']

      if (props.assignee && el.type.includes('Task')) bo.$attrs['flowable:assignee'] = props.assignee
      else delete bo.$attrs['flowable:assignee']

      if (props.formKey) bo.$attrs['flowable:formKey'] = props.formKey
      else delete bo.$attrs['flowable:formKey']
    }

    if (el.type === 'bpmn:SequenceFlow') {
      if (props.condition) {
        const formalExpr = moddle.create('bpmn:FormalExpression', {
          body: props.condition,
        })
        updates.conditionExpression = formalExpr
      } else {
        updates.conditionExpression = undefined
      }
    }

    modeling.updateProperties(el, updates)
    setHasChanges(true)

    setSelectedElement((prev) => ({
      ...prev,
      name: props.name,
      candidateGroups: props.candidateGroups,
      assignee: props.assignee,
      formKey: props.formKey,
      condition: props.condition,
    }))

    modelerRef.current
      .saveXML({ format: true })
      .then((res) => setXml(res.xml))
      .catch((err) => console.error('Failed to sync XML:', err))
  }

  const handleConvertToUserTask = () => {
    if (!modelerRef.current || !selectedElement) return
    try {
      const elementRegistry = modelerRef.current.get('elementRegistry')
      const bpmnReplace = modelerRef.current.get('bpmnReplace')
      const el = elementRegistry.get(selectedElement.id)
      if (!el) return

      const newElement = bpmnReplace.replaceElement(el, {
        type: 'bpmn:UserTask',
      })
      if (newElement) {
        const bo = newElement.businessObject
        const attrs = bo?.$attrs || {}
        setSelectedElement({
          id: newElement.id,
          type: newElement.type,
          name: bo?.name || '',
          candidateGroups: attrs['flowable:candidateGroups'] || 'managers',
          assignee: attrs['flowable:assignee'] || '',
          formKey: attrs['flowable:formKey'] || 'approval-form',
          condition: '',
        })
        setHasChanges(true)
        modelerRef.current.saveXML({ format: true }).then((res) => setXml(res.xml))
      }
    } catch (err) {
      console.error('Failed to convert task:', err)
    }
  }

  const handleSave = async () => {
    if (!modelerRef.current) return
    const result = await modelerRef.current.saveXML({ format: true })
    setXml(result.xml)
    setHasChanges(false)
    if (onSave) onSave(result.xml, forms)
  }

  const handleDeploy = async () => {
    if (!modelerRef.current) return
    const result = await modelerRef.current.saveXML({ format: true })
    setXml(result.xml)
    setHasChanges(false)
    if (onDeploy) onDeploy(result.xml, forms)
  }

  const handleExportBpmn = () => {
    const blob = new Blob([xml], { type: 'application/xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'process-diagram.bpmn'
    link.click()
  }

  const handleExportSvg = async () => {
    if (!modelerRef.current) return
    try {
      const { svg } = await modelerRef.current.saveSVG()
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'process-diagram.svg'
      link.click()
    } catch (err) {
      console.error('Failed to export SVG:', err)
    }
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string' && modelerRef.current) {
        modelerRef.current
          .importXML(content)
          .then(() => {
            modelerRef.current.get('canvas').zoom('fit-viewport')
            setXml(content)
            setHasChanges(true)
          })
          .catch((err) => alert('Format XML / BPMN tidak valid: ' + err.message))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleZoom = (dir) => {
    if (!modelerRef.current) return
    const canvas = modelerRef.current.get('canvas')
    const zoom = canvas.zoom()
    if (dir === 'in') canvas.zoom(zoom + 0.15)
    else if (dir === 'out') canvas.zoom(Math.max(0.2, zoom - 0.15))
    else canvas.zoom('fit-viewport')
  }

  return (
    <div
      className="flex flex-col border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm w-full"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-gray-50 border-b border-gray-200 text-sm">
        {/* Actions */}
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs flex items-center gap-1 shadow-sm transition"
          title="Simpan draft ke database lokal"
        >
          💾 Simpan Draft
        </button>

        {onDeploy && (
          <button
            onClick={handleDeploy}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium text-xs flex items-center gap-1 shadow-sm transition"
            title="Deploy langsung ke Workflow Engine"
          >
            🚀 Deploy Workflow
          </button>
        )}

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Import & Export */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".bpmn,.xml"
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-xs font-medium transition"
          title="Upload file .bpmn atau .xml dari komputer"
        >
          📂 Import File
        </button>

        <button
          onClick={handleExportBpmn}
          className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-xs font-medium transition"
          title="Download diagram sebagai file BPMN 2.0 XML"
        >
          📥 Export BPMN
        </button>

        <button
          onClick={handleExportSvg}
          className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-xs font-medium transition"
          title="Download diagram sebagai gambar SVG"
        >
          🖼️ Export SVG
        </button>

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={() => modelerRef.current?.get('commandStack').undo()}
          className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs transition"
          title="Undo"
        >
          ↩️
        </button>
        <button
          onClick={() => modelerRef.current?.get('commandStack').redo()}
          className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs transition"
          title="Redo"
        >
          ↪️
        </button>

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Zoom */}
        <button
          onClick={() => handleZoom('in')}
          className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs transition"
          title="Zoom In"
        >
          ➕
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs transition"
          title="Zoom Out"
        >
          ➖
        </button>
        <button
          onClick={() => handleZoom('fit')}
          className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs font-medium transition"
          title="Fit Viewport"
        >
          🔲 Fit
        </button>

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Toggle Form & Properties Side Panel */}
        <button
          onClick={() => setShowProperties((prev) => !prev)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
            showProperties
              ? 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold shadow-xs'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
          }`}
          title="Buka / Tutup Panel Properti & Form Task"
        >
          <span>⚙️</span>
          <span>Form &amp; Properti</span>
          {selectedElement && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </button>

        {hasChanges && (
          <span className="ml-auto text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            ● Ada Perubahan Belum Disimpan
          </span>
        )}
      </div>

      {/* Workspace Area: BPMN Canvas + Properties Panel */}
      <div className="flex-1 flex w-full relative min-h-0 overflow-hidden">
        {/* BPMN Canvas Container */}
        <div
          ref={containerRef}
          className="bio-theme-parent flex-1 bg-gray-50 relative h-full min-h-0"
        />

        {/* Properties & Form Task Side Panel */}
        {showProperties && (
          <BpmnPropertiesPanel
            selectedElement={selectedElement}
            onApply={handleApplyProperties}
            onConvertToUserTask={handleConvertToUserTask}
            onClose={() => setShowProperties(false)}
            forms={forms}
            onUpdateForm={handleUpdateTaskForm}
          />
        )}
      </div>

      <style jsx global>{`
        .djs-palette {
          left: 14px !important;
          top: 14px !important;
          background: #ffffff !important;
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.12) !important;
          padding: 4px 2px !important;
          width: 48px !important;
          max-height: calc(100% - 28px) !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scrollbar-width: thin !important;
          z-index: 10 !important;
        }
        .djs-palette::-webkit-scrollbar {
          width: 4px;
        }
        .djs-palette::-webkit-scrollbar-track {
          background: transparent;
        }
        .djs-palette::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .djs-palette .entry {
          cursor: pointer !important;
          color: #334155 !important;
          font-size: 22px !important;
          line-height: 32px !important;
          height: 32px !important;
          width: 38px !important;
          margin: 2px auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 4px !important;
          transition: all 0.15s ease-in-out !important;
        }
        .djs-palette .entry:hover {
          color: #2563eb !important;
          background-color: #eff6ff !important;
          transform: scale(1.08);
        }
        .djs-palette .separator {
          margin: 6px auto !important;
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          width: 80% !important;
        }
        .djs-context-pad {
          z-index: 10 !important;
        }
        .djs-context-pad .entry {
          cursor: pointer !important;
          color: #334155 !important;
        }
        .djs-context-pad .entry:hover {
          color: #2563eb !important;
        }
      `}</style>
    </div>
  )
})

export default BpmnDesigner
