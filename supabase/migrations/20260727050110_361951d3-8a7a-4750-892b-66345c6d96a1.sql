
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
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
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read their own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

-- first ever signup becomes THE admin; all later signups get nothing
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_bootstrap_admin
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bootstrap_admin();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- CATEGORIES
CREATE TABLE public.categories (
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
CREATE POLICY "Categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MENU ITEMS
CREATE TABLE public.menu_items (
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
CREATE POLICY "Menu is public" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage menu" ON public.menu_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS
CREATE TYPE public.order_status AS ENUM ('Pending','Accepted','Preparing','Ready','Completed','Cancelled');
CREATE SEQUENCE public.order_number_seq START 1;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  pickup_time text NOT NULL DEFAULT 'ASAP',
  payment_method text NOT NULL DEFAULT 'Pay at Pickup',
  special_instructions text,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place an order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.order_number := 'CC-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  NEW.status := 'Pending';
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_assign_number BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();

CREATE TABLE public.order_items (
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
CREATE POLICY "Anyone can add order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete order items" ON public.order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- STORE SETTINGS (singleton)
CREATE TABLE public.store_settings (
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
CREATE POLICY "Store settings are public" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update store settings" ON public.store_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert store settings" ON public.store_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FAQS
CREATE TABLE public.faqs (
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
CREATE POLICY "FAQs are public" ON public.faqs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage faqs" ON public.faqs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- REVIEWS
CREATE TABLE public.reviews (
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
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.store_settings (id) VALUES (true);
