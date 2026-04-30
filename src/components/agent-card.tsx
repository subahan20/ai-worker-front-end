import type { AgentState } from "@/src/types/agent";
import Link from "next/link";

const STATUS_STYLE: Record<AgentState["status"], string> = {
  idle: "text-slate-300",
  pending: "text-amber-300",
  running: "text-sky-300",
  done: "text-emerald-300",
  error: "text-rose-300",
};

const AGENT_THEME: Record<AgentState["department"], { icon: string; accent: string; summary: string }> = {
  CEO: {
    icon: "C",
    accent: "from-orange-500/25 to-rose-500/10",
    summary: "Analyzes all business data and coordinates every department.",
  },
  HR: {
    icon: "H",
    accent: "from-violet-500/25 to-fuchsia-500/10",
    summary: "Team management, hiring pipeline, performance, and internal tasks.",
  },
  Sales: {
    icon: "S",
    accent: "from-emerald-500/25 to-teal-500/10",
    summary: "Leads pipeline, proposals, outbound follow-ups, and conversion work.",
  },
  Marketing: {
    icon: "M",
    accent: "from-pink-500/25 to-purple-500/10",
    summary: "Campaigns, content strategy, brand messaging, and growth execution.",
  },
  Finance: {
    icon: "F",
    accent: "from-yellow-500/25 to-orange-500/10",
    summary: "Budgets, forecasting, approvals, reporting, and financial tracking.",
  },
  Developer: {
    icon: "D",
    accent: "from-cyan-500/25 to-sky-500/10",
    summary: "Builds features, integrations, fixes, automations, and technical delivery.",
  },
  Operations: {
    icon: "O",
    accent: "from-indigo-500/25 to-blue-500/10",
    summary: "Projects, deadlines, delivery flow, and execution across teams.",
  },
};

function getFooterMessage(agent: AgentState) {
  if (agent.status === "idle") {
    return "Standing by for tasks.";
  }

  if (agent.status === "running") {
    return "Currently handling assigned work.";
  }

  if (agent.status === "done") {
    return "Completed current assigned workflow.";
  }

  if (agent.status === "error") {
    return "Attention needed before continuing.";
  }

  return "Preparing next department action.";
}

export function AgentCard({
  agent,
  requestId,
}: {
  agent: AgentState;
  requestId: string | null;
}) {
  const theme = AGENT_THEME[agent.department];
  const openHref = requestId
    ? `/workflow/${requestId}/department/${encodeURIComponent(agent.department)}`
    : null;

  return (
    <article className="rounded-2xl border border-white/10 bg-[#17172a] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${theme.accent} text-sm font-bold text-white ring-1 ring-white/10`}
          >
            {theme.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{agent.department} Department</h3>
            <p className="max-w-xs text-xs leading-5 text-slate-400">{theme.summary}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${STATUS_STYLE[agent.status]}`}>
          {agent.status}
        </span>
      </header>

      <div className="min-h-16 rounded-xl border border-white/6 bg-white/3 p-3">
        <p className="text-sm text-slate-200">{agent.lastMessage}</p>
        <p className="mt-2 text-xs text-slate-500">{getFooterMessage(agent)}</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {openHref ? (
          <Link
            href={openHref}
            className="flex-1 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-center text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/20"
          >
            Open →
          </Link>
        ) : (
          <button
            disabled
            className="flex-1 cursor-not-allowed rounded-xl border border-indigo-400/20 bg-indigo-500/5 px-3 py-2 text-sm font-medium text-indigo-200/50"
          >
            Open →
          </button>
        )}
        <button className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5">
          Chat
        </button>
      </div>
    </article>
  );
}
