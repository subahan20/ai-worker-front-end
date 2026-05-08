import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Task } from '../api/tasksApi';

interface TasksState {
  searchQuery: string;
}

const initialState: TasksState = {
  searchQuery: '',
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
});

export const { setSearchQuery } = tasksSlice.actions;

// --- Specialized Selectors ---

export const selectAllTasks = (state: RootState) => state.tasksApi.queries['getTasks(undefined)']?.data as Task[] || [];

export const selectTasksByDepartment = (dept: string) => (state: RootState) => {
  const allTasks = selectAllTasks(state);
  return allTasks.filter(t => String(t.department || '').toLowerCase() === String(dept || '').toLowerCase());
};

export const selectHRData = (state: RootState) => {
  const hrTasks = selectTasksByDepartment('HR')(state);
  // Only candidate-linked HR tasks should drive candidate UI.
  const hrCandidateTasks = hrTasks.filter(t => {
    const analysisCandidateId = (t as any)?.analysis?.candidate_id;
    return Boolean((t as any).application_id || analysisCandidateId);
  });

  const isPlaceholderName = (value?: string) => {
    const v = String(value || '').trim().toLowerCase();
    return !v || v === 'unknown candidate' || v === 'processing...';
  };
  const isPlaceholderEmail = (value?: string) => {
    const v = String(value || '').trim().toLowerCase();
    return !v || v === 'parsing@ai.com' || v === 'noreply@example.com';
  };

  const extractNameFromTitle = (title?: string) => {
    const match = String(title || '').match(/\bto\s+(.+)$/i);
    return match ? match[1].trim() : '';
  };

  const mapped = hrCandidateTasks
    .map(t => {
      const analysis = (t as any).analysis || {};
      const parsedResume = (t as any)?.metadata?.parsed_resume || {};
      const fromMetadata = (t as any)?.metadata?.candidate_name || parsedResume?.name || '';
      const fromTaskProfile = (t as any).parsed_name || (t as any).applicantName || (t as any).name || fromMetadata || '';
      const fromAnalysis = analysis?.details?.candidate_name || analysis?.candidate_name || '';
      const fromTitle = extractNameFromTitle((t as any).title);
      const display_name = !isPlaceholderName(fromTaskProfile)
        ? fromTaskProfile
        : (!isPlaceholderName(fromAnalysis)
          ? fromAnalysis
          : (!isPlaceholderName(fromTitle) ? fromTitle : ''));

      const score = analysis?.match_score || analysis?.ats_score || (t as any)?.metadata?.candidate_score || 0;
      const email = (t as any).parsed_email || (t as any).applicantEmail || (t as any).email || (t as any)?.metadata?.candidate_email || parsedResume?.email || '';
      const parserStatus = (t as any).parserStatus || (t as any)?.metadata?.parser_status || '';
      const parserError = (t as any).parserError || (t as any)?.metadata?.parser_error || '';
      const hasIdentity = (!isPlaceholderName(display_name) && Boolean(display_name)) || (!isPlaceholderEmail(email) && Boolean(email));
      const hasParserFailure = String(parserStatus).toLowerCase() === 'failed';
      const hasRealParserError = hasParserFailure && Boolean(String(parserError || '').trim());
      const hasMeaningfulProfile = hasIdentity || hasRealParserError;

      return {
        ...t,
        id: (t as any).application_id || analysis?.candidate_id || t.id,
        source_task_id: t.id,
        display_name,
        name: display_name || (t as any).name || '',
        email,
        role: (t as any).role || '',
        experience: (t as any).parsed_experience || (t as any).experience || '',
        resume_url: (t as any).resume_url || '',
        candidate_analysis: analysis ? [analysis] : [],
        score,
        parsed_text: (t as any).parsedText || '',
        ai_summary: (t as any).aiSummary || analysis?.details?.summary || '',
        matched_skills: (t as any).matchedSkills || analysis?.matched_skills || [],
        missing_skills: (t as any).missingSkills || analysis?.missing_skills || [],
        parser_status: parserStatus,
        parser_error: parserError,
        hasMeaningfulProfile
      };
    })
    .filter((t: any) => t.hasMeaningfulProfile);

  // Deduplicate candidate cards by application id / candidate id.
  const dedupedByCandidate = new Map<string, any>();
  for (const row of mapped) {
    const key = String(row.id || row.application_id || row.source_task_id || '');
    if (!key) continue;
    const existing = dedupedByCandidate.get(key);
    if (!existing) {
      dedupedByCandidate.set(key, row);
      continue;
    }
    const rowHasParsed = Boolean(String(row.parsed_text || '').trim());
    const existingHasParsed = Boolean(String(existing.parsed_text || '').trim());
    const rowHasAnalysis = Array.isArray(row.candidate_analysis) && row.candidate_analysis.length > 0;
    const existingHasAnalysis = Array.isArray(existing.candidate_analysis) && existing.candidate_analysis.length > 0;
    const rowTime = Date.parse(String(row.createdAt || row.created_at || '')) || 0;
    const existingTime = Date.parse(String(existing.createdAt || existing.created_at || '')) || 0;

    const shouldReplace =
      (rowHasParsed && !existingHasParsed) ||
      (rowHasAnalysis && !existingHasAnalysis) ||
      (rowHasParsed === existingHasParsed && rowHasAnalysis === existingHasAnalysis && rowTime > existingTime);
    if (shouldReplace) dedupedByCandidate.set(key, row);
  }
  return Array.from(dedupedByCandidate.values());
};

export const selectMarketingData = (state: RootState) => {
  const marketingTasks = selectTasksByDepartment('Marketing')(state);
  return marketingTasks.map(t => ({
    ...t,
    handle_name: (t as any)?.metadata?.handle_name || (t as any)?.metadata?.profile_name || String((t as any)?.title || 'Marketing Profile'),
    platform: (t as any)?.metadata?.platform || 'Instagram',
    followers: (t as any)?.metadata?.followers || null,
    marketing_analysis: Array.isArray((t as any).marketing_analysis)
      ? (t as any).marketing_analysis
      : ((t as any).analysis ? [(t as any).analysis] : []),
    viral_reels: t.analysis?.reels || [],
    insight: t.analysis?.strategy || ''
  }));
};

export const selectSalesData = (state: RootState) => {
  const salesTasks = selectTasksByDepartment('Sales')(state);
  return salesTasks.map(t => ({
    ...t,
    leads: t.analysis?.leads || [],
    strategy: t.analysis?.strategy || ''
  }));
};

export const selectOpsData = (state: RootState) => {
  const opsTasks = selectTasksByDepartment('Operations')(state);
  return opsTasks.map(t => ({
    ...t,
    deployments: t.analysis?.deployments || [],
    efficiency: t.analysis?.efficiency || 0,
    summary: t.analysis?.summary || t.description,
    inefficiencies: t.analysis?.inefficiencies || [],
    improvements: t.analysis?.improvements || []
  }));
};

export const selectFinanceData = (state: RootState) => {
  const financeTasks = selectTasksByDepartment('Finance')(state);
  return financeTasks.map(t => ({
    ...t,
    invoices: t.analysis?.invoices || [],
    burn_rate: t.analysis?.burn_rate || 0,
    summary: t.analysis?.summary || t.description,
    score: t.analysis?.score || 0,
    recommendations: t.analysis?.recommendations || []
  }));
};

export const selectOverviewStats = (state: RootState) => {
  const allTasks = selectAllTasks(state);
  return {
    total: allTasks.length,
    active: allTasks.filter(t => t.status === 'running').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    pending: allTasks.filter(t => t.status === 'waiting_for_ceo').length,
  };
};

export default tasksSlice.reducer;
