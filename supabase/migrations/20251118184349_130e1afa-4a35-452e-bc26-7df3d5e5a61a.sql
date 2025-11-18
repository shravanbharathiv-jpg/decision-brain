-- Create decision_cases table
CREATE TABLE public.decision_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT,
  context TEXT,
  risks TEXT,
  objectives TEXT,
  additional_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create decision_analyses table
CREATE TABLE public.decision_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  summary TEXT,
  key_arguments JSONB,
  decision_paths JSONB,
  effects_tradeoffs JSONB,
  probability_reasoning TEXT,
  blind_spots JSONB,
  recommended_path TEXT,
  follow_up_questions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create risk_simulations table
CREATE TABLE public.risk_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  expected_value JSONB,
  best_case JSONB,
  worst_case JSONB,
  simulation_results JSONB,
  probability_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create decision_revisions table
CREATE TABLE public.decision_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  revision_type TEXT NOT NULL,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.decision_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decision_cases
CREATE POLICY "Users can view their own cases" ON public.decision_cases
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT invited_user_id FROM public.team_members WHERE case_id = decision_cases.id
  ));

CREATE POLICY "Users can create their own cases" ON public.decision_cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases" ON public.decision_cases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cases" ON public.decision_cases
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for decision_analyses
CREATE POLICY "Users can view analyses of their cases" ON public.decision_analyses
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT invited_user_id FROM public.team_members WHERE case_id = decision_analyses.case_id
  ));

CREATE POLICY "Users can create analyses for their cases" ON public.decision_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for risk_simulations
CREATE POLICY "Users can view simulations of their cases" ON public.risk_simulations
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT invited_user_id FROM public.team_members WHERE case_id = risk_simulations.case_id
  ));

CREATE POLICY "Users can create simulations for their cases" ON public.risk_simulations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for decision_revisions
CREATE POLICY "Users can view revisions of their cases" ON public.decision_revisions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT invited_user_id FROM public.team_members WHERE case_id = decision_revisions.case_id
  ));

CREATE POLICY "Users can create revisions for their cases" ON public.decision_revisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their cases" ON public.team_members
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = invited_user_id);

CREATE POLICY "Users can add team members to their cases" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove team members from their cases" ON public.team_members
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on decision_cases
CREATE TRIGGER update_decision_cases_updated_at
  BEFORE UPDATE ON public.decision_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();