-- Lock down Supabase Data API (anon/authenticated).
-- This app uses Prisma as the postgres role (bypasses RLS), so enabling RLS
-- with no public policies blocks browser/API access without breaking the app.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'Enabled RLS on public.%', r.tablename;
  END LOOP;
END $$;

-- Auto-enable RLS for future tables created in public schema
CREATE OR REPLACE FUNCTION public.r101_auto_enable_rls()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  obj RECORD;
BEGIN
  FOR obj IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS')
  LOOP
    IF obj.schema_name = 'public' AND obj.object_type = 'table' THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS r101_auto_enable_rls_trigger;
CREATE EVENT TRIGGER r101_auto_enable_rls_trigger
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS')
EXECUTE FUNCTION public.r101_auto_enable_rls();
