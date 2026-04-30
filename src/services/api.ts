import type {
  CreateWorkflowInput,
  CreateWorkflowResponse,
  Department,
  StartDepartmentInput,
  WorkflowStatusResponse,
} from "@/src/types/agent";

const BASE_URL = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  createWorkflow: (payload: CreateWorkflowInput) =>
    request<CreateWorkflowResponse>("/workflow", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  approveWorkflow: (requestId: string) =>
    request<{ ok: true }>(`/workflow/${requestId}/approve`, {
      method: "POST",
    }),

  startDepartment: (payload: StartDepartmentInput) =>
    request<{ ok: true }>("/workflow/start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getWorkflowStatus: (requestId: string) =>
    request<WorkflowStatusResponse>(`/workflow/${requestId}/status`),
};

export const AUTO_START_DEPARTMENTS: Department[] = [
  "HR",
  "Sales",
  "Marketing",
  "Finance",
  "Developer",
  "Operations",
];
