export const LEAVE_REQUEST_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:flowable="http://flowable.org/bpmn"
                  id="Definitions_LeaveRequest"
                  targetNamespace="http://flowable.org/bpmn20">
  <bpmn:process id="LeaveRequest" name="Leave Request Workflow" isExecutable="true">
    <bpmn:startEvent id="StartEvent" name="Submit Leave"/>

    <bpmn:sequenceFlow id="Flow_Start_To_Gateway" sourceRef="StartEvent" targetRef="Gateway_BypassCheck"/>

    <!-- Gateway Smart Auto-Bypass: jika pemohon adalah Approval 1 itu sendiri -->
    <bpmn:exclusiveGateway id="Gateway_BypassCheck" name="Check Self Approval"/>

    <bpmn:sequenceFlow id="Flow_To_App1" name="Normal (Approver 1)" sourceRef="Gateway_BypassCheck" targetRef="Task_Approver1">
      <bpmn:conditionExpression>\${skipApprover1 != true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_Bypass_To_App2Gate" name="Auto Bypass to App2 or HR" sourceRef="Gateway_BypassCheck" targetRef="Gateway_HasApp2">
      <bpmn:conditionExpression>\${skipApprover1 == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Tingkat 1: Approval 1 (Assignee spesifik sesuai approver1Id) -->
    <bpmn:userTask id="Task_Approver1" name="Approval 1"
                   flowable:assignee="\${approver1Username}"
                   flowable:candidateGroups="superadmin">
      <bpmn:documentation>Persetujuan tingkat 1 oleh penanggung jawab operasional / koordinator.</bpmn:documentation>
    </bpmn:userTask>

    <bpmn:sequenceFlow id="Flow_App1_To_Gw" sourceRef="Task_Approver1" targetRef="Gateway_App1"/>

    <bpmn:exclusiveGateway id="Gateway_App1" name="Approver 1 Decision"/>

    <bpmn:sequenceFlow id="Flow_App1_Approved" name="Approved" sourceRef="Gateway_App1" targetRef="Gateway_HasApp2">
      <bpmn:conditionExpression>\${approved == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_App1_Rejected" name="Rejected" sourceRef="Gateway_App1" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Gateway Dinamis: Cek Apakah Karyawan Memiliki Approval 2 -->
    <bpmn:exclusiveGateway id="Gateway_HasApp2" name="Check Approval 2 Exists"/>

    <bpmn:sequenceFlow id="Flow_To_App2" name="Has Approval 2" sourceRef="Gateway_HasApp2" targetRef="Task_Approver2">
      <bpmn:conditionExpression>\${hasApproval2 == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_Direct_To_HR" name="No Approval 2 (Direct to HR)" sourceRef="Gateway_HasApp2" targetRef="Task_HRApproval">
      <bpmn:conditionExpression>\${hasApproval2 != true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Tingkat 2: Approval 2 (Assignee spesifik sesuai approver2Id) -->
    <bpmn:userTask id="Task_Approver2" name="Approval 2"
                   flowable:assignee="\${approver2Username}"
                   flowable:candidateGroups="superadmin">
      <bpmn:documentation>Persetujuan tingkat 2 oleh Manager / Head Departemen.</bpmn:documentation>
    </bpmn:userTask>

    <bpmn:sequenceFlow id="Flow_App2_To_Gw" sourceRef="Task_Approver2" targetRef="Gateway_App2"/>

    <bpmn:exclusiveGateway id="Gateway_App2" name="Approver 2 Decision"/>

    <bpmn:sequenceFlow id="Flow_App2_Approved" name="Approved to HR" sourceRef="Gateway_App2" targetRef="Task_HRApproval">
      <bpmn:conditionExpression>\${approved == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_App2_Rejected" name="Rejected" sourceRef="Gateway_App2" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Tingkat Terakhir: Persetujuan Akhir HR (HR Approval) -->
    <bpmn:userTask id="Task_HRApproval" name="HR Approval"
                   flowable:candidateGroups="hr,hr_manager,superadmin">
      <bpmn:documentation>Persetujuan akhir oleh HR Team untuk verifikasi kuota cuti dan kalkulasi payroll.</bpmn:documentation>
    </bpmn:userTask>

    <bpmn:sequenceFlow id="Flow_HR_To_Gw" sourceRef="Task_HRApproval" targetRef="Gateway_HR"/>

    <bpmn:exclusiveGateway id="Gateway_HR" name="HR Decision"/>

    <bpmn:sequenceFlow id="Flow_HR_Approved" name="Final Approved" sourceRef="Gateway_HR" targetRef="End_Approved">
      <bpmn:conditionExpression>\${approved == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_HR_Rejected" name="Rejected" sourceRef="Gateway_HR" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:endEvent id="End_Approved" name="Approved &amp; Synced to Payroll"/>
    <bpmn:endEvent id="End_Rejected" name="Leave Request Rejected"/>
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="LeaveRequest">
      <bpmndi:BPMNShape id="StartEvent_di" bpmnElement="StartEvent">
        <dc:Bounds x="80" y="100" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_BypassCheck_di" bpmnElement="Gateway_BypassCheck" isMarkerVisible="true">
        <dc:Bounds x="160" y="93" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Approver1_di" bpmnElement="Task_Approver1">
        <dc:Bounds x="260" y="78" width="120" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_App1_di" bpmnElement="Gateway_App1" isMarkerVisible="true">
        <dc:Bounds x="420" y="93" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_HasApp2_di" bpmnElement="Gateway_HasApp2" isMarkerVisible="true">
        <dc:Bounds x="510" y="93" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Approver2_di" bpmnElement="Task_Approver2">
        <dc:Bounds x="600" y="78" width="120" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_App2_di" bpmnElement="Gateway_App2" isMarkerVisible="true">
        <dc:Bounds x="760" y="93" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_HRApproval_di" bpmnElement="Task_HRApproval">
        <dc:Bounds x="850" y="78" width="120" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_HR_di" bpmnElement="Gateway_HR" isMarkerVisible="true">
        <dc:Bounds x="1010" y="93" width="50" height="50"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Approved_di" bpmnElement="End_Approved">
        <dc:Bounds x="1100" y="100" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Rejected_di" bpmnElement="End_Rejected">
        <dc:Bounds x="642" y="240" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
