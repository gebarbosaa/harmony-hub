
-- ENUMS
CREATE TYPE public.tx_type AS ENUM ('RECEITA','DESPESA','TRANSFERENCIA','INVESTIMENTO');
CREATE TYPE public.pay_method AS ENUM ('DEBITO','PIX','DINHEIRO','CREDITO','ALIMENTACAO','TRANSFERENCIA','BOLETO');
CREATE TYPE public.privacy_level AS ENUM ('PRIVADO','COMPARTILHADO','DESAFIO');
CREATE TYPE public.task_quadrant AS ENUM ('FAZER_AGORA','AGENDAR','DELEGAR','ELIMINAR');
CREATE TYPE public.invoice_status AS ENUM ('ABERTA','FECHADA','VENCIDA','PAGA');

-- HOUSEHOLDS
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  name text NOT NULL,
  initials text,
  color text NOT NULL DEFAULT '#FF6B00',
  avatar_url text,
  avatar_scale numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- helper
CREATE OR REPLACE FUNCTION public.current_household_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT household_id FROM public.profiles WHERE id = auth.uid()
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read household" ON public.households FOR SELECT TO authenticated
  USING (id = public.current_household_id());
CREATE POLICY "members update household" ON public.households FOR UPDATE TO authenticated
  USING (id = public.current_household_id()) WITH CHECK (id = public.current_household_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "read household profiles" ON public.profiles FOR SELECT TO authenticated
  USING (household_id IS NOT NULL AND household_id = public.current_household_id());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- generic timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by uuid,
  date date NOT NULL DEFAULT current_date,
  description text NOT NULL,
  amount numeric NOT NULL,
  type public.tx_type NOT NULL DEFAULT 'DESPESA',
  category text NOT NULL DEFAULT 'OUTROS',
  pay_method public.pay_method NOT NULL DEFAULT 'PIX',
  card_name text,
  responsible text NOT NULL DEFAULT 'AMBAS',
  installment_current int,
  installment_total int,
  is_fixed boolean NOT NULL DEFAULT false,
  paid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household transactions" ON public.transactions FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_transactions BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FIXED COSTS
CREATE TABLE public.fixed_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'MORADIA',
  pay_method public.pay_method NOT NULL DEFAULT 'BOLETO',
  card_name text,
  due_day int NOT NULL DEFAULT 5,
  months boolean[] NOT NULL DEFAULT ARRAY[true,true,true,true,true,true,true,true,true,true,true,true],
  responsible text NOT NULL DEFAULT 'AMBAS',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_costs TO authenticated;
GRANT ALL ON public.fixed_costs TO service_role;
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household fixed_costs" ON public.fixed_costs FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_fixed_costs BEFORE UPDATE ON public.fixed_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fixed_cost_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  fixed_cost_id uuid NOT NULL REFERENCES public.fixed_costs(id) ON DELETE CASCADE,
  period text NOT NULL,
  paid boolean NOT NULL DEFAULT true,
  paid_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fixed_cost_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_cost_payments TO authenticated;
GRANT ALL ON public.fixed_cost_payments TO service_role;
ALTER TABLE public.fixed_cost_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household fixed_cost_payments" ON public.fixed_cost_payments FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_fcp BEFORE UPDATE ON public.fixed_cost_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INSTALLMENTS
CREATE TABLE public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  purchase_date date NOT NULL DEFAULT current_date,
  total_amount numeric NOT NULL,
  installments_count int NOT NULL DEFAULT 1,
  paid_count int NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'OUTROS',
  pay_method public.pay_method NOT NULL DEFAULT 'CREDITO',
  card_name text,
  responsible text NOT NULL DEFAULT 'AMBAS',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household installments" ON public.installments FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_installments BEFORE UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CARDS + INVOICES
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  last4 text,
  credit_limit numeric NOT NULL DEFAULT 0,
  close_day int NOT NULL DEFAULT 28,
  due_day int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household cards" ON public.cards FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_cards BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.cards(id) ON DELETE CASCADE,
  period text NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'ABERTA',
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household invoices" ON public.invoices FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BUDGETS
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category text NOT NULL,
  period text NOT NULL,
  limit_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, category, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household budgets" ON public.budgets FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_budgets BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GOALS
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  current_amount numeric NOT NULL DEFAULT 0,
  target_amount numeric NOT NULL DEFAULT 0,
  deadline text,
  monthly numeric NOT NULL DEFAULT 0,
  responsible text NOT NULL DEFAULT 'AMBAS',
  shared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household goals" ON public.goals FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_goals BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVESTMENTS
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'CDB',
  invested numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household investments" ON public.investments FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_investments BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- HABITS
CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  privacy public.privacy_level NOT NULL DEFAULT 'COMPARTILHADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read habits" ON public.habits FOR SELECT TO authenticated
  USING (household_id = public.current_household_id() AND (owner_id = auth.uid() OR privacy <> 'PRIVADO'));
CREATE POLICY "write own habits" ON public.habits FOR INSERT TO authenticated
  WITH CHECK (household_id = public.current_household_id() AND owner_id = auth.uid());
CREATE POLICY "update own habits" ON public.habits FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own habits" ON public.habits FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER t_habits BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;
GRANT ALL ON public.habit_logs TO service_role;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read habit_logs" ON public.habit_logs FOR SELECT TO authenticated
  USING (household_id = public.current_household_id() AND (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.privacy <> 'PRIVADO')));
CREATE POLICY "insert own habit_logs" ON public.habit_logs FOR INSERT TO authenticated
  WITH CHECK (household_id = public.current_household_id() AND user_id = auth.uid());
CREATE POLICY "delete own habit_logs" ON public.habit_logs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  quadrant public.task_quadrant NOT NULL DEFAULT 'FAZER_AGORA',
  responsible text NOT NULL DEFAULT 'AMBAS',
  due_date date,
  done boolean NOT NULL DEFAULT false,
  privacy public.privacy_level NOT NULL DEFAULT 'COMPARTILHADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read tasks" ON public.tasks FOR SELECT TO authenticated
  USING (household_id = public.current_household_id() AND (owner_id = auth.uid() OR privacy <> 'PRIVADO'));
CREATE POLICY "insert own tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (household_id = public.current_household_id() AND owner_id = auth.uid());
CREATE POLICY "update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (household_id = public.current_household_id() AND (owner_id = auth.uid() OR privacy <> 'PRIVADO'))
  WITH CHECK (household_id = public.current_household_id());
CREATE POLICY "delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER t_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REMINDERS / AGENDA
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  time text,
  category text NOT NULL DEFAULT 'LAZER',
  privacy public.privacy_level NOT NULL DEFAULT 'COMPARTILHADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read reminders" ON public.reminders FOR SELECT TO authenticated
  USING (household_id = public.current_household_id() AND (owner_id = auth.uid() OR privacy <> 'PRIVADO'));
CREATE POLICY "insert own reminders" ON public.reminders FOR INSERT TO authenticated
  WITH CHECK (household_id = public.current_household_id() AND owner_id = auth.uid());
CREATE POLICY "update own reminders" ON public.reminders FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own reminders" ON public.reminders FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER t_reminders BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SHOPPING
CREATE TABLE public.shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT ALL ON public.shopping_lists TO service_role;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household shopping_lists" ON public.shopping_lists FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_shopping_lists BEFORE UPDATE ON public.shopping_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'MERCEARIA',
  qty numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'UN',
  price numeric NOT NULL DEFAULT 0,
  actual_price numeric,
  priority text NOT NULL DEFAULT 'MÉDIA',
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_items TO authenticated;
GRANT ALL ON public.shopping_items TO service_role;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household shopping_items" ON public.shopping_items FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());
CREATE TRIGGER t_shopping_items BEFORE UPDATE ON public.shopping_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SETTINGS: categories & payment methods
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'DESPESA',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household categories" ON public.categories FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind public.pay_method NOT NULL DEFAULT 'PIX',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household payment_methods" ON public.payment_methods FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

-- RPCs
CREATE OR REPLACE FUNCTION public.create_household(household_name text, my_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; code text; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  LOOP
    code := upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.households WHERE invite_code = code);
  END LOOP;
  INSERT INTO public.households (name, invite_code) VALUES (household_name, code) RETURNING id INTO new_id;
  INSERT INTO public.profiles (id, household_id, name, initials)
  VALUES (uid, new_id, upper(my_name), upper(substring(my_name from 1 for 2)))
  ON CONFLICT (id) DO UPDATE SET household_id = new_id, name = upper(my_name), updated_at = now();
  RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_household(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_household(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_household(invite text, my_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT id INTO target FROM public.households WHERE invite_code = upper(invite);
  IF target IS NULL THEN RAISE EXCEPTION 'Código de convite inválido'; END IF;
  INSERT INTO public.profiles (id, household_id, name, initials, color)
  VALUES (uid, target, upper(my_name), upper(substring(my_name from 1 for 2)), '#3B9DFF')
  ON CONFLICT (id) DO UPDATE SET household_id = target, name = upper(my_name), updated_at = now();
  RETURN target;
END; $$;
REVOKE ALL ON FUNCTION public.join_household(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.join_household(text, text) TO authenticated;

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions, public.fixed_costs, public.fixed_cost_payments, public.installments, public.goals, public.investments, public.habits, public.habit_logs, public.tasks, public.reminders, public.shopping_lists, public.shopping_items, public.budgets, public.invoices, public.cards, public.profiles;
