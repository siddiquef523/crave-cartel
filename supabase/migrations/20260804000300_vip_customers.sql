CREATE TABLE public.vip_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  name text,
  notes text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vip_customers_phone_key ON public.vip_customers (phone);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_customers TO authenticated;
GRANT ALL ON public.vip_customers TO service_role;

ALTER TABLE public.vip_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vip customers"
  ON public.vip_customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vip_customers_updated_at
  BEFORE UPDATE ON public.vip_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.vip_lookup(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vip_customers
    WHERE enabled = true
      AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
      AND length(regexp_replace(_phone, '\D', '', 'g')) >= 10
  );
$$;

GRANT EXECUTE ON FUNCTION public.vip_lookup(text) TO anon, authenticated;
