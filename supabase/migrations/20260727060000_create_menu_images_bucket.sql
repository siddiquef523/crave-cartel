-- Creates the storage bucket that the policies in the previous migration
-- (20260727050150_...) reference. Safe to run even if the bucket already
-- exists (e.g. created manually via the Supabase dashboard).
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;
