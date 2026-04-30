"use client";

import { useEffect } from "react";
import { AgentCard } from "@/src/components/agent-card";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  approveAndAutoStart,
  createWorkflow,
  refreshWorkflowStatus,
  resetWorkflow,
} from "@/src/store/slices/workflowSlice";
import type { Department } from "@/src/types/agent";

const ORDERED_DEPARTMENTS: Department[] = [
  "CEO",
  "HR",
  "Sales",
  "Marketing",
  "Finance",
  "Developer",
  "Operations",
];

const DEPARTMENT_AGENTS = ORDERED_DEPARTMENTS.filter((department) => department !== "CEO");

export function WorkflowDashboard() {
  const dispatch = useAppDispatch();
  const { requestId, approved, autoStarted, loading, error, agents } = useAppSelector(
    (state) => state.workflow
  );

  const queueItems = approved
    ? [
        "CEO approval completed",
        ...autoStarted.map((department) => `${department} started automatically`),
      ]
    : requestId
      ? ["CEO is reviewing the request", "Waiting for approval to start departments"]
      : ["No tasks yet. Run CEO approval flow to start work."];

  useEffect(() => {
    if (!requestId) return;

    const intervalId = window.setInterval(() => {
      dispatch(refreshWorkflowStatus(requestId));
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [dispatch, requestId]);

  const approve = async () => {
    try {
      let activeRequestId = requestId;

      if (!activeRequestId) {
        const created = await dispatch(
          createWorkflow("CEO approval flow auto-generated objective")
        ).unwrap();
        activeRequestId = created.requestId;
      }

      await dispatch(approveAndAutoStart(activeRequestId)).unwrap();
    } catch {
      // Errors are already handled in Redux state.
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 text-white">
      <section className="rounded-[28px] border border-white/10 bg-[#10111f] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500/30 to-pink-500/10 text-sm font-bold text-orange-100 ring-1 ring-orange-400/20">
                CEO
              </div>
              <div>
                <p className="text-lg font-semibold text-white">CEO Agent</p>
                <p className="mt-1 max-w-2xl text-sm text-slate-300">
                  Analyzes all business data, proposes work, and starts every remaining
                  department after your approval.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Click <span className="font-medium text-slate-200">Approve & Start Remaining</span> to let
                  the CEO trigger all department work automatically.
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                <p className="text-slate-500">Request ID</p>
                <p className="mt-1 font-medium text-white">{requestId ?? "Not created"}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                <p className="text-slate-500">Approval</p>
                <p className="mt-1 font-medium text-white">{approved ? "Approved" : "Pending"}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                <p className="text-slate-500">Departments</p>
                <p className="mt-1 font-medium text-white">{autoStarted.length}/6 started</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[auto_auto] lg:justify-end">
            <button
              className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-white"
              onClick={approve}
              disabled={approved || loading}
            >
              Approve & Start Remaining
            </button>
            <button
              className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/8"
              onClick={() => dispatch(resetWorkflow())}
            >
              Reset
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

          <section className="mt-6 rounded-2xl border border-white/8 bg-[#0f1020] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Task Queue
            </p>
            <div className="mt-4 min-h-36 rounded-2xl border border-dashed border-white/10 bg-white/2 p-4">
              <div className="space-y-3">
                {queueItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/6 bg-white/3 px-3 py-3 text-sm text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-white/8 bg-[#0f1020] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Department Agents
              </p>
              <p className="text-sm text-slate-500">
                CEO controls the full department workflow.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {DEPARTMENT_AGENTS.map((department) => (
                <AgentCard key={department} agent={agents[department]} requestId={requestId} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
