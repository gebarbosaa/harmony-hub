-- HARMONY HUB ORGANIZATION EXTENSIONS
CREATE TABLE IF NOT EXISTS public.domestic_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL,
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  responsible text NOT NULL DEFAULT 'AMBAS',
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domestic_tasks TO authenticated;
ALTER TABLE public.domestic_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household domestic tasks" ON public.domestic_tasks FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

CREATE TABLE IF NOT EXISTS public.harmony_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'ANOTAÇÃO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.harmony_notes TO authenticated;
ALTER TABLE public.harmony_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household harmony notes" ON public.harmony_notes FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

CREATE TABLE IF NOT EXISTS public.household_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  institution text,
  account_type text NOT NULL DEFAULT 'CONTA CORRENTE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_accounts TO authenticated;
ALTER TABLE public.household_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household accounts" ON public.household_accounts FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

CREATE TABLE IF NOT EXISTS public.pix_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_type text NOT NULL,
  pix_key text NOT NULL,
  institution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_keys TO authenticated;
ALTER TABLE public.pix_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household pix keys" ON public.pix_keys FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
