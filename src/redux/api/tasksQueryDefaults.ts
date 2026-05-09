/** Shared options for `useGetTasksQuery` — one subscription shouldn’t multiply requests on focus/tab changes */
export const TASKS_QUERY_OPTIONS = {
  refetchOnFocus: false,
  refetchOnReconnect: true,
} as const;
