import type {
  AgentStatus,
  Department,
  DepartmentAutomationResponse,
  DepartmentAutomationStage,
} from "@/src/types/agent";

type WorkflowRecord = {
  requestId: string;
  approved: boolean;
  goal: string;
  agents: Record<
    Department,
    { status: AgentStatus; lastMessage: string; startedAt: number | null }
  >;
};

declare global {
  // eslint-disable-next-line no-var
  var __workflowMemoryDb__: Map<string, WorkflowRecord> | undefined;
}

const DEPARTMENTS: Department[] = [
  "CEO",
  "HR",
  "Sales",
  "Marketing",
  "Finance",
  "Developer",
  "Operations",
];

const NON_CEO_DEPARTMENTS = DEPARTMENTS.filter(
  (department) => department !== "CEO"
) as Exclude<Department, "CEO">[];

const memoryDb =
  globalThis.__workflowMemoryDb__ ?? new Map<string, WorkflowRecord>();
globalThis.__workflowMemoryDb__ = memoryDb;

function defaultAgents(): WorkflowRecord["agents"] {
  return DEPARTMENTS.reduce(
    (acc, department) => {
      acc[department] = {
        status: "idle",
        lastMessage: "Not started",
        startedAt: null,
      };
      return acc;
    },
    {} as WorkflowRecord["agents"]
  );
}

export function createWorkflow(goal: string) {
  const requestId = `req_${Date.now()}`;
  const record: WorkflowRecord = {
    requestId,
    approved: false,
    goal,
    agents: defaultAgents(),
  };

  record.agents.CEO = {
    status: "running",
    lastMessage: "Reviewing objective and assigning departments",
    startedAt: Date.now(),
  };

  memoryDb.set(requestId, record);
  return { requestId };
}

export function approveWorkflow(requestId: string) {
  const record = memoryDb.get(requestId);
  if (!record) return null;

  record.approved = true;
  record.agents.CEO = {
    status: "done",
    lastMessage: "Approved by user",
    startedAt: record.agents.CEO.startedAt,
  };
  memoryDb.set(requestId, record);
  return { ok: true as const };
}

export function startDepartment(requestId: string, department: Department) {
  const record = memoryDb.get(requestId);
  if (!record) return null;

  record.agents[department] = {
    status: "running",
    lastMessage: "Started and processing assigned tasks",
    startedAt: Date.now(),
  };
  memoryDb.set(requestId, record);
  return { ok: true as const };
}

export function getWorkflowStatus(requestId: string) {
  const record = memoryDb.get(requestId);
  if (!record) return null;

  const now = Date.now();
  const completionMs = 12000;
  const mailMs = 18000;

  for (const department of NON_CEO_DEPARTMENTS) {
    const agent = record.agents[department];
    if (
      agent.status === "running" &&
      agent.startedAt !== null &&
      now - agent.startedAt >= completionMs
    ) {
      record.agents[department] = {
        ...agent,
        status: "done",
        lastMessage: "Completed assigned tasks",
      };
    }

    if (
      agent.startedAt !== null &&
      now - agent.startedAt >= mailMs &&
      record.agents[department].status === "done"
    ) {
      record.agents[department] = {
        ...record.agents[department],
        lastMessage: "Completed task and email sent to CEO",
      };
    }
  }

  memoryDb.set(requestId, record);

  return {
    requestId: record.requestId,
    approved: record.approved,
    agents: DEPARTMENTS.map((department) => ({
      department,
      status: record.agents[department].status,
      lastMessage: record.agents[department].lastMessage,
    })),
  };
}

type EventDefinition = {
  key: DepartmentAutomationStage;
  label: string;
  offsetMs: number;
};

const AUTOMATION_EVENTS: EventDefinition[] = [
  { key: "received", label: "Task received from CEO queue", offsetMs: 0 },
  { key: "acknowledged", label: "Department lead acknowledged task", offsetMs: 2000 },
  { key: "planning", label: "Human planning and subtask breakdown", offsetMs: 5000 },
  { key: "in_progress", label: "Execution in progress", offsetMs: 8000 },
  { key: "review", label: "Internal review and QA", offsetMs: 12000 },
  { key: "completed", label: "Work completed and report prepared", offsetMs: 15000 },
  { key: "mail_sent", label: "Completion email sent to CEO", offsetMs: 18000 },
];

function calculateCurrentStage(elapsedMs: number): DepartmentAutomationStage {
  if (elapsedMs >= 18000) return "mail_sent";
  if (elapsedMs >= 15000) return "completed";
  if (elapsedMs >= 12000) return "review";
  if (elapsedMs >= 8000) return "in_progress";
  if (elapsedMs >= 5000) return "planning";
  if (elapsedMs >= 2000) return "acknowledged";
  return "received";
}

function stageToAgentStatus(stage: DepartmentAutomationStage): AgentStatus {
  if (stage === "completed" || stage === "mail_sent") return "done";
  return "running";
}

export function getDepartmentAutomationDetails(
  requestId: string,
  department: Department
): DepartmentAutomationResponse | null {
  const record = memoryDb.get(requestId);
  if (!record) return null;
  if (!DEPARTMENTS.includes(department)) return null;

  if (department === "CEO") {
    return {
      requestId,
      department,
      approved: record.approved,
      currentStage: "completed",
      progress: 100,
      currentStatus: record.agents.CEO.status,
      latestMessage: record.agents.CEO.lastMessage,
      events: AUTOMATION_EVENTS.map((event) => ({
        key: event.key,
        label: event.label,
        status: event.key === "mail_sent" ? "pending" : "done",
        at: null,
      })),
      completionSummary:
        "CEO completes routing and approval control. Department execution happens in other agents.",
      emailToCeo: {
        to: "ceo@company.local",
        subject: `CEO control cycle status`,
        sent: false,
        sentAt: null,
      },
    };
  }

  const agent = record.agents[department];
  if (agent.startedAt === null) {
    return {
      requestId,
      department,
      approved: record.approved,
      currentStage: "received",
      progress: 0,
      currentStatus: "idle",
      latestMessage: agent.lastMessage,
      events: AUTOMATION_EVENTS.map((event) => ({
        key: event.key,
        label: event.label,
        status: "pending",
        at: null,
      })),
      completionSummary: "Department has not started work yet.",
      emailToCeo: {
        to: "ceo@company.local",
        subject: `${department} completion update`,
        sent: false,
        sentAt: null,
      },
    };
  }

  const startedAt = agent.startedAt;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - startedAt);
  const currentStage = calculateCurrentStage(elapsedMs);
  const currentStatus = stageToAgentStatus(currentStage);
  const progress = Math.min(100, Math.floor((elapsedMs / 18000) * 100));
  const sentAt = elapsedMs >= 18000 ? new Date(startedAt + 18000).toISOString() : null;

  const events: DepartmentAutomationResponse["events"] = AUTOMATION_EVENTS.map(
    (event, index) => {
    const nextEvent = AUTOMATION_EVENTS[index + 1];
    const isDone = elapsedMs >= event.offsetMs;
    const isRunning = isDone && (!nextEvent || elapsedMs < nextEvent.offsetMs);

    return {
      key: event.key,
      label: event.label,
      status: isDone ? (isRunning ? "running" : "done") : "pending",
      at: isDone ? new Date(startedAt + event.offsetMs).toISOString() : null,
    };
    }
  );

  return {
    requestId,
    department,
    approved: record.approved,
    currentStage,
    progress,
    currentStatus,
    latestMessage:
      currentStage === "mail_sent"
        ? "Completed all steps and sent completion email to CEO."
        : agent.lastMessage,
    events,
    completionSummary:
      currentStage === "mail_sent" || currentStage === "completed"
        ? `${department} completed execution, passed review, and prepared handoff summary.`
        : `${department} is currently processing assigned work with human-like stage transitions.`,
    emailToCeo: {
      to: "ceo@company.local",
      subject: `${department} task completion report`,
      sent: currentStage === "mail_sent",
      sentAt,
    },
  };
}
