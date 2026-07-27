
CREATE POLICY "Admins manage menu images" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read menu images" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'menu-images');
