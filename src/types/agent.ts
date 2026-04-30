export type Department =
  | "CEO"
  | "HR"
  | "Sales"
  | "Marketing"
  | "Finance"
  | "Developer"
  | "Operations";

export type AgentStatus = "idle" | "pending" | "running" | "done" | "error";

export interface AgentState {
  department: Department;
  status: AgentStatus;
  lastMessage: string;
}

export interface CreateWorkflowInput {
  goal: string;
}

export interface CreateWorkflowResponse {
  requestId: string;
}

export interface StartDepartmentInput {
  requestId: string;
  department: Department;
}

export interface AgentStatusResponse {
  department: Department;
  status: AgentStatus;
  lastMessage?: string;
}

export interface WorkflowStatusResponse {
  requestId: string;
  approved: boolean;
  agents: AgentStatusResponse[];
}

export type DepartmentAutomationStage =
  | "received"
  | "acknowledged"
  | "planning"
  | "in_progress"
  | "review"
  | "completed"
  | "mail_sent";

export interface DepartmentAutomationEvent {
  key: DepartmentAutomationStage;
  label: string;
  status: "done" | "running" | "pending";
  at: string | null;
}

export interface DepartmentAutomationResponse {
  requestId: string;
  department: Department;
  approved: boolean;
  currentStage: DepartmentAutomationStage;
  progress: number;
  currentStatus: AgentStatus;
  latestMessage: string;
  events: DepartmentAutomationEvent[];
  completionSummary: string;
  emailToCeo: {
    to: string;
    subject: string;
    sent: boolean;
    sentAt: string | null;
  };
}
