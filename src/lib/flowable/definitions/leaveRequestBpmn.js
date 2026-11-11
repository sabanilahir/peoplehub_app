export const LEAVE_REQUEST_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:flowable="http://flowable.org/bpmn"
                  id="Definitions_LeaveRequest"
                  targetNamespace="http://flowable.org/bpmn20">
  <bpmn:process id="leave-request-process" name="Pengajuan Cuti Karyawan" isExecutable="true">
    <bpmn:startEvent id="StartEvent_Leave" name="Pengajuan Cuti (ESS)"/>

    <bpmn:sequenceFlow id="Flow_Start_To_Gateway" sourceRef="StartEvent_Leave" targetRef="Gateway_EntryCheck"/>

    <!-- Gateway Entry Check: Jika tidak ada approver operasional (misal: self approval 1-tier), langsung ke HR -->
    <bpmn:exclusiveGateway id="Gateway_EntryCheck" name="Cek Approver Operasional"/>

    <bpmn:sequenceFlow id="Flow_Direct_To_HR_Start" name="Direct to HR (Tanpa Atasan)" sourceRef="Gateway_EntryCheck" targetRef="Task_HRApproval">
      <bpmn:conditionExpression>\${noOperationalApprovers == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_To_ApproverTask" name="Ada Matriks Approver" sourceRef="Gateway_EntryCheck" targetRef="Task_Approver">
      <bpmn:conditionExpression>\${noOperationalApprovers != true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Dynamic User Task untuk Level Operasional (Level 1, Level 2, Level 3, dst.) -->
    <bpmn:userTask id="Task_Approver" name="\${currentStepLabel}"
                   flowable:assignee="\${currentApproverUsername}"
                   flowable:candidateGroups="superadmin">
      <bpmn:documentation>Persetujuan tingkat operasional bertingkat (Level 1, Level 2, dst.) sesuai matriks approval karyawan.</bpmn:documentation>
    </bpmn:userTask>

    <bpmn:sequenceFlow id="Flow_App_To_Decision" sourceRef="Task_Approver" targetRef="Gateway_Decision"/>

    <bpmn:exclusiveGateway id="Gateway_Decision" name="Keputusan Approver"/>

    <bpmn:sequenceFlow id="Flow_App_Approved" name="Disetujui" sourceRef="Gateway_Decision" targetRef="Gateway_HasMore">
      <bpmn:conditionExpression>\${approved == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_App_Rejected" name="Ditolak" sourceRef="Gateway_Decision" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Gateway Cek Apakah Masih Ada Approver Berikutnya (N-Tier Loop) -->
    <bpmn:exclusiveGateway id="Gateway_HasMore" name="Ada Tingkat Lanjutan?"/>

    <bpmn:sequenceFlow id="Flow_Loop_Next_Approver" name="Next Level (Loop)" sourceRef="Gateway_HasMore" targetRef="Task_Approver">
      <bpmn:conditionExpression>\${hasMoreApprovers == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_All_Approved_To_HR" name="Semua Level Selesai" sourceRef="Gateway_HasMore" targetRef="Task_HRApproval">
      <bpmn:conditionExpression>\${hasMoreApprovers != true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Persetujuan Akhir oleh HR (Final Gate) -->
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
