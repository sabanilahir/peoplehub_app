// src/lib/flowable/definitions/overtimeRequestBpmn.js

export const OVERTIME_REQUEST_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:flowable="http://flowable.org/bpmn"
                  id="Definitions_OvertimeRequest"
                  targetNamespace="http://flowable.org/bpmn20">
  <bpmn:process id="overtime-request-process" name="Persetujuan Lembur Karyawan" isExecutable="true">
    <bpmn:startEvent id="StartEvent_Overtime" name="Pengajuan Lembur (ESS)"/>

    <bpmn:sequenceFlow id="Flow_Start_To_Approver" sourceRef="StartEvent_Overtime" targetRef="Task_Approver"/>

    <!-- User Task untuk Atasan Langsung / Manager Pemohon Lembur -->
    <bpmn:userTask id="Task_Approver" name="\${currentStepLabel}"
                   flowable:assignee="\${currentApproverUsername}"
                   flowable:candidateGroups="manager,spv,lead,coordinator,superadmin">
      <bpmn:documentation>Persetujuan lembur oleh atasan langsung (Supervisor/Manager) pemohon lembur.</bpmn:documentation>
    </bpmn:userTask>

    <bpmn:sequenceFlow id="Flow_App_To_Decision" sourceRef="Task_Approver" targetRef="Gateway_Decision"/>

    <bpmn:exclusiveGateway id="Gateway_Decision" name="Keputusan Atasan"/>

    <bpmn:sequenceFlow id="Flow_App_Approved" name="Disetujui Atasan" sourceRef="Gateway_Decision" targetRef="Task_HRVerification">
      <bpmn:conditionExpression>\${approved == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_App_Rejected" name="Ditolak" sourceRef="Gateway_Decision" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Verifikasi & Validasi HR Payroll (Final Gate) -->
    <bpmn:userTask id="Task_HRVerification" name="Verifikasi &amp; Payroll Sync HR"
                   flowable:candidateGroups="hr,hr_manager,superadmin">
      <bpmn:documentation>Verifikasi akhir oleh tim HR untuk memasukkan lembur ke HO Calculator dan Odoo Payroll.</bpmn:documentation>
    </bpmn:userTask>

    <bpmn:sequenceFlow id="Flow_HR_To_Gw" sourceRef="Task_HRVerification" targetRef="Gateway_HR"/>

    <bpmn:exclusiveGateway id="Gateway_HR" name="Keputusan HR"/>

    <bpmn:sequenceFlow id="Flow_HR_Approved" name="Disetujui HR" sourceRef="Gateway_HR" targetRef="End_Approved">
      <bpmn:conditionExpression>\${approved == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_HR_Rejected" name="Ditolak HR" sourceRef="Gateway_HR" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:endEvent id="End_Approved" name="Selesai Disetujui (Payroll Sync)"/>
    <bpmn:endEvent id="End_Rejected" name="Pengajuan Lembur Ditolak"/>
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_Overtime">
    <bpmndi:BPMNPlane id="BPMNPlane_Overtime" bpmnElement="overtime-request-process">
      <bpmndi:BPMNShape id="StartEvent_Overtime_di" bpmnElement="StartEvent_Overtime">
        <dc:Bounds x="120" y="162" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="100" y="205" width="80" height="27"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Task_Approver_di" bpmnElement="Task_Approver">
        <dc:Bounds x="230" y="140" width="180" height="80"/>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Gateway_Decision_di" bpmnElement="Gateway_Decision" isMarkerVisible="true">
        <dc:Bounds x="470" y="155" width="50" height="50"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="455" y="125" width="80" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Task_HRVerification_di" bpmnElement="Task_HRVerification">
        <dc:Bounds x="600" y="140" width="180" height="80"/>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Gateway_HR_di" bpmnElement="Gateway_HR" isMarkerVisible="true">
        <dc:Bounds x="840" y="155" width="50" height="50"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="830" y="125" width="70" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="End_Approved_di" bpmnElement="End_Approved">
        <dc:Bounds x="970" y="162" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="945" y="205" width="86" height="27"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="End_Rejected_di" bpmnElement="End_Rejected">
        <dc:Bounds x="672" y="282" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="648" y="325" width="84" height="27"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <!-- Edges -->
      <bpmndi:BPMNEdge id="Flow_Start_To_Approver_di" bpmnElement="Flow_Start_To_Approver">
        <di:waypoint x="156" y="180"/>
        <di:waypoint x="230" y="180"/>
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNEdge id="Flow_App_To_Decision_di" bpmnElement="Flow_App_To_Decision">
        <di:waypoint x="410" y="180"/>
        <di:waypoint x="470" y="180"/>
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNEdge id="Flow_App_Approved_di" bpmnElement="Flow_App_Approved">
        <di:waypoint x="520" y="180"/>
        <di:waypoint x="600" y="180"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="535" y="162" width="50" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNEdge id="Flow_App_Rejected_di" bpmnElement="Flow_App_Rejected">
        <di:waypoint x="495" y="205"/>
        <di:waypoint x="495" y="300"/>
        <di:waypoint x="672" y="300"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="502" y="243" width="35" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNEdge id="Flow_HR_To_Gw_di" bpmnElement="Flow_HR_To_Gw">
        <di:waypoint x="780" y="180"/>
        <di:waypoint x="840" y="180"/>
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNEdge id="Flow_HR_Approved_di" bpmnElement="Flow_HR_Approved">
        <di:waypoint x="890" y="180"/>
        <di:waypoint x="970" y="180"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="900" y="162" width="60" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNEdge id="Flow_HR_Rejected_di" bpmnElement="Flow_HR_Rejected">
        <di:waypoint x="865" y="205"/>
        <di:waypoint x="865" y="300"/>
        <di:waypoint x="708" y="300"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="872" y="243" width="55" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`
