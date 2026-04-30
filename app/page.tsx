import { WorkflowDashboard } from "@/src/components/workflow-dashboard";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,#1d2340,#0a0b14_55%)] font-sans">
      <WorkflowDashboard />
    </div>
  );
}
