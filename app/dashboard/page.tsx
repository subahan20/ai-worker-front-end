import TaskQueue from '@/src/components/TaskQueue';

export const metadata = {
  title: 'Worker Tasks | Autonomous Execution',
  description: 'Persistent AI worker task execution queue.',
};

export default function DashboardPage() {
  return <TaskQueue />;
}
