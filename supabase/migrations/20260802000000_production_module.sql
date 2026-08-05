DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('Pending','Accepted','Preparing','Ready','Completed','Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sales_source AS ENUM ('website','swiggy','zomato','walkin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_reason AS ENUM ('sale','restock','waste','adjustment','reversal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cycle_status AS ENUM ('open','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$fn$;

DO $$ BEGIN
  CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$fn$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS on_auth_user_created_bootstrap_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_bootstrap_admin
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bootstrap_admin();

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS categories_updated_at ON public.categories;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  veg boolean NOT NULL DEFAULT false,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  best_seller boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Menu is public" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage menu" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS menu_items_updated_at ON public.menu_items;
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  pickup_time text NOT NULL DEFAULT 'ASAP',
  payment_method text NOT NULL DEFAULT 'Pay at Pickup',
  special_instructions text,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'Pending',
  source public.sales_source NOT NULL DEFAULT 'website',
  order_type text NOT NULL DEFAULT 'pickup',
  delivery_address text,
  sale_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  archived boolean NOT NULL DEFAULT false,
  archived_month date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_check
  CHECK (lower(order_type) IN ('pickup', 'takeaway', 'delivery', 'walkin', 'walk-in', 'dine-in', 'dinein'));

CREATE OR REPLACE FUNCTION public.sanitize_order_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.order_type := lower(NEW.order_type);
  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS trg_sanitize_order_type ON public.orders;
CREATE TRIGGER trg_sanitize_order_type
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_order_type();

DO $$ BEGIN
  CREATE POLICY "Anyone can place an order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_sale_date_idx  ON public.orders (sale_date DESC);
CREATE INDEX IF NOT EXISTS orders_source_idx     ON public.orders (source);
CREATE INDEX IF NOT EXISTS orders_status_idx     ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_archived_idx   ON public.orders (archived);

CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' OR NEW.order_number = 'pending' THEN
    NEW.order_number := 'CC-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  END IF;
  IF COALESCE(NEW.source, 'website') = 'website' AND NEW.status IS NULL THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS orders_assign_number ON public.orders;
CREATE TRIGGER orders_assign_number BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can add order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins read order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins delete order items" ON public.order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_menu_idx     ON public.order_items (menu_item_id);

CREATE TABLE IF NOT EXISTS public.inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_units TO authenticated;
GRANT ALL ON public.inventory_units TO service_role;
ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage units" ON public.inventory_units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.inventory_units (name, sort_order) VALUES
  ('kg',1),('g',2),('litre',3),('ml',4),('pcs',5),('packet',6),('bottle',7),('dozen',8)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ingredient_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredient_categories TO authenticated;
GRANT ALL ON public.ingredient_categories TO service_role;
ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage ingredient categories" ON public.ingredient_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.ingredient_categories (name, sort_order) VALUES
  ('Vegetables',1),('Meat',2),('Dairy',3),('Bakery',4),('Sauces',5),('Packaging',6),('Beverages',7),('Other',8)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  unit text NOT NULL DEFAULT 'pcs',
  category_id uuid REFERENCES public.ingredient_categories(id) ON DELETE SET NULL,
  stock_qty numeric(12,3) NOT NULL DEFAULT 0,
  low_threshold numeric(12,3) NOT NULL DEFAULT 0,
  cost_per_unit numeric(12,2) NOT NULL DEFAULT 0,
  supplier text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredients TO authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage ingredients" ON public.ingredients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS ingredients_updated_at ON public.ingredients;
CREATE TRIGGER ingredients_updated_at BEFORE UPDATE ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ingredients_category_idx ON public.ingredients (category_id);
CREATE INDEX IF NOT EXISTS ingredients_name_idx     ON public.ingredients (name);

CREATE TABLE IF NOT EXISTS public.recipes (
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  qty_per_unit numeric(12,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (menu_item_id, ingredient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage recipes" ON public.recipes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS recipes_ingredient_idx ON public.recipes (ingredient_id);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  delta numeric(12,3) NOT NULL,
  reason public.inventory_reason NOT NULL DEFAULT 'adjustment',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid,
  unit_cost numeric(12,2),
  supplier text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins read movements" ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins insert movements" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS movements_ingredient_idx ON public.inventory_movements (ingredient_id);
CREATE INDEX IF NOT EXISTS movements_created_idx    ON public.inventory_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS movements_reason_idx     ON public.inventory_movements (reason);

CREATE OR REPLACE FUNCTION public.record_stock_change(
  _ingredient_id uuid,
  _delta numeric,
  _reason public.inventory_reason DEFAULT 'adjustment',
  _note text DEFAULT NULL,
  _unit_cost numeric DEFAULT NULL,
  _supplier text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE public.ingredients
     SET stock_qty = stock_qty + _delta,
         cost_per_unit = COALESCE(_unit_cost, cost_per_unit),
         supplier = COALESCE(_supplier, supplier)
   WHERE id = _ingredient_id;

  INSERT INTO public.inventory_movements (ingredient_id, delta, reason, note, unit_cost, supplier, created_by)
  VALUES (_ingredient_id, _delta, _reason, _note, _unit_cost, _supplier, auth.uid());
END; $fn$;
GRANT EXECUTE ON FUNCTION public.record_stock_change(uuid, numeric, public.inventory_reason, text, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.deduct_stock_for_order_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r RECORD;
BEGIN
  IF NEW.menu_item_id IS NULL THEN RETURN NEW; END IF;

  FOR r IN SELECT ingredient_id, qty_per_unit FROM public.recipes WHERE menu_item_id = NEW.menu_item_id LOOP
    UPDATE public.ingredients SET stock_qty = stock_qty - (r.qty_per_unit * NEW.qty) WHERE id = r.ingredient_id;

    INSERT INTO public.inventory_movements (ingredient_id, delta, reason, order_id, order_item_id, note)
    VALUES (r.ingredient_id, -(r.qty_per_unit * NEW.qty), 'sale', NEW.order_id, NEW.id, NEW.name);
  END LOOP;

  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS order_items_deduct_stock ON public.order_items;
DROP TRIGGER IF EXISTS trg_deduct_inv ON public.order_items;
CREATE TRIGGER order_items_deduct_stock AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_for_order_item();

CREATE OR REPLACE FUNCTION public.reverse_inventory_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r RECORD;
BEGIN
  IF NEW.status = 'Cancelled' AND OLD.status IS DISTINCT FROM 'Cancelled' THEN
    FOR r IN SELECT im.ingredient_id, SUM(im.delta) AS total_delta
             FROM public.inventory_movements im
             WHERE im.order_id = NEW.id AND im.reason = 'sale'
             GROUP BY im.ingredient_id LOOP
      UPDATE public.ingredients SET stock_qty = stock_qty - r.total_delta WHERE id = r.ingredient_id;
      INSERT INTO public.inventory_movements (ingredient_id, delta, reason, order_id, note)
        VALUES (r.ingredient_id, -r.total_delta, 'reversal', NEW.id, 'Order cancelled');
    END LOOP;
  END IF;
  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS trg_reverse_inv ON public.orders;
CREATE TRIGGER trg_reverse_inv AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.reverse_inventory_on_cancel();

CREATE OR REPLACE VIEW public.menu_item_costs AS
SELECT m.id AS menu_item_id,
       m.name,
       m.price,
       COALESCE(SUM(r.qty_per_unit * i.cost_per_unit), 0)::numeric(12,2) AS unit_cost
  FROM public.menu_items m
  LEFT JOIN public.recipes r ON r.menu_item_id = m.id
  LEFT JOIN public.ingredients i ON i.id = r.ingredient_id
 GROUP BY m.id, m.name, m.price;
GRANT SELECT ON public.menu_item_costs TO authenticated;
GRANT ALL ON public.menu_item_costs TO service_role;

CREATE TABLE IF NOT EXISTS public.business_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  status public.cycle_status NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid,
  note text
);
GRANT SELECT, INSERT, UPDATE ON public.business_cycles TO authenticated;
GRANT ALL ON public.business_cycles TO service_role;
ALTER TABLE public.business_cycles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage cycles" ON public.business_cycles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  revenue numeric(14,2) NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  items_sold integer NOT NULL DEFAULT 0,
  cogs numeric(14,2) NOT NULL DEFAULT 0,
  gross_profit numeric(14,2) NOT NULL DEFAULT 0,
  avg_order_value numeric(14,2) NOT NULL DEFAULT 0,
  by_source jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reports TO authenticated;
GRANT ALL ON public.monthly_reports TO service_role;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage monthly reports" ON public.monthly_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS monthly_reports_month_idx ON public.monthly_reports (month DESC);

CREATE OR REPLACE FUNCTION public.sales_summary(_from date, _to date)
RETURNS TABLE (
  revenue numeric,
  orders_count integer,
  items_sold integer,
  cogs numeric,
  gross_profit numeric,
  avg_order_value numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH o AS (
    SELECT * FROM public.orders
     WHERE sale_date >= _from AND sale_date <= _to AND status <> 'Cancelled'
  ),
  li AS (
    SELECT oi.qty, oi.price, COALESCE(c.unit_cost, 0) AS unit_cost
      FROM public.order_items oi
      JOIN o ON o.id = oi.order_id
      LEFT JOIN public.menu_item_costs c ON c.menu_item_id = oi.menu_item_id
  )
  SELECT
    COALESCE((SELECT SUM(total) FROM o), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM o), 0)::integer,
    COALESCE((SELECT SUM(qty) FROM li), 0)::integer,
    COALESCE((SELECT SUM(qty * unit_cost) FROM li), 0)::numeric,
    (COALESCE((SELECT SUM(total) FROM o), 0) - COALESCE((SELECT SUM(qty * unit_cost) FROM li), 0))::numeric,
    CASE WHEN COALESCE((SELECT COUNT(*) FROM o), 0) = 0 THEN 0
         ELSE (COALESCE((SELECT SUM(total) FROM o), 0) / (SELECT COUNT(*) FROM o)) END::numeric;
$fn$;
GRANT EXECUTE ON FUNCTION public.sales_summary(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_business_month(_month date)
RETURNS public.monthly_reports LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  m_start date := date_trunc('month', _month)::date;
  m_end   date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
  s       RECORD;
  src     jsonb;
  tops    jsonb;
  out_row public.monthly_reports;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO s FROM public.sales_summary(m_start, m_end);

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO src FROM (
    SELECT source::text AS source, SUM(total)::numeric AS revenue, COUNT(*)::int AS orders
      FROM public.orders
     WHERE sale_date BETWEEN m_start AND m_end AND status <> 'Cancelled'
     GROUP BY source
  ) x;

  SELECT COALESCE(jsonb_agg(y), '[]'::jsonb) INTO tops FROM (
    SELECT oi.name, SUM(oi.qty)::int AS qty, SUM(oi.qty * oi.price)::numeric AS revenue
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
     WHERE o.sale_date BETWEEN m_start AND m_end AND o.status <> 'Cancelled'
     GROUP BY oi.name
     ORDER BY SUM(oi.qty * oi.price) DESC
     LIMIT 10
  ) y;

  INSERT INTO public.monthly_reports
    (month, revenue, orders_count, items_sold, cogs, gross_profit, avg_order_value, by_source, top_items)
  VALUES
    (m_start, s.revenue, s.orders_count, s.items_sold, s.cogs, s.gross_profit, s.avg_order_value, src, tops)
  ON CONFLICT (month) DO UPDATE SET
    revenue = EXCLUDED.revenue,
    orders_count = EXCLUDED.orders_count,
    items_sold = EXCLUDED.items_sold,
    cogs = EXCLUDED.cogs,
    gross_profit = EXCLUDED.gross_profit,
    avg_order_value = EXCLUDED.avg_order_value,
    by_source = EXCLUDED.by_source,
    top_items = EXCLUDED.top_items,
    created_at = now()
  RETURNING * INTO out_row;

  UPDATE public.orders
     SET archived = true, archived_month = m_start
   WHERE sale_date BETWEEN m_start AND m_end AND status IN ('Completed','Cancelled');

  INSERT INTO public.business_cycles (month, status, closed_at, closed_by)
  VALUES (m_start, 'closed', now(), auth.uid())
  ON CONFLICT (month) DO UPDATE SET status = 'closed', closed_at = now(), closed_by = auth.uid();

  INSERT INTO public.business_cycles (month, status)
  VALUES ((m_start + interval '1 month')::date, 'open')
  ON CONFLICT (month) DO NOTHING;

  RETURN out_row;
END; $fn$;
GRANT EXECUTE ON FUNCTION public.close_business_month(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_completed_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.orders
     SET archived = true, archived_month = COALESCE(archived_month, date_trunc('month', sale_date)::date)
   WHERE status IN ('Completed','Cancelled') AND archived = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $fn$;
GRANT EXECUTE ON FUNCTION public.archive_completed_orders() TO authenticated;

INSERT INTO public.business_cycles (month, status)
VALUES (date_trunc('month', now())::date, 'open')
ON CONFLICT (month) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.store_settings (
  id boolean PRIMARY KEY DEFAULT true,
  store_name text NOT NULL DEFAULT 'Crave Cartel',
  tagline text NOT NULL DEFAULT 'Cloud Kitchen · Takeaway Only',
  logo_url text,
  hero_banner_url text,
  whatsapp text NOT NULL DEFAULT '919876543210',
  phone text NOT NULL DEFAULT '+91 98765 43210',
  instagram_url text NOT NULL DEFAULT 'https://instagram.com',
  maps_url text NOT NULL DEFAULT 'https://maps.google.com',
  address text NOT NULL DEFAULT 'Unit 14, Ground Floor, Sunrise Arcade, MG Road, Bengaluru 560001',
  open_time text NOT NULL DEFAULT '18:00',
  close_time text NOT NULL DEFAULT '03:00',
  time_zone text NOT NULL DEFAULT 'Asia/Kolkata',
  store_override text NOT NULL DEFAULT 'auto',
  announcement_text text NOT NULL DEFAULT '',
  announcement_enabled boolean NOT NULL DEFAULT false,
  hero_title text NOT NULL DEFAULT '',
  hero_subtitle text NOT NULL DEFAULT '',
  about_text text NOT NULL DEFAULT '',
  footer_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_settings_singleton CHECK (id)
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Store settings are public" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins update store settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins insert store settings" ON public.store_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS store_settings_updated_at ON public.store_settings;
CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.store_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "FAQs are public" ON public.faqs FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage faqs" ON public.faqs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5,
  quote text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;