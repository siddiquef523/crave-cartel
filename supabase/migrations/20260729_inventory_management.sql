-- ============ Enums ============
DO $$ BEGIN
  CREATE TYPE public.sales_source AS ENUM ('website','swiggy','zomato','walkin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_reason AS ENUM ('sale','restock','waste','adjustment','reversal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ orders.source column ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source public.sales_source NOT NULL DEFAULT 'website';

-- ============ ingredients ============
CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'g',
  stock_qty numeric NOT NULL DEFAULT 0,
  low_threshold numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  supplier text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredients TO authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ingredients" ON public.ingredients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ recipes ============
CREATE TABLE IF NOT EXISTS public.recipes (
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  qty_per_unit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (menu_item_id, ingredient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage recipes" ON public.recipes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ inventory_movements ============
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  reason public.inventory_reason NOT NULL,
  order_id uuid,
  order_item_id uuid,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read movements" ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert movements" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_movements_ing_created ON public.inventory_movements(ingredient_id, created_at DESC);

-- ============ Functions & triggers ============
CREATE OR REPLACE FUNCTION public.record_stock_change(
  _ingredient_id uuid, _delta numeric, _reason public.inventory_reason, _note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.ingredients SET stock_qty = stock_qty + _delta WHERE id = _ingredient_id;
  INSERT INTO public.inventory_movements (ingredient_id, delta, reason, note, created_by)
    VALUES (_ingredient_id, _delta, _reason, _note, auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order_item() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.menu_item_id IS NULL THEN RETURN NEW; END IF;
  FOR r IN SELECT ingredient_id, qty_per_unit FROM public.recipes WHERE menu_item_id = NEW.menu_item_id LOOP
    UPDATE public.ingredients SET stock_qty = stock_qty - (r.qty_per_unit * NEW.qty) WHERE id = r.ingredient_id;
    INSERT INTO public.inventory_movements (ingredient_id, delta, reason, order_id, order_item_id)
      VALUES (r.ingredient_id, -(r.qty_per_unit * NEW.qty), 'sale', NEW.order_id, NEW.id);
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_deduct_inv ON public.order_items;
CREATE TRIGGER trg_deduct_inv AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.deduct_inventory_on_order_item();

CREATE OR REPLACE FUNCTION public.reverse_inventory_on_cancel() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
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
END; $$;

DROP TRIGGER IF EXISTS trg_reverse_inv ON public.orders;
CREATE TRIGGER trg_reverse_inv AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.reverse_inventory_on_cancel();
