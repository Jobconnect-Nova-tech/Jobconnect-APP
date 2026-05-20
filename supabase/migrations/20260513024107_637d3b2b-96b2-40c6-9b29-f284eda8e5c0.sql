
CREATE TYPE public.app_role AS ENUM ('worker', 'company');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  salary TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Tiempo completo',
  tags TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active jobs readable" ON public.jobs FOR SELECT TO authenticated USING (active = true OR company_id = auth.uid());
CREATE POLICY "company creates own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (company_id = auth.uid() AND public.has_role(auth.uid(), 'company'));
CREATE POLICY "company updates own jobs" ON public.jobs FOR UPDATE TO authenticated USING (company_id = auth.uid());
CREATE POLICY "company deletes own jobs" ON public.jobs FOR DELETE TO authenticated USING (company_id = auth.uid());

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'nuevo',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, worker_id)
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker reads own applications" ON public.applications FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "company reads applications" ON public.applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.company_id = auth.uid()));
CREATE POLICY "worker creates applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid() AND public.has_role(auth.uid(), 'worker'));
CREATE POLICY "worker withdraws applications" ON public.applications FOR DELETE TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "company updates applications" ON public.applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.company_id = auth.uid()));

CREATE TABLE public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, worker_id)
);
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker reads own saved" ON public.saved_jobs FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "worker saves jobs" ON public.saved_jobs FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid());
CREATE POLICY "worker unsaves jobs" ON public.saved_jobs FOR DELETE TO authenticated USING (worker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_apps_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role app_role;
BEGIN
  v_role := CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role','worker') = 'company' THEN 'company'::app_role ELSE 'worker'::app_role END;
  INSERT INTO public.profiles (user_id, full_name, company_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'company_name')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_jobs_company ON public.jobs(company_id);
CREATE INDEX idx_jobs_active ON public.jobs(active);
CREATE INDEX idx_apps_job ON public.applications(job_id);
CREATE INDEX idx_apps_worker ON public.applications(worker_id);
CREATE INDEX idx_saved_worker ON public.saved_jobs(worker_id);
