/* ------------------------------------------------------- 1. unit helper */

CREATE OR REPLACE FUNCTION public.convert_qty(_qty numeric, _from text, _to text)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT CASE
    WHEN _from IS NULL OR _to IS NULL THEN _qty
    WHEN lower(trim(_from)) = lower(trim(_to)) THEN _qty
    WHEN lower(trim(_from)) = 'kg'    AND lower(trim(_to)) = 'g'     THEN _qty * 1000
    WHEN lower(trim(_from)) = 'g'     AND lower(trim(_to)) = 'kg'    THEN _qty / 1000
    WHEN lower(trim(_from)) = 'litre' AND lower(trim(_to)) = 'ml'    THEN _qty * 1000
    WHEN lower(trim(_from)) = 'ml'    AND lower(trim(_to)) = 'litre' THEN _qty / 1000
    WHEN lower(trim(_from)) = 'dozen' AND lower(trim(_to)) = 'pcs'   THEN _qty * 12
    WHEN lower(trim(_from)) = 'pcs'   AND lower(trim(_to)) = 'dozen' THEN _qty / 12
    ELSE _qty
  END;
$fn$;
GRANT EXECUTE ON FUNCTION public.convert_qty(numeric, text, text) TO authenticated;

/* ------------------------------------------- 2. category + extra units */

INSERT INTO public.ingredient_categories (name, sort_order) VALUES
  ('Sauce & Batter', 9)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.inventory_units (name, sort_order) VALUES
  ('cup', 9), ('tbsp', 10), ('tsp', 11), ('piece', 12), ('batch', 13)
ON CONFLICT (name) DO NOTHING;

/* ------------------------------------------------- 3. recipe sections */

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'main';

ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_section_check;
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_section_check CHECK (section IN ('main','sauces','dip'));

ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_pkey;
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_pkey PRIMARY KEY (menu_item_id, ingredient_id, section);

/* ------------------------------------------------ 4. production recipes */

CREATE TABLE IF NOT EXISTS public.production_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.ingredients(id) ON DELETE CASCADE,
  output_qty numeric(12,3) NOT NULL DEFAULT 1,
  output_unit text NOT NULL DEFAULT 'pcs',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_recipes TO authenticated;
GRANT ALL ON public.production_recipes TO service_role;
ALTER TABLE public.production_recipes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage production recipes" ON public.production_recipes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS production_recipes_updated_at ON public.production_recipes;
CREATE TRIGGER production_recipes_updated_at BEFORE UPDATE ON public.production_recipes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.production_recipe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_recipe_id uuid NOT NULL REFERENCES public.production_recipes(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  qty numeric(12,4) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_recipe_id, ingredient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_recipe_items TO authenticated;
GRANT ALL ON public.production_recipe_items TO service_role;
ALTER TABLE public.production_recipe_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage production recipe items" ON public.production_recipe_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS production_recipe_items_recipe_idx ON public.production_recipe_items (production_recipe_id);
CREATE INDEX IF NOT EXISTS production_recipe_items_ingredient_idx ON public.production_recipe_items (ingredient_id);

/* ----------------------------------------------- 5. production history */

CREATE TABLE IF NOT EXISTS public.production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  produced_qty numeric(12,3) NOT NULL DEFAULT 0,
  produced_unit text NOT NULL DEFAULT 'pcs',
  recipe_output_qty numeric(12,3) NOT NULL DEFAULT 0,
  recipe_output_unit text NOT NULL DEFAULT 'pcs',
  scale_factor numeric(12,4) NOT NULL DEFAULT 1,
  total_cost numeric(14,2) NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.production_batches TO authenticated;
GRANT ALL ON public.production_batches TO service_role;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins read production batches" ON public.production_batches FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins insert production batches" ON public.production_batches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS production_batches_product_idx ON public.production_batches (product_id);
CREATE INDEX IF NOT EXISTS production_batches_created_idx ON public.production_batches (created_at DESC);

CREATE TABLE IF NOT EXISTS public.production_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  ingredient_name text NOT NULL DEFAULT '',
  qty_used numeric(12,4) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  line_cost numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.production_batch_items TO authenticated;
GRANT ALL ON public.production_batch_items TO service_role;
ALTER TABLE public.production_batch_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins read production batch items" ON public.production_batch_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins insert production batch items" ON public.production_batch_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS production_batch_items_batch_idx ON public.production_batch_items (batch_id);

/* --------------------------------------------------- 6. record_production */

CREATE OR REPLACE FUNCTION public.record_production(
  _product_id uuid,
  _produced_qty numeric,
  _produced_unit text,
  _note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  rec        public.production_recipes%ROWTYPE;
  product    public.ingredients%ROWTYPE;
  it         RECORD;
  out_in_pu  numeric;
  scale      numeric;
  batch_id   uuid;
  used_recipe_unit numeric;
  used_stock_unit  numeric;
  line_cost  numeric;
  total      numeric := 0;
  added      numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _produced_qty IS NULL OR _produced_qty <= 0 THEN RAISE EXCEPTION 'Produced quantity must be greater than zero'; END IF;

  SELECT * INTO product FROM public.ingredients WHERE id = _product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;

  SELECT * INTO rec FROM public.production_recipes WHERE product_id = _product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'This product has no production recipe yet'; END IF;
  IF rec.output_qty IS NULL OR rec.output_qty <= 0 THEN RAISE EXCEPTION 'Recipe output quantity must be greater than zero'; END IF;

  out_in_pu := public.convert_qty(rec.output_qty, rec.output_unit, _produced_unit);
  IF out_in_pu IS NULL OR out_in_pu = 0 THEN RAISE EXCEPTION 'Cannot compare recipe output with produced unit'; END IF;

  scale := _produced_qty / out_in_pu;

  INSERT INTO public.production_batches
    (product_id, product_name, produced_qty, produced_unit, recipe_output_qty, recipe_output_unit,
     scale_factor, total_cost, note, created_by)
  VALUES
    (_product_id, product.name, _produced_qty, _produced_unit, rec.output_qty, rec.output_unit,
     scale, 0, _note, auth.uid())
  RETURNING id INTO batch_id;

  FOR it IN
    SELECT pri.ingredient_id, pri.qty, pri.unit, i.name AS ing_name, i.unit AS stock_unit, i.cost_per_unit
      FROM public.production_recipe_items pri
      JOIN public.ingredients i ON i.id = pri.ingredient_id
     WHERE pri.production_recipe_id = rec.id
  LOOP
    used_recipe_unit := it.qty * scale;
    used_stock_unit  := public.convert_qty(used_recipe_unit, it.unit, it.stock_unit);
    line_cost        := ROUND(used_stock_unit * COALESCE(it.cost_per_unit, 0), 2);
    total            := total + line_cost;

    UPDATE public.ingredients
       SET stock_qty = stock_qty - used_stock_unit
     WHERE id = it.ingredient_id;

    INSERT INTO public.inventory_movements (ingredient_id, delta, reason, note, created_by)
    VALUES (it.ingredient_id, -used_stock_unit, 'adjustment',
            'Production: ' || product.name, auth.uid());

    INSERT INTO public.production_batch_items
      (batch_id, ingredient_id, ingredient_name, qty_used, unit, unit_cost, line_cost)
    VALUES
      (batch_id, it.ingredient_id, it.ing_name, used_recipe_unit, it.unit,
       COALESCE(it.cost_per_unit, 0), line_cost);
  END LOOP;

  added := public.convert_qty(_produced_qty, _produced_unit, product.unit);

  UPDATE public.ingredients
     SET stock_qty = stock_qty + added,
         cost_per_unit = CASE WHEN added > 0 THEN ROUND(total / added, 2) ELSE cost_per_unit END
   WHERE id = _product_id;

  INSERT INTO public.inventory_movements (ingredient_id, delta, reason, note, unit_cost, created_by)
  VALUES (_product_id, added, 'restock', 'Produced batch' ||
          CASE WHEN _note IS NULL OR _note = '' THEN '' ELSE ' — ' || _note END,
          CASE WHEN added > 0 THEN ROUND(total / added, 2) ELSE NULL END, auth.uid());

  UPDATE public.production_batches SET total_cost = total WHERE id = batch_id;

  RETURN batch_id;
END; $fn$;
GRANT EXECUTE ON FUNCTION public.record_production(uuid, numeric, text, text) TO authenticated;

/* ------------------------------------------------------- 7. marketing */

CREATE TABLE IF NOT EXISTS public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  banner_type text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  primary_button_text text NOT NULL DEFAULT '',
  primary_button_link text NOT NULL DEFAULT '',
  secondary_button_text text NOT NULL DEFAULT '',
  secondary_button_link text NOT NULL DEFAULT '',
  image_url text,
  start_date timestamptz,
  end_date timestamptz,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_banners TO authenticated;
GRANT ALL ON public.hero_banners TO service_role;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Banners are public" ON public.hero_banners FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage banners" ON public.hero_banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS hero_banners_updated_at ON public.hero_banners;
CREATE TRIGGER hero_banners_updated_at BEFORE UPDATE ON public.hero_banners
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'percentage',
  value numeric(10,2) NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'all',
  enabled boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discounts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discounts TO authenticated;
GRANT ALL ON public.discounts TO service_role;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Discounts are public" ON public.discounts FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage discounts" ON public.discounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS discounts_updated_at ON public.discounts;
CREATE TRIGGER discounts_updated_at BEFORE UPDATE ON public.discounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.discount_categories (
  discount_id uuid NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, category_id)
);
GRANT SELECT ON public.discount_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_categories TO authenticated;
GRANT ALL ON public.discount_categories TO service_role;
ALTER TABLE public.discount_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Discount categories are public" ON public.discount_categories FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage discount categories" ON public.discount_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.discount_items (
  discount_id uuid NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, menu_item_id)
);
GRANT SELECT ON public.discount_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_items TO authenticated;
GRANT ALL ON public.discount_items TO service_role;
ALTER TABLE public.discount_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Discount items are public" ON public.discount_items FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage discount items" ON public.discount_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;