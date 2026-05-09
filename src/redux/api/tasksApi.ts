import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/src/lib/api';

export interface Task {
  id: string;
  title: string;
  description: string;
  department: string;
  status: string;
  priority: string;
  progress: number;
  type?: string;
  category?: string;
  analysis?: any;
  metadata?: any;
  created_at: string;
  application_id?: string | null;
  steps?: string[];
  current_step?: number;
  name?: string;
  email?: string;
  role?: string;
  experience?: string | number;
  resume_url?: string;
  parsed_name?: string;
  parsed_email?: string;
  parsed_experience?: string;
  applicantName?: string | null;
  applicantEmail?: string | null;
  applicantPhone?: string | null;
  skills?: string[];
  education?: string[];
  summary?: string | null;
  resumeUrl?: string | null;
  createdAt?: string | null;
  parsedText?: string | null;
  aiScore?: number | null;
  aiSummary?: string | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  parserStatus?: string | null;
  parserError?: string | null;
  candidate_profile?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    experience?: string | number;
    resume_url?: string;
    parsed_data?: any;
  };
}

const normalizeStatus = (status?: string): string => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'in_progress' || normalized === 'in progress' || normalized === 'working') return 'running';
  if (normalized === 'success') return 'completed';
  if (normalized === 'pending') return 'waiting_for_ceo';
  return normalized || 'waiting_for_ceo';
};

const normalizeDepartment = (department?: string): string => {
  const value = String(department || '').trim();
  if (!value) return 'Operations';
  // Frontend department views currently don't support Engineering separately.
  if (value.toLowerCase() === 'engineering') return 'Operations';
  return value;
};

export const normalizeTask = (task: any): Task => {
  const analysis = task?.analysis && typeof task.analysis === 'object' ? task.analysis : {};
  const metadata = task?.metadata && typeof task.metadata === 'object' ? task.metadata : {};
  const parsedResume = metadata?.parsed_resume && typeof metadata.parsed_resume === 'object' ? metadata.parsed_resume : {};
  const candidate = task?.candidate_profile && typeof task.candidate_profile === 'object' ? task.candidate_profile : {};
  const parsed = candidate?.parsed_data && typeof candidate.parsed_data === 'object' ? candidate.parsed_data : {};
  return {
    ...task,
    id: String(task?.id || ''),
    title: String(task?.title || 'Untitled Task'),
    description: String(task?.description || ''),
    department: normalizeDepartment(task?.department),
    status: normalizeStatus(task?.status),
    priority: String(task?.priority || 'MEDIUM'),
    progress: Number.isFinite(Number(task?.progress)) ? Number(task.progress) : 0,
    created_at: String(task?.created_at || new Date().toISOString()),
    analysis,
    metadata,
    application_id: task?.application_id || analysis?.candidate_id || null,
    steps: Array.isArray(task?.steps) ? task.steps : [],
    current_step: Number.isFinite(Number(task?.current_step)) ? Number(task.current_step) : -1,
    candidate_profile: candidate,
    name: candidate?.name || parsed?.name || metadata?.candidate_name || parsedResume?.name || null,
    email: candidate?.email || parsed?.email || metadata?.candidate_email || parsedResume?.email || null,
    role: candidate?.role || parsed?.role || metadata?.candidate_role || null,
    experience: candidate?.experience || parsed?.experience || metadata?.candidate_experience || parsedResume?.experience || null,
    resume_url: candidate?.resume_url || null,
    parsed_name: parsed?.name || metadata?.candidate_name || parsedResume?.name || null,
    parsed_email: parsed?.email || metadata?.candidate_email || parsedResume?.email || null,
    parsed_experience: parsed?.experience || metadata?.candidate_experience || parsedResume?.experience || null,
    applicantName: candidate?.name || parsed?.name || metadata?.candidate_name || parsedResume?.name || null,
    applicantEmail: candidate?.email || parsed?.email || metadata?.candidate_email || parsedResume?.email || null,
    applicantPhone: parsed?.phone || metadata?.candidate_phone || parsedResume?.phone || null,
    skills: Array.isArray(parsed?.skills) ? parsed.skills : (Array.isArray(metadata?.candidate_skills) ? metadata.candidate_skills : (Array.isArray(parsedResume?.skills) ? parsedResume.skills : [])),
    education: Array.isArray(parsed?.education) ? parsed.education : (Array.isArray(metadata?.candidate_education) ? metadata.candidate_education : (Array.isArray(parsedResume?.education) ? parsedResume.education : [])),
    summary: parsed?.summary || metadata?.candidate_summary || parsedResume?.summary || null,
    resumeUrl: candidate?.resume_url || null,
    createdAt: String(task?.created_at || new Date().toISOString()),
    parsedText: candidate?.extracted_text || parsed?.fullText || metadata?.parsed_text || parsedResume?.fullText || null,
    aiScore: analysis?.match_score ?? metadata?.ai_score ?? null,
    aiSummary: analysis?.details?.summary || metadata?.ai_summary || null,
    matchedSkills: Array.isArray(analysis?.matched_skills) ? analysis.matched_skills : (Array.isArray(metadata?.matched_skills) ? metadata.matched_skills : []),
    missingSkills: Array.isArray(analysis?.missing_skills) ? analysis.missing_skills : (Array.isArray(metadata?.missing_skills) ? metadata.missing_skills : []),
    parserStatus: metadata?.parser_status || null,
    parserError: metadata?.parser_error || null,
  };
};

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], void>({
      query: () => '/tasks',
      transformResponse: (response: unknown) => {
        const rows = Array.isArray(response) ? response : [];
        return rows.map(normalizeTask);
      },
      providesTags: ['Task'],
    }),
    approveTasks: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/tasks/approve',
        method: 'POST',
      }),
      invalidatesTags: ['Task'],
    }),
  }),
});

export const { useGetTasksQuery, useApproveTasksMutation } = tasksApi;
