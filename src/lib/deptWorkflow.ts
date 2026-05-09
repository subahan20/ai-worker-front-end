/** Unified rules for worker-style tasks: insights only after a successful completed run. */

export function normalizeTaskStatus(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function isDeptTaskSuccessfullyCompleted(task: unknown): boolean {
  if (!task || typeof task !== 'object') return false;
  const t = task as Record<string, unknown>;
  const s = normalizeTaskStatus(t.status);
  if (s === 'failed') return false;
  if (s === 'completed' || s === 'success') return true;
  const p = Number(t.progress);
  return Number.isFinite(p) && p >= 100;
}

/** Latest row for this dept exists and is still running / queued — hide AI briefing & static “ideas”. */
export function shouldBlockDeptInsights(task: unknown): boolean {
  return Boolean(task) && !isDeptTaskSuccessfullyCompleted(task);
}

export function deptProcessingHeadline(dept: string): string {
  switch (dept) {
    case 'HR':
      return 'Generating hiring insights…';
    case 'Marketing':
      return 'AI is analyzing campaign performance…';
    case 'Sales':
      return 'Sharpening lead intelligence for your pipeline…';
    case 'Operations':
      return 'Processing workflow and delivery signals…';
    case 'Finance':
      return 'Reconciling financial signals for your briefing…';
    default:
      return 'Processing workspace data…';
  }
}

export function deptProcessingSubcopy(dept: string): string {
  switch (dept) {
    case 'HR':
      return 'We will surface candidate analysis and scorecard-ready summaries as soon as this run completes—no placeholders in the meantime.';
    case 'Marketing':
      return 'Engagement benchmarks, creative angles, and audience strategy unlock after this task finishes successfully.';
    case 'Sales':
      return 'Lead context, conversion angles, and pipeline notes appear after the workflow reports complete.';
    case 'Operations':
      return 'Automation and productivity insights populate once execution data is finalized.';
    case 'Finance':
      return 'Cash-flow and forecasting commentary appears only after numbers are finalized for this task.';
    default:
      return 'AI-generated commentary stays hidden until this job reaches a completed state.';
  }
}

/** Status line when a department worker is active but insights are gated. */
export function deptIdleProcessingLine(dept: string): string {
  switch (dept) {
    case 'HR':
      return 'AI is reviewing talent signals for this sprint…';
    case 'Marketing':
      return 'AI is working through your creative and channel audit…';
    case 'Sales':
      return 'Processing pipeline intelligence for this initiative…';
    case 'Operations':
      return 'AI is aligning delivery and throughput metrics…';
    case 'Finance':
      return 'Finance models are syncing for this workload…';
    default:
      return 'AI is working on the latest departmental request…';
  }
}

export function deptCompletedCardBrief(dept: string, taskTitle?: string): { title: string; body: string } {
  const label = taskTitle?.trim() || `${dept} workspace`;
  switch (dept) {
    case 'HR':
      return {
        title: 'Talent intelligence ready',
        body: `${label}: hiring signals are consolidated—shortlist rationale, calibrated interview paths, and the next people decisions your leaders can execute without guesswork.`,
      };
    case 'Marketing':
      return {
        title: 'Audience & campaign clarity',
        body: `${label}: engagement cues, channel fit, and creative direction are packaged so Marketing can prioritize what to amplify and what to retire.`,
      };
    case 'Sales':
      return {
        title: 'Pipeline-ready insight',
        body: `${label}: account context, urgency, and next-best actions read like a briefing your reps can send upward—focused on conversions, not jargon.`,
      };
    case 'Operations':
      return {
        title: 'Operational leverage',
        body: `${label}: workflows, throughput, and handoffs are distilled into where automation earns time back and where ownership must stay human.`,
      };
    case 'Finance':
      return {
        title: 'Financial executive read',
        body: `${label}: cash posture, runway signals, and the few levers that move the needle are framed for decisive leadership conversations.`,
      };
    default:
      return {
        title: 'Run complete',
        body: `${label}: outputs are summarized for stakeholders in a concise, dashboard-ready narrative.`,
      };
  }
}
