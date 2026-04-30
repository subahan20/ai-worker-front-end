"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type {
  Department,
  DepartmentAutomationResponse,
} from "@/src/types/agent";

const DEPARTMENTS: Department[] = [
  "CEO",
  "HR",
  "Sales",
  "Marketing",
  "Finance",
  "Developer",
  "Operations",
];

function toTitle(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusClass(state: "done" | "running" | "pending") {
  if (state === "done") return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
  if (state === "running") return "bg-sky-500/20 text-sky-300 border-sky-400/30";
  return "bg-white/5 text-slate-400 border-white/10";
}

export default function DepartmentDetailsPage() {
  const params = useParams<{ requestId: string; department: string }>();
  const [data, setData] = useState<DepartmentAutomationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requestId = params.requestId;
  const departmentName = decodeURIComponent(params.department);
  const department = DEPARTMENTS.find((item) => item === departmentName) ?? null;

  useEffect(() => {
    if (!requestId) return;

    let mounted = true;

    async function loadStatus() {
      try {
        setError(null);
        const response = await fetch(
          `/api/workflow/${requestId}/department/${encodeURIComponent(departmentName)}`,
          {
          cache: "no-store",
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Unable to fetch department automation");
        }

        const json = (await response.json()) as DepartmentAutomationResponse;
        if (mounted) setData(json);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Request failed");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStatus();
    const intervalId = window.setInterval(loadStatus, 3000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [departmentName, requestId]);

  if (!department) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 text-white">
        <div className="rounded-2xl border border-white/10 bg-[#111426] p-8">
          <p className="text-lg font-semibold">Invalid department.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-sky-300 underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-8 text-white">
      <section className="rounded-2xl border border-white/10 bg-[#101325] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Department Automation</p>
            <h1 className="mt-2 text-2xl font-semibold">{department} Department</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/"
              aria-label="Close details"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg font-semibold text-slate-200 transition hover:bg-white/10"
            >
              ×
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#101325] p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Live Status by ID</p>
        {loading ? <p className="mt-3 text-sm text-slate-300">Loading workflow data...</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        {!loading && !error ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-500">Approval</p>
              <p className="mt-1 text-sm font-medium">{data?.approved ? "Approved" : "Pending"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-500">Department Status</p>
              <p className="mt-1 text-sm font-medium">{toTitle(data?.currentStatus ?? "idle")}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#101325] p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Full Automation Flow
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-slate-500">Progress</p>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-linear-to-r from-sky-400 to-emerald-400"
              style={{ width: `${data?.progress ?? 0}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Current stage: {toTitle(data?.currentStage ?? "received")}</span>
            <span>{data?.progress ?? 0}%</span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {data?.events.map((event) => {
            return (
              <div
                key={event.key}
                className={`rounded-xl border px-4 py-3 text-sm ${statusClass(event.status)}`}
              >
                <span className="mr-2 text-xs uppercase tracking-[0.2em]">{event.status}</span>
                {event.label}
                <span className="ml-2 text-xs text-slate-400">
                  {event.at ? new Date(event.at).toLocaleTimeString() : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#101325] p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Completion and CEO Email
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Completion Summary</p>
            <p className="mt-2 text-sm text-slate-200">
              {data?.completionSummary ?? "Waiting for department execution."}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Latest message: {data?.latestMessage ?? "No department data yet"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Email to CEO</p>
            <p className="mt-2 text-sm text-slate-200">
              To: {data?.emailToCeo.to ?? "ceo@company.local"}
            </p>
            <p className="mt-1 text-sm text-slate-200">
              Subject: {data?.emailToCeo.subject ?? `Completion report`}
            </p>
            <p className="mt-1 text-sm text-slate-200">
              Status: {data?.emailToCeo.sent ? "Sent" : "Pending"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {data?.emailToCeo.sentAt
                ? `Sent at: ${new Date(data.emailToCeo.sentAt).toLocaleString()}`
                : "Mail will be sent automatically after completion."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
