export const LEAVE_REQUEST_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:flowable="http://flowable.org/bpmn"
                  id="Definitions_LeaveRequest"
                  targetNamespace="http://flowable.org/bpmn20">
  <bpmn:process id="LeaveRequest" name="Leave Request Workflow" isExecutable="true">
    <bpmn:startEvent id="StartEvent" name="Submit Leave"/>

    <bpmn:sequenceFlow id="Flow_Start_To_Gateway" sourceRef="StartEvent" targetRef="Gateway_EntryCheck"/>

    <!-- Gateway Entry Check: Jika tidak ada approver operasional (misal: self approval 1-tier), langsung ke HR -->
    <bpmn:exclusiveGateway id="Gateway_EntryCheck" name="Check Has Approvers"/>

    <bpmn:sequenceFlow id="Flow_Direct_To_HR_Start" name="Direct to HR" sourceRef="Gateway_EntryCheck" targetRef="Task_HRApproval">
      <bpmn:conditionExpression>\${noOperationalApprovers == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_To_ApproverTask" name="Process Approvers" sourceRef="Gateway_EntryCheck" targetRef="Task_Approver">
      <bpmn:conditionExpression>\${noOperationalApprovers != true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Dynamic User Task untuk Level Operasional (Level 1, Level 2, Level 3, dst.) -->
    <bpmn:userTask id="Task_Approver" name="\${currentStepLabel}"
                   flowable:assignee="\${currentApproverUsername}"
                   flowable:candidateGroups="superadmin">
      <bpmn:documentation>Persetujuan tingkat operasional oleh atasan / manager / direksi.</bpmn:documentation>
    </bpmn:userTask>

    <bpmn:sequenceFlow id="Flow_App_To_Decision" sourceRef="Task_Approver" targetRef="Gateway_Decision"/>

    <bpmn:exclusiveGateway id="Gateway_Decision" name="Approver Decision"/>

    <bpmn:sequenceFlow id="Flow_App_Rejected" name="Rejected" sourceRef="Gateway_Decision" targetRef="End_Rejected">
      <bpmn:conditionExpression>\${approved == false}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_App_Approved" name="Approved" sourceRef="Gateway_Decision" targetRef="Gateway_HasMore"/>

    <!-- Gateway Cek Apakah Masih Ada Approver Berikutnya (N-Tier Loop) -->
    <bpmn:exclusiveGateway id="Gateway_HasMore" name="Has More Approvers?"/>

    <bpmn:sequenceFlow id="Flow_Loop_Next_Approver" name="Next Level" sourceRef="Gateway_HasMore" targetRef="Task_Approver">
      <bpmn:conditionExpression>\${hasMoreApprovers == true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <bpmn:sequenceFlow id="Flow_All_Approved_To_HR" name="All Levels Done -> HR" sourceRef="Gateway_HasMore" targetRef="Task_HRApproval">
      <bpmn:conditionExpression>\${hasMoreApprovers != true}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Persetujuan Akhir oleh HR (Final Gate) -->
    <bpmn:userTask id="Task_HRApproval" name="HR Approval"
                   flowable:candidateGroups="hr,hr_manager,superadmin">
      <bpmn:documentation>Persetujuan akhir oleh HR Team untuk penetapan status Approved dan sinkronisasi kuota/payroll.</bpmn:documentation>
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
</bpmn:definitions>`
