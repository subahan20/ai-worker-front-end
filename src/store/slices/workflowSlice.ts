import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AUTO_START_DEPARTMENTS, api } from "@/src/services/api";
import type { AgentState, Department } from "@/src/types/agent";

const ALL_DEPARTMENTS: Department[] = [
  "CEO",
  "HR",
  "Sales",
  "Marketing",
  "Finance",
  "Developer",
  "Operations",
];

function createInitialAgents(): Record<Department, AgentState> {
  return ALL_DEPARTMENTS.reduce(
    (acc, department) => {
      acc[department] = { department, status: "idle", lastMessage: "Not started" };
      return acc;
    },
    {} as Record<Department, AgentState>
  );
}

interface WorkflowState {
  requestId: string | null;
  goal: string;
  approved: boolean;
  autoStarted: Department[];
  loading: boolean;
  error: string | null;
  agents: Record<Department, AgentState>;
}

const initialState: WorkflowState = {
  requestId: null,
  goal: "",
  approved: false,
  autoStarted: [],
  loading: false,
  error: null,
  agents: createInitialAgents(),
};

export const createWorkflow = createAsyncThunk(
  "workflow/create",
  async (goal: string, { rejectWithValue }) => {
    try {
      const result = await api.createWorkflow({ goal });
      return { requestId: result.requestId, goal };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create workflow";
      return rejectWithValue(message);
    }
  }
);

export const approveAndAutoStart = createAsyncThunk(
  "workflow/approveAndAutoStart",
  async (requestId: string, { rejectWithValue }) => {
    try {
      await api.approveWorkflow(requestId);

      await Promise.all(
        AUTO_START_DEPARTMENTS.map((department) =>
          api.startDepartment({ requestId, department })
        )
      );

      return { requestId, autoStarted: AUTO_START_DEPARTMENTS };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to approve and auto-start departments";
      return rejectWithValue(message);
    }
  }
);

export const refreshWorkflowStatus = createAsyncThunk(
  "workflow/refreshStatus",
  async (requestId: string, { rejectWithValue }) => {
    try {
      const response = await api.getWorkflowStatus(requestId);
      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch workflow status";
      return rejectWithValue(message);
    }
  }
);

const workflowSlice = createSlice({
  name: "workflow",
  initialState,
  reducers: {
    setGoal(state, action: { payload: string }) {
      state.goal = action.payload;
    },
    resetWorkflow(state) {
      state.requestId = null;
      state.goal = "";
      state.approved = false;
      state.autoStarted = [];
      state.loading = false;
      state.error = null;
      state.agents = createInitialAgents();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWorkflow.fulfilled, (state, action) => {
        state.loading = false;
        state.requestId = action.payload.requestId;
        state.goal = action.payload.goal;
        state.agents.CEO = {
          department: "CEO",
          status: "running",
          lastMessage: "Routing workflow for departments",
        };
      })
      .addCase(createWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Unable to create workflow";
      })
      .addCase(approveAndAutoStart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveAndAutoStart.fulfilled, (state, action) => {
        state.loading = false;
        state.approved = true;
        state.autoStarted = action.payload.autoStarted;
        state.agents.CEO = {
          department: "CEO",
          status: "done",
          lastMessage: "Approved and started all remaining departments",
        };
        for (const department of action.payload.autoStarted) {
          state.agents[department] = {
            department,
            status: "running",
            lastMessage: "Started automatically after approval",
          };
        }
      })
      .addCase(approveAndAutoStart.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? "Unable to approve and start departments";
      })
      .addCase(refreshWorkflowStatus.fulfilled, (state, action) => {
        state.approved = action.payload.approved;
        for (const entry of action.payload.agents) {
          state.agents[entry.department] = {
            department: entry.department,
            status: entry.status,
            lastMessage: entry.lastMessage ?? "No message",
          };
        }
      })
      .addCase(refreshWorkflowStatus.rejected, (state, action) => {
        state.error = (action.payload as string) ?? "Unable to refresh status";
      });
  },
});

export const { setGoal, resetWorkflow } = workflowSlice.actions;
export default workflowSlice.reducer;
